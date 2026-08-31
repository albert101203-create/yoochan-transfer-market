const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const draftsPayload = JSON.parse(
  fs.readFileSync(path.join(ROOT, "cache", "auto-drafts.json"), "utf8")
);
const assetMap = JSON.parse(fs.readFileSync(path.join(ROOT, "asset-map.json"), "utf8"));
const drafts = Array.isArray(draftsPayload?.drafts) ? draftsPayload.drafts : [];
const reviewItems = Array.isArray(draftsPayload?.reviewItems) ? draftsPayload.reviewItems : [];
const UNKNOWN_TEAM_NAMES = new Set(["", "미상", "미정", "소속팀 확인 중", "unknown", "tbc", "tbd"]);

function detectImageType(filePath) {
  const buffer = fs.readFileSync(filePath).subarray(0, 256);
  const hex = buffer.subarray(0, 12).toString("hex");
  const text = buffer.toString("utf8").trimStart().toLowerCase();
  if (hex.startsWith("89504e470d0a1a0a")) return "png";
  if (hex.startsWith("ffd8ff")) return "jpg";
  if (hex.startsWith("52494646") && hex.slice(16, 24) === "57454250") return "webp";
  if (text.startsWith("<?xml") || text.startsWith("<svg")) return "svg";
  return "unknown";
}

function checkAsset(kind, name) {
  const entry = assetMap?.[kind]?.[name];
  if (!entry?.src) return { kind, name, reason: "missing-entry" };
  const filePath = path.join(ROOT, entry.src.replace(/^\.\//, ""));
  if (!fs.existsSync(filePath)) return { kind, name, reason: "missing-file", src: entry.src };
  const extension = path.extname(filePath).toLowerCase();
  const imageType = detectImageType(filePath);
  const expectedType = extension === ".jpeg" ? "jpg" : extension.slice(1);
  if (imageType === "unknown" || (expectedType && imageType !== expectedType)) {
    return { kind, name, reason: "image-signature-mismatch", expectedType, imageType, src: entry.src };
  }
  const sourceText = `${entry.sourcePage || ""} ${entry.sourceImage || ""}`.toLowerCase();
  if (kind === "clubs" && /wikipedia/.test(sourceText) && !/(logo|crest|badge|svg)/.test(sourceText)) {
    return { kind, name, reason: "untrusted-club-image-source", src: entry.src };
  }
  if (
    kind === "players" &&
    entry.summaryDescription &&
    !/football|soccer|midfielder|defender|striker|winger|goalkeeper|forward/i.test(entry.summaryDescription)
  ) {
    return { kind, name, reason: "untrusted-player-image-source", src: entry.src };
  }
  return null;
}

const missing = [];
let repairedCount = 0;

function sanitizeCardText(card) {
  let changed = false;
  for (const field of ["player", "fromTeam", "toTeam", "status", "sourceReason", "headlineTitle"]) {
    if (typeof card[field] !== "string") continue;
    const sanitized = card[field].replace(/\uFFFD/g, "");
    if (sanitized !== card[field]) {
      card[field] = sanitized;
      changed = true;
    }
  }
  for (const link of card.sourceLinks || []) {
    if (typeof link.headlineTitle !== "string") continue;
    const sanitized = link.headlineTitle.replace(/\uFFFD/g, "");
    if (sanitized !== link.headlineTitle) {
      link.headlineTitle = sanitized;
      changed = true;
    }
  }
  return changed;
}

for (const item of [...drafts, ...reviewItems]) {
  if (sanitizeCardText(item)) repairedCount += 1;
}
const mapEntries = [
  ...Object.entries(assetMap?.players || {}).map(([name, entry]) => ["players", name, entry]),
  ...Object.entries(assetMap?.clubs || {}).map(([name, entry]) => ["clubs", name, entry]),
];
const referencedAssets = new Set();
for (const item of [...drafts, ...reviewItems]) {
  if (item.player) referencedAssets.add(`players|${item.player}`);
  if (item.fromTeam && !UNKNOWN_TEAM_NAMES.has(String(item.fromTeam).trim().toLowerCase())) referencedAssets.add(`clubs|${item.fromTeam}`);
  if (item.toTeam && !UNKNOWN_TEAM_NAMES.has(String(item.toTeam).trim().toLowerCase())) referencedAssets.add(`clubs|${item.toTeam}`);
}
for (const [kind, name, entry] of mapEntries) {
  const problem = checkAsset(kind, name);
  if (problem && referencedAssets.has(`${kind}|${name}`)) missing.push(problem);
}

for (const item of [...drafts, ...reviewItems]) {
  const text = [item.player, item.fromTeam, item.toTeam, item.headlineTitle, item.sourceReason]
    .map((value) => String(value || ""))
    .join(" ");
  if (/\uFFFD/.test(text)) missing.push({ kind: "card", name: item.player || "unknown", reason: "replacement-character", card: item.id });
}

for (const draft of [...drafts]) {
  const label = `${draft.player || "unknown"} -> ${draft.toTeam || "unknown"}`;
  // Fallback cards intentionally wait for enrichment. They must remain visible
  // with their source link, but should not block a deployment for missing assets.
  if (draft.needsVerification) continue;
  let cardProblems = [];
  for (const [kind, name] of [
    ["players", draft.player],
    ["clubs", draft.fromTeam],
    ["clubs", draft.toTeam],
  ]) {
    if (UNKNOWN_TEAM_NAMES.has(String(name || "").trim().toLowerCase())) {
      cardProblems.push({ kind, name: name || "", reason: "unknown-entity", card: label });
      continue;
    }
    const problem = checkAsset(kind, name);
    if (problem) cardProblems.push({ ...problem, card: label });
  }
  if (cardProblems.length) {
    const index = drafts.indexOf(draft);
    if (index >= 0) drafts.splice(index, 1);
    draft.needsVerification = true;
    draft.status = "확인 필요";
    draft.sourceReason = `${draft.sourceReason || "자동 수집 카드"} 이미지 또는 구단 정보 확인이 필요해 검수 대기로 이동했습니다.`;
    reviewItems.unshift(draft);
    repairedCount += 1;
  }
}

if (repairedCount) {
  draftsPayload.drafts = drafts;
  draftsPayload.reviewItems = reviewItems;
  draftsPayload.itemCount = drafts.length;
  draftsPayload.reviewItemCount = reviewItems.length;
  fs.writeFileSync(
    path.join(ROOT, "cache", "auto-drafts.json"),
    JSON.stringify(draftsPayload, null, 2) + "\n",
    "utf8"
  );
}

const result = { cards: drafts.length, reviewItems: reviewItems.length, repairedCount, missingCount: missing.length, missing };
console.log(JSON.stringify(result, null, 2));
if (missing.length) process.exit(1);

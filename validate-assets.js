const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const draftsPayload = JSON.parse(
  fs.readFileSync(path.join(ROOT, "cache", "auto-drafts.json"), "utf8")
);
const assetMap = JSON.parse(fs.readFileSync(path.join(ROOT, "asset-map.json"), "utf8"));
const drafts = Array.isArray(draftsPayload?.drafts) ? draftsPayload.drafts : [];

function checkAsset(kind, name) {
  const entry = assetMap?.[kind]?.[name];
  if (!entry?.src) return { kind, name, reason: "missing-entry" };
  const filePath = path.join(ROOT, entry.src.replace(/^\.\//, ""));
  if (!fs.existsSync(filePath)) return { kind, name, reason: "missing-file", src: entry.src };
  return null;
}

const missing = [];
for (const draft of drafts) {
  const label = `${draft.player || "unknown"} -> ${draft.toTeam || "unknown"}`;
  for (const [kind, name] of [
    ["players", draft.player],
    ["clubs", draft.fromTeam],
    ["clubs", draft.toTeam],
  ]) {
    if (!name || /미상|확인 중|unknown/i.test(String(name))) {
      missing.push({ kind, name: name || "", reason: "unknown-entity", card: label });
      continue;
    }
    const problem = checkAsset(kind, name);
    if (problem) missing.push({ ...problem, card: label });
  }
}

const result = { cards: drafts.length, missingCount: missing.length, missing };
console.log(JSON.stringify(result, null, 2));
if (missing.length) process.exit(1);

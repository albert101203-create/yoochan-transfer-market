const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const BASE_DIR = __dirname;
const ASSET_MAP_FILE = path.join(BASE_DIR, "asset-map.json");
const ATTRIBUTIONS_FILE = path.join(BASE_DIR, "asset-attributions.json");
const PLAYER_DIR = path.join(BASE_DIR, "assets", "players");
const CLUB_DIR = path.join(BASE_DIR, "assets", "clubs");

const SEEDED_ASSETS = {
  players: {
    "Viktor Gyökeres":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Viktor_Gy%C3%B6keres_2026-06-04_1_%28cropped%29.jpg/330px-Viktor_Gy%C3%B6keres_2026-06-04_1_%28cropped%29.jpg",
    "김민재":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/FC_Red_Bull_Salzburg_gegen_Bayern_M%C3%BCnchen_%282025-01-06_Testspiel%29_26.jpg/960px-FC_Red_Bull_Salzburg_gegen_Bayern_M%C3%BCnchen_%282025-01-06_Testspiel%29_26.jpg",
    "브라힘 디아스":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Brahim_Diaz_Morocco_v_Norway_7_June_2026-36_%28cropped_3-4%29.jpg/960px-Brahim_Diaz_Morocco_v_Norway_7_June_2026-36_%28cropped_3-4%29.jpg",
    "이반 토니":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Ivan_Toney_England_v_Ghana_23_June_2026-051.jpg/960px-Ivan_Toney_England_v_Ghana_23_June_2026-051.jpg",
    "비토르 호키":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Vitor-roque-palmeiras-internacional-sep2025.jpg/960px-Vitor-roque-palmeiras-internacional-sep2025.jpg",
  },
  clubs: {
    Arsenal:
      "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/1280px-Arsenal_FC.svg.png",
    Barcelona:
      "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/1280px-FC_Barcelona_%28crest%29.svg.png",
    "바이에른 뮌헨":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/FC_Bayern_M%C3%BCnchen_logo_%282024%29.svg/1280px-FC_Bayern_M%C3%BCnchen_logo_%282024%29.svg.png",
    "인터 밀란":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/FC_Internazionale_Milano_2021.svg/1280px-FC_Internazionale_Milano_2021.svg.png",
    "레알 마드리드":
      "https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/960px-Real_Madrid_CF.svg.png",
    "밀란":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Logo_of_AC_Milan.svg/960px-Logo_of_AC_Milan.svg.png",
    "알 아흘리":
      "https://upload.wikimedia.org/wikipedia/en/thumb/4/45/Al_Ahli_Saudi_FC_logo.svg/1280px-Al_Ahli_Saudi_FC_logo.svg.png",
    "토트넘":
      "https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/Tottenham_Hotspur.svg/960px-Tottenham_Hotspur.svg.png",
    "바르셀로나":
      "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/1280px-FC_Barcelona_%28crest%29.svg.png",
    "레알 베티스":
      "https://upload.wikimedia.org/wikipedia/en/thumb/2/2f/Real_Betis_2022_logo.svg/1280px-Real_Betis_2022_logo.svg.png",
  },
};

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function normalize(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function slug(value) {
  const readable = normalize(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const hash = crypto.createHash("sha1").update(value).digest("hex").slice(0, 8);
  return `${readable || "asset"}-${hash}`;
}

function collectRecords() {
  const files = [
    "transfers.json",
    path.join("cache", "auto-drafts.json"),
    path.join("cache", "promoted-candidates.json"),
  ];
  const records = files.flatMap((file) => {
    const data = readJson(path.join(BASE_DIR, file), null);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.drafts)) return data.drafts;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  });

  const players = new Set();
  const clubs = new Set();
  records.forEach((record) => {
    if (normalize(record.player)) players.add(normalize(record.player));
    if (normalize(record.fromTeam)) clubs.add(normalize(record.fromTeam));
    if (normalize(record.toTeam)) clubs.add(normalize(record.toTeam));
  });

  return { players: [...players], clubs: [...clubs] };
}

async function fetchSummaryTitle(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; YoochanTransferMarket/1.0)",
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.type === "standard" && data.thumbnail?.source ? data : null;
}

async function fetchWikipediaSummary(title) {
  const candidates = [
    title,
    `${title} (footballer)`,
    `${title} footballer`,
  ];

  for (const candidate of candidates) {
    const summary = await fetchSummaryTitle(candidate);
    if (summary) return summary;
  }

  const searchQueries = [`${title} footballer`, `${title} football club`, title];
  for (const query of searchQueries) {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
      query
    )}&limit=5&namespace=0&format=json`;
    const response = await fetch(searchUrl, {
      headers: { "user-agent": "yoochan-transfer-market/1.0" },
    });
    if (!response.ok) continue;
    const data = await response.json();
    for (const resultTitle of data[1] || []) {
      const summary = await fetchSummaryTitle(resultTitle);
      if (summary) return summary;
    }
  }

  return null;
}

function extensionFromContentType(contentType = "") {
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  return ".jpg";
}

async function downloadFile(url, filePath) {
  if (fs.existsSync(filePath)) return true;
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; YoochanTransferMarket/1.0)",
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
  });
  if (!response.ok) return false;
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) return false;
  fs.writeFileSync(filePath, buffer);
  return true;
}

async function downloadEntity(kind, name, assetMap, attributions) {
  const collection = kind === "players" ? assetMap.players : assetMap.clubs;
  if (collection[name]?.src && fs.existsSync(path.join(BASE_DIR, collection[name].src))) {
    return "cached";
  }

  try {
    const summary = await fetchWikipediaSummary(name);
    if (!summary?.thumbnail?.source) return "not-found";

    const directory = kind === "players" ? PLAYER_DIR : CLUB_DIR;
    fs.mkdirSync(directory, { recursive: true });
    const extension = extensionFromContentType(summary.thumbnail.contentUrl || "");
    const fileName = `${slug(name)}${extension}`;
    const filePath = path.join(directory, fileName);
    const downloaded = await downloadFile(summary.thumbnail.source, filePath);
    if (!downloaded) return "download-failed";

    const relativePath = `./assets/${kind}/${fileName}`;
    collection[name] = {
      src: relativePath,
      sourcePage: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(name)}`,
      sourceImage: summary.thumbnail.source,
      retrievedAt: new Date().toISOString(),
    };
    attributions[relativePath] = {
      name,
      sourcePage: collection[name].sourcePage,
      sourceImage: collection[name].sourceImage,
      note: "Downloaded from a Wikipedia/Wikimedia thumbnail; verify the image license before redistribution.",
    };
    return "downloaded";
  } catch (error) {
    console.warn(`asset lookup failed for ${kind}/${name}: ${error.message}`);
    return "failed";
  }
}

async function downloadSeededAssets(assetMap, attributions) {
  let downloaded = 0;
  for (const [kind, entries] of Object.entries(SEEDED_ASSETS)) {
    const directory = kind === "players" ? PLAYER_DIR : CLUB_DIR;
    fs.mkdirSync(directory, { recursive: true });
    for (const [name, sourceImage] of Object.entries(entries)) {
      const extension = sourceImage.includes(".svg") ? ".png" : ".jpg";
      const fileName = `${slug(name)}${extension}`;
      const filePath = path.join(directory, fileName);
      if (!fs.existsSync(filePath) && (await downloadFile(sourceImage, filePath))) downloaded += 1;
      if (!fs.existsSync(filePath)) continue;
      const relativePath = `./assets/${kind}/${fileName}`;
      assetMap[kind][name] = {
        src: relativePath,
        sourcePage: sourceImage,
        sourceImage,
        retrievedAt: new Date().toISOString(),
      };
      attributions[relativePath] = {
        name,
        sourcePage: sourceImage,
        sourceImage,
        note: "Seeded from the existing Wikimedia image reference; verify the image license before redistribution.",
      };
    }
  }
  return downloaded;
}

async function downloadAssets() {
  const { players, clubs } = collectRecords();
  const assetMap = readJson(ASSET_MAP_FILE, { players: {}, clubs: {} });
  const attributions = readJson(ATTRIBUTIONS_FILE, {});
  const counts = { downloaded: 0, cached: 0, notFound: 0, failed: 0 };

  counts.downloaded += await downloadSeededAssets(assetMap, attributions);

  for (const player of players) {
    const result = await downloadEntity("players", player, assetMap, attributions);
    if (result === "downloaded") counts.downloaded += 1;
    else if (result === "cached") counts.cached += 1;
    else if (result === "not-found") counts.notFound += 1;
    else counts.failed += 1;
  }

  for (const club of clubs) {
    const result = await downloadEntity("clubs", club, assetMap, attributions);
    if (result === "downloaded") counts.downloaded += 1;
    else if (result === "cached") counts.cached += 1;
    else if (result === "not-found") counts.notFound += 1;
    else counts.failed += 1;
  }

  writeJson(ASSET_MAP_FILE, assetMap);
  writeJson(ATTRIBUTIONS_FILE, attributions);
  console.log(`Asset refresh complete: ${JSON.stringify(counts)}`);
  return counts;
}

if (require.main === module) {
  downloadAssets().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { downloadAssets };

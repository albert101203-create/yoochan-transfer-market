const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 4173);
const BASE_DIR = __dirname;
const CACHE_TTL_MS = 90 * 1000;
const BACKGROUND_REFRESH_MS = 120 * 1000;
const CACHE_DIR = path.join(BASE_DIR, "cache");
const LIVE_CACHE_FILE = path.join(CACHE_DIR, "live-headlines.json");
const DRAFT_CACHE_FILE = path.join(CACHE_DIR, "auto-drafts.json");
const PROMOTED_CACHE_FILE = path.join(CACHE_DIR, "promoted-candidates.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const TRANSFER_KEYWORDS = [
  "transfer",
  "transfers",
  "here we go",
  "agreed",
  "agreement",
  "rumour",
  "rumours",
  "rumor",
  "rumors",
  "sign",
  "signs",
  "signing",
  "signed",
  "joins",
  "join",
  "deal",
  "bid",
  "loan",
  "medical",
  "contract",
  "release clause",
  "move",
];

const OFFICIAL_KEYWORDS = [
  "completes",
  "completed",
  "confirmed",
  "signs",
  "signed",
  "joins",
  "join",
  "announced",
  "official",
];

const RUMOR_KEYWORDS = [
  "rumour",
  "rumours",
  "rumor",
  "rumors",
  "bid",
  "interest",
  "linked",
  "target",
  "set to",
  "could",
  "transfer news",
];

const GENERIC_DRAFT_SKIP_PATTERNS = [
  /transfer show/i,
  /live updates/i,
  /rumours and gossip/i,
  /rumors and gossip/i,
  /goals and highlights/i,
  /paper talk/i,
  /transfer news live/i,
  /scottish premiership news/i,
  /transfer market after/i,
  /makes bow/i,
  /amid transfer speculation/i,
  /world-class .*star/i,
  /demands emerge/i,
  /want to sign .*star/i,
];

const POSITION_PATTERN =
  "(?:goalkeeper|keeper|full-back|left-back|right-back|winger|forward|striker|centre-back|center-back|central defender|defender|midfielder)";

const TEAM_LEAGUES = {
  Arsenal: "프리미어리그",
  "Aston Villa": "프리미어리그",
  Brighton: "프리미어리그",
  Celtic: "스코티시 프리미어십",
  Chelsea: "프리미어리그",
  Fenerbahce: "쉬페르리그",
  Galatasaray: "쉬페르리그",
  Hull: "EFL 챔피언십",
  "Inter Milan": "세리에 A",
  "Leeds United": "프리미어리그",
  "Manchester City": "프리미어리그",
  "Manchester United": "프리미어리그",
  "Man City": "프리미어리그",
  "Man Utd": "프리미어리그",
  Tottenham: "프리미어리그",
  "Tottenham Hotspur": "프리미어리그",
  "Atletico Madrid": "라리가",
  Atletico: "라리가",
};

const TEAM_ALIASES = {
  Gunners: "Arsenal",
  Spurs: "Tottenham",
  "Man Utd": "Manchester United",
  "Man City": "Manchester City",
  Palace: "Crystal Palace",
  Barça: "Barcelona",
  Barca: "Barcelona",
  Philly: "Philadelphia Union",
  SKC: "Sporting Kansas City",
  Atletico: "Atletico Madrid",
  Atleti: "Atletico Madrid",
};

const SOURCE_TIERS = {
  "official-club": "high",
  "official-league": "high",
  "fabrizio-romano": "high",
  "david-ornstein": "high",
  "x-direct-monitor": "high",
  "bbc-sport": "medium",
  "sky-sports": "medium",
  "the-athletic": "medium",
  "gianluca-di-marzio": "medium",
  "espn-fc": "medium",
  "guardian-football": "medium",
  "romano-monitor": "medium",
  "ornstein-monitor": "medium",
  "athletic-monitor": "medium",
  "dimarzio-monitor": "medium",
  "matteo-moretto-monitor": "medium",
  "ben-jacobs-monitor": "medium",
  "plettenberg-monitor": "medium",
  "solhekol-monitor": "medium",
  "santi-aouna-monitor": "medium",
  "official-arsenal-monitor": "high",
  "official-barcelona-monitor": "high",
  "official-real-madrid-monitor": "high",
  "official-bayern-monitor": "high",
  "official-man-city-monitor": "high",
  "official-man-utd-monitor": "high",
  "official-chelsea-monitor": "high",
  "official-liverpool-monitor": "high",
  "club-beat-reporter": "medium",
  "aggregator-account": "low",
  "fan-rumor-account": "low",
  "clickbait-outlet": "low",
};

function googleNewsTransferFeed(source, query, sourceKey, sourceName) {
  const encodedQuery = encodeURIComponent(query);

  return {
    source,
    url: `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`,
    parser: (xml) =>
      parseGenericRssFeed(xml, {
        sourceKey,
        sourceName,
        summary: `${sourceName} Google News monitor result.`,
      }),
  };
}

const LIVE_FEED_SOURCES = [
  {
    source: "BBC Sport RSS",
    url: "https://feeds.bbci.co.uk/sport/football/rss.xml",
    parser: parseBbcFeed,
  },
  {
    source: "Sky Sports sitemap",
    url: "https://www.skysports.com/sitemap_news_football.xml",
    parser: parseSkySitemap,
  },
  {
    source: "ESPN FC page",
    url: "https://www.espn.com/soccer/story/_/id/37380404/rss-feeds",
    parser: parseEspnSoccerPage,
  },
  {
    source: "The Guardian Football RSS",
    url: "https://www.theguardian.com/football/rss",
    parser: (xml) =>
      parseGenericRssFeed(xml, {
        sourceKey: "guardian-football",
        sourceName: "The Guardian Football",
        summary: "The Guardian football RSS에서 가져온 실시간 헤드라인입니다.",
      }),
  },
  {
    source: "Fabrizio Romano Google News",
    url: "https://news.google.com/rss/search?q=Fabrizio%20Romano%20transfer&hl=en-US&gl=US&ceid=US:en",
    parser: (xml) =>
      parseGenericRssFeed(xml, {
        sourceKey: "romano-monitor",
        sourceName: "Fabrizio Romano 검색 모니터",
        summary: "Fabrizio Romano 관련 Google News 검색 결과입니다.",
      }),
  },
  {
    source: "David Ornstein Google News",
    url: "https://news.google.com/rss/search?q=David%20Ornstein%20transfer&hl=en-US&gl=US&ceid=US:en",
    parser: (xml) =>
      parseGenericRssFeed(xml, {
        sourceKey: "ornstein-monitor",
        sourceName: "David Ornstein 검색 모니터",
        summary: "David Ornstein 관련 Google News 검색 결과입니다.",
      }),
  },
  {
    source: "The Athletic Google News",
    url: "https://news.google.com/rss/search?q=site%3Anytimes.com%2Fathletic%2Ffootball%20transfer&hl=en-US&gl=US&ceid=US:en",
    parser: (xml) =>
      parseGenericRssFeed(xml, {
        sourceKey: "athletic-monitor",
        sourceName: "The Athletic 검색 모니터",
        summary: "The Athletic 축구 이적 기사 Google News 검색 결과입니다.",
      }),
  },
  {
    source: "Gianluca Di Marzio Google News",
    url: "https://news.google.com/rss/search?q=Gianluca%20Di%20Marzio%20transfer&hl=en-US&gl=US&ceid=US:en",
    parser: (xml) =>
      parseGenericRssFeed(xml, {
        sourceKey: "dimarzio-monitor",
        sourceName: "Gianluca Di Marzio 검색 모니터",
        summary: "Gianluca Di Marzio 관련 Google News 검색 결과입니다.",
      }),
  },
  googleNewsTransferFeed(
    "Matteo Moretto Google News",
    "Matteo Moretto transfer",
    "matteo-moretto-monitor",
    "Matteo Moretto monitor"
  ),
  googleNewsTransferFeed(
    "Ben Jacobs Google News",
    "Ben Jacobs transfer",
    "ben-jacobs-monitor",
    "Ben Jacobs monitor"
  ),
  googleNewsTransferFeed(
    "Florian Plettenberg Google News",
    "Florian Plettenberg transfer",
    "plettenberg-monitor",
    "Florian Plettenberg monitor"
  ),
  googleNewsTransferFeed(
    "Kaveh Solhekol Google News",
    "Kaveh Solhekol transfer",
    "solhekol-monitor",
    "Kaveh Solhekol monitor"
  ),
  googleNewsTransferFeed(
    "Santi Aouna Google News",
    "Santi Aouna transfer",
    "santi-aouna-monitor",
    "Santi Aouna monitor"
  ),
  googleNewsTransferFeed(
    "Arsenal official-site monitor",
    "site:arsenal.com/news transfer",
    "official-arsenal-monitor",
    "Arsenal official-site monitor"
  ),
  googleNewsTransferFeed(
    "Barcelona official-site monitor",
    "site:fcbarcelona.com/en/news transfer OR site:fcbarcelona.com/en/club/news transfer",
    "official-barcelona-monitor",
    "Barcelona official-site monitor"
  ),
  googleNewsTransferFeed(
    "Real Madrid official-site monitor",
    "site:realmadrid.com transfer football",
    "official-real-madrid-monitor",
    "Real Madrid official-site monitor"
  ),
  googleNewsTransferFeed(
    "Bayern official-site monitor",
    "site:fcbayern.com transfer football",
    "official-bayern-monitor",
    "Bayern official-site monitor"
  ),
  googleNewsTransferFeed(
    "Manchester City official-site monitor",
    "site:mancity.com/news transfer",
    "official-man-city-monitor",
    "Manchester City official-site monitor"
  ),
  googleNewsTransferFeed(
    "Manchester United official-site monitor",
    "site:manutd.com/news transfer",
    "official-man-utd-monitor",
    "Manchester United official-site monitor"
  ),
  googleNewsTransferFeed(
    "Chelsea official-site monitor",
    "site:chelseafc.com/en/news/article transfer",
    "official-chelsea-monitor",
    "Chelsea official-site monitor"
  ),
  googleNewsTransferFeed(
    "Liverpool official-site monitor",
    "site:liverpoolfc.com/news transfer",
    "official-liverpool-monitor",
    "Liverpool official-site monitor"
  ),
];

function readJsonCache(filePath) {
  try {
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

function writeJsonCache(filePath, payload) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(payload, null, 2), "utf8");
  fs.renameSync(temporaryPath, filePath);
}

const savedLivePayload = readJsonCache(LIVE_CACHE_FILE);
const savedDraftPayload = readJsonCache(DRAFT_CACHE_FILE);
const savedPromotedPayload = readJsonCache(PROMOTED_CACHE_FILE);

let liveCache = {
  fetchedAt: savedLivePayload?.fetchedAt
    ? new Date(savedLivePayload.fetchedAt).getTime()
    : 0,
  payload: savedLivePayload,
};
let draftCache = savedDraftPayload;
let promotedCache = savedPromotedPayload;
let refreshInFlight = null;
let lastRefreshError = null;

function decodeHtmlEntities(text = "") {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#163;|&#x0*a3;/gi, "£")
    .replace(/&#8364;|&#x0*20ac;/gi, "€")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(html = "") {
  return decodeHtmlEntities(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeHtmlEntities(match[1].trim()) : "";
}

function isTransferHeadline(text = "") {
  const lower = text.toLowerCase();
  return TRANSFER_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function detectHeadlineStatus(title = "") {
  const lower = title.toLowerCase();

  if (OFFICIAL_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return "완료";
  }

  if (RUMOR_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return "루머";
  }

  return "업데이트";
}

function toIsoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function compareByDateDesc(a, b) {
  const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
  const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
  return bTime - aTime;
}

function normalizeWhitespace(text = "") {
  return decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
}

function formatStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function extractFeeFromText(text = "") {
  const match = normalizeWhitespace(text).match(/([£€])\s?(\d+(?:\.\d+)?)\s?([mb])/i);
  return match ? `${match[1]}${match[2]}${match[3].toUpperCase()}` : "미정";
}

function normalizeTeamName(team = "") {
  const cleaned = normalizeWhitespace(team)
    .replace(/^the\s+/i, "")
    .replace(/[.,;:]+$/g, "");
  return TEAM_ALIASES[cleaned] || cleaned || "미상";
}

function normalizePlayerName(player = "") {
  const cleaned = normalizeWhitespace(player)
    .replace(/^.*\b(?:youth|prospect|winner|striker|forward|midfielder|defender|goalkeeper|keeper|winger)\s+/i, "")
    .replace(/[.,;:]+$/g, "");
  return cleaned || "미상 선수";
}

function inferLeague(team = "") {
  return TEAM_LEAGUES[team] || "미분류";
}

function shouldSkipDraftTitle(title = "") {
  return GENERIC_DRAFT_SKIP_PATTERNS.some((pattern) => pattern.test(title));
}

function getSourceTier(sourceKey = "") {
  return SOURCE_TIERS[sourceKey] || "low";
}

function makeDraft(item, extracted) {
  const player = normalizePlayerName(extracted.player);
  const toTeam = normalizeTeamName(extracted.toTeam);
  const fromTeam = normalizeTeamName(extracted.fromTeam || "미상");

  if (!player || / and /i.test(player) || shouldSkipDraftTitle(player)) {
    return null;
  }

  return {
    id: `draft:${item.id}`,
    player,
    fromTeam,
    toTeam,
    league: inferLeague(toTeam),
    status: extracted.status || item.status || "업데이트",
    fee: extracted.fee || extractFeeFromText(`${item.title} ${item.summary}`),
    sourceKey: item.sourceKey,
    sourceTier: getSourceTier(item.sourceKey),
    sourceName: item.sourceName,
    sourceUrl: item.url,
    sourceType: "자동 추출 초안",
    sourceReason:
      extracted.note ||
      "실시간 헤드라인 제목 패턴에서 자동 추출한 초안입니다. 원문 확인 후 확정 반영하는 것을 권장합니다.",
    publishedAt: item.publishedAt ? formatStamp(new Date(item.publishedAt)) : "시간 미상",
    lastVerifiedAt: formatStamp(),
    extractionConfidence: extracted.extractionConfidence || "medium",
    extractionPattern: extracted.extractionPattern || "generic",
    headlineTitle: item.title,
  };
}

function extractAutoDraft(item) {
  const title = normalizeWhitespace(item.title);

  if (!title || shouldSkipDraftTitle(title)) {
    return null;
  }

  const xStyleTitle = title.replace(/^[🚨⚡️🟢🔴🟡\s]+/, "");
  let match = xStyleTitle.match(
    /^(?:here we go[!,:]?\s*)?(?<player>.+?)\s+to\s+(?<to>.+?)(?:,\s*(?:here we go|deal agreed|agreement reached|medical|all documents signed).*)?[.!]?$/i
  );

  if (match?.groups && item.sourceKey === "x-direct-monitor") {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: "미상",
      toTeam: match.groups.to,
      status: "루머",
      extractionConfidence: "medium",
      extractionPattern: "x-reporter-player-to-club",
      note: "X 등록 기자의 직접 게시물에서 자동 추출한 카드입니다. 구단 공식 발표 전에는 확정으로 보지 않습니다.",
    });
  }

  match =
    title.match(
      /^(?<to>.+?) transfer news: (?<player>.+?) completes move .*? from (?<from>.+)$/i
    ) ||
    title.match(
      /^(?<to>.+?) transfer news: (?<player>.+?) agrees deal .*? from (?<from>.+)$/i
    );

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: match.groups.from,
      toTeam: match.groups.to,
      status: "완료",
      extractionConfidence: "high",
      extractionPattern: "team-transfer-news-complete",
    });
  }

  match = title.match(
    new RegExp(
      `^(?<to>.+?) transfer news: .*? over (?<from>.+?) ${POSITION_PATTERN} (?<player>.+?)(?: - .*|$)`,
      "i"
    )
  );

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: match.groups.from,
      toTeam: match.groups.to,
      status: "루머",
      extractionConfidence: "medium",
      extractionPattern: "team-transfer-news-target",
    });
  }

  // Common transfer headlines: "Newcastle in talks to sign Player from Club".
  match = title.match(
    /^(?<to>.+?)(?: in talks)? to sign (?<player>.+?) from (?<from>.+?)(?:\s+-\s+.*)?$/i
  );

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: match.groups.from,
      toTeam: match.groups.to,
      status: "루머",
      extractionConfidence: "medium",
      extractionPattern: "club-talks-to-sign-player",
    });
  }

  // A player-specific update can still identify both sides when the headline
  // says which club is negotiating with the player's current club.
  match = title.match(
    /^(?<player>.+?) transfer:\s*(?<from>.+?) in talks with (?:the )?(?:Saudi club )?(?<to>.+?) over /i
  );

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: match.groups.from,
      toTeam: match.groups.to,
      status: "루머",
      extractionConfidence: "medium",
      extractionPattern: "player-transfer-talks",
    });
  }

  // "Club agree deal for Former Club's Player".
  match = title.match(
    /^(?<to>.+?) agree(?:s)?(?: a| an)? deal for (?<from>.+?)'?s (?<player>.+?)(?:\s+-\s+.*)?$/i
  );

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: match.groups.from,
      toTeam: match.groups.to,
      status: "완료",
      extractionConfidence: "medium",
      extractionPattern: "club-agrees-deal-for-player",
    });
  }

  match = title.match(
    /^(?<player>.+?): (?<to>.+?) sign .*? from (?<from>.+?)(?: on .*| worth .*|$)/i
  );

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: match.groups.from,
      toTeam: match.groups.to,
      status: "완료",
      extractionConfidence: "high",
      extractionPattern: "player-club-signs-from",
    });
  }

  match = title.match(/^(?<player>.+?)(?:,\s*\d+)?[,]?\s+seals(?: a)? move to (?<to>.+)$/i);

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: "미상",
      toTeam: match.groups.to,
      status: "완료",
      extractionConfidence: "medium",
      extractionPattern: "player-seals-move",
    });
  }

  match = title.match(/^(?<player>.+?) on brink of (?<to>.+?) move$/i);

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: "미상",
      toTeam: match.groups.to,
      status: "루머",
      extractionConfidence: "medium",
      extractionPattern: "player-on-brink-of-move",
    });
  }

  // "Club sign Player from Former Club" and its short-form variants.
  match = title.match(
    /^(?<to>.+?) sign(?:s|ed)? .*?(?<player>[A-Z][\p{L}'’.-]+(?:\s+[A-Z][\p{L}'’.-]+)?) from (?<from>.+?)(?:\s+-\s+.*)?$/iu
  );

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: match.groups.from,
      toTeam: match.groups.to,
      status: "완료",
      extractionConfidence: "high",
      extractionPattern: "club-signs-player-from",
    });
  }

  match = title.match(
    /^(?<to>.+?) sign(?:s|ed)? .*?(?<player>[A-Z][\p{L}'’.-]+(?:\s+[A-Z][\p{L}'’.-]+)?)\s+(?:on loan|for record\b.*)$/iu
  );

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: "미상",
      toTeam: match.groups.to,
      status: "완료",
      extractionConfidence: "medium",
      extractionPattern: "club-signs-player",
    });
  }

  match = title.match(
    /^(?<to>.+?) sign(?:s|ed)? .*?prospect (?<player>.+?)(?:\s+-\s+.*)?$/i
  );

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: "미상",
      toTeam: match.groups.to,
      status: "완료",
      extractionConfidence: "medium",
      extractionPattern: "club-signs-prospect",
    });
  }

  match = title.match(
    /^(?<to>.+?) steal (?<player>.+?) away from (?<from>.+?)(?:\s+and\s+.*)?$/i
  );

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: match.groups.from,
      toTeam: match.groups.to,
      status: "루머",
      extractionConfidence: "medium",
      extractionPattern: "club-steals-player",
    });
  }

  match = title.match(
    /^(?:Source:\s*)?(?:[^:]+?'s )?(?<player>.+?) set to rejoin (?<to>.+)$/i
  );

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: "미상",
      toTeam: match.groups.to,
      status: "루머",
      extractionConfidence: "low",
      extractionPattern: "player-set-to-rejoin-club",
    });
  }

  match = title.match(/^(?<to>.+?) agree(?:s)?(?: .*?)? deal for (?<from>.+?)'?s (?<player>.+)$/i);

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: match.groups.from,
      toTeam: match.groups.to,
      status: "완료",
      extractionConfidence: "medium",
      extractionPattern: "club-agree-deal-for-player",
    });
  }

  match = title.match(
    /^(?<player>.+?): (?<to>.+?) agree deal with (?<from>.+?) to sign .*?(?: after|$)/i
  );

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: match.groups.from,
      toTeam: match.groups.to,
      status: "완료",
      extractionConfidence: "high",
      extractionPattern: "player-colon-agree-deal",
    });
  }

  match = title.match(
    /^(?:Sources:\s*)?(?<to>.+?), (?<from>.+?) agree [€£]?\d+(?:\.\d+)?[mb]?\s*(?:deal )?(?<player>.+?)(?: deal|$)/i
  );

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: match.groups.from,
      toTeam: match.groups.to,
      status: "완료",
      extractionConfidence: "medium",
      extractionPattern: "sources-clubs-agree-player-deal",
    });
  }

  match = title.match(/^(?<to>.+?) want (?<from>.+?)'?s (?<player>.+?)(?: on .*| - .*|$)/i);

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: match.groups.from,
      toTeam: match.groups.to,
      status: "루머",
      extractionConfidence: "low",
      extractionPattern: "club-want-player",
    });
  }

  // ESPN-style headlines such as "Barcelona eye Arsenal striker Viktor Gyökeres"
  // contain a position between the club and player. Handle this before the
  // generic pattern so the outlet suffix ("- ESPN") cannot become the player.
  match = title.match(
    /^(?:transfer rumors?, news:\s*)?(?<to>.+?) eye (?<from>.+?)\s+(?:striker|forward|midfielder|defender|goalkeeper|keeper|winger|centre-back|center-back|full-back|left-back|right-back)\s+(?<player>.+?)\s+-\s+[^-]+$/i
  );

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: match.groups.from,
      toTeam: match.groups.to,
      status: "루머",
      extractionConfidence: "medium",
      extractionPattern: "club-eye-positioned-player",
    });
  }

  match = title.match(
    /^(?:transfer rumors?, news:\s*)?(?<to>.+?) eye (?<from>.+?)'?s (?<player>.+?)(?: to | - |$)/i
  );

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: match.groups.from,
      toTeam: match.groups.to,
      status: "루머",
      extractionConfidence: "low",
      extractionPattern: "club-eye-player",
    });
  }

  match = title.match(
    /^(?:transfer rumors?, news:\s*)?(?<to>.+?) eye .*?move for (?<player>.+?)(?:\s+-\s+.*)?$/i
  );

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: "미상",
      toTeam: match.groups.to,
      status: "루머",
      extractionConfidence: "low",
      extractionPattern: "club-eye-move-for-player",
    });
  }

  match = title.match(/^(?<to>.+?) target (?<from>.+?)'?s (?<player>.+?)(?:\s+-\s+.*|$)/i);

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: match.groups.from,
      toTeam: match.groups.to,
      status: "루머",
      extractionConfidence: "low",
      extractionPattern: "club-targets-player",
    });
  }

  return null;
}

function dedupeDrafts(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = `${item.player}|${item.toTeam}|${item.sourceUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getTierRank(tier = "low") {
  if (tier === "high") return 3;
  if (tier === "medium") return 2;
  return 1;
}

function getConfidenceRank(level = "low") {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

function getStatusRank(status = "") {
  if (status === "완료") return 3;
  if (status === "루머") return 2;
  return 1;
}

function compareDraftPriority(a, b) {
  const scoreDiff =
    getStatusRank(b.status) - getStatusRank(a.status) ||
    getTierRank(b.sourceTier) - getTierRank(a.sourceTier) ||
    getConfidenceRank(b.extractionConfidence) - getConfidenceRank(a.extractionConfidence);

  if (scoreDiff !== 0) return scoreDiff;

  return compareByDateDesc(a, b);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(`${url} -> HTTP ${response.status}`);
  }

  return response.text();
}

const X_MONITORED_HANDLES = (process.env.X_MONITORED_HANDLES ||
  "FabrizioRomano,David_Ornstein,Plettigoal,MatteoMoretto,Santi_J_FM")
  .split(",")
  .map((handle) => handle.trim().replace(/^@/, ""))
  .filter(Boolean);

const X_TRANSFER_QUERY =
  process.env.X_TRANSFER_QUERY ||
  `(${X_MONITORED_HANDLES.map((handle) => `from:${handle}`).join(" OR ")}) (transfer OR "here we go" OR agreed OR agreement OR medical OR signed OR signing) -is:retweet`;

async function fetchXRecentPosts() {
  // GitHub Secret에 토큰만 넣거나 `Bearer ...` 전체를 넣은 경우 모두 지원합니다.
  const token = (process.env.X_BEARER_TOKEN || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) {
    return {
      items: [],
      health: {
        source: "X API direct monitor",
        ok: false,
        disabled: true,
        error: "X_BEARER_TOKEN is not configured",
      },
    };
  }

  const params = new URLSearchParams({
    query: X_TRANSFER_QUERY,
    max_results: "100",
    "tweet.fields": "created_at,entities,lang,author_id",
    expansions: "author_id",
    "user.fields": "name,username",
  });
  const response = await fetch(`https://api.x.com/2/tweets/search/recent?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "user-agent": "yoochan-transfer-market/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`X API recent search -> HTTP ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  const users = new Map((payload.includes?.users || []).map((user) => [user.id, user]));
  const items = (payload.data || [])
    .map((post) => {
      const user = users.get(post.author_id);
      const username = user?.username || "unknown";
      const text = normalizeWhitespace(post.text || "");

      return {
        id: `x:${post.id}`,
        title: text,
        url: `https://x.com/${username}/status/${post.id}`,
        publishedAt: post.created_at || null,
        summary: `X @${username} 직접 게시물`,
        sourceKey: "x-direct-monitor",
        sourceName: `X @${username}`,
        status: detectHeadlineStatus(text),
      };
    })
    .filter((item) => item.url && isTransferHeadline(`${item.title} ${item.summary}`));

  return {
    items,
    health: {
      source: "X API direct monitor",
      ok: true,
      count: items.length,
      query: X_TRANSFER_QUERY,
    },
  };
}

function parseBbcFeed(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);

  return items
    .map((block) => {
      const title = extractTag(block, "title");
      const summary = stripHtml(extractTag(block, "description"));

      return {
        id: extractTag(block, "guid") || extractTag(block, "link"),
        title,
        url: extractTag(block, "link"),
        publishedAt: toIsoDate(extractTag(block, "pubDate")),
        summary,
        sourceKey: "bbc-sport",
        sourceName: "BBC Sport",
        status: detectHeadlineStatus(title),
      };
    })
    .filter((item) => item.url && isTransferHeadline(`${item.title} ${item.summary}`));
}

function parseGenericRssFeed(xml, config) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);

  return items
    .map((block) => {
      const title = stripHtml(extractTag(block, "title"));
      const summary = stripHtml(extractTag(block, "description")) || config.summary;
      const rawLink = extractTag(block, "link");

      return {
        id: extractTag(block, "guid") || rawLink || title,
        title,
        url: rawLink,
        publishedAt: toIsoDate(extractTag(block, "pubDate")),
        summary,
        sourceKey: config.sourceKey,
        sourceName: config.sourceName,
        status: detectHeadlineStatus(title),
      };
    })
    .filter((item) => item.url && isTransferHeadline(`${item.title} ${item.summary}`));
}

function parseSkySitemap(xml) {
  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map((match) => match[1]);

  return blocks
    .map((block) => {
      const title = extractTag(block, "news:title");
      const url = extractTag(block, "loc");

      return {
        id: url,
        title,
        url,
        publishedAt: toIsoDate(extractTag(block, "news:publication_date")),
        summary: "Sky Sports football sitemap에서 가져온 실시간 헤드라인입니다.",
        sourceKey: "sky-sports",
        sourceName: "Sky Sports",
        status: detectHeadlineStatus(title),
      };
    })
    .filter((item) => item.url && isTransferHeadline(item.title));
}

function parseEspnSoccerPage(html) {
  const blocks = [
    ...html.matchAll(
      /<!--get:\s+espn-en_story_soccer_[^_]+_(?<publishedAt>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)[\s\S]*?<div data-id="(?<id>\d+)" class="news-feed-item[\s\S]*?<a[^>]+href="(?<href>[^"]+)"[\s\S]*?<a[^>]+class="realStory"[^>]*>(?<title>[\s\S]*?)<\/a>/gi
    ),
  ];

  return blocks
    .map((match) => ({
      id: match.groups.id,
      title: stripHtml(match.groups.title),
      url: match.groups.href.startsWith("http")
        ? match.groups.href
        : `https://www.espn.com${decodeHtmlEntities(match.groups.href)}`,
      publishedAt: toIsoDate(match.groups.publishedAt),
      summary: "ESPN FC soccer 최신 피드에서 가져온 실시간 헤드라인입니다.",
      sourceKey: "espn-fc",
      sourceName: "ESPN FC",
      status: detectHeadlineStatus(stripHtml(match.groups.title)),
    }))
    .filter((item) => item.url && isTransferHeadline(item.title));
}

function dedupeItems(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = item.url || item.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function buildLivePayload() {
  const items = [];
  const sourceHealth = [];
  const settled = await Promise.allSettled(
    LIVE_FEED_SOURCES.map(async (feedSource) => {
      const text = await fetchText(feedSource.url);
      return {
        source: feedSource.source,
        items: feedSource.parser(text),
      };
    })
  );

  settled.forEach((result, index) => {
    const feedSource = LIVE_FEED_SOURCES[index];

    if (result.status === "fulfilled") {
      items.push(...result.value.items);
      sourceHealth.push({
        source: result.value.source,
        ok: true,
        count: result.value.items.length,
      });
      return;
    }

    sourceHealth.push({
      source: feedSource.source,
      ok: false,
      error: String(result.reason),
    });
  });

  try {
    const xResult = await fetchXRecentPosts();
    items.push(...xResult.items);
    sourceHealth.push(xResult.health);
  } catch (error) {
    sourceHealth.push({
      source: "X API direct monitor",
      ok: false,
      error: String(error),
    });
  }

  const normalized = dedupeItems(items).sort(compareByDateDesc).slice(0, 40);

  return {
    fetchedAt: new Date().toISOString(),
    itemCount: normalized.length,
    items: normalized,
    sourceHealth,
  };
}

function buildDraftPayload(livePayload) {
  const drafts = dedupeDrafts(livePayload.items.map(extractAutoDraft).filter(Boolean))
    .sort(compareDraftPriority)
    .slice(0, 30);

  return {
    generatedAt: new Date().toISOString(),
    basedOnFetchedAt: livePayload.fetchedAt,
    itemCount: drafts.length,
    drafts,
  };
}

function buildPromotedPayload(draftPayload) {
  const promoted = draftPayload.drafts
    .filter((item) => ["high", "medium"].includes(item.sourceTier))
    .filter((item) => ["high", "medium"].includes(item.extractionConfidence))
    .sort(compareDraftPriority)
    .slice(0, 30);

  return {
    generatedAt: new Date().toISOString(),
    basedOnGeneratedAt: draftPayload.generatedAt,
    itemCount: promoted.length,
    items: promoted,
    rules: {
      minSourceTier: "medium",
      minExtractionConfidence: "medium",
      priority: ["완료", "루머", "기타"],
    },
  };
}

async function refreshAllData(reason = "background") {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const livePayload = await buildLivePayload();
    liveCache = {
      fetchedAt: new Date(livePayload.fetchedAt).getTime(),
      payload: livePayload,
    };
    writeJsonCache(LIVE_CACHE_FILE, livePayload);

    const draftPayload = buildDraftPayload(livePayload);
    draftCache = draftPayload;
    writeJsonCache(DRAFT_CACHE_FILE, draftPayload);

    const promotedPayload = buildPromotedPayload(draftPayload);
    promotedCache = promotedPayload;
    writeJsonCache(PROMOTED_CACHE_FILE, promotedPayload);

    lastRefreshError = null;
    console.log(
      `[${new Date().toISOString()}] ${reason} refresh complete: ${
        livePayload.itemCount
      } headlines, ${draftPayload.itemCount} drafts, ${promotedPayload.itemCount} promoted`
    );

    return livePayload;
  })()
    .catch((error) => {
      lastRefreshError = String(error);
      console.error(`[${new Date().toISOString()}] ${reason} refresh failed`, error);
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

async function getLivePayload(force = false) {
  const now = Date.now();
  const isFresh = liveCache.payload && now - liveCache.fetchedAt < CACHE_TTL_MS;

  if (!force && isFresh) return liveCache.payload;

  try {
    return await refreshAllData(force ? "manual" : "request");
  } catch (error) {
    if (liveCache.payload) return liveCache.payload;
    throw error;
  }
}

async function getDraftPayload(force = false) {
  await getLivePayload(force);
  if (!force && draftCache) return draftCache;
  const payload = buildDraftPayload(liveCache.payload);
  draftCache = payload;
  writeJsonCache(DRAFT_CACHE_FILE, payload);
  return payload;
}

async function getPromotedPayload(force = false) {
  await getDraftPayload(force);
  if (!force && promotedCache) return promotedCache;
  const payload = buildPromotedPayload(draftCache);
  promotedCache = payload;
  writeJsonCache(PROMOTED_CACHE_FILE, payload);
  return payload;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function serveFile(res, targetPath) {
  fs.readFile(targetPath, (error, data) => {
    if (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      res.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    const ext = path.extname(targetPath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=300",
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (requestUrl.pathname === "/api/live-headlines") {
    try {
      const payload = await getLivePayload(requestUrl.searchParams.has("t"));
      sendJson(res, 200, payload);
    } catch (error) {
      sendJson(res, 500, {
        error: "live_feed_failed",
        message: String(error),
      });
    }
    return;
  }

  if (requestUrl.pathname === "/api/auto-drafts") {
    try {
      const payload = await getDraftPayload(requestUrl.searchParams.has("t"));
      sendJson(res, 200, payload);
    } catch (error) {
      sendJson(res, 500, {
        error: "auto_draft_failed",
        message: String(error),
      });
    }
    return;
  }

  if (requestUrl.pathname === "/api/promoted-candidates") {
    try {
      const payload = await getPromotedPayload(requestUrl.searchParams.has("t"));
      sendJson(res, 200, payload);
    } catch (error) {
      sendJson(res, 500, {
        error: "promoted_candidates_failed",
        message: String(error),
      });
    }
    return;
  }

  if (requestUrl.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      now: new Date().toISOString(),
      backgroundRefresh: {
        intervalMs: BACKGROUND_REFRESH_MS,
        lastFetchedAt: liveCache.payload?.fetchedAt || null,
        lastRefreshError,
        cacheFiles: ["cache/live-headlines.json", "cache/auto-drafts.json", "cache/promoted-candidates.json"],
      },
    });
    return;
  }

  const relativePath =
    requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.replace(/^\/+/, "");
  const targetPath = path.normalize(path.join(BASE_DIR, relativePath));

  if (!targetPath.startsWith(BASE_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  serveFile(res, targetPath);
});

function startServer() {
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Transfer app server running at http://127.0.0.1:${PORT}`);
    console.log(
      `Background collection enabled: every ${Math.round(BACKGROUND_REFRESH_MS / 1000)} seconds`
    );
    refreshAllData("startup").catch(() => {});
    setInterval(() => refreshAllData("scheduled").catch(() => {}), BACKGROUND_REFRESH_MS);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  buildLivePayload,
  buildDraftPayload,
  buildPromotedPayload,
  refreshAllData,
  startServer,
};

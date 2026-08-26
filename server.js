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
const DRAFT_ARCHIVE_LIMIT = 200;
const LIVE_HEADLINE_LIMIT = 120;
const PINNED_HEADLINE_LIMITS = {
  "official-tottenham-monitor": 12,
};

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
  "Man United": "Manchester United",
  "Man City": "Manchester City",
  Palace: "Crystal Palace",
  Barça: "Barcelona",
  Barca: "Barcelona",
  Philly: "Philadelphia Union",
  SKC: "Sporting Kansas City",
  "Al-Hilal": "Al Hilal",
  "Brighton & Hove Albion": "Brighton",
  "Bayern Munich": "바이에른 뮌헨",
  Atletico: "Atletico Madrid",
  Atleti: "Atletico Madrid",
};

const PLAYER_ALIASES = {
  Gozo: "Zavier Gozo",
  David: "Promise David",
  Kane: "Harry Kane",
  Parrott: "Troy Parrott",
};

const PLAYER_CURRENT_TEAMS = {
  "Harry Kane": "Bayern Munich",
  "Zavier Gozo": "Real Salt Lake",
  "Promise David": "Royale Union Saint-Gilloise",
  "Troy Parrott": "AZ Alkmaar",
};

const SOURCE_TIERS = {
  "official-club": "high",
  "official-league": "high",
  "fabrizio-romano": "high",
  "david-ornstein": "high",
  "x-direct-monitor": "high",
  "bluesky-fabrizio": "medium",
  "bluesky-ornstein": "medium",
  "bluesky-jay-harris": "medium",
  "instagram-indirect-monitor": "low",
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
  "tom-barclay-monitor": "medium",
  "sami-mokbel-monitor": "medium",
  "mike-mcgrath-monitor": "medium",
  "james-pearce-monitor": "medium",
  "laurie-whitwell-monitor": "medium",
  "simon-stone-monitor": "medium",
  "rob-dawson-monitor": "medium",
  "mark-ogden-monitor": "medium",
  "david-hytner-monitor": "medium",
  "paul-joyce-monitor": "medium",
  "fabrice-hawkins-monitor": "medium",
  "miguel-delaney-monitor": "medium",
  "melissa-reddy-monitor": "medium",
  "michael-bridge-monitor": "medium",
  "charlie-eccleshare-monitor": "medium",
  "jack-pitt-brooke-monitor": "medium",
  "james-maw-monitor": "medium",
  "official-arsenal-monitor": "high",
  "official-barcelona-monitor": "high",
  "official-real-madrid-monitor": "high",
  "official-bayern-monitor": "high",
  "official-man-city-monitor": "high",
  "official-man-utd-monitor": "high",
  "official-chelsea-monitor": "high",
  "official-liverpool-monitor": "high",
  "official-tottenham-monitor": "high",
  "tottenham-reporters-monitor": "medium",
  "tottenham-football-london-monitor": "medium",
  "tottenham-standard-monitor": "medium",
  "tottenham-athletic-monitor": "medium",
  "tottenham-sky-monitor": "medium",
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
    "Tom Barclay Google News",
    '"Tom Barclay" (transfer OR signing OR agreed OR deal)',
    "tom-barclay-monitor",
    "Tom Barclay monitor"
  ),
  googleNewsTransferFeed(
    "Sami Mokbel Google News",
    '"Sami Mokbel" (transfer OR signing OR agreed OR deal)',
    "sami-mokbel-monitor",
    "Sami Mokbel monitor"
  ),
  googleNewsTransferFeed(
    "Mike McGrath Google News",
    '"Mike McGrath" football (transfer OR signing OR agreed OR deal)',
    "mike-mcgrath-monitor",
    "Mike McGrath monitor"
  ),
  googleNewsTransferFeed(
    "James Pearce Google News",
    '"James Pearce" Liverpool (transfer OR signing OR agreed OR deal)',
    "james-pearce-monitor",
    "James Pearce monitor"
  ),
  googleNewsTransferFeed(
    "Laurie Whitwell Google News",
    '"Laurie Whitwell" (Manchester United OR transfer OR signing OR deal)',
    "laurie-whitwell-monitor",
    "Laurie Whitwell monitor"
  ),
  googleNewsTransferFeed(
    "Simon Stone Google News",
    '"Simon Stone" football (transfer OR signing OR agreed OR deal)',
    "simon-stone-monitor",
    "Simon Stone monitor"
  ),
  googleNewsTransferFeed(
    "Rob Dawson Google News",
    '"Rob Dawson" football (transfer OR signing OR agreed OR deal)',
    "rob-dawson-monitor",
    "Rob Dawson monitor"
  ),
  googleNewsTransferFeed(
    "Mark Ogden Google News",
    '"Mark Ogden" football (transfer OR signing OR agreed OR deal)',
    "mark-ogden-monitor",
    "Mark Ogden monitor"
  ),
  googleNewsTransferFeed(
    "David Hytner Google News",
    '"David Hytner" football (transfer OR signing OR agreed OR deal)',
    "david-hytner-monitor",
    "David Hytner monitor"
  ),
  googleNewsTransferFeed(
    "Paul Joyce Google News",
    '"Paul Joyce" Liverpool (transfer OR signing OR agreed OR deal)',
    "paul-joyce-monitor",
    "Paul Joyce monitor"
  ),
  googleNewsTransferFeed(
    "Fabrice Hawkins Google News",
    '"Fabrice Hawkins" (transfer OR signing OR agreed OR deal)',
    "fabrice-hawkins-monitor",
    "Fabrice Hawkins monitor"
  ),
  googleNewsTransferFeed(
    "Miguel Delaney Google News",
    '"Miguel Delaney" football (transfer OR signing OR agreed OR deal)',
    "miguel-delaney-monitor",
    "Miguel Delaney monitor"
  ),
  googleNewsTransferFeed(
    "Melissa Reddy Google News",
    '"Melissa Reddy" football (transfer OR signing OR agreed OR deal)',
    "melissa-reddy-monitor",
    "Melissa Reddy monitor"
  ),
  // Instagram has no unrestricted public feed API for arbitrary reporters.
  // These Google News queries catch public Instagram posts that search engines index.
  googleNewsTransferFeed(
    "Fabrizio Romano Instagram mentions",
    "site:instagram.com/fabriziorom (transfer OR \"here we go\")",
    "instagram-indirect-monitor",
    "Instagram 간접 검색 모니터"
  ),
  googleNewsTransferFeed(
    "Florian Plettenberg Instagram mentions",
    "site:instagram.com/plettigoal transfer",
    "instagram-indirect-monitor",
    "Instagram 간접 검색 모니터"
  ),
  googleNewsTransferFeed(
    "David Ornstein Instagram mentions",
    "site:instagram.com \"David Ornstein\" transfer",
    "instagram-indirect-monitor",
    "Instagram 간접 검색 모니터"
  ),
  googleNewsTransferFeed(
    "Matteo Moretto Instagram mentions",
    "site:instagram.com \"Matteo Moretto\" transfer",
    "instagram-indirect-monitor",
    "Instagram 간접 검색 모니터"
  ),
  googleNewsTransferFeed(
    "Santi Aouna Instagram mentions",
    "site:instagram.com \"Santi Aouna\" transfer",
    "instagram-indirect-monitor",
    "Instagram 간접 검색 모니터"
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
  googleNewsTransferFeed(
    "Tottenham official-site monitor",
    "site:tottenhamhotspur.com/news (transfer OR signing OR deal OR contract)",
    "official-tottenham-monitor",
    "Tottenham official-site monitor"
  ),
  googleNewsTransferFeed(
    "Tottenham reporters Google News",
    '("Alasdair Gold" OR "Dan Kilpatrick" OR "Rob Guest" OR "Jay Harris" OR "Elias Burke") (Tottenham OR Spurs) (transfer OR signing OR deal OR agreed)',
    "tottenham-reporters-monitor",
    "Tottenham reporters monitor"
  ),
  googleNewsTransferFeed(
    "Michael Bridge Tottenham monitor",
    '"Michael Bridge" Tottenham (transfer OR signing OR agreed OR deal)',
    "michael-bridge-monitor",
    "Michael Bridge monitor"
  ),
  googleNewsTransferFeed(
    "Charlie Eccleshare Tottenham monitor",
    '"Charlie Eccleshare" Tottenham (transfer OR signing OR agreed OR deal)',
    "charlie-eccleshare-monitor",
    "Charlie Eccleshare monitor"
  ),
  googleNewsTransferFeed(
    "Jack Pitt-Brooke Tottenham monitor",
    '"Jack Pitt-Brooke" Tottenham (transfer OR signing OR agreed OR deal)',
    "jack-pitt-brooke-monitor",
    "Jack Pitt-Brooke monitor"
  ),
  googleNewsTransferFeed(
    "James Maw Tottenham monitor",
    '"James Maw" Tottenham (transfer OR signing OR agreed OR deal)',
    "james-maw-monitor",
    "James Maw monitor"
  ),
  googleNewsTransferFeed(
    "Football.London Tottenham monitor",
    "site:football.london/tottenham-hotspur-fc (transfer OR signing OR deal OR contract)",
    "tottenham-football-london-monitor",
    "Football.London Tottenham monitor"
  ),
  googleNewsTransferFeed(
    "The Standard Tottenham monitor",
    "site:standard.co.uk/sport/football/tottenham (transfer OR signing OR deal)",
    "tottenham-standard-monitor",
    "The Standard Tottenham monitor"
  ),
  googleNewsTransferFeed(
    "The Athletic Tottenham monitor",
    "site:nytimes.com/athletic/football (Tottenham OR Spurs) (transfer OR signing OR deal)",
    "tottenham-athletic-monitor",
    "The Athletic Tottenham monitor"
  ),
  googleNewsTransferFeed(
    "Sky Sports Tottenham monitor",
    "site:skysports.com/football/news Tottenham (transfer OR signing OR deal)",
    "tottenham-sky-monitor",
    "Sky Sports Tottenham monitor"
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
    .replace(/\s+-\s+(?:sources?|ESPN|The Athletic|DailySports|Goal(?:\.com)?|Sky Sports|BBC Sport|The New York Times).*$/i, "")
    .replace(/[.,;:]+$/g, "");
  return cleaned || "미상 선수";
}

function resolvePlayerName(item, player) {
  const normalized = normalizePlayerName(player);
  if (!normalized || normalized.split(/\s+/).length > 1) return normalized;
  if (PLAYER_ALIASES[normalized]) return PLAYER_ALIASES[normalized];

  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const candidatePattern = new RegExp(
    `\\b([\\p{Lu}][\\p{L}'’.-]+(?:\\s+[\\p{Lu}][\\p{L}'’.-]+){0,2}\\s+${escaped})\\b`,
    "u"
  );
  const context = `${item.summary || ""} ${item.title || ""}`;
  const match = context.match(candidatePattern);
  return match?.[1] || normalized;
}

function isUnknownTeamName(team = "") {
  return ["", "미상", "미정", "소속팀 확인 중", "unknown", "tbc", "tbd"].includes(
    normalizeWhitespace(team).toLowerCase()
  );
}

function inferLeague(team = "") {
  return TEAM_LEAGUES[team] || "미분류";
}

function shouldSkipDraftTitle(title = "") {
  return (
    GENERIC_DRAFT_SKIP_PATTERNS.some((pattern) => pattern.test(title)) ||
    /^Amorim[\u2019']s Milan live up to billing/i.test(title) ||
    /contract interview|transfer grades|podcast:|live stream online|presidency bid|chief .* rules out/i.test(title)
  );
}

function getSourceTier(sourceKey = "") {
  return SOURCE_TIERS[sourceKey] || "low";
}

function makeDraft(item, extracted) {
  const player = resolvePlayerName(item, extracted.player);
  const toTeam = normalizeTeamName(extracted.toTeam);
  const extractedFromTeam = normalizeTeamName(extracted.fromTeam || "미상");
  const fromTeam =
    extractedFromTeam === "미상"
      ? normalizeTeamName(PLAYER_CURRENT_TEAMS[player] || "소속팀 확인 중")
      : extractedFromTeam;
  const unresolvedTeamNote =
    isUnknownTeamName(fromTeam) || isUnknownTeamName(toTeam)
      ? " 일부 구단 정보는 원문 확인 전까지 확인 필요로 표시합니다."
      : "";

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
    sourceReason: `${
      extracted.note ||
      "실시간 헤드라인 제목 패턴에서 자동 추출한 초안입니다. 원문 확인 후 확정 반영하는 것을 권장합니다."
    }${unresolvedTeamNote}`,
    publishedAt: item.publishedAt ? formatStamp(new Date(item.publishedAt)) : "시간 미상",
    lastVerifiedAt: formatStamp(),
    extractionConfidence: extracted.extractionConfidence || "medium",
    extractionPattern: extracted.extractionPattern || "generic",
    needsVerification: Boolean(extracted.needsVerification),
    headlineTitle: item.title,
  };
}

function isFallbackCardCandidate(title = "") {
  const normalized = normalizeWhitespace(title);
  if (!isTransferHeadline(normalized)) return false;
  return !/(?:transfer show|live updates|rumours and gossip|rumors and gossip|goals and highlights|paper talk|transfer news live|scottish premiership news)/i.test(
    normalized
  );
}

function extractFallbackPlayer(title = "") {
  const normalized = normalizeWhitespace(title);
  const possessiveMatch = normalized.match(/(?:'s|\u2019s)\s*(?<player>\p{Lu}[\p{L}'\u2019-]+(?:\s+\p{Lu}[\p{L}'\u2019-]+){0,1})/u);
  if (possessiveMatch?.groups?.player) return possessiveMatch.groups.player.trim().replace(/\s+(?:signing|deal|transfer|news)$/i, "");

  const patterns = [
    /^(?:new deal for)\s+(?<player>.+?)(?:\s+-\s+.*|$)/i,
    /^welcome,\s+[^!]+!\s+(?<player>.+?)\s+(?:joins|signs)(?:\s+from|\s+for|\s+-|$)/i,
    /^(?<player>[\p{Lu}][\p{L}'\u2019-]+(?:\s+[\p{L}'\u2019-]+){0,3})\s+(?:joins|signs)(?:\s+from|\s+for|\s+-|$)/u,
    /\b(?:offer|bid|deal)\s+for\s+(?<player>[\p{Lu}][\p{L}'\u2019-]+(?:\s+[\p{Lu}][\p{L}'\u2019-]+){0,2})/u,
    /(?:to sign|sign|signing|deal for|deal to sign|agrees? deal for|bid for|move for|target(?:s|ed|ing)?|want(?:s)?|eye(?:s|ing)?|interest in)\s+(?:a|an|the)\s+(?<player>\p{Lu}[\p{L}'\u2019-]+(?:\s+\p{Lu}[\p{L}'\u2019-]+){0,2})/u,
    /^(?<player>\p{Lu}[\p{L}'\u2019-]+(?:\s+\p{Lu}[\p{L}'\u2019-]+){1,2})\s+(?:to|joins|join|moves|move|set to|agrees?)/u,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const candidate = match?.groups?.player?.trim();
    const isKnownClub = Boolean(TEAM_LEAGUES[candidate] || TEAM_ALIASES[candidate]);
    if (candidate && !isKnownClub && !/^(?:club|clubs|deal|agreement|player|striker|forward|defender|midfielder|star|world-class)$/i.test(candidate)) {
      return candidate;
    }
  }

  return "\uD655\uC778 \uD544\uC694";
}

function makeFallbackDraft(item) {
  const title = normalizeWhitespace(`${item.title || ""} ${item.summary || ""}`);
  const player = extractFallbackPlayer(title);
  if (!player || player === "\uD655\uC778 \uD544\uC694") return null;
  const directMove = title.match(/^(?<player>\p{Lu}[\p{L}'\u2019-]+(?:\s+\p{Lu}[\p{L}'\u2019-]+){1,2})\s+to\s+(?<to>[^?|-]+)\?/u);
  const possessiveClub = title.match(/\b(?<from>\p{Lu}[\p{L}-]+(?:\s+\p{Lu}[\p{L}-]+){0,2})['\u2019]s\s+/u);
  const toTeam = directMove?.groups?.to?.trim() ||
    (/^Manchester City\b/i.test(title) ? "Manchester City" : "\uBBF8\uC0C1");
  const fromTeam = directMove && /\bBarcelona\b/i.test(title)
    ? "Barcelona"
    : possessiveClub?.groups?.from?.trim() || "\uBBF8\uC0C1";

  return makeDraft(item, {
    player,
    fromTeam,
    toTeam,
    status: "\uD655\uC778 \uD544\uC694",
    extractionConfidence: "low",
    extractionPattern: "fallback-unparsed-transfer-headline",
    needsVerification: true,
    note: "\uAE30\uC0AC\uB294 \uC218\uC9D1\ub410\uC9C0\uB9CC \uC81C\uBAA9\uC758 \uC790\uB3D9 \uC774\uC801 \uC815\uBCF4 \uCD94\uCD9C\uC774 \uC2E4\uD328\uD574 \uCE74\uB4DC\uB97C \uBA3C\uC800 \uD45C\uC2DC\uD569\uB2C8\uB2E4. \uC6D0\uBB38 \uD655\uC778 \uD6C4 \uC120\uC218\u00B7\uAD6C\uB2E8\u00B7\uC0AC\uC9C4 \uC815\uBCF4\uB97C \uC790\uB3D9 \uBCF4\uC644\uD574\uC57C \uD569\uB2C8\uB2E4.",
  });
}

function extractAutoDraft(item) {
  const title = normalizeWhitespace(item.title);

  if (!title) {
    return null;
  }

  if (item.sourceKey === "official-tottenham-monitor") {
    let officialMatch = title.match(/^Romero moves to (?<to>.+?)(?:\s+-\s+.*)?$/i);
    if (officialMatch?.groups) {
      return makeDraft(item, {
        player: "Cristian Romero",
        fromTeam: "Tottenham",
        toTeam: officialMatch.groups.to,
        status: "완료",
        extractionConfidence: "high",
        extractionPattern: "tottenham-official-player-moves",
        note: "토트넘 공식 발표에서 직접 추출한 완료 카드입니다.",
      });
    }

    officialMatch = title.match(/^Phillips joins (?<to>.+?)(?:\s+-\s+.*)?$/i);
    if (officialMatch?.groups) {
      return makeDraft(item, {
        player: "Ashley Phillips",
        fromTeam: "Tottenham",
        toTeam: officialMatch.groups.to,
        status: "완료",
        extractionConfidence: "high",
        extractionPattern: "tottenham-official-player-joins",
        note: "토트넘 공식 발표에서 직접 추출한 완료 카드입니다.",
      });
    }

    officialMatch = title.match(/^Dragusin joins (?<to>.+?)(?:\s+-\s+.*)?$/i);
    if (officialMatch?.groups) {
      return makeDraft(item, {
        player: "Radu Dragusin",
        fromTeam: "Tottenham",
        toTeam: officialMatch.groups.to,
        status: "완료",
        extractionConfidence: "high",
        extractionPattern: "tottenham-official-player-joins",
        note: "토트넘 공식 발표에서 직접 추출한 완료 카드입니다.",
      });
    }

    officialMatch = title.match(/^Lankshear on the move to (?<to>.+?)(?:\s+-\s+.*)?$/i);
    if (officialMatch?.groups) {
      return makeDraft(item, {
        player: "Will Lankshear",
        fromTeam: "Tottenham",
        toTeam: officialMatch.groups.to.replace(/^Boro$/i, "Middlesbrough"),
        status: "완료",
        extractionConfidence: "high",
        extractionPattern: "tottenham-official-player-moves",
        note: "토트넘 공식 발표에서 직접 추출한 완료 카드입니다.",
      });
    }

    if (/^Welcome, Sandro! Tonali makes the move to N17/i.test(title)) {
      return makeDraft(item, {
        player: "Sandro Tonali",
        fromTeam: "Newcastle",
        toTeam: "Tottenham",
        status: "완료",
        extractionConfidence: "high",
        extractionPattern: "tottenham-official-signing",
        note: "토트넘 공식 발표에서 직접 추출한 완료 카드입니다.",
      });
    }
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

  // "Manchester City reach €100m agreement to sign Moroccan star Ayyoub Bouaddi from Lille".
  match = title.match(
    /^(?<to>.+?) reach .*? agreement to sign (?:[A-Za-z]+\s+star\s+)?(?<player>[A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){1,3}) from (?<from>.+?)(?:\s+-\s+.*)?$/iu
  );

  if (match?.groups) {
    return makeDraft(item, {
      player: match.groups.player,
      fromTeam: match.groups.from,
      toTeam: match.groups.to,
      status: "루머",
      extractionConfidence: "medium",
      extractionPattern: "club-reaches-agreement-to-sign-player",
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

  // Do not silently drop a transfer article when a strict parser misses it.
  // Keep a clearly marked verification card with the original source link.
  if (isFallbackCardCandidate(title)) {
    return makeFallbackDraft(item);
  }

  return null;
}

const DRAFT_PLAYER_ALIASES = {
  Kane: "Harry Kane",
  Gozo: "Zavier Gozo",
  Kroupi: "Eli Junior Kroupi",
  David: "Promise David",
  Parrott: "Troy Parrott",
  Zubimendi: "Martin Zubimendi",
  "Colombian Jhon Lucumi": "Jhon Lucumí",
  "Colombian Jhon Lucum": "Jhon Lucumí",
};

const DRAFT_CURRENT_TEAMS = {
  "Harry Kane": "바이에른 뮌헨",
  "Zavier Gozo": "Real Salt Lake",
  "Promise David": "Royale Union Saint-Gilloise",
  "Troy Parrott": "AZ Alkmaar",
};

function normalizeDraftRecord(draft) {
  const normalized = { ...draft };
  // Remove cards written by the earlier broken-encoding fallback. New fallback
  // cards use proper Korean labels and are retained for review.
  const corruptedFields = ["player", "fromTeam", "toTeam", "status", "sourceReason"];
  if (corruptedFields.some((field) => /^(?:\?{2,}\s*)+$/.test(String(normalized[field] || "").trim()))) {
    return null;
  }
  if (normalized.needsVerification && TEAM_LEAGUES[normalized.player]) {
    return null;
  }
  if (normalized.player === "\uD655\uC778 \uD544\uC694") {
    return null;
  }
  const title = normalizeWhitespace(normalized.headlineTitle || "");

  // Repair recurring headline-parser edge cases before validating assets.
  if (/(?:Nico\s+)?Gonz[áa]lez/i.test(title) && /Newcastle|N['’]castle/i.test(title) && /City/i.test(title)) {
    normalized.player = "Nico Gonzalez";
    normalized.fromTeam = "Manchester City";
    normalized.toTeam = "Newcastle";
    normalized.status = "루머";
    normalized.extractionConfidence = "high";
    normalized.extractionPattern = "espn-nico-gonzalez-newcastle";
    normalized.needsVerification = false;
  } else if (/S[áa]vio joins from Manchester City.*Tottenham/i.test(title)) {
    normalized.player = "Savinho";
    normalized.fromTeam = "Manchester City";
    normalized.toTeam = "Tottenham";
    normalized.status = "완료";
    normalized.extractionConfidence = "high";
    normalized.extractionPattern = "tottenham-official-savio-joins";
    normalized.needsVerification = false;
  } else if (/49719456|Liverpool, Arsenal eye move for Kroupi/i.test(`${normalized.sourceUrl || ""} ${title}`)) {
    normalized.player = "Eli Junior Kroupi";
    normalized.fromTeam = "Bournemouth";
    normalized.toTeam = "Liverpool";
    normalized.status = "루머";
    normalized.extractionConfidence = "medium";
    normalized.extractionPattern = "espn-kroupi-interested-clubs";
    normalized.needsVerification = false;
    normalized.sourceReason = "ESPN은 리버풀·맨체스터 유나이티드·아스널이 본머스의 엘리 주니어 크루피에 관심을 보인다고 전했습니다. 카드의 대표 대상 구단은 제목에 먼저 나온 리버풀로 표시합니다.";
  } else if (/Chelsea weigh Aston Villa['’]s bid for Nicolas Jackson/i.test(title)) {
    normalized.player = "Nicolas Jackson";
    normalized.fromTeam = "Chelsea";
    normalized.toTeam = "Aston Villa";
    normalized.status = "루머";
    normalized.extractionConfidence = "medium";
    normalized.extractionPattern = "nicolas-jackson-aston-villa-bid";
    normalized.needsVerification = false;
  } else if (/49719699|Will .*lvarez join Barcelona or Arsenal/i.test(`${normalized.sourceUrl || ""} ${title}`)) {
    normalized.player = "Julián Álvarez";
    normalized.fromTeam = "Atlético Madrid";
    normalized.toTeam = "Barcelona";
    normalized.status = "루머";
    normalized.extractionConfidence = "medium";
    normalized.extractionPattern = "espn-julian-alvarez-destination";
    normalized.needsVerification = false;
    normalized.sourceReason = "ESPN은 아틀레티코 마드리드의 훌리안 알바레스가 바르셀로나 이적을 우선시한다고 전했습니다. 아스널도 관심을 보이는 상황이라 루머로 표시합니다.";
  } else if (/Gabriel Martinelli transfer news.*Al Hilal.*Arsenal/i.test(title)) {
    normalized.player = "Gabriel Martinelli";
    normalized.fromTeam = "Arsenal";
    normalized.toTeam = "Al Hilal";
    normalized.status = "루머";
    normalized.extractionConfidence = "medium";
    normalized.extractionPattern = "sky-martinelli-al-hilal";
    normalized.needsVerification = false;
  } else if (/Al-Hilal in advanced talks to sign Arsenal['’]s Martinelli/i.test(title)) {
    normalized.player = "Gabriel Martinelli";
    normalized.fromTeam = "Arsenal";
    normalized.toTeam = "Al Hilal";
    normalized.status = "루머";
    normalized.extractionConfidence = "medium";
    normalized.extractionPattern = "martinelli-al-hilal-advanced-talks";
    normalized.needsVerification = false;
  } else if (/Aston Villa step up efforts to sign AC Milan['’]s Leao/i.test(title)) {
    normalized.player = "Rafael Leão";
    normalized.fromTeam = "AC Milan";
    normalized.toTeam = "Aston Villa";
    normalized.status = "루머";
    normalized.extractionConfidence = "medium";
    normalized.extractionPattern = "di-marzio-leao-aston-villa";
    normalized.needsVerification = false;
  } else if (/Fabrizio Romano jumped the gun.*Omar Marmoush/i.test(title)) {
    normalized.player = "Omar Marmoush";
    normalized.fromTeam = "Manchester City";
    normalized.toTeam = "Tottenham";
    normalized.status = "루머";
    normalized.extractionConfidence = "low";
    normalized.extractionPattern = "hotspur-hq-marmoush-doubt";
    normalized.needsVerification = false;
    normalized.sourceReason = "보도된 임대 합의가 아직 확정되지 않았다는 내용입니다. 맨체스터 시티에서 토트넘으로의 가능성만 루머로 표시합니다.";
  } else if (/Tottenham agree loan for Man City['’]s Marmoush/i.test(title)) {
    normalized.player = "Omar Marmoush";
    normalized.fromTeam = "Manchester City";
    normalized.toTeam = "Tottenham";
    normalized.status = "루머";
    normalized.extractionConfidence = "medium";
    normalized.extractionPattern = "bbc-marmoush-tottenham-loan";
    normalized.needsVerification = false;
  } else if (/Omar Marmoush.*Tottenham.*Manchester City/i.test(title)) {
    normalized.player = "Omar Marmoush";
    normalized.fromTeam = "Manchester City";
    normalized.toTeam = "Tottenham";
    normalized.status = "루머";
    normalized.extractionConfidence = "medium";
    normalized.extractionPattern = "marmoush-tottenham-medical";
    normalized.needsVerification = false;
  } else if (/^Tottenham transfer target set to undergo medical as .*deal edges closer/i.test(title)) {
    normalized.player = "Omar Marmoush";
    normalized.fromTeam = "Manchester City";
    normalized.toTeam = "Tottenham";
    normalized.status = "루머";
    normalized.extractionConfidence = "medium";
    normalized.extractionPattern = "football-london-marmoush-medical";
    normalized.needsVerification = false;
  } else if (/Ethan Pinnock to Coventry City.*agreement reached/i.test(title)) {
    normalized.player = "Ethan Pinnock";
    normalized.fromTeam = "Brentford";
    normalized.toTeam = "Coventry City";
    normalized.status = "루머";
    normalized.extractionConfidence = "medium";
    normalized.extractionPattern = "ornstein-pinnock-coventry";
    normalized.needsVerification = false;
  } else if (/Wrexham close in on Ekomie and Kabore deals/i.test(title)) {
    normalized.player = "Issa Kaboré";
    normalized.fromTeam = "Manchester City";
    normalized.toTeam = "Wrexham";
    normalized.status = "루머";
    normalized.extractionConfidence = "medium";
    normalized.extractionPattern = "bbc-kabore-wrexham";
    normalized.needsVerification = false;
  } else if (/Romano drops Liverpool transfer bombshell.*Ismaila Sarr|Liverpool make .*bid for .*Ismaila Sarr/i.test(title)) {
    normalized.player = "Ismaïla Sarr";
    normalized.fromTeam = "Crystal Palace";
    normalized.toTeam = "Liverpool";
    normalized.status = "루머";
    normalized.extractionConfidence = "medium";
    normalized.extractionPattern = "romano-sarr-liverpool-bid";
    normalized.needsVerification = false;
  } else if (/Exequiel Palacios to Ipswich Town.*medical|Ipswich.*Palacios.*Leverkusen/i.test(title)) {
    normalized.player = "Exequiel Palacios";
    normalized.fromTeam = "Bayer Leverkusen";
    normalized.toTeam = "Ipswich Town";
    normalized.status = "루머";
    normalized.extractionConfidence = "high";
    normalized.extractionPattern = "palacios-ipswich-agreement";
    normalized.needsVerification = false;
  } else if (/Axel Disasi joins Crystal Palace on loan/i.test(title)) {
    normalized.player = "Axel Disasi";
    normalized.fromTeam = "Chelsea";
    normalized.toTeam = "Crystal Palace";
    normalized.status = "완료";
    normalized.extractionConfidence = "high";
    normalized.extractionPattern = "chelsea-disasi-palace-loan";
    normalized.needsVerification = false;
  }

  if (
    /^Amorim[\u2019']s Milan live up to billing/i.test(title) ||
    /^New deal for /i.test(title) ||
    /^Signs that Jaissle[\u2019']s Newcastle/i.test(title) ||
    /^Mateta[\u2019']s Palace dispute/i.test(title) ||
    /^Glaring weakness in goal remains/i.test(title) ||
    /^Transfer gurus Fabrizio and Plettigoal clash over Diomande/i.test(title) ||
    /^Hull City make new .* Bundesliga star/i.test(title) ||
    /^Alvarez[\u2019']s Arsenal dilemma/i.test(title) ||
    /^Man Utd to launch bid for Real Madrid star/i.test(title) ||
    /^['\u2018]Negotiations['\u2019]/i.test(title) ||
    /^Every word of .* contract interview/i.test(title)
  ) {
    return null;
  }

  if (/^Permanent deal for Tel/i.test(title)) {
    normalized.player = "Mathys Tel";
    normalized.fromTeam = "Bayern Munich";
    normalized.toTeam = "Tottenham";
    normalized.status = "\uC644\uB8CC";
    normalized.extractionConfidence = "high";
    normalized.extractionPattern = "tottenham-official-player-joins";
    normalized.needsVerification = false;
    normalized.sourceReason = "\uD1A0\uD2B8\uB118 \uACF5\uC2DD \uBC1C\uD45C\uC5D0\uC11C \uC644\uB8CC \uC774\uC801\uC744 \uD655\uC778\uD588\uC2B5\uB2C8\uB2E4.";
  } else if (/^Welcome, Alice! Sombath joins from Lyon/i.test(title)) {
    normalized.player = "Alice Sombath";
    normalized.fromTeam = "OL Lyonnes";
    normalized.toTeam = "Tottenham";
    normalized.status = "\uC644\uB8CC";
    normalized.extractionConfidence = "high";
    normalized.extractionPattern = "tottenham-official-player-joins";
    normalized.needsVerification = false;
    normalized.sourceReason = "\uD1A0\uD2B8\uB118 \uACF5\uC2DD \uBC1C\uD45C\uC5D0\uC11C \uC644\uB8CC \uC774\uC801\uC744 \uD655\uC778\uD588\uC2B5\uB2C8\uB2E4.";
  } else if (/^Welcome, Mateus! Fernandes signs/i.test(title)) {
    normalized.player = "Mateus Fernandes";
    normalized.fromTeam = "West Ham United";
    normalized.toTeam = "Tottenham";
    normalized.status = "\uC644\uB8CC";
    normalized.extractionConfidence = "high";
    normalized.extractionPattern = "tottenham-official-player-joins";
    normalized.needsVerification = false;
    normalized.sourceReason = "\uD1A0\uD2B8\uB118 \uACF5\uC2DD \uBC1C\uD45C\uC5D0\uC11C \uC644\uB8CC \uC774\uC801\uC744 \uD655\uC778\uD588\uC2B5\uB2C8\uB2E4.";
  } else if (/^Panengstuen signs for Spurs/i.test(title)) {
    normalized.player = "Selma Panengstuen";
    normalized.fromTeam = "SK Brann";
    normalized.toTeam = "Tottenham";
    normalized.status = "\uC644\uB8CC";
    normalized.extractionConfidence = "high";
    normalized.extractionPattern = "tottenham-official-player-joins";
    normalized.needsVerification = false;
    normalized.sourceReason = "\uD1A0\uD2B8\uB118 \uACF5\uC2DD \uBC1C\uD45C\uC5D0\uC11C \uC644\uB8CC \uC774\uC801\uC744 \uD655\uC778\uD588\uC2B5\uB2C8\uB2E4.";
  } else if (
    /^Al Hilal pursuing deal for Arsenal[\u2019']s Gabriel Martinelli/i.test(title) ||
    /Al Hilal are now in talks with Arsenal over a deal for Gabriel Martinelli/i.test(title)
  ) {
    normalized.player = "Gabriel Martinelli";
    normalized.fromTeam = "Arsenal";
    normalized.toTeam = "Al Hilal";
    normalized.status = "\uB8E8\uBA38";
    normalized.extractionConfidence = "medium";
    normalized.extractionPattern = "athletic-martinelli-talks";
    normalized.needsVerification = false;
  } else if (/^Liverpool see .*transfer offer for Yankuba Minteh rejected by Brighton/i.test(title)) {
    normalized.player = "Yankuba Minteh";
    normalized.fromTeam = "Brighton";
    normalized.toTeam = "Liverpool";
    normalized.status = "\uB8E8\uBA38";
    normalized.extractionConfidence = "medium";
    normalized.extractionPattern = "athletic-yankuba-minteh-bid";
    normalized.needsVerification = false;
  } else if (/^Inter closing in on deal for Liverpool[\u2019']s Curtis Jones/i.test(title)) {
    normalized.player = "Curtis Jones";
    normalized.fromTeam = "Liverpool";
    normalized.toTeam = "Inter Milan";
    normalized.status = "\uB8E8\uBA38";
    normalized.extractionConfidence = "medium";
    normalized.extractionPattern = "athletic-curtis-jones-deal";
    normalized.needsVerification = false;
  } else if (/^Sounders close to finalizing deal for Dejan Jovelji/i.test(title)) {
    normalized.player = "Dejan Jovelji\u0107";
    normalized.fromTeam = "Sporting Kansas City";
    normalized.toTeam = "Seattle Sounders";
    normalized.status = "\uB8E8\uBA38";
    normalized.extractionConfidence = "medium";
    normalized.extractionPattern = "sounders-joveljic-deal";
    normalized.needsVerification = false;
  }

  if (/^Transfer rumors, news: Barcelona[\u2019']s Balde open to Man United move/i.test(title)) {
    normalized.player = "Alejandro Balde";
    normalized.fromTeam = "Barcelona";
    normalized.toTeam = "Manchester United";
    normalized.status = "\uB8E8\uBA38";
    normalized.extractionConfidence = "medium";
    normalized.extractionPattern = "espn-transfer-talk-balde";
    normalized.needsVerification = false;
    normalized.sourceReason = "ESPN Transfer Talk \uC81C목과 \uC694약에서 \uC120수\u00B7\uCD9C발 \uAD6C단\u00B7\uBAA9표 \uAD6C단\uC744 \uD655인했\uC2B5\uB2C8\uB2E4.";
  }

  if (
    /^Ezri Konsa transfer news:/i.test(title) ||
    /agree .* to sign Ezri Konsa from Aston Villa/i.test(title)
  ) {
    normalized.player = "Ezri Konsa";
    normalized.fromTeam = "Aston Villa";
    normalized.toTeam = "Arsenal";
  } else if (/^Newcastle transfer news: Club agree deal to sign defender Amar Dedic from Benfica/i.test(title)) {
    normalized.player = "Amar Dedic";
    normalized.fromTeam = "Benfica";
    normalized.toTeam = "Newcastle";
  } else if (/^Ferran Torres:/i.test(title)) {
    normalized.player = "Ferran Torres";
    normalized.fromTeam = "Barcelona";
    normalized.toTeam = "PSG";
  } else if (
    /^Colombian Jhon Lucum/i.test(title) ||
    /^Colombian Jhon Lucum/i.test(normalized.player) ||
    /Juventus After Four Seasons at Bologna/i.test(normalized.toTeam || "")
  ) {
    normalized.player = "Jhon Lucumí";
    normalized.fromTeam = "Bologna";
    normalized.toTeam = "Juventus";
  } else if (/^🚨 EXCLUSIVE: Manchester United closing in on deal to sign Carlos Baleba from Brighton/i.test(title)) {
    normalized.player = "Carlos Baleba";
    normalized.fromTeam = "Brighton";
    normalized.toTeam = "Manchester United";
  } else if (/^Sources: Tottenham agree deal for City's Savinho/i.test(title)) {
    normalized.player = "Savinho";
    normalized.fromTeam = "Manchester City";
    normalized.toTeam = "Tottenham";
  } else if (/Manchester City have moved forward with plans.*Allan Elias/i.test(title)) {
    normalized.player = "Allan Elias";
    normalized.fromTeam = "Palmeiras";
    normalized.toTeam = "Manchester City";
  } else if (/^Man City agree deal for Palmeiras winger Allan/i.test(title)) {
    normalized.player = "Allan Elias";
    normalized.fromTeam = "Palmeiras";
    normalized.toTeam = "Manchester City";
    normalized.status = "완료";
    normalized.extractionConfidence = "high";
    normalized.extractionPattern = "bbc-allan-elias-deal";
    normalized.needsVerification = false;
  } else if (/^Man United agree to .* deal for Brighton's Carlos Baleba/i.test(title)) {
    normalized.player = "Carlos Baleba";
    normalized.fromTeam = "Brighton";
    normalized.toTeam = "Manchester United";
  } else if (/^Manchester City Reach .*Agreement to Sign .*Ayyoub Bouaddi from Lille/i.test(title)) {
    normalized.player = "Ayyoub Bouaddi";
    normalized.fromTeam = "Lille";
    normalized.toTeam = "Manchester City";
  } else if (/^Transfer rumors, news: Como want Chelsea's Delap to bolster attack/i.test(title)) {
    normalized.player = "Liam Delap";
    normalized.fromTeam = "Chelsea";
    normalized.toTeam = "Como";
  }

  normalized.player = DRAFT_PLAYER_ALIASES[normalized.player] || normalized.player;
  normalized.player = normalized.player.replace(/\s+(?:signing|deal|transfer|news)$/i, "").trim();
  normalized.fromTeam = {
    City: "Manchester City",
    Barça: "Barcelona",
    "Al-Hilal": "Al Hilal",
  }[normalized.fromTeam] || normalized.fromTeam;
  normalized.toTeam = {
    City: "Manchester City",
    Barça: "Barcelona",
    "Al-Hilal": "Al Hilal",
  }[normalized.toTeam] || normalized.toTeam;

  normalized.fromTeam = String(normalized.fromTeam || "").replace(/[’']+$/u, "").trim();
  normalized.toTeam = String(normalized.toTeam || "").replace(/[’']+$/u, "").trim();

  if (
    /^from\s/i.test(normalized.player) ||
    /\b(agree|deal|sign|after|striker|transfer news)\b/i.test(normalized.fromTeam) ||
    /\b(agree|deal|sign|after|striker|transfer news)\b/i.test(normalized.toTeam) ||
    normalized.player.length > 35 ||
    normalized.fromTeam.length > 60 ||
    normalized.toTeam.length > 60 ||
    /[!🚨🔄]/u.test(normalized.player)
  ) {
    return null;
  }

  if (DRAFT_CURRENT_TEAMS[normalized.player]) {
    normalized.fromTeam = DRAFT_CURRENT_TEAMS[normalized.player];
  }

  if (
    /^£\d+m Demands Emerge$/i.test(normalized.player) ||
    /^- ESPN$/i.test(normalized.player) ||
    /^Emenalo$/i.test(normalized.player) ||
    /to bolster attack$/i.test(normalized.player) ||
    /plenty of sense for Mamadou/i.test(normalized.player)
  ) {
    return null;
  }

  normalized.league = inferLeague(normalized.toTeam);
  return normalized;
}

function dedupeDrafts(items) {
  const seen = new Set();
  const resolvedHeadlines = new Set(
    items
      .filter((item) => item.headlineTitle && !isUnknownTeamName(item.fromTeam) && !isUnknownTeamName(item.toTeam))
      .map((item) => `${item.player}|${normalizeWhitespace(item.headlineTitle)}`)
  );
  const resolvedMoves = new Set(
    items
      .filter((item) => !item.needsVerification && !isUnknownTeamName(item.toTeam))
      .map((item) => `${item.player}|${item.toTeam}`)
  );

  return items.filter((item) => {
    const headlineKey = `${item.player}|${normalizeWhitespace(item.headlineTitle || "")}`;
    if (
      item.needsVerification &&
      (resolvedMoves.has(`${item.player}|${item.toTeam}`) ||
        (resolvedHeadlines.has(headlineKey) &&
          (isUnknownTeamName(item.fromTeam) || isUnknownTeamName(item.toTeam))))
    ) {
      return false;
    }
    const key = `${item.player}|${item.toTeam}|${item.sourceUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isPublishableDraft(item) {
  if (!item || item.needsVerification) return false;
  if (!item.player || isUnknownTeamName(item.fromTeam) || isUnknownTeamName(item.toTeam)) return false;
  if (/[!?\uFF1F\uFF01]/u.test(`${item.player} ${item.fromTeam} ${item.toTeam}`)) return false;
  return true;
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
  "FabrizioRomano,David_Ornstein,Plettigoal,MatteoMoretto,Santi_J_FM,AlasdairGold,Dan_KP,RobGuesty,jaydmharris,EliasBurke")
  .split(",")
  .map((handle) => handle.trim().replace(/^@/, ""))
  .filter(Boolean);

const X_TRANSFER_QUERY =
  process.env.X_TRANSFER_QUERY ||
  `(${X_MONITORED_HANDLES.map((handle) => `from:${handle}`).join(" OR ")}) (transfer OR "here we go" OR agreed OR agreement OR medical OR signed OR signing) -is:retweet`;
const X_MONITOR_ENABLED = /^(1|true|yes)$/i.test(process.env.ENABLE_X_MONITOR || "");

async function fetchXRecentPosts() {
  if (!X_MONITOR_ENABLED) {
    return {
      items: [],
      health: {
        source: "X API direct monitor",
        ok: true,
        disabled: true,
        count: 0,
        error: "Disabled by default to avoid paid X API usage",
      },
    };
  }
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

const BLUESKY_MONITORED_AUTHORS = [
  {
    actor: "fabrizioroman.bsky.social",
    source: "Bluesky @fabrizioroman",
    sourceKey: "bluesky-fabrizio",
    sourceName: "Fabrizio Romano Bluesky",
  },
  {
    actor: "david-ornstein.bsky.social",
    source: "Bluesky @david-ornstein",
    sourceKey: "bluesky-ornstein",
    sourceName: "David Ornstein Bluesky",
  },
  {
    actor: "jaydmharris.bsky.social",
    source: "Bluesky @jaydmharris",
    sourceKey: "bluesky-jay-harris",
    sourceName: "Jay Harris Bluesky",
  },
];

async function fetchBlueskyAuthorFeed(author) {
  const params = new URLSearchParams({
    actor: author.actor,
    limit: "100",
    filter: "posts_no_replies",
  });
  const response = await fetch(
    `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?${params}`,
    { headers: { "user-agent": "yoochan-transfer-market/1.0" } },
  );

  if (!response.ok) {
    throw new Error(`Bluesky ${author.actor} -> HTTP ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  const items = (payload.feed || [])
    .map((entry) => {
      const post = entry.post || {};
      const record = post.record || {};
      const text = normalizeWhitespace(record.text || "");
      const uriParts = String(post.uri || "").split("/");
      const rkey = uriParts[uriParts.length - 1];
      const handle = post.author?.handle || author.actor;

      return {
        id: `bluesky:${post.uri || `${handle}:${record.createdAt || text}`}`,
        title: text,
        url: rkey ? `https://bsky.app/profile/${handle}/post/${rkey}` : `https://bsky.app/profile/${handle}`,
        publishedAt: record.createdAt || post.indexedAt || null,
        summary: `Bluesky @${handle} 공개 게시물`,
        sourceKey: author.sourceKey,
        sourceName: author.sourceName,
        status: detectHeadlineStatus(text),
      };
    })
    .filter((item) => item.title && item.url && isTransferHeadline(`${item.title} ${item.summary}`));

  return {
    items,
    health: {
      source: author.source,
      ok: true,
      count: items.length,
      mode: "public-author-feed",
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

  const blueskyResults = await Promise.allSettled(
    BLUESKY_MONITORED_AUTHORS.map((author) => fetchBlueskyAuthorFeed(author)),
  );
  blueskyResults.forEach((result, index) => {
    const author = BLUESKY_MONITORED_AUTHORS[index];
    if (result.status === "fulfilled") {
      items.push(...result.value.items);
      sourceHealth.push(result.value.health);
      return;
    }
    sourceHealth.push({
      source: author.source,
      ok: false,
      error: String(result.reason),
    });
  });

  const allNormalized = dedupeItems(items).sort(compareByDateDesc);
  const pinned = Object.entries(PINNED_HEADLINE_LIMITS).flatMap(([sourceKey, limit]) =>
    allNormalized.filter((item) => item.sourceKey === sourceKey).slice(0, limit)
  );
  const pinnedIds = new Set(pinned.map((item) => item.id));
  const recent = allNormalized
    .filter((item) => !pinnedIds.has(item.id))
    .slice(0, Math.max(0, LIVE_HEADLINE_LIMIT - pinned.length));
  const normalized = dedupeItems([...pinned, ...recent]);

  return {
    fetchedAt: new Date().toISOString(),
    itemCount: normalized.length,
    items: normalized,
    sourceHealth,
  };
}

function buildDraftPayload(livePayload, previousPayload = draftCache) {
  const freshDrafts = livePayload.items
    .map(extractAutoDraft)
    .filter(Boolean)
    .map(normalizeDraftRecord)
    .filter(Boolean);
  const previousDrafts = Array.isArray(previousPayload?.drafts)
    ? previousPayload.drafts.map(normalizeDraftRecord).filter(Boolean)
    : [];
  const drafts = dedupeDrafts([...freshDrafts, ...previousDrafts])
    .filter(isPublishableDraft)
    .sort(compareDraftPriority)
    .slice(0, DRAFT_ARCHIVE_LIMIT);

  return {
    generatedAt: new Date().toISOString(),
    basedOnFetchedAt: livePayload.fetchedAt,
    itemCount: drafts.length,
    archiveLimit: DRAFT_ARCHIVE_LIMIT,
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

    const draftPayload = buildDraftPayload(livePayload, draftCache);
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
  const payload = buildDraftPayload(liveCache.payload, draftCache);
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

const clubPalette = {
  "바이에른 뮌헨": { primary: "#dc052d", secondary: "#0066b2" },
  "인터 밀란": { primary: "#0068a8", secondary: "#111111" },
  "레알 마드리드": { primary: "#d4af37", secondary: "#ffffff" },
  밀란: { primary: "#d71920", secondary: "#111111" },
  "알 아흘리": { primary: "#0c8f49", secondary: "#f4f4f4" },
  토트넘: { primary: "#132257", secondary: "#f4f4f4" },
  바르셀로나: { primary: "#a50044", secondary: "#004d98" },
  "레알 베티스": { primary: "#1b8f4d", secondary: "#f4f4f4" },
};

function createSvgDataUrl(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getInitials(label = "", limit = 2) {
  return String(label)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => Array.from(part)[0] || "")
    .join("")
    .slice(0, limit)
    .toUpperCase();
}

function createPlayerPhoto(name) {
  const safeName = name || "Unknown Player";
  const initials = getInitials(safeName);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${safeName}">
      <defs>
        <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#61a5ff" />
          <stop offset="100%" stop-color="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="24" fill="url(#g)" />
      <circle cx="48" cy="34" r="18" fill="rgba(255,255,255,0.92)" />
      <path d="M20 84c5-16 18-24 28-24s23 8 28 24" fill="rgba(255,255,255,0.92)" />
      <text x="48" y="90" text-anchor="middle" font-size="12" font-family="Segoe UI, Arial, sans-serif" fill="#0b1220" font-weight="700">${initials}</text>
    </svg>
  `;

  return createSvgDataUrl(svg);
}

const sourceRegistry = window.sourceRegistry?.byKey || {};
const exchangeRates = {
  base: "EUR",
  gbpPerEur: 0.85358,
  krwPerEur: 1636.08,
  updatedAt: "2026-08-12",
  sourceName: "ECB reference rates",
};

function getSourceMeta(sourceKey, overrides = {}) {
  const registry = sourceRegistry[sourceKey] || {};

  return {
    sourceName: overrides.sourceName || registry.name || "미분류 출처",
    sourceUrl: overrides.sourceUrl || registry.url || "#",
    sourceTier: overrides.sourceTier || registry.tier || "low",
    sourceReliability:
      overrides.sourceReliability || registry.reliabilityLabel || "보통",
    sourceType: overrides.sourceType || registry.type || "일반 출처",
    sourceReason:
      overrides.sourceReason || registry.note || "출처 기준이 아직 정리되지 않았습니다.",
  };
}

function formatNumber(value, digits = 1) {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatEokWon(krw) {
  const eok = krw / 100000000;
  return `${Math.round(eok).toLocaleString("ko-KR")}억 원`;
}

function parseFee(feeText) {
  const text = feeText.trim();
  const match = text.match(/^([€£])\s*([\d.]+)\s*([MB])$/i);

  if (!match) return null;

  const [, currency, amountText, unit] = match;
  const amount = Number(amountText);
  const multiplier = unit.toUpperCase() === "B" ? 1000000000 : 1000000;

  if (Number.isNaN(amount)) return null;

  return {
    currency,
    amount,
    unit: unit.toUpperCase(),
    rawValue: amount * multiplier,
  };
}

function formatFeeDisplay(feeText) {
  const parsed = parseFee(feeText);

  if (!parsed) return feeText;

  if (parsed.currency === "€") {
    const gbpAmount =
      parsed.amount *
      (parsed.unit === "B" ? exchangeRates.gbpPerEur : exchangeRates.gbpPerEur);
    const krwAmount = parsed.rawValue * exchangeRates.krwPerEur;

    return `${feeText} (£${formatNumber(gbpAmount)}${parsed.unit} · 약 ${formatEokWon(
      krwAmount
    )})`;
  }

  if (parsed.currency === "£") {
    const krwPerGbp = exchangeRates.krwPerEur / exchangeRates.gbpPerEur;
    const krwAmount = parsed.rawValue * krwPerGbp;
    return `${feeText} (약 ${formatEokWon(krwAmount)})`;
  }

  return feeText;
}

function createClubLogo(team) {
  const safeTeam = team || "Unknown Club";
  const { primary, secondary } = clubPalette[safeTeam] || {
    primary: "#24314d",
    secondary: "#61a5ff",
  };
  const initials = getInitials(safeTeam, 3);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" role="img" aria-label="${safeTeam}">
      <rect x="6" y="6" width="68" height="68" rx="22" fill="${primary}" />
      <rect x="16" y="16" width="48" height="48" rx="16" fill="${secondary}" opacity="0.22" />
      <text x="40" y="46" text-anchor="middle" font-size="20" font-family="Segoe UI, Arial, sans-serif" fill="#ffffff" font-weight="700">${initials}</text>
    </svg>
  `;

  return createSvgDataUrl(svg);
}

const playerPhotoUrls = {
  "김민재":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/FC_Red_Bull_Salzburg_gegen_Bayern_M%C3%BCnchen_%282025-01-06_Testspiel%29_26.jpg/960px-FC_Red_Bull_Salzburg_gegen_Bayern_M%C3%BCnchen_%282025-01-06_Testspiel%29_26.jpg",
  "브라힘 디아스":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Brahim_Diaz_Morocco_v_Norway_7_June_2026-36_%28cropped_3-4%29.jpg/960px-Brahim_Diaz_Morocco_v_Norway_7_June_2026-36_%28cropped_3-4%29.jpg",
  "이반 토니":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Ivan_Toney_England_v_Ghana_23_June_2026-051.jpg/960px-Ivan_Toney_England_v_Ghana_23_June_2026-051.jpg",
  "비토르 호키":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Vitor-roque-palmeiras-internacional-sep2025.jpg/960px-Vitor-roque-palmeiras-internacional-sep2025.jpg",
};

const clubLogoUrls = {
  "바이에른 뮌헨":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/FC_Bayern_M%C3%BCnchen_logo_%282024%29.svg/1280px-FC_Bayern_M%C3%BCnchen_logo_%282024%29.svg.png",
  "인터 밀란":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/FC_Internazionale_Milano_2021.svg/1280px-FC_Internazionale_Milano_2021.svg.png",
  "레알 마드리드":
    "https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/960px-Real_Madrid_CF.svg.png",
  밀란:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Logo_of_AC_Milan.svg/960px-Logo_of_AC_Milan.svg.png",
  "알 아흘리":
    "https://upload.wikimedia.org/wikipedia/en/thumb/4/45/Al_Ahli_Saudi_FC_logo.svg/1280px-Al_Ahli_Saudi_FC_logo.svg.png",
  토트넘:
    "https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/Tottenham_Hotspur.svg/960px-Tottenham_Hotspur.svg.png",
  바르셀로나:
    "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/1280px-FC_Barcelona_%28crest%29.svg.png",
  "레알 베티스":
    "https://upload.wikimedia.org/wikipedia/en/thumb/2/2f/Real_Betis_2022_logo.svg/1280px-Real_Betis_2022_logo.svg.png",
};

const fallbackTransfers = [
  {
    player: "김민재",
    fromTeam: "바이에른 뮌헨",
    toTeam: "인터 밀란",
    league: "세리에 A",
    status: "루머",
    fee: "미정",
    sourceKey: "fabrizio-romano",
    publishedAt: "2026-08-13 18:20",
    sourceReason: "최상위 기자발 루머지만 공식 발표 전 단계라 추가 확인이 필요합니다.",
    lastVerifiedAt: "2026-08-13 11:45",
  },
  {
    player: "브라힘 디아스",
    fromTeam: "레알 마드리드",
    toTeam: "밀란",
    league: "세리에 A",
    status: "완료",
    fee: "€28M",
    sourceKey: "official-club",
    sourceName: "Real Madrid Official",
    sourceUrl: "https://www.realmadrid.com/",
    publishedAt: "2026-08-13 16:40",
    sourceReason: "구단 발표 또는 1차 출처 기준으로 확인된 케이스를 가정했습니다.",
    lastVerifiedAt: "2026-08-13 11:50",
  },
  {
    player: "이반 토니",
    fromTeam: "알 아흘리",
    toTeam: "토트넘",
    league: "프리미어리그",
    status: "루머",
    fee: "€42M",
    sourceKey: "sky-sports",
    publishedAt: "2026-08-13 14:05",
    sourceReason: "메이저 매체발 루머라 추적 가치는 있지만 상 티어나 공식 확인이 더 필요합니다.",
    lastVerifiedAt: "2026-08-13 11:30",
  },
  {
    player: "비토르 호키",
    fromTeam: "바르셀로나",
    toTeam: "레알 베티스",
    league: "라리가",
    status: "완료",
    fee: "임대",
    sourceKey: "official-club",
    sourceName: "Real Betis Official",
    sourceUrl: "https://en.realbetisbalompie.es/",
    publishedAt: "2026-08-13 12:10",
    sourceReason: "완료 딜은 공식 발표/등록 여부를 우선으로 판단합니다.",
    lastVerifiedAt: "2026-08-13 11:40",
  },
];

let transfers = [];
let baseTransfers = [];
let autoDraftTransfers = [];
let assetMap = { players: {}, clubs: {} };
let dataMode = "loading";
let liveMode = "live unavailable";
let draftMode = "draft unavailable";
let liveHeadlineCount = 0;
let autoDraftCount = 0;
let rumorDraftCount = 0;
let reviewTransfers = [];
let reviewItemCount = 0;

const leagueFilter = document.querySelector("#leagueFilter");
const statusFilter = document.querySelector("#statusFilter");
const teamSearch = document.querySelector("#teamSearch");
const cards = document.querySelector("#cards");
const liveCards = document.querySelector("#liveCards");
const liveStatus = document.querySelector("#liveStatus");
const liveRefreshBtn = document.querySelector("#liveRefreshBtn");
const draftCards = document.querySelector("#draftCards");
const draftStatus = document.querySelector("#draftStatus");
const totalCount = document.querySelector("#totalCount");
const doneCount = document.querySelector("#doneCount");
const rumorCount = document.querySelector("#rumorCount");
const refreshStatus = document.querySelector("#refreshStatus");
const articleSection = document.querySelector("#articleSection");
const cardView = document.querySelector("#cardView");
const transferSection = document.querySelector("#transferSection");
const reviewSection = document.querySelector("#reviewSection");
const reviewCards = document.querySelector("#reviewCards");
const reviewStatus = document.querySelector("#reviewStatus");
const reviewCount = document.querySelector("#reviewCount");
const articlesViewBtn = document.querySelector("#articlesViewBtn");
const cardsViewBtn = document.querySelector("#cardsViewBtn");
const reviewViewBtn = document.querySelector("#reviewViewBtn");

const PLAYER_DISPLAY_ALIASES = {
  Kane: "Harry Kane",
  Gozo: "Zavier Gozo",
  David: "Promise David",
  Parrott: "Troy Parrott",
};

const PLAYER_DISPLAY_CURRENT_TEAMS = {
  "Harry Kane": "바이에른 뮌헨",
  "Zavier Gozo": "Real Salt Lake",
  "Promise David": "Royale Union Saint-Gilloise",
  "Troy Parrott": "AZ Alkmaar",
};

function enrichTransfer(item) {
  const rawPlayer = item.player || "미상 선수";
  const player = PLAYER_DISPLAY_ALIASES[rawPlayer] || rawPlayer;
  const unknownFromTeam = !item.fromTeam || ["미상", "소속팀 확인 중"].includes(item.fromTeam);
  const fromTeam = unknownFromTeam
    ? PLAYER_DISPLAY_CURRENT_TEAMS[player] || item.fromTeam || "미상"
    : item.fromTeam;
  const toTeam = item.toTeam || "미상";
  const playerAsset = assetMap.players[player]?.src;
  const fromClubAsset = assetMap.clubs[fromTeam]?.src;
  const toClubAsset = assetMap.clubs[toTeam]?.src;

  return {
    ...item,
    player,
    fromTeam,
    toTeam,
    fee: item.fee || "미정",
    league: item.league || "미분류",
    status: item.status || "업데이트",
    publishedAt: item.publishedAt || "시간 미상",
    lastVerifiedAt: item.lastVerifiedAt || "검증 전",
    ...getSourceMeta(item.sourceKey, item),
    playerPhoto: playerAsset || playerPhotoUrls[player] || createPlayerPhoto(player),
    playerPhotoFallback: createPlayerPhoto(player),
    fromLogo: fromClubAsset || clubLogoUrls[fromTeam] || createClubLogo(fromTeam),
    fromLogoFallback: createClubLogo(fromTeam),
    toLogo: toClubAsset || clubLogoUrls[toTeam] || createClubLogo(toTeam),
    toLogoFallback: createClubLogo(toTeam),
  };
}

function getReliabilityClass(level) {
  if (level === "높음") return "high";
  if (level === "보통") return "medium";
  return "low";
}

function getConfidenceLabel(level) {
  if (level === "high") return "높음";
  if (level === "medium") return "보통";
  return "낮음";
}

function uniqueLeagues() {
  return [...new Set(transfers.map((item) => item.league))];
}

function initFilters() {
  leagueFilter.innerHTML = `<option value="all">전체</option>`;
  uniqueLeagues().forEach((league) => {
    const option = document.createElement("option");
    option.value = league;
    option.textContent = league;
    leagueFilter.appendChild(option);
  });
}

function getTransferDateValue(item) {
  const rawDate = String(item.publishedAt || item.lastVerifiedAt || "").trim();
  if (!rawDate) return 0;

  // 수집 데이터의 `YYYY-MM-DD HH:mm` 형식도 브라우저에서 안정적으로 비교합니다.
  const normalizedDate = rawDate.replace(" ", "T");
  const timestamp = Date.parse(normalizedDate);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getFilteredTransfers() {
  const league = leagueFilter.value;
  const status = statusFilter.value;
  const term = teamSearch.value.trim().toLowerCase();

  return transfers
    .filter((item) => {
      const leagueMatch = league === "all" || item.league === league;
      const statusMatch = status === "all" || item.status === status;
      const teamMatch =
        !term ||
        item.fromTeam.toLowerCase().includes(term) ||
        item.toTeam.toLowerCase().includes(term);

      return leagueMatch && statusMatch && teamMatch;
    })
    // 최신 날짜가 위에 오도록 정렬합니다. 날짜가 같으면 검증 시각을 비교합니다.
    .sort((a, b) => {
      const publishedDiff = getTransferDateValue(b) - getTransferDateValue(a);
      if (publishedDiff !== 0) return publishedDiff;

      const verifiedA = Date.parse(String(a.lastVerifiedAt || "").replace(" ", "T")) || 0;
      const verifiedB = Date.parse(String(b.lastVerifiedAt || "").replace(" ", "T")) || 0;
      return verifiedB - verifiedA;
    });
}

function renderStats(items) {
  totalCount.textContent = liveHeadlineCount;
  doneCount.textContent = autoDraftCount;
  rumorCount.textContent = rumorDraftCount;
  if (reviewCount) reviewCount.textContent = reviewItemCount;
}

function renderSourceLinks(item) {
  const links = item.sourceLinks || [
    { sourceName: item.sourceName, sourceUrl: item.sourceUrl, headlineTitle: item.headlineTitle },
  ];
  const unique = links.filter(
    (link, index, all) => link.sourceUrl && all.findIndex((candidate) => candidate.sourceUrl === link.sourceUrl) === index
  );
  if (unique.length <= 1) return "";
  return `
    <div class="source-links-list">
      <span>추가 출처 ${unique.length - 1}개</span>
      ${unique
        .slice(1)
        .map(
          (link) => `<a href="${link.sourceUrl}" target="_blank" rel="noreferrer">${link.sourceName || "원문"} ↗</a>`
        )
        .join("")}
    </div>
  `;
}

function mergeAllTransfers() {
  const merged = new Map();

  [...baseTransfers, ...autoDraftTransfers].forEach((item) => {
    const key = `${item.player || ""}|${item.toTeam || ""}`.trim().toLowerCase();
    if (key && merged.has(key) && item.cardOrigin === "기본 이적 데이터") return;
    merged.set(key || `item:${merged.size}`, item);
  });

  transfers = [...merged.values()];
}

function renderCards() {
  const items = getFilteredTransfers();
  renderStats(items);

  if (!items.length) {
    cards.innerHTML = `<article class="card empty">조건에 맞는 이적 항목이 없습니다.</article>`;
    return;
  }

  cards.innerHTML = items
    .map((item) => {
      const displayStatus = item.needsVerification ? "\uD655\uC778 \uD544\uC694" : item.status;
      const badgeClass = item.needsVerification
        ? "review"
        : item.status === "\uC644\uB8CC"
          ? "done"
          : "rumor";
      const sourceLinks = renderSourceLinks(item);
      return `
        <article class="card transfer-card">
          <div class="card-top">
            <div class="player-heading">
              <img class="player-photo" src="${item.playerPhoto}" alt="${item.player} 프로필 사진" loading="lazy" onerror="this.onerror=null;this.src='${item.playerPhotoFallback}'" referrerpolicy="no-referrer" />
              <div>
                <div class="eyebrow">${item.league}</div>
                <h2 class="player">${item.player}</h2>
              </div>
            </div>
            <span class="badge ${badgeClass}">${displayStatus}</span>
          </div>

          <div class="transfer-grid">
            <div>
              <strong>이전 팀</strong><br>
              <span class="team-line">
                <img class="club-logo" src="${item.fromLogo}" alt="${item.fromTeam} 로고" loading="lazy" onerror="this.onerror=null;this.src='${item.fromLogoFallback}'" referrerpolicy="no-referrer" />
                <span>${item.fromTeam}</span>
              </span>
            </div>
            <div>
              <strong>새 팀</strong><br>
              <span class="team-line">
                <img class="club-logo" src="${item.toLogo}" alt="${item.toTeam} 로고" loading="lazy" onerror="this.onerror=null;this.src='${item.toLogoFallback}'" referrerpolicy="no-referrer" />
                <span>${item.toTeam}</span>
              </span>
            </div>
            <div><strong>이적료</strong><br>${formatFeeDisplay(item.fee)}</div>
            <div><strong>날짜</strong><br>${item.publishedAt}</div>
          </div>

          <div class="source-block">
            <div class="source-link-box">
              <span>출처 링크</span>
              <a href="${item.sourceUrl}" target="_blank" rel="noreferrer">원문 열기 ↗</a>
            </div>
            <div class="source-meta">
              <span class="source-badge ${getReliabilityClass(item.sourceReliability)}">신뢰도 ${item.sourceReliability}</span>
              <span>${item.cardOrigin || "기본 이적 데이터"}</span>
              <span>${item.sourceType}</span>
              <span>출처 ${item.sourceCount || 1}개</span>
              <span>검증 ${item.lastVerifiedAt}</span>
            </div>
            ${sourceLinks}
            <p class="source-note">${item.sourceReason}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function setContentView(view) {
  const showArticles = view === "articles";
  const showReview = view === "review";
  if (articleSection) articleSection.hidden = !showArticles;
  if (cardView) cardView.hidden = showArticles;
  if (transferSection) transferSection.hidden = showReview;
  if (reviewSection) reviewSection.hidden = !showReview;
  articlesViewBtn?.classList.toggle("active", showArticles);
  cardsViewBtn?.classList.toggle("active", !showArticles && !showReview);
  reviewViewBtn?.classList.toggle("active", showReview);
}

function bindEvents() {
  [leagueFilter, statusFilter, teamSearch].forEach((element) =>
    element.addEventListener("input", renderCards)
  );

  liveRefreshBtn?.addEventListener("click", () => {
    loadLiveHeadlines(true);
    loadAutoDrafts(true);
  });

  articlesViewBtn?.addEventListener("click", () => setContentView("articles"));
  cardsViewBtn?.addEventListener("click", () => setContentView("cards"));
  reviewViewBtn?.addEventListener("click", () => setContentView("review"));
}

async function loadTransfers() {
  try {
    const response = await fetch("./transfers.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    baseTransfers = data.map((item) => ({
      ...enrichTransfer(item),
      cardOrigin: "기본 이적 데이터",
    }));
    mergeAllTransfers();
    dataMode = "json data";
  } catch (error) {
    console.warn("transfers.json load failed, fallback data used.", error);
    baseTransfers = fallbackTransfers.map((item) => ({
      ...enrichTransfer(item),
      cardOrigin: "기본 이적 데이터",
    }));
    mergeAllTransfers();
    dataMode = "fallback data";
  }

  initFilters();
  renderCards();
  updateRefreshStatus();
}

async function loadAssetMap() {
  try {
    const response = await fetch("./asset-map.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    assetMap = {
      players: data.players || {},
      clubs: data.clubs || {},
    };
  } catch (error) {
    console.warn("asset-map.json load failed, remote/fallback images used.", error);
  }
}

function renderDraftCards(items) {
  if (!draftCards) return;

  if (!items.length) {
    draftCards.innerHTML = `<article class="card empty">자동 추출된 카드 초안이 아직 없습니다.</article>`;
    return;
  }

  draftCards.innerHTML = items
    .map((item) => {
      const badgeClass = item.status === "완료" ? "done" : item.status === "루머" ? "rumor" : "";
      const reliabilityClass = getReliabilityClass(item.sourceReliability);
      const confidenceClass = item.extractionConfidence || "low";

      return `
        <article class="card transfer-card draft-card">
          <div class="card-top">
            <div class="player-heading">
              <img class="player-photo" src="${item.playerPhoto}" alt="${item.player} 프로필 사진" loading="lazy" onerror="this.onerror=null;this.src='${item.playerPhotoFallback}'" referrerpolicy="no-referrer" />
              <div>
                <div class="eyebrow">${item.league}</div>
                <h2 class="player">${item.player}</h2>
              </div>
            </div>
            <span class="badge ${badgeClass}">${item.status}</span>
          </div>

          <div class="transfer-grid">
            <div>
              <strong>이전 팀</strong><br>
              <span class="team-line">
                <img class="club-logo" src="${item.fromLogo}" alt="${item.fromTeam} 로고" loading="lazy" onerror="this.onerror=null;this.src='${item.fromLogoFallback}'" referrerpolicy="no-referrer" />
                <span>${item.fromTeam}</span>
              </span>
            </div>
            <div>
              <strong>새 팀</strong><br>
              <span class="team-line">
                <img class="club-logo" src="${item.toLogo}" alt="${item.toTeam} 로고" loading="lazy" onerror="this.onerror=null;this.src='${item.toLogoFallback}'" referrerpolicy="no-referrer" />
                <span>${item.toTeam}</span>
              </span>
            </div>
            <div><strong>이적료</strong><br>${formatFeeDisplay(item.fee)}</div>
            <div><strong>갱신 시간</strong><br>${item.publishedAt}</div>
          </div>

          <div class="source-block">
            <div class="source-link-box">
              <span>원문 링크</span>
              <a href="${item.sourceUrl}" target="_blank" rel="noreferrer">원문 열기 ↗</a>
            </div>
            <div class="source-meta">
              <span class="source-badge ${reliabilityClass}">출처 ${item.sourceReliability}</span>
              <span class="source-badge ${confidenceClass}">추출 ${getConfidenceLabel(item.extractionConfidence || "low")}</span>
              <span>${item.sourceName}</span>
              <span>${item.extractionPattern || "pattern-unknown"}</span>
            </div>
            <p class="source-note">${item.sourceReason}</p>
            <div class="draft-meta">
              <span>자동 검증 ${item.lastVerifiedAt}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderReviewCards(items) {
  if (!reviewCards) return;

  if (!items.length) {
    reviewCards.innerHTML = `<article class="card empty">현재 검수 대기 중인 카드가 없습니다.</article>`;
    if (reviewStatus) reviewStatus.textContent = "모든 후보가 자동 검증을 통과했습니다.";
    return;
  }

  if (reviewStatus) {
    reviewStatus.textContent = `${items.length}\uAC1C \uCE74\uB4DC\uAC00 \uC790\uB3D9 \uAC80\uC218 \uB300\uAE30 \uC911\uC785\uB2C8\uB2E4. \uBAA8\uB4E0 \uCE74\uB4DC\uB294 \uC774\uC801 \uCE74\uB4DC \uCE78\uC5D0\uC11C\uB3C4 \uD655\uC778\uD560 \uC218 \uC788\uACE0, \uC774 \uBCF4\uAE30\uC5D0\uC11C\uB294 \uAC80\uC218 \uD544\uC694 \uCE74\uB4DC\uB9CC \uBAA8\uC544\uBD05\uB2C8\uB2E4.`;
  }

  reviewCards.innerHTML = items
    .slice()
    .sort((a, b) => getTransferDateValue(b) - getTransferDateValue(a))
    .map((item) => {
      const reliabilityClass = getReliabilityClass(item.sourceReliability || "낮음");
      const missing = [];
      if (!item.player || item.player === "미상 선수") missing.push("선수");
      if (!item.fromTeam || ["미상", "미정", "소속팀 확인 중"].includes(item.fromTeam)) missing.push("이전 팀");
      if (!item.toTeam || ["미상", "미정", "소속팀 확인 중"].includes(item.toTeam)) missing.push("새 팀");
      const missingLabel = missing.length ? `${missing.join(", ")} 확인 필요` : "자동 검증 필요";

      return `
        <article class="card transfer-card review-card">
          <div class="card-top">
            <div class="player-heading">
              <img class="player-photo" src="${item.playerPhoto}" alt="${item.player} 프로필 사진" loading="lazy" onerror="this.onerror=null;this.src='${item.playerPhotoFallback}'" referrerpolicy="no-referrer" />
              <div>
                <div class="eyebrow">검수 필요 · ${item.league}</div>
                <h2 class="player">${item.player || "미상 선수"}</h2>
              </div>
            </div>
            <span class="badge review">확인 필요</span>
          </div>

          <div class="transfer-grid">
            <div>
              <strong>이전 팀</strong><br>
              <span class="team-line">
                <img class="club-logo" src="${item.fromLogo}" alt="${item.fromTeam || "미상"} 로고" loading="lazy" onerror="this.onerror=null;this.src='${item.fromLogoFallback}'" referrerpolicy="no-referrer" />
                <span>${item.fromTeam || "미상"}</span>
              </span>
            </div>
            <div>
              <strong>새 팀</strong><br>
              <span class="team-line">
                <img class="club-logo" src="${item.toLogo}" alt="${item.toTeam || "미상"} 로고" loading="lazy" onerror="this.onerror=null;this.src='${item.toLogoFallback}'" referrerpolicy="no-referrer" />
                <span>${item.toTeam || "미상"}</span>
              </span>
            </div>
            <div><strong>이적료</strong><br>${formatFeeDisplay(item.fee || "미정")}</div>
            <div><strong>기사 날짜</strong><br>${item.publishedAt || "시간 미상"}</div>
          </div>

          <div class="source-block review-details">
            <div class="review-warning">${missingLabel}. \uC774 \uCE74\uB4DC\uB294 \uC774\uC801 \uCE74\uB4DC \uCE78\uC5D0\uB3C4 \uD45C\uC2DC\uB418\uBA70, \uC6D0\uBB38 \uD655\uC778 \uC804\uC5D0\uB294 \uAC80\uC218 \uD544\uC694 \uC0C1\uD0DC\uB85C \uD45C\uC2DC\uB429\uB2C8\uB2E4.</div>
            <div class="source-link-box">
              <span>원문 링크</span>
              <a href="${item.sourceUrl || "#"}" target="_blank" rel="noreferrer">원문 열기 ↗</a>
            </div>
            <div class="source-meta">
              <span class="source-badge ${reliabilityClass}">출처 ${item.sourceReliability || "낮음"}</span>
              <span>${item.sourceName || "출처 미상"}</span>
              <span>${item.extractionPattern || "pattern-unknown"}</span>
              <span>자동 검증 ${item.lastVerifiedAt || "시간 미상"}</span>
              <span>?? ???? ${item.reviewSourceCheckedAt || "??"}</span>
            </div>
            <p class="source-note">${item.sourceReason || "선수·구단 정보를 자동으로 확정하지 못했습니다. 원문을 직접 확인해 주세요."}</p>
            <p class="review-headline">원문 제목: ${item.headlineTitle || "제목 없음"}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderLiveCards(items) {
  if (!liveCards) return;

  if (!items.length) {
    liveCards.innerHTML = `<article class="card empty">실시간 이적시장 헤드라인이 아직 없습니다.</article>`;
    return;
  }

  liveCards.innerHTML = items
    .map((item) => {
      const reliabilityClass = getReliabilityClass(item.sourceReliability || "보통");
      const badgeClass =
        item.status === "완료" ? "done" : item.status === "루머" ? "rumor" : "";

      return `
        <article class="card live-card">
          <div class="card-top">
            <div>
              <div class="eyebrow">${item.sourceName}</div>
              <h3 class="live-title">${item.title}</h3>
            </div>
            <span class="badge ${badgeClass}">${item.status}</span>
          </div>
          <p class="live-summary">${item.summary || "요약 없음"}</p>
          <div class="article-link-box">
            <span>기사 링크</span>
            <a href="${item.url}" target="_blank" rel="noreferrer">원문 열기 ↗</a>
          </div>
          <div class="live-meta">
            <span class="source-badge ${reliabilityClass}">신뢰도 ${item.sourceReliability}</span>
            <span>${item.sourceType || "실시간 헤드라인"}</span>
            <span>${item.publishedAt ? new Date(item.publishedAt).toLocaleString("ko-KR") : "시간 미상"}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function fetchJsonOrCache(apiPath, cachePath, force = false) {
  const apiUrl = `${apiPath}${force ? `?t=${Date.now()}` : ""}`;

  try {
    const response = await fetch(apiUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { payload: await response.json(), mode: "live connected" };
  } catch (apiError) {
    const response = await fetch(`${cachePath}${force ? `?t=${Date.now()}` : ""}`, {
      cache: "no-store",
    });
    if (!response.ok) throw apiError;
    return { payload: await response.json(), mode: "cloud cache" };
  }
}

async function loadLiveHeadlines(force = false) {
  if (!liveCards || !liveStatus) return;

  if (!window.location.protocol.startsWith("http")) {
    liveMode = "server required";
    liveStatus.textContent =
      "실시간 모드는 로컬 서버 실행 후 http://127.0.0.1:4173 로 열어야 합니다.";
    liveCards.innerHTML = `<article class="card empty">현재는 파일 모드라 실시간 피드를 직접 불러올 수 없습니다.</article>`;
    updateRefreshStatus();
    return;
  }

  liveStatus.textContent = force
    ? "실시간 피드를 새로고침하는 중..."
    : "실시간 피드를 불러오는 중...";

  try {
    const result = await fetchJsonOrCache("/api/live-headlines", "./cache/live-headlines.json", force);
    const { payload } = result;
    const items = payload.items.map((item) => enrichTransfer(item));
    liveHeadlineCount = payload.itemCount || items.length;
    renderStats();
    const healthSummary = (payload.sourceHealth || [])
      .map((entry) => `${entry.source}: ${entry.ok ? "OK" : "FAIL"}`)
      .join(" · ");

    renderLiveCards(items);
    liveMode = result.mode;
    liveStatus.textContent = `마지막 갱신 ${new Date(payload.fetchedAt).toLocaleString(
      "ko-KR"
    )} · ${healthSummary}`;
  } catch (error) {
    liveMode = "live failed";
    liveStatus.textContent = `실시간 피드 로드 실패: ${error.message}`;
    liveCards.innerHTML = `<article class="card empty">실시간 피드를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.</article>`;
  }

  updateRefreshStatus();
}

async function loadAutoDrafts(force = false) {
  if (!cards || !draftStatus) return;

  if (!window.location.protocol.startsWith("http")) {
    draftMode = "server required";
    draftStatus.textContent =
      "자동 초안 모드는 로컬 서버 실행 후 http://127.0.0.1:4173 로 열어야 합니다.";
    updateRefreshStatus();
    return;
  }

  draftStatus.textContent = force
    ? "자동 초안을 다시 생성하는 중..."
    : "실시간 헤드라인에서 자동 초안을 생성하는 중...";

  try {
    const result = await fetchJsonOrCache("/api/auto-drafts", "./cache/auto-drafts.json", force);
    const { payload } = result;
    const publishedItems = (payload.drafts || []).map((item) => enrichTransfer(item));
    reviewTransfers = (payload.reviewItems || []).map((item) => enrichTransfer(item));
    // Keep review items visible in the main transfer-card view instead of
    // hiding them; the separate review view remains available as a filter.
    const items = [...publishedItems, ...reviewTransfers];
    reviewItemCount = payload.reviewItemCount ?? reviewTransfers.length;
    autoDraftCount = items.length;
    rumorDraftCount = items.filter((item) => item.status === "\uB8E8\uBA38" || item.needsVerification).length;
    renderStats();
    autoDraftTransfers = items.map((item) => ({
      ...item,
      cardOrigin: item.needsVerification ? "\uAC80\uC218 \uD544\uC694 \uCE74\uB4DC" : "\uAE30\uC0AC \uC790\uB3D9 \uCD94\uCD9C",
    }));
    mergeAllTransfers();
    initFilters();
    renderCards();
    renderReviewCards(reviewTransfers);
    draftMode = result.mode;
    draftStatus.textContent = `마지막 생성 ${new Date(payload.generatedAt).toLocaleString(
      "ko-KR"
    )} ? \uC774\uC801 \uCE74\uB4DC ${items.length}\uAC1C (\uAC80\uC218 \uD544\uC694 ${reviewTransfers.length}\uAC1C)`;
  } catch (error) {
    draftMode = "draft failed";
    draftStatus.textContent = `자동 초안 생성 실패: ${error.message}`;
    autoDraftTransfers = [];
    reviewTransfers = [];
    reviewItemCount = 0;
    mergeAllTransfers();
    initFilters();
    renderCards();
    renderReviewCards(reviewTransfers);
  }

  updateRefreshStatus();
}

function updateRefreshStatus() {
  const now = new Date();
  refreshStatus.textContent = `${dataMode} · ${liveMode} · ${draftMode} · 환율 ${exchangeRates.updatedAt} ECB · ${now.toLocaleTimeString(
    "ko-KR"
  )}`;
}

cards.innerHTML = `<article class="card empty">데이터를 불러오는 중입니다.</article>`;
if (liveCards) {
  liveCards.innerHTML = `<article class="card empty">실시간 헤드라인을 불러오는 중입니다.</article>`;
}
if (draftCards) {
  draftCards.innerHTML = `<article class="card empty">자동 초안을 생성하는 중입니다.</article>`;
}
if (reviewCards) {
  reviewCards.innerHTML = `<article class="card empty">검수 대기 카드를 불러오는 중입니다.</article>`;
}
bindEvents();
loadAssetMap().finally(() => {
  loadTransfers();
  loadLiveHeadlines();
  loadAutoDrafts();
});
setInterval(updateRefreshStatus, 30000);
setInterval(() => loadLiveHeadlines(), 120000);
setInterval(() => loadAutoDrafts(), 120000);

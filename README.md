# 축구 이적시장 웹사이트 데모

이 폴더는 Obsidian vault 안에서 바로 열어볼 수 있는 정적 데모입니다.

## 파일

- `index.html`
- `styles.css`
- `app.js`
- `server.js`
- `transfers.json`
- `source-registry.js`
- `source-tier-list.md`

## 목적

- 실제 API 연결 전 화면 구조 검증
- 리그/팀 필터 흐름 확인
- 이적 완료 / 루머 카드 형태 확인

## 현재 상태

실데이터가 아니라 로컬 mock 데이터로 동작합니다.
이적 항목은 `transfers.json`에 분리되어 있습니다.
실시간 헤드라인은 `server.js`가 원격 피드를 읽어와 표시합니다.
실시간 헤드라인 기반 자동 카드 초안도 함께 생성합니다.
자동 초안 중 조건을 통과한 항목은 메인 노출 후보로 따로 승격됩니다.

## 추가된 표시

- 각 카드에 출처 링크 표시
- 출처 신뢰도(높음/보통/낮음) 배지 표시
- 출처 유형, 마지막 검증 시각, 간단한 판단 근거 표시
- 선수 프로필 사진 표시
- 이전 팀 / 새 팀 구단 로고 표시
- 이적료의 파운드화/원화 환산 표시
- 실시간 헤드라인 기반 자동 이적 카드 초안 표시
- 조건 충족 시 메인 노출 후보 자동 승격

> 주의: 현재 신뢰도 역시 mock 데이터 기준 데모입니다. 실제 서비스에서는 공식 발표, 1차 보도, 복수 교차검증 여부를 기준으로 계산해야 합니다.

## 이미지 처리 방식

- 현재는 Wikipedia/Wikimedia의 실제 선수 사진과 구단 로고 URL을 사용합니다.
- 이미지 로드가 실패하면 SVG 기반 플레이스홀더가 fallback으로 표시됩니다.
- 네트워크 없이 완전 오프라인으로 쓰려면 나중에 로컬 에셋 파일로 다시 내려받아 교체하면 됩니다.

## 출처 티어 기준

- `source-registry.js`: 사이트가 직접 참고하는 출처 데이터
- `source-tier-list.md`: 사람이 읽는 운영 기준 문서
- 앞으로 새 이적 항목을 넣을 때는 `sourceKey`를 먼저 정하고, 그 기준으로 신뢰도 배지를 붙입니다.

## 데이터 입력 방식

- 새 이적 항목은 `transfers.json`에 추가합니다.
- 각 항목에는 최소한 `player`, `fromTeam`, `toTeam`, `league`, `status`, `fee`, `sourceKey`, `publishedAt` 정도를 넣는 것을 권장합니다.
- 앱은 `sourceKey`를 기준으로 출처 이름/링크/신뢰도/유형을 자동으로 채웁니다.
- `transfers.json` 로딩이 실패하면 `app.js` 안의 fallback 데이터로 표시됩니다.

## 환율 표시 방식

- `€28M` 같은 표기는 화면에서 자동으로 `€28M (£... · 약 ...억 원)` 형태로 보입니다.
- 현재 환율 기준일은 `2026-08-12`이며 `ECB reference rates`를 사용합니다.
- `미정`, `임대`처럼 금액이 아닌 값은 그대로 표시됩니다.

## 실시간 모드 실행 방법

1. `app` 폴더에서 `node server.js`
2. 브라우저에서 `http://127.0.0.1:4173`
3. 앱이 BBC Sport RSS, Sky Sports football sitemap, ESPN FC, The Guardian Football RSS를 읽어 실시간 헤드라인을 2분마다 새로고침합니다.
4. Fabrizio Romano, David Ornstein, The Athletic, Gianluca Di Marzio 관련 Google News 검색 모니터도 함께 읽어 더 많은 이적 관련 헤드라인을 수집합니다.

### 참고

- 실시간 헤드라인은 기사 제목/요약 기준으로 transfer 키워드를 필터링한 결과입니다.
- 현재 자동 수집원은 총 8개입니다.
- 자동 카드 초안은 헤드라인 패턴 기반 추출이므로 100% 정확하지 않습니다.
- 확정 반영 전에는 기사 원문 확인이 필요합니다.
- 메인 노출 후보 규칙: `출처 중/상 + 추출 신뢰도 보통 이상`

<!-- static asset refresh -->

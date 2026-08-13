# 백그라운드 수집 안내

- `server.js`가 실행 중이면 브라우저를 닫아도 약 2분마다 자동 수집합니다.
- 수집 결과는 `cache/live-headlines.json`, `cache/auto-drafts.json`, `cache/promoted-candidates.json`에 저장됩니다.
- Windows 작업 스케줄러의 `YoochanTransferMarketBackground` 작업이 로그인할 때 서버를 자동 시작하도록 설정되어 있습니다.
- 컴퓨터가 꺼져 있거나 인터넷이 끊긴 동안에는 수집할 수 없습니다. 다시 켜거나 로그인하면 최신 수집을 재시도합니다.

상태 확인 주소: `http://127.0.0.1:4173/api/health`

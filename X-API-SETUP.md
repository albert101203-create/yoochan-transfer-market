# X 직접 모니터 설정

이 앱은 `X_BEARER_TOKEN`이 있을 때 X API의 최근 게시물 검색을 사용합니다.
현재 등록된 기자 계정의 공개 게시물을 5분 주기의 GitHub Actions에서 직접 확인합니다.

## 유찬이 한 번만 할 일

1. X Developer Console에서 프로젝트와 앱을 만듭니다.
2. 앱의 Bearer Token을 발급합니다.
3. GitHub 저장소의 `Settings → Secrets and variables → Actions`로 이동합니다.
4. Repository secret을 추가합니다.
   - 이름: `X_BEARER_TOKEN`
   - 값: X에서 발급한 Bearer Token
5. Actions 탭에서 `Transfer market collector`를 한 번 수동 실행합니다.

토큰은 채팅이나 코드 파일에 붙여넣지 마세요. GitHub Secret에만 저장해야 합니다.

## 현재 감시 계정

기본값:

```text
FabrizioRomano,David_Ornstein,Plettigoal,MatteoMoretto,Santi_J_FM
```

계정을 바꾸려면 GitHub Actions의 환경변수 `X_MONITORED_HANDLES`를 쉼표로 지정하면 됩니다.

토큰이 없으면 기존 RSS 수집만 계속 작동하고 X 수집은 자동으로 건너뜁니다.

# 컴퓨터가 꺼져도 수집하는 방법

이 앱은 GitHub Actions를 이용해 컴퓨터가 꺼져 있어도 10분마다 자료를 수집할 수 있도록 준비되어 있습니다.

## 최초 설정

1. `app` 폴더의 파일을 새 GitHub 저장소에 업로드합니다.
2. 저장소의 **Settings → Actions → General**에서 워크플로 실행과 쓰기 권한을 허용합니다.
3. **Actions → Transfer market collector → Run workflow**를 한 번 눌러 테스트합니다.
4. GitHub Actions가 `cache/*.json`을 갱신하고 자동 커밋합니다.

## 웹사이트 공개

GitHub 저장소의 **Settings → Pages**에서 `main` 브랜치와 `/ (root)`를 선택합니다. 이후 GitHub Pages 주소로 접속하면 API 서버가 없어도 `cache/*.json`을 읽어 최신 수집 결과를 보여줍니다.

## 주의

- GitHub Actions의 예약 실행은 정확히 10분마다 실행된다고 보장되지는 않으며, GitHub 상황에 따라 지연될 수 있습니다.
- Actions가 실행되려면 저장소가 GitHub에 있어야 합니다.
- 현재 로컬 PC의 Windows 자동 시작 작업은 그대로 유지됩니다. 클라우드 수집이 정상 작동하는 것을 확인한 뒤 로컬 작업을 꺼도 됩니다.

## IYK Code Files

- [frontend/](frontend/) — React SPA (Vite + TypeScript + Tailwind CSS + React Router + Zustand)
- [backend/](backend/) — Spring Boot 3.5 / Java 21 / Gradle. 구조는 [backend/README.md](backend/README.md) 참고.

API 계약·DB 스키마·MBTI 매핑 기준 문서는 [docs/md/](../docs/md/)

## 로컬에서 프론트+백엔드 함께 실행

1. 백엔드: `cd backend && ./gradlew bootRun` (Windows: `gradlew.bat bootRun`) → `http://localhost:8080`
2. 프론트: `cd frontend && npm ci && npm run dev` → `http://localhost:5173`

개발 서버는 `/api` 요청을 `localhost:8080`으로 프록시하므로([frontend/vite.config.ts](frontend/vite.config.ts)) 별도 설정이나 CORS 허용 없이 로그인·찜·후기가 실제 백엔드와 연결됩니다. 백엔드를 다른 주소에 배포하면 `VITE_API_BASE_URL`로 지정합니다([frontend/.env.example](frontend/.env.example)).

프론트에서 백엔드에 연결된 기능(2026-09-19 기준): 회원가입·로그인(JWT), 찜, 후기(댓글), 그리고 한국관광공사 TourAPI 기반의 **MBTI 추천·관광지 상세(사진·소개·이용시간)·연관 관광지·30일 혼잡도 예측·검색**. 프론트의 목데이터는 모두 제거됐습니다. 저장한 여행 경로와 경로 편집 상태는 백엔드 API가 없어서 브라우저 localStorage에만 저장됩니다. 카카오 지도는 아직 연동 전이라 경로 화면은 실제 좌표를 상대 위치로 옮긴 약식 지도입니다.

### TourAPI 인증키 설정 (백엔드)

한국관광공사 OpenAPI 인증키는 저장소에 올리지 않고 `backend/.env`에 둡니다(이 파일은 `.gitignore` 대상).

1. [backend/.env.example](backend/.env.example)을 `backend/.env`로 복사합니다.
2. 공공데이터포털에서 발급받은 키를 `TOURAPI_SERVICE_KEY=` 뒤에 붙여넣습니다(9개 API가 모두 같은 키). Encoding/Decoding 키 어느 쪽이든 됩니다.
3. 백엔드를 시작하면 충북 관광지 약 1,300곳과 혼잡도 예측을 자동으로 동기화합니다(약 10초, 이후 매일 새벽 4시 30분). 동기화가 끝나기 전에는 추천 API가 `503 DATA_NOT_READY`를 돌려주고, 프론트는 몇 초 간격으로 다시 시도합니다.

키가 없으면 서버는 뜨지만 관광지 데이터가 비어 있어 추천·상세 화면이 동작하지 않습니다.

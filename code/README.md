## IYK Code Files

- [frontend/](frontend/) — React SPA (Vite + TypeScript + Tailwind CSS + React Router + Zustand)
- [backend/](backend/) — Spring Boot 3.5 / Java 21 / Gradle. 구조는 [backend/README.md](backend/README.md) 참고.

API 계약·DB 스키마·MBTI 매핑 기준 문서는 [docs/md/](../docs/md/)

## 로컬에서 프론트+백엔드 함께 실행

1. 백엔드: `cd backend && ./gradlew bootRun` (Windows: `gradlew.bat bootRun`) → `http://localhost:8080`
2. 프론트: `cd frontend && npm ci && npm run dev` → `http://localhost:5173`

개발 서버는 `/api` 요청을 `localhost:8080`으로 프록시하므로([frontend/vite.config.ts](frontend/vite.config.ts)) 별도 설정이나 CORS 허용 없이 로그인·찜·후기가 실제 백엔드와 연결됩니다. 백엔드를 다른 주소에 배포하면 `VITE_API_BASE_URL`로 지정합니다([frontend/.env.example](frontend/.env.example)).

프론트에서 백엔드에 연결된 기능(2026-09-19 기준): 회원가입·로그인(JWT), 찜(`POST /api/spots/{id}/like`, `GET /api/me/likes`), 후기(댓글) 조회·작성·삭제. 추천·상세·경로·혼잡도는 TourAPI 연동 전이라 프론트가 아직 목데이터(`src/data/mockSpots.ts`)를 사용합니다. 저장한 여행 경로와 경로 편집 상태는 백엔드 API가 없어서 브라우저 localStorage에만 저장됩니다.

## IYK Code Files

- [frontend/](frontend/) — React SPA (Vite + TypeScript + Tailwind CSS + React Router + Zustand)
- [backend/](backend/) — Spring Boot 3.5 / Java 21 / Gradle. 구조는 [backend/README.md](backend/README.md) 참고.

API 계약·DB 스키마·MBTI 매핑 기준 문서는 [docs/md/](../docs/md/)

## 로컬에서 프론트+백엔드 함께 실행

1. 백엔드: `cd backend && ./gradlew bootRun` (Windows: `gradlew.bat bootRun`) → `http://localhost:8080`
2. 프론트: `cd frontend && npm ci && npm run dev` → `http://localhost:5173`

개발 서버는 `/api` 요청을 `localhost:8080`으로 프록시하므로([frontend/vite.config.ts](frontend/vite.config.ts)) 별도 설정이나 CORS 허용 없이 로그인·찜·후기가 실제 백엔드와 연결됩니다. 백엔드를 다른 주소에 배포하면 `VITE_API_BASE_URL`로 지정합니다([frontend/.env.example](frontend/.env.example)).

프론트에서 백엔드에 연결된 기능(2026-09-19 기준): 회원가입·로그인(JWT), 찜, 후기(댓글), 그리고 한국관광공사 TourAPI 기반의 **MBTI 추천·관광지 상세(사진·소개·이용시간)·연관 관광지·30일 혼잡도 예측·검색**. 프론트의 목데이터는 모두 제거됐습니다. 저장한 여행 경로와 경로 편집 상태는 백엔드 API가 없어서 브라우저 localStorage에만 저장됩니다. 카카오 지도(추천 결과·관광지 상세·여행 경로)는 코드 연동이 끝났고, JavaScript 키를 설정하면 실제 지도가 표시됩니다. 키가 없으면 결과 페이지는 안내 자리표시를, 경로 페이지는 실제 좌표를 상대 위치로 옮긴 약식 지도를 보여줍니다.

### TourAPI 인증키 설정 (백엔드)

한국관광공사 OpenAPI 인증키는 저장소에 올리지 않고 `backend/.env`에 둡니다(이 파일은 `.gitignore` 대상).

1. [backend/.env.example](backend/.env.example)을 `backend/.env`로 복사합니다.
2. 공공데이터포털에서 발급받은 키를 `TOURAPI_SERVICE_KEY=` 뒤에 붙여넣습니다(9개 API가 모두 같은 키). Encoding/Decoding 키 어느 쪽이든 됩니다.
3. 백엔드를 시작하면 충북 관광지 약 1,300곳과 혼잡도 예측을 자동으로 동기화합니다(약 10초, 이후 매일 새벽 4시 30분). 동기화가 끝나기 전에는 추천 API가 `503 DATA_NOT_READY`를 돌려주고, 프론트는 몇 초 간격으로 다시 시도합니다.

키가 없으면 서버는 뜨지만 관광지 데이터가 비어 있어 추천·상세 화면이 동작하지 않습니다.

### 카카오 지도 키 설정 (프론트)

1. [Kakao Developers](https://developers.kakao.com)에서 앱을 만들고 **[앱] > [플랫폼 키] > JavaScript 키**를 복사합니다(REST API 키가 아닙니다).
2. 그 키의 **JavaScript SDK 도메인**에 사이트 주소를 등록합니다. 개발 중에는 `http://localhost:5173`, 배포하면 배포 도메인도 추가합니다.
3. **[제품 설정] > [카카오맵] > [사용 설정]을 ON**으로 바꿉니다(2024년 12월부터 신규 앱은 필수).
4. `frontend/.env.local`에 `VITE_KAKAO_MAP_KEY=복사한키`를 넣고 개발 서버를 다시 시작합니다([frontend/.env.example](frontend/.env.example) 참고, `.env.local`은 커밋되지 않습니다).

지도를 불러오지 못하면(키·도메인·사용 설정 문제) 화면에 원인 안내가 표시되고 나머지 기능은 그대로 동작합니다. 관광지 상세의 "카카오맵에서 보기"·"길찾기" 링크는 키 없이도 동작합니다.

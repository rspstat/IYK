# 배포 가이드 (Render + Aiven MySQL)

무료 티어로 배포한다. 백엔드/프론트 둘 다 Render, DB는 Aiven(무료, 만료 없음, 카드 등록 불필요)을 쓴다.

- 백엔드: Render Web Service (Docker) — `code/backend/Dockerfile`
- 프론트: Render Static Site — `code/frontend`
- DB: Aiven MySQL 무료 플랜(1GB)
- 설정 파일: 루트의 [`render.yaml`](../../render.yaml) — Render 대시보드에서 "New > Blueprint"로 이 저장소를 고르면 위 두 서비스가 한 번에 생성된다.

Render 무료 웹 서비스는 15분간 요청이 없으면 슬립 상태가 되고, 다음 요청이 오면 다시 깨어나는 데 몇십 초 걸린다(첫 방문이 느린 건 정상).

## 0. 준비물

- GitHub에 이 저장소 push (Render는 GitHub 연동으로 배포)
- [Render](https://render.com) 계정 (GitHub으로 가입 가능)
- [Aiven](https://aiven.io) 계정 (카드 없이 가입, 무료 MySQL 서비스 생성)
- 기존에 쓰던 카카오 개발자 앱(REST API 키가 이미 `code/backend/.env`에 있는 그 앱)

## 1. Aiven에서 MySQL 만들기

1. Aiven 콘솔 → **Create service** → **MySQL** → **Free plan** 선택 → 리전 아무거나(가까운 곳) → 생성.
2. 서비스가 뜨면 **Overview** 탭에서 `Host`, `Port`, `User`(기본 `avnadmin`), `Password`, `Default database name` 확인.
3. JDBC URL을 아래 형식으로 조립해둔다(뒤에서 Render 환경변수에 그대로 넣음):
   ```
   jdbc:mysql://<Host>:<Port>/<Default database name>?useSSL=true&requireSSL=true&rewriteBatchedStatements=true&serverTimezone=Asia/Seoul
   ```

## 2. GitHub에 push

`render.yaml`, `code/backend/Dockerfile`이 이미 저장소에 있어야 한다(이번 작업으로 추가됨). 브랜치를 Render가 볼 수 있게 push.

## 3. Render Blueprint로 두 서비스 한 번에 생성

1. Render 대시보드 → **New** → **Blueprint** → 이 GitHub 저장소 선택 → 브랜치 선택 → **Apply**.
2. `render.yaml`에 있는 `sync: false` 항목들은 이 시점에 값을 입력하라고 뜬다. **1차 배포에서는 아래처럼 임시로 채워도 된다**(3-a 참고), 서로의 실제 주소는 배포가 끝난 뒤에 알 수 있기 때문이다.

### 3-a. 처음 채워 넣을 값

**iyk-backend**
| 키 | 값 |
|---|---|
| `SPRING_DATASOURCE_URL` | 1번에서 만든 JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | Aiven `avnadmin` |
| `SPRING_DATASOURCE_PASSWORD` | Aiven 비밀번호 |
| `JWT_SECRET` | 32자 이상 랜덤 문자열 (예: `openssl rand -hex 32` 결과) |
| `APP_CORS_ALLOWED_ORIGINS` | 일단 `http://localhost:5173` 그대로 둬도 됨(4번에서 실제 값으로 교체) |
| `TOURAPI_*`, `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET` | 지금 쓰는 `code/backend/.env` 값 그대로 복사 |

**iyk-frontend**
| 키 | 값 |
|---|---|
| `VITE_API_BASE_URL` | 일단 비워두거나 임시값(4번에서 교체) |
| (`VITE_KAKAO_JS_KEY`) | **입력 불필요** — 카카오 JavaScript 키가 `code/frontend/.env`에 커밋돼 있다. 다른 카카오 앱의 키를 쓸 때만 추가 |
| `VITE_PUBLIC_URL` | 일단 비워둬도 됨(4번에서 교체) |

## 4. 서로의 실제 주소로 교체 (첫 배포 후 1회)

배포가 끝나면 Render가 각 서비스에 `https://iyk-backend-xxxx.onrender.com`, `https://iyk-frontend-xxxx.onrender.com` 같은 주소를 준다(대시보드 상단에 표시).

1. **iyk-backend** 서비스 → Environment → `APP_CORS_ALLOWED_ORIGINS`를 프론트 주소로 교체: `https://iyk-frontend-xxxx.onrender.com`
2. **iyk-frontend** 서비스 → Environment →
   - `VITE_API_BASE_URL` = `https://iyk-backend-xxxx.onrender.com/api`
   - `VITE_PUBLIC_URL` = `https://iyk-frontend-xxxx.onrender.com`
3. 둘 다 저장하면 자동으로 재배포된다. 프론트는 빌드 타임에 환경변수를 주입하므로(Vite) **재빌드가 필요하다** — 저장하면 Render가 알아서 다시 빌드한다.

## 5. 카카오 개발자 콘솔에 배포 도메인 등록

기존에 쓰던 카카오 앱(백엔드 `.env`의 `KAKAO_REST_API_KEY`가 있는 그 앱)에 아래를 추가로 등록한다. localhost 항목은 지우지 말고 그대로 둔 채 추가만 하면 로컬 개발도 계속 된다.

- **[플랫폼] > [Web]**: `https://iyk-frontend-xxxx.onrender.com` 추가
- **[카카오 로그인] > [Redirect URI]**: `https://iyk-frontend-xxxx.onrender.com/auth/kakao/callback` 추가
- **[제품 설정] > [카카오맵] > [사용 설정]** ON 확인
- (카카오톡 공유도 쓴다면) **[제품 설정] > [카카오톡 공유] > [웹 도메인]**에도 같은 주소 추가

## 6. 확인

- `https://iyk-backend-xxxx.onrender.com/api/health` → `{"status":"ok"}`
- `https://iyk-frontend-xxxx.onrender.com` 접속 → 메인 화면, MBTI 클릭 → 지도까지 뜨는지
- 회원가입 → 새로고침해도 로그인 유지되는지(=MySQL에 실제로 저장됐는지)
- 카카오 로그인 버튼이 보이는지, 눌렀을 때 카카오 로그인 창으로 가는지

## 나중에 참고할 것

- **첫 요청이 느림**: Render 무료 플랜은 슬립에서 깨어나는 데 시간이 걸린다. 데모 발표 직전엔 미리 한 번 접속해서 깨워두는 게 좋다.
- **DB 스키마**: 아직 Flyway 같은 마이그레이션 도구가 없다. `spring.jpa.hibernate.ddl-auto=update`가 엔티티 기준으로 테이블을 자동 생성/보정한다(운영 단계에서 안전한 방식은 아니지만, 지금 규모에서는 충분).
- **환경변수 전체 목록**: [`render.yaml`](../../render.yaml)에 주석과 함께 정리되어 있다. 로컬 개발용 값은 `code/backend/.env.example`, `code/frontend/.env.example` 참고.

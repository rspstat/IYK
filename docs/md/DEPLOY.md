# 배포 현황 및 가이드 (Render + Aiven MySQL)

- 최종 갱신: 2026-09-21 (실제 배포 후 실주소로 동작 확인)
- 대상: 배포를 운영·수정하는 팀원. "지금 무엇이 어떻게 설정되어 있는지"(1~6장)와 "처음부터 다시 만드는 절차·장애 대응"(7~9장)을 함께 적었다.
- **이 문서에는 비밀번호·API 키·시크릿을 적지 않는다.** 그 값들은 Render 대시보드의 환경변수에만 있다(6장).

## 1. 한눈에 보기

| 항목 | 내용 |
|---|---|
| 서비스 주소(프론트) | **https://iyk-frontend.onrender.com** ← 공모전 제출용 홈페이지 주소 |
| API 주소(백엔드) | https://iyk-backend.onrender.com/api (상태 확인: `/api/health`) |
| 프론트 호스팅 | Render **Static Site** (무료, CDN, 잠들지 않음) |
| 백엔드 호스팅 | Render **Web Service (Docker)** (무료, 리전 Singapore, 15분 무요청 시 잠듦) |
| 데이터베이스 | **Aiven for MySQL** 무료 플랜(`Free-1-1gb`: 1 CPU / 1GB RAM / 1GB 저장, DigitalOcean 인도 벵갈루루), MySQL 8.4 |
| 배포 방식 | GitHub `rspstat/IYK`의 `main` 브랜치 push → Render가 자동 빌드·배포 (Blueprint: 루트 [`render.yaml`](../../render.yaml)) |
| 비용 | 전부 무료 티어, 카드 등록 없음 |

```
사용자 브라우저
   │  ① 화면(HTML/JS)                                 ② API 호출(fetch, CORS)
   ▼                                                    ▼
Render Static Site  ──(빌드 시 API 주소·카카오 키 주입)──▶  Render Web Service (Docker, Spring Boot)
iyk-frontend.onrender.com                           iyk-backend.onrender.com/api
                                                        │            │
                                     JDBC(SSL) ─────────┘            └───────▶ 한국관광공사 TourAPI
                                          ▼                                      (관광지 동기화, 서버에서만 호출)
                                Aiven MySQL (defaultdb)
브라우저 ─▶ 카카오(지도 SDK·공유·로그인 창) : 프론트 도메인을 카카오 콘솔에 등록해야 동작(5장)
```

## 2. 사용한 서비스와 도구

| 구분 | 사용한 것 | 역할 |
|---|---|---|
| 코드 저장소 | GitHub `rspstat/IYK` (`main` 단일 브랜치) | Render가 여기서 소스를 받아 빌드 |
| 호스팅 | Render (Blueprint) | 프론트 정적 사이트 + 백엔드 Docker 서비스 |
| DB | Aiven for MySQL (무료) | 회원·찜·댓글·프로필 사진·관광지 캐시·혼잡도 예측 저장 |
| 외부 API | 한국관광공사 TourAPI 9종 | 서버가 시작할 때·매일 새벽 동기화해 DB에 캐시 |
| 지도·공유·로그인 | Kakao Developers 앱 "여행가유" | 카카오맵 SDK, 카카오톡 공유, 카카오 로그인 |
| 빌드 | Docker 멀티스테이지(`eclipse-temurin:21-jdk` → `21-jre`), Gradle 8.14, Node 22.12 + Vite 8 | |
| 빌드 안정화 | Maven Central의 Google Cloud Storage 미러 | Render 빌드 IP가 Maven Central에서 429를 받는 문제 회피(8장) |
| 잠들기 방지(권장, 미적용) | UptimeRobot 무료 플랜 | 5분마다 `/api/health` 호출(9장) |

## 3. Render 서비스 설정 (`render.yaml` 기준)

[`render.yaml`](../../render.yaml)이 두 서비스의 설정 원본이다. **파일을 고쳐 push하면 Blueprint가 자동으로 반영**한다. 대시보드에서 직접 바꾼 값은 `sync: false` 환경변수(6장)를 제외하면 다음 동기화 때 파일 내용으로 되돌아갈 수 있으니, 설정은 파일에서 바꾼다.

### 3-1. 백엔드 `iyk-backend`

| 설정 | 값 | 이유 |
|---|---|---|
| 종류 / 런타임 | Web Service / Docker | |
| Dockerfile | `code/backend/Dockerfile`, 컨텍스트 `code/backend` | |
| 플랜 | `free` (512MB RAM) | |
| 리전 | `singapore` | DB가 인도라서 가까운 곳으로. 미국(기본값)이면 쿼리마다 왕복 지연이 커서 매우 느려진다 |
| 헬스체크 | `/api/health` | |
| 포트 | Render가 넣어 주는 `PORT` 환경변수를 사용 | `application.yml`의 `server.port: ${PORT:8080}` |

`code/backend/Dockerfile`이 하는 일:
1. **빌드 스테이지**(JDK 21): `./gradlew bootJar -x test`로 실행 jar 생성. Maven Central 대신 미러를 먼저 보게 하는 [`docker-mirror.init.gradle`](../../code/backend/docker-mirror.init.gradle)을 `--init-script`로 적용하고, 실패하면 30초 간격으로 최대 5회 재시도한다.
2. **실행 스테이지**(JRE 21): jar만 복사해 `java -XX:MaxRAMPercentage=75 -XX:+UseSerialGC -jar app.jar` 실행. 512MB 컨테이너에서 힙을 메모리의 75%까지 쓰고 작은 컨테이너에 맞는 SerialGC를 쓴다.
3. `ENV TZ=Asia/Seoul`: 서버 시간대를 한국으로 맞춘다. 안 하면 댓글 시간이 9시간 어긋난다(DB에는 시간대 없는 `LocalDateTime`을 저장하기 때문).

### 3-2. 프론트 `iyk-frontend`

| 설정 | 값 |
|---|---|
| 종류 | Static Site |
| 루트 디렉터리 | `code/frontend` |
| 빌드 명령 | `npm ci && npm run build` |
| 게시 폴더 | `./dist` |
| 라우팅 | `rewrite  /*  →  /index.html` (React Router의 `BrowserRouter`용) |
| Node 버전 | `NODE_VERSION=22.12.0` (Vite 8이 Node 20.19+/22.12+ 요구) |

> **주의:** rewrite의 `source`는 반드시 `/*`여야 한다. `/(.*)`처럼 쓰면 규칙이 적용되지 않아 `/result/ENFP`, `/mypage`, 카카오 로그인 콜백(`/auth/kakao/callback`)을 직접 열면 404가 난다(실제로 겪음).

프론트는 **빌드할 때** `VITE_*` 환경변수를 코드에 박아 넣는다. 그래서 값을 바꾸면 다시 빌드(재배포)해야 반영된다.

## 4. 데이터베이스 (Aiven MySQL)

| 항목 | 내용 |
|---|---|
| 플랜 | Free-1-1gb (무료, 카드 불필요) |
| 엔진 | MySQL 8.4, 접속 포트 13206, 사용자 `avnadmin`, 기본 DB `defaultdb` |
| 접속 정보 | Aiven 콘솔 → 서비스 → **Overview**의 Host / Port / User / Password |
| 연결 방식 | JDBC + SSL. 앱은 환경변수 `SPRING_DATASOURCE_*`로 받는다 |
| 스키마 | 앱이 시작할 때 `spring.jpa.hibernate.ddl-auto=update`로 엔티티 기준 테이블을 자동 생성·보정(마이그레이션 도구 없음). 테이블 설명은 [db-schema.md](db-schema.md) |

**JDBC URL 형식** (`SPRING_DATASOURCE_URL`):

```
jdbc:mysql://<Host>:<Port>/defaultdb?useSSL=true&requireSSL=true&rewriteBatchedStatements=true&serverTimezone=Asia/Seoul
```

| 파라미터 | 이유 |
|---|---|
| `useSSL=true&requireSSL=true` | Aiven은 SSL 접속만 허용 |
| `rewriteBatchedStatements=true` | 시작 동기화가 수천~1만 행을 저장하므로, JDBC 배치를 한 번에 합쳐 보내야 원격 DB에서도 빠르다(없으면 수십 분) |
| `serverTimezone=Asia/Seoul` | 날짜·시간 해석 기준 |

**저장 데이터와 동기화**
- 배포 직전에 한국관광공사 데이터(관광지 1,333곳, 혼잡도 예측 11,610행)를 미리 넣어 두었다. 회원·댓글 등 사용자 데이터는 비어 있는 상태로 시작했다.
- 백엔드는 시작할 때 마지막 동기화가 **20시간 이내면 건너뛰고**(`SpotSyncRunner`), 아니면 백그라운드로 동기화한다(약 1~7분, 그동안 추천 API는 `503 DATA_NOT_READY`). 이후 매일 04:30(한국 시간)에 다시 동기화한다. Render 무료 서비스가 잠들어 있으면 이 새벽 동기화는 못 돌 수 있다(9장의 잠들기 방지 참고).
- Aiven 무료 서비스는 사용이 없으면 **전원이 꺼질 수 있다**(콘솔에서 다시 켤 수 있음). 서비스가 Running이 되기 전에는 호스트 주소가 조회되지 않는다.
- Aiven은 기본키 없는 테이블 생성을 막는다(`sql_require_primary_key`). 그래서 시퀀스 테이블을 흉내 내는 `GenerationType.SEQUENCE`는 쓸 수 없다(8장).

## 5. 카카오 개발자 콘솔 설정

앱 "여행가유"에 **배포 주소를 추가로 등록**한다(기존 `http://localhost:5173` 항목은 지우지 않는다). 등록하지 않은 기능은 배포 주소에서 각각 동작하지 않는다.

| 기능 | 등록 위치 | 값 |
|---|---|---|
| 카카오맵 | 앱 → 플랫폼 키 → **JavaScript 키** → JavaScript SDK 도메인 (+ 후 저장) | `https://iyk-frontend.onrender.com` |
| 카카오톡 공유 | 앱 → **제품 링크 관리 → 웹 도메인** | `https://iyk-frontend.onrender.com` |
| 카카오 로그인 | 앱 → 플랫폼 키 → **REST API 키** → 리다이렉트 URI | `https://iyk-frontend.onrender.com/auth/kakao/callback` |
| 카카오 로그인 사용 | 제품 설정 → 카카오 로그인 → 사용 설정 | ON |
| 카카오맵 사용 | 제품 설정 → 카카오맵 → 사용 설정 | ON |

- 카카오 로그인은 서버가 카카오와 통신한다. 그래서 백엔드에 **REST API 키 + 클라이언트 시크릿**이 필요하고(6장), 프론트에 쓰는 **JavaScript 키와는 다른 키**다.
- 카카오는 설정이 틀려도 로그인 화면에 들어가기 전에는 오류(`KOE…`)를 보여주지 않는다. 등록 후에는 실제로 카카오 계정으로 한 번 로그인해 봐야 안다.

## 6. 환경변수 (값은 Render 대시보드에만 있음)

### 6-1. 백엔드 `iyk-backend`

| 환경변수 | 값 / 용도 | 어디서 정하나 |
|---|---|---|
| `SPRING_DATASOURCE_DRIVER` | `com.mysql.cj.jdbc.Driver` | `render.yaml`에 고정 |
| `SPRING_DATASOURCE_URL` | 4장의 JDBC URL | 대시보드 입력(`sync: false`) |
| `SPRING_DATASOURCE_USERNAME` | `avnadmin` | 대시보드 |
| `SPRING_DATASOURCE_PASSWORD` | Aiven 비밀번호 | 대시보드 |
| `JWT_SECRET` | 로그인 토큰 서명 키(32바이트 이상 랜덤 문자열). 바꾸면 기존 로그인이 모두 풀린다 | 대시보드 |
| `APP_CORS_ALLOWED_ORIGINS` | 프론트 주소 `https://iyk-frontend.onrender.com` (끝에 `/` 없이, 쉼표로 여러 개 가능) | 대시보드 |
| `TOURAPI_KEY_KOR` `_RELATED` `_PHOTO` `_CONGESTION` `_PET` `_BARRIER_FREE` `_WELLNESS` `_CAMPING` `_DURUNUBI` | 한국관광공사 API 9종 인증키(현재 9개가 같은 값) | 대시보드 |
| `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET` | 카카오 로그인용 | 대시보드 |
| `H2_CONSOLE_ENABLED` | `false` (H2 콘솔을 인증 없이 노출하지 않도록) | `render.yaml`에 고정 |
| `JPA_SHOW_SQL` | `false` (시작 동기화 때 SQL 로그가 폭증) | `render.yaml`에 고정 |

`PORT`는 Render가 자동으로 넣는다. `TOURAPI_SERVICE_KEY`(공용 키)는 9개를 따로 넣었기 때문에 쓰지 않는다.

### 6-2. 프론트 `iyk-frontend`

| 환경변수 | 값 / 용도 |
|---|---|
| `VITE_API_BASE_URL` | `https://iyk-backend.onrender.com/api` — 프론트가 호출할 백엔드 주소(끝에 `/api`) |
| `VITE_PUBLIC_URL` | `https://iyk-frontend.onrender.com` — 카카오톡·링크 공유에 쓰는 기준 주소 |
| `NODE_VERSION` | `22.12.0` (`render.yaml`에 고정) |
| 카카오 JavaScript 키 | 대시보드에 넣지 않는다. 저장소의 [`code/frontend/.env`](../../code/frontend/.env)(`VITE_KAKAO_MAP_KEY`)에 커밋되어 있다. 브라우저 코드에 그대로 노출되는 공개용 키이고 등록한 도메인에서만 동작한다. 다른 카카오 앱의 키를 쓰려면 `VITE_KAKAO_JS_KEY`를 추가한다(이 값이 우선, 빈 값은 무시) |

### 6-3. 저장소에 있는 것 / 없는 것

| 저장소에 있음(공개 가능) | 저장소에 없음(비밀) |
|---|---|
| `render.yaml`, `Dockerfile`, `docker-mirror.init.gradle` | DB 비밀번호, `JWT_SECRET` |
| 프론트 `.env`의 카카오 JavaScript 키 | TourAPI 키, 카카오 REST API 키·클라이언트 시크릿 |
| `.env.example` (이름과 설명만) | 로컬의 `code/backend/.env` (`.gitignore`) |

## 7. 배포하는 방법

### 7-1. 평소 (코드 수정 후)

`main`에 push하면 두 서비스가 자동으로 다시 빌드·배포된다(백엔드 5~10분, 프론트 2~3분). 자동 배포가 시작되지 않으면 Render 서비스 화면에서 **Manual Deploy → Deploy latest commit**을 누른다.

### 7-2. 환경변수를 바꿀 때

- Render 서비스 → **Environment**에서 값을 바꾸고 Save → 자동 재배포.
- 프론트의 `VITE_*` 값은 빌드에 박히므로 재빌드가 끝나야 반영된다.
- 백엔드 주소나 프론트 주소가 바뀌면 세 곳을 함께 맞춘다: 백엔드 `APP_CORS_ALLOWED_ORIGINS`, 프론트 `VITE_API_BASE_URL`·`VITE_PUBLIC_URL`, 그리고 카카오 콘솔(5장).

### 7-3. 처음부터 다시 만들 때

1. **Aiven:** Create service → MySQL → Free plan → 리전 선택 → 상태가 **Running**이 될 때까지 기다린다(꺼져 있으면 Power on). Host·Port·Password를 확인하고 4장 형식으로 JDBC URL을 만든다.
2. **Render:** 계정 가입(GitHub 연동) → New → **Blueprint** → `rspstat/IYK`의 `main` 선택 → 플랜이 Free, 백엔드 리전이 Singapore인지 확인.
3. Blueprint 화면에서 `sync: false` 환경변수(6장)를 채운다. 프론트의 `VITE_API_BASE_URL`·`VITE_PUBLIC_URL`은 아직 주소를 모르니 임시로 `http://localhost`를 넣는다.
4. **Apply** → 두 서비스가 Live가 될 때까지 기다린다. 두 서비스의 실제 주소가 나온다(이름이 이미 쓰였으면 뒤에 무작위 문자가 붙는다).
5. 실제 주소로 값을 교체하고 저장한다: 백엔드 `APP_CORS_ALLOWED_ORIGINS`, 프론트 `VITE_API_BASE_URL`, `VITE_PUBLIC_URL`. 자동 재배포가 끝나기를 기다린다.
6. 카카오 콘솔에 새 주소를 등록한다(5장).
7. 아래 확인 목록으로 검증한다.

### 7-4. 확인 목록

- `https://<백엔드>/api/health` → `{"status":"ok"}`
- `https://<백엔드>/api/auth/providers` → `{"kakao":true}`
- 프론트 접속 → MBTI 선택 → 추천 관광지와 지도가 표시된다.
- 회원가입 후 `/mypage`를 새로고침해도 로그인이 유지된다(MySQL에 저장됐다는 뜻).
- 마이페이지에서 닉네임 수정·프로필 사진 변경이 된다.
- 로그인 화면의 "카카오로 계속하기" → 카카오 로그인 창이 열리고, 실제로 로그인하면 돌아온다.
- `/result/ENFP`, `/mypage` 같은 주소를 직접 열어도 404가 나지 않는다.

**2026-09-21 배포 직후 실제 주소로 브라우저(Edge) 자동 점검을 한 결과, 위 항목 중 카카오 실제 로그인을 제외하고 모두 통과했다**(결과 페이지 관광지 12곳·지도, 회원가입, 새로고침 후 로그인 유지, 닉네임 수정, 프로필 사진, 상세 페이지 직접 접속, 카카오 로그인 버튼 → 카카오 로그인 창 이동). API 오류·콘솔 오류는 없었다.

## 8. 겪은 문제와 해결 (재발 방지용)

| 증상 | 원인 | 해결 |
|---|---|---|
| Docker 빌드가 `Could not GET ... gson ... 429 Too Many Requests`로 실패, 재시도 5회도 전부 실패 | Render 빌드 서버 IP가 Maven Central에서 계속 차단됨 | `docker-mirror.init.gradle`로 Google Cloud Storage의 Maven Central 미러를 먼저 조회(빌드에만 적용, 로컬 빌드 무관). Maven Central을 막고 캐시를 비운 상태에서 빌드가 되는 것까지 확인 |
| `/result/ENFP`, `/mypage`, 카카오 콜백을 직접 열면 404 | rewrite `source`를 `/(.*)`로 써서 규칙 미적용 | `source: /*`로 수정 |
| 프론트에서 API 호출이 CORS로 막힘(`403`) | 백엔드 `APP_CORS_ALLOWED_ORIGINS`가 임시값(`http://localhost:5173`) | 프론트 주소로 교체하고 백엔드 재배포 |
| 프로필 사진 저장 시 `500` (`Data too long for column 'data_url'`) | `@Lob String`이 MySQL에서 `tinytext`(255바이트)로 생성됨. H2에서는 드러나지 않음 | 컬럼 길이를 명시해 `mediumtext`로 생성 |
| 시작 동기화가 끝나지 않음(혼잡도 테이블 생성 오류) | `SEQUENCE` 생성 전략이 기본키 없는 번호표 테이블을 만드는데 Aiven이 차단 | `congestion_forecast.id`를 UUID로 변경 |
| 시작 동기화가 수십 분 걸림 | IDENTITY(AUTO_INCREMENT)는 JDBC 배치가 꺼지고, 원격 DB는 한 건마다 왕복 지연 | UUID id + `batch_size` + `rewriteBatchedStatements=true` (한국의 PC에서 인도 DB로 전체 동기화하는 데 약 7분 걸렸다. 배포 서버에서의 시간은 재보지 않았다) |
| DB 호스트가 조회되지 않음(NXDOMAIN) | Aiven 서비스가 아직 Building 중이거나 전원이 꺼져 있음 | 콘솔에서 Running 확인/Power on |
| 댓글 시간이 9시간 어긋날 위험 | 컨테이너 기본 시간대가 UTC | `TZ=Asia/Seoul` |
| 카카오 지도·공유가 빈 화면 | 카카오 콘솔에 배포 주소 미등록, 또는 `VITE_KAKAO_JS_KEY`를 빈 값으로 저장 | 5장 등록 / 프론트가 빈 값을 무시하고 저장소 키로 넘어가게 수정 |

## 9. 운영 시 알아둘 것

- **첫 접속이 느림:** Render 무료 백엔드는 15분간 요청이 없으면 잠들고, 다시 깨어나는 데 30~60초 걸린다. 프론트(정적 사이트)는 잠들지 않는다. **심사·발표 전에는 미리 한 번 접속해 깨워 둔다.**
- **잠들기 방지(권장, 아직 미적용):** [UptimeRobot](https://uptimerobot.com) 무료 플랜에서 HTTP 모니터를 만들어 `https://iyk-backend.onrender.com/api/health`를 5분 간격으로 호출한다. 이러면 새벽 04:30 동기화도 안정적으로 돈다.
- **로그 보기:** Render 서비스 화면의 **Logs**. 빌드 실패는 Events → 해당 배포 → deploy logs.
- **DB 직접 접속:** `mysql -h <Host> -P <Port> -u avnadmin --ssl-mode=REQUIRED defaultdb` (비밀번호는 Aiven 콘솔).
- **비밀번호를 바꿀 때:** Aiven에서 재설정하고 Render의 `SPRING_DATASOURCE_PASSWORD`도 같은 값으로 바꾼다(백엔드 재배포). *배포 작업 중 DB 비밀번호가 대화에 노출된 적이 있으므로 이 절차를 한 번 하는 것을 권장한다.*
- **JWT_SECRET을 바꾸면** 모든 사용자의 로그인이 풀린다.
- **무료 티어 한도:** 백엔드 RAM 512MB, Aiven 저장 1GB, 잠들기(위). TourAPI 개발 계정은 일 1,000건 수준의 호출 한도(국문 관광정보 기준)라 동기화를 자주 반복하면 소진될 수 있다(운영 계정 신청은 별도).
- **기존 MySQL을 재사용할 때:** 카카오 로그인 도입 전에 만든 `users` 테이블이 있으면 `ddl-auto: update`가 NOT NULL을 풀어 주지 않으므로 [db-schema.md](db-schema.md)의 `ALTER TABLE` 안내를 먼저 실행한다. 새 DB에는 필요 없다.

## 10. 남은 일

- [ ] UptimeRobot으로 백엔드 잠들기 방지
- [ ] Aiven 비밀번호 재설정 + Render `SPRING_DATASOURCE_PASSWORD` 갱신
- [ ] 배포 주소에서 카카오 실제 로그인 확인(콘솔 3곳 등록 후)
- [ ] TourAPI 운영 계정 신청(현재 개발 계정, 일 1,000건 수준 한도)
- [ ] (선택) 커스텀 도메인 연결 시 4개 위치 갱신: 백엔드 CORS, 프론트 `VITE_*`, 카카오 콘솔 3곳

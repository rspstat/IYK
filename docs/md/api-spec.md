# API 명세서 (v1.7)

- 작성일: 2026-07-13
- 회의록(2026-07-05)에서 합의한 대로, 이 문서가 확정되기 전까지는 프론트엔드/백엔드 어느 쪽도 응답 필드명을 임의로 바꾸지 않습니다. 변경이 필요하면 이 문서를 먼저 고치고 팀에 공유합니다.
- Base URL (로컬 개발): `http://localhost:8080/api`. 배포 URL은 미정.
- 담당 구분: 추천·상세·경로·혼잡도 = 외부 연동, 인증·좋아요·댓글 = 내부 로직.

## 공통 규칙

- 모든 요청/응답은 `application/json`.
- 인증이 필요한 요청은 `Authorization: Bearer <accessToken>` 헤더 사용.
- 에러 응답 공통 포맷:

  ```json
  { "error": { "code": "SPOT_NOT_FOUND", "message": "해당 관광지를 찾을 수 없습니다." } }
  ```

  서버가 만드는 모든 에러 응답(인증 실패·검증 실패·존재하지 않는 경로 포함)이 이 포맷을 따르며, 스택트레이스 등 내부 정보는 싣지 않습니다. 현재 구현된 `code`:

  | HTTP | code | 발생 상황 |
  |---|---|---|
  | 400 | `INVALID_REQUEST` | 비즈니스 규칙 위반(중복 이메일, 잘못된 MBTI 등), `@Valid` 검증 실패(`message`에 문제 필드명 포함), 깨지거나 빈 JSON 본문, 파라미터 형식 오류·누락 |
  | 401 | `UNAUTHORIZED` | 보호된 엔드포인트에 토큰이 없거나 만료·위조된 경우 |
  | 404 | `NOT_FOUND` | 존재하지 않는 경로 |
  | 404 | `SPOT_NOT_FOUND` | 없는 관광지 id (상세·연관·혼잡도) |
  | 405 | `METHOD_NOT_ALLOWED` | 경로는 맞지만 HTTP 메서드가 다른 경우 |
  | 415 등 | `INVALID_REQUEST` | Spring MVC가 정한 그 밖의 4xx (예: 지원하지 않는 Content-Type)는 원래 상태코드를 유지 |
  | 500 | `INTERNAL_ERROR` | 처리되지 않은 서버 오류 (상세는 서버 로그에만 기록) |
  | 502 | `KAKAO_ERROR` | 카카오 서버와 통신하지 못했거나 카카오가 5xx 로 응답한 경우 |
  | 502 | `UPSTREAM_ERROR` | 한국관광공사 API 장애·한도 초과 등으로 상세 정보를 못 받은 경우 (원인은 서버 로그에만 기록) |
  | 503 | `KAKAO_NOT_CONFIGURED` | 서버에 카카오 로그인 키(`KAKAO_REST_API_KEY`)가 설정되지 않은 경우 |
  | 503 | `DATA_NOT_READY` | 서버 시작 직후 TourAPI 동기화가 끝나기 전이라 관광지 데이터가 아직 비어 있는 경우. 잠시 후 재시도 |

  프론트는 HTTP 상태코드로 분기하고, 사용자에게 보여줄 문구는 `error.message`를 그대로 써도 됩니다(400/401은 한국어 문구).

- 공통 타입 `Spot`:

  ```ts
  {
    id: string
    name: string
    region: string
    category: "activity" | "wellness" | "nature" | "family" | "culture"
    congestion: "low" | "medium" | "high" | null   // 오늘 기준. null = 혼잡도 예측 정보 없음
    summary: string | null    // 소개글 앞부분(100자 안팎). 아직 없으면 주소로 대체
    imageUrl: string | null   // 대표 이미지(원본, 수백 KB)
    thumbnailUrl: string | null   // 목록용 작은 이미지(약 20KB). 화면은 thumbnailUrl ?? imageUrl
    mapx: number   // 경도
    mapy: number   // 위도
  }
  ```

  `id`는 TourAPI `contentId` 문자열이고, 고캠핑은 국문 관광정보와 id 가 겹칠 수 있어 `camp-` 접두어가 붙습니다(예: `camp-1441`). 카테고리 값은 [mbti-mapping.md](mbti-mapping.md) 기준.

  **혼잡도 `null`은 "모른다"는 뜻입니다.** 집중률 예측 API에는 contentId 가 없어 이름으로 관광지와 연결하는데, 충북 기준 관광지의 약 30%만 연결됩니다(2026-09-19 기준 1,333곳 중 387곳). 연결되지 않은 곳은 값을 지어내지 않고 `null`로 내려가며, 프론트는 뱃지를 숨기거나 "예측 정보 없음"으로 표시합니다.

---

## 인증 — 구현 완료

`AuthController`/`AuthService` 실제 동작. 비밀번호는 BCrypt로 해시 저장, 토큰은 JWT(HS512, 24시간 만료). `jwt.secret`은 `application.yml`에 개발용 기본값이 있고 `JWT_SECRET` 환경변수로 덮어쓸 수 있음 — 배포 전 반드시 교체.

### `POST /api/auth/register`

```json
// request
{ "email": "a@b.com", "password": "string", "nickname": "string" }

// response 201
{ "id": 1, "email": "a@b.com", "nickname": "string" }
```

이메일 중복 시 `400 INVALID_REQUEST` ("이미 가입된 이메일입니다.").

### `POST /api/auth/login`

```json
// request
{ "email": "a@b.com", "password": "string" }

// response 200
{ "accessToken": "jwt...", "user": { "id": 1, "nickname": "string" } }
```

이메일 없음/비밀번호 불일치 모두 동일하게 `400 INVALID_REQUEST` ("이메일 또는 비밀번호가 올바르지 않습니다.") — 계정 존재 여부가 드러나지 않도록 메시지를 통일함. 카카오로 가입한 계정은 이메일·비밀번호가 없어 이 방식으로는 로그인할 수 없다(같은 메시지).

### 카카오 로그인 (v1.5)

OAuth 인가 코드 방식이다. 서버가 카카오와 통신하고(클라이언트 시크릿은 서버 `.env`에만 있다), 프론트는 카카오 로그인 창으로 이동했다가 돌아온 `code`를 서버에 넘긴다. 카카오 콘솔에서 카카오 로그인 사용 설정 ON, 리다이렉트 URI 등록(`{프론트 주소}/auth/kakao/callback`)이 필요하다.

```
1. 프론트  GET  /api/auth/kakao/login-url?redirectUri=…&state=…  → { "url": "https://kauth.kakao.com/oauth/authorize?…" }
2. 브라우저 → 카카오 로그인·동의 → {redirectUri}?code=…&state=… 로 돌아옴 (프론트가 state 일치 확인)
3. 프론트  POST /api/auth/kakao { "code": "…", "redirectUri": "…" }  → 로그인 응답과 같은 형식
```

#### `GET /api/auth/providers`
로그인 방식별 사용 가능 여부. 프론트가 카카오 버튼을 보여줄지 정하는 데 쓴다.
```json
{ "kakao": true }
```

#### `GET /api/auth/kakao/login-url?redirectUri=…&state=…`
```json
// response 200
{ "url": "https://kauth.kakao.com/oauth/authorize?client_id=…&redirect_uri=…&response_type=code&state=…" }
```
`redirectUri`는 `http(s)://호스트/auth/kakao/callback` 형식이어야 하고(쿼리·해시 없음), `state`는 영문·숫자·`_`·`-` 1~128자. 아니면 `400 INVALID_REQUEST`. 서버에 카카오 키가 없으면 `503 KAKAO_NOT_CONFIGURED`.

#### `POST /api/auth/kakao`
```json
// request
{ "code": "카카오가 돌려준 인가 코드", "redirectUri": "인가 코드를 받을 때 쓴 redirect_uri 와 같은 값" }

// response 200 — POST /api/auth/login 과 같은 형식
{ "accessToken": "jwt...", "user": { "id": 7, "nickname": "길동" } }
```
- 처음 로그인하면 계정을 만들고, 이미 있으면 그 계정으로 로그인한다. 계정은 카카오 회원번호로만 구분하며, **이메일은 받지 않는다**(이메일로 가입한 계정과 자동으로 합치지 않는다).
- 닉네임은 카카오가 주면 그것을, 안 주면 `카카오사용자` + 회원번호 끝 4자리를 쓴다. 재로그인해도 닉네임을 덮어쓰지 않는다.
- 인가 코드가 만료됐거나 이미 썼거나 `redirectUri`가 다르면 `400 INVALID_REQUEST`("카카오 로그인 인증에 실패했어요…"), 카카오 서버 문제면 `502 KAKAO_ERROR`.

### `GET /api/me` — 로그인 필요 (v1.7)
내 정보. 프론트가 로그인할 때·새로고침할 때·마이페이지에 들어올 때 불러 저장된 표시 정보(이메일·닉네임·프로필 사진)를 서버 기준으로 맞춘다.
```json
// response 200
{ "id": 7, "email": "a@b.com", "nickname": "길동", "profileImage": "data:image/jpeg;base64,..." }
```
카카오 계정은 `email`이 `null`, 프로필 사진이 없으면 `profileImage`가 `null`.

### `PUT /api/me/profile-image` — 로그인 필요 (v1.7)
프로필 사진을 저장한다(사용자당 한 장, 다시 올리면 교체). 별도 파일 저장소 없이 data URL 문자열 그대로 DB에 넣는다.
```json
// request
{ "image": "data:image/jpeg;base64,/9j/4AAQ..." }

// response 200
{ "profileImage": "data:image/jpeg;base64,/9j/4AAQ..." }
```
- `image`는 `data:image/jpeg|png|webp;base64,…` 형식이어야 하고 디코딩한 크기가 **150KB 이하**여야 한다. 선언한 형식과 실제 파일 내용(매직 바이트)이 다르거나 SVG·HTML 등 다른 형식이면 `400 INVALID_REQUEST`.
- 프론트는 사용자가 고른 사진을 가운데 기준 정사각형으로 잘라 **256×256 JPEG**로 줄여서 보낸다(보통 20~30KB).

### `DELETE /api/me/profile-image` — 로그인 필요 (v1.7)
프로필 사진을 지운다. 응답 `204`. 원래 없어도 `204`.

### `PUT /api/me/nickname` — 로그인 필요 (v1.6)
마이페이지에서 닉네임을 바꾼다. 이메일·카카오 계정 모두 쓸 수 있다. (CORS 허용 메서드가 PUT 까지라 PATCH 대신 PUT)
```json
// request
{ "nickname": "새 닉네임" }

// response 200 — 로그인 응답의 user 와 같은 형식
{ "id": 7, "nickname": "새 닉네임" }
```
- 앞뒤 공백은 지우고 저장하며, 응답은 저장된 값이다.
- 비었거나(공백뿐 포함) 20자를 넘거나(글자 수 기준) 줄바꿈 같은 제어문자가 있으면 `400 INVALID_REQUEST`(사용자에게 보여줄 한국어 메시지 포함).
- 댓글의 `author`는 조회할 때마다 `users`에서 읽으므로 **이미 쓴 댓글에도 새 닉네임이 바로 반영**된다. 닉네임은 중복될 수 있다(구분은 `authorId`).
- 이미 발급된 JWT 안의 `nickname` 클레임은 갱신하지 않는다(서버는 이 클레임을 읽지 않으며, 프론트는 이 응답으로 표시 이름을 갱신한다).
- 토큰이 없거나 잘못되면 `401 UNAUTHORIZED`.

---

## 추천 — 구현 완료 (TourAPI 실데이터)

### `GET /api/recommendations?mbti=INFJ`

```json
// response 200
{
  "mbti": "INFJ",
  "category": "wellness",
  "style": { "title": "string", "description": "string", "tags": ["string"], "tip": "string" },
  "spots": [ /* Spot[] */ ]
}
```

`mbti`가 16개 유형이 아니면 `400 INVALID_REQUEST`. 대소문자는 구분하지 않습니다.

- `style`은 백엔드(`MbtiStyleData`)가 내려주는 유형별 여행 성향 문구입니다(프론트 `mbtiStyles.ts`와 같은 내용).
- `spots`는 유형의 카테고리에 속한 충북 관광지 최대 **12곳**입니다. 대표 이미지가 있고 혼잡도 예측이 있는 곳을 먼저 고르되 시군구당 3곳까지 담아 한 지역에 몰리지 않게 하며(모자라면 나머지로 채움), 같은 카테고리 유형끼리도 서로 다른 곳이 나오도록 유형마다 정렬 기준을 달리합니다. 같은 요청은 항상 같은 결과입니다.
- `family` 카테고리는 반려동물 동반여행·무장애 여행 정보에 등록된 관광지·문화시설·레포츠이고, 이 경우 `spots[].category`도 모두 `"family"`로 표기합니다.
- 서버 시작 직후 동기화가 끝나기 전에는 `503 DATA_NOT_READY`입니다.

---

## 관광지 상세

### `GET /api/spots/{id}`

```json
// response 200 — Spot 필드 + 아래 추가
{
  ...Spot,
  "description": "string | null",
  "address": "string | null",
  "operatingHours": "string | null",
  "tel": "string | null",
  "photos": ["string"],
  "petFriendly": false,
  "barrierFree": true
}
```

소개(`description`)·이용시간(`operatingHours`)·사진(`photos`)은 처음 조회할 때 TourAPI(`detailCommon2`, `detailIntro2`, `detailImage2`, 관광사진 정보)에서 받아 DB에 저장하고, 이후에는 캐시를 돌려줍니다(첫 조회 1초 안팎, 이후 즉시). 사진은 최대 10장이며 대표 이미지 → 상세 사진 → 관광사진 정보 순입니다. 정보가 없는 항목은 `null`(사진은 빈 배열 또는 대표 이미지 1장)입니다. `petFriendly`/`barrierFree`는 각각 반려동물 동반여행·무장애 여행 정보에 등록된 곳이라는 뜻입니다.

없는 id는 `404 SPOT_NOT_FOUND`. 한국관광공사 서버 장애로 처음 조회에 실패하면 `502 UPSTREAM_ERROR`(다음 조회 때 다시 시도).

### `GET /api/spots/{id}/related`

```json
// response 200
{ "spots": [ /* Spot[], 최대 6개 */ ] }
```

한국관광공사 「관광지별 연관 관광지 정보」(함께 방문한 관광지 순위)에서 이 관광지와 연관된 곳을 찾아 이름으로 우리 관광지와 연결하고, 6곳이 안 되면 가까운 관광지로 채웁니다. 연관 API가 실패해도 가까운 곳으로 응답합니다.

### `GET /api/spots/{id}/congestion?days=30`

```json
// response 200
{
  "spotId": "string",
  "forecast": [ { "date": "2026-09-19", "level": "medium", "score": 42.38 } ],
  "recommendedDates": ["2026-09-21", "2026-09-22", "2026-10-12"]
}
```

- `days`는 1~30(30 초과는 30으로 처리, 1 미만은 `400`). 오늘부터 `days`일치입니다.
- `score`는 집중률(%) 원값(0~100), `level`은 그 값을 나눈 등급입니다: `score < 33` → `low`, `< 58` → `medium`, 그 이상 → `high`. 충북 관광지 3,750개 일별 값의 분포(중앙값 42)를 기준으로 삼분위에 가깝게 잡았고, 절대적인 붐빔 정도가 아니라 예측 기간 안의 상대적 집중도입니다.
- `recommendedDates`는 조회 범위에서 `score`가 가장 낮은 3일(날짜순)입니다.
- **예측 정보가 없는 관광지는 `forecast`와 `recommendedDates`가 빈 배열**입니다(`spots[].congestion`이 `null`인 곳). 프론트는 "예측 정보 없음"으로 표시합니다.

### `GET /api/spots?ids=id1,id2,id3`

여러 관광지를 한 번에 조회합니다(찜 목록·저장한 경로 표시용). 요청한 순서를 유지하고 없는 id는 건너뜁니다. 최대 50개.

```json
// response 200
{ "spots": [ /* Spot[] */ ] }
```

### `GET /api/spots/search?q=단양&category=nature&limit=30`

이름·지역·요약에 `q`가 들어간 관광지. 모든 파라미터는 선택입니다. `category`는 5개 카테고리 중 하나(아니면 `400`, `family`는 반려동물·무장애 등록 시설), `limit`은 기본 30·최대 50. `q`가 비어 있으면 대표 이미지가 있는 곳 위주로 이름순 목록을 돌려줍니다.

```json
// response 200
{ "spots": [ /* Spot[] */ ] }
```

---

## 여행 경로

### `GET /api/routes?spots=id1,id2,id3`

```json
// response 200
{
  "spots": [
    { "id": "id1", "name": "string", "mapx": 127.489, "mapy": 36.641, "order": 1 }
  ]
}
```

`order`는 요청한 `spots` 쿼리 순서를 그대로 반영(경로 최적화는 범위 밖). 없는 id는 건너뛰며 최대 50개입니다. 지도 핀과 가까운 순 정렬에 쓰는 좌표(`mapx` 경도, `mapy` 위도)를 돌려줍니다.

---

## SNS 기능 — 구현 완료 (좋아요/댓글), 로그인 필요

`LikeController`/`CommentController` 실제 동작. `spotId`는 문자열 그대로 받아 저장하며 실존 관광지인지는 검증하지 않습니다(TourAPI 동기화 데이터로 검증하는 것은 추후 과제). 지금 화면이 쓰는 id 는 TourAPI `contentId`라서, TourAPI 연동 이전에 목데이터 id(`danyang-manchonha` 등)로 저장된 좋아요·댓글은 더 이상 화면에 연결되지 않습니다.

인증이 안 된 요청(토큰 없음/만료/위조)이 보호된 엔드포인트(좋아요/댓글 작성/삭제)에 오면 `401 UNAUTHORIZED` JSON을 반환합니다(v1.2부터. 이전에는 빈 본문 403). `GET /api/**`(댓글 목록 등)와 `/api/auth/**`, `/api/health`는 토큰 없이 호출할 수 있습니다.

### `POST /api/spots/{id}/like`

찜 토글 (있으면 취소, 없으면 추가).

```json
// response 200
{ "spotId": "string", "liked": true, "likeCount": 12 }
```

### `GET /api/me/likes` — 로그인 필요

내가 찜한 관광지 목록. 최근에 찜한 순. 새로고침·재로그인·다른 기기에서 찜 상태를 복원하는 용도(v1.3 추가). 토큰이 없으면 `401 UNAUTHORIZED`.

```json
// response 200
{ "likes": [ { "spotId": "string", "createdAt": "2026-07-13T10:00:00" } ] }
```

### `GET /api/spots/{id}/comments`

```json
// response 200
{ "comments": [ { "id": 1, "authorId": 3, "author": "string", "content": "string", "createdAt": "2026-07-13T10:00:00" } ] }
```

`authorId`(v1.3 추가)는 작성자의 `users.id`로, 로그인 응답의 `user.id`와 비교해 "내 댓글"에만 삭제 버튼을 보여주는 용도입니다. 닉네임은 중복될 수 있어서 `author`로 비교하지 않습니다.

### `POST /api/spots/{id}/comments`

```json
// request
{ "content": "string" }

// response 201
{ "id": 1, "authorId": 3, "author": "string", "content": "string", "createdAt": "2026-07-13T10:00:00" }
```

### `DELETE /api/comments/{commentId}`

응답 204, 본문 없음. 본인 댓글만 삭제 가능 — 아니면 `400 INVALID_REQUEST` ("본인 댓글만 삭제할 수 있습니다."). 존재하지 않는 댓글도 동일하게 400.

---

## 헬스체크

### `GET /api/health`

```json
{ "status": "ok" }
```

구현 완료 (`common/HealthController`).

---

## 변경 이력

- v1.0 (2026-07-13): 최초 작성.
- v1.1 (2026-08-02): 인증(회원가입/로그인, JWT)과 좋아요·댓글 CRUD 실제 구현 완료. 미인증 요청의 403 처리 관련 알려진 제약 기록.
- v1.2 (2026-09-19): 에러 응답 통일. 미인증 요청을 `401 UNAUTHORIZED` JSON으로 처리(커스텀 `AuthenticationEntryPoint`), `@Valid` 검증 실패·깨진 JSON·없는 경로·405·미처리 예외도 공통 에러 포맷으로 반환(이전에는 빈 본문 403 또는 기본 에러 페이지). 공통 규칙에 `code` 목록 추가.
- v1.3 (2026-09-19): 프론트 연동을 위해 하위 호환 확장 2건. 댓글 응답에 `authorId` 추가, `GET /api/me/likes`(내 찜 목록) 추가. 백엔드 통합 테스트(`ApiContractTests`)로 에러 포맷·찜·댓글 계약을 검증.
- v1.4 (2026-09-19): TourAPI 실연동. 추천·상세·연관·혼잡도·경로를 목데이터에서 실데이터(충북 관광지 약 1,300곳)로 교체. `Spot.congestion`이 `null` 가능(예측 정보 없음), `thumbnailUrl` 추가, 상세에 `tel`·`petFriendly`·`barrierFree` 추가, `GET /api/spots?ids=`·`GET /api/spots/search` 추가, 에러 코드 `SPOT_NOT_FOUND`·`DATA_NOT_READY`·`UPSTREAM_ERROR` 추가. 혼잡도 등급 기준(33/58)과 관광지 id 체계 명시.
- v1.5 (2026-09-19): 카카오 로그인 추가(`GET /api/auth/providers`, `GET /api/auth/kakao/login-url`, `POST /api/auth/kakao`). 카카오 계정은 이메일 없이 가입되며 `users`에 `provider`·`provider_id` 추가. 에러 코드 `KAKAO_NOT_CONFIGURED`·`KAKAO_ERROR`.
- v1.6 (2026-09-19): 닉네임 수정 `PUT /api/me/nickname` 추가(마이페이지 연필 버튼). 이미 쓴 댓글의 작성자명에도 바로 반영.
- v1.7 (2026-09-19): 프로필 사진 `PUT·DELETE /api/me/profile-image`, 내 정보 `GET /api/me` 추가(마이페이지 프로필 메뉴).

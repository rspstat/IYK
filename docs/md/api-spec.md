# API 명세서 (v1.3)

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
  | 405 | `METHOD_NOT_ALLOWED` | 경로는 맞지만 HTTP 메서드가 다른 경우 |
  | 415 등 | `INVALID_REQUEST` | Spring MVC가 정한 그 밖의 4xx (예: 지원하지 않는 Content-Type)는 원래 상태코드를 유지 |
  | 500 | `INTERNAL_ERROR` | 처리되지 않은 서버 오류 (상세는 서버 로그에만 기록) |

  프론트는 HTTP 상태코드로 분기하고, 사용자에게 보여줄 문구는 `error.message`를 그대로 써도 됩니다(400/401은 한국어 문구).

- 공통 타입 `Spot`:

  ```ts
  {
    id: string
    name: string
    region: string
    category: "activity" | "wellness" | "nature" | "family" | "culture"
    congestion: "low" | "medium" | "high"
    summary: string
    imageUrl: string | null
    mapx: number   // 경도
    mapy: number   // 위도
  }
  ```

  프론트엔드 `code/frontend/src/types.ts`의 `Spot`과 필드명을 맞췄습니다(`imageUrl`, `mapx`, `mapy`는 목데이터에는 없던 필드라 실 연동 시 프론트도 같이 업데이트 필요). 카테고리 값은 [mbti-mapping.md](mbti-mapping.md) 기준.

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

이메일 없음/비밀번호 불일치 모두 동일하게 `400 INVALID_REQUEST` ("이메일 또는 비밀번호가 올바르지 않습니다.") — 계정 존재 여부가 드러나지 않도록 메시지를 통일함.

---

## 추천 — 구현 상태: 목데이터로 동작 중

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

`mbti`가 16개 유형이 아니면 `400 INVALID_REQUEST`.

현재 `RecommendationController` → `RecommendationService`가 실제로 이 형식으로 응답하며, `spots`는 목데이터 1건 고정입니다. TourAPI 연동 시 이 계약(필드명/타입)을 유지한 채 내부 구현만 교체하면 됩니다.

---

## 관광지 상세

### `GET /api/spots/{id}`

```json
// response 200 — Spot 필드 + 아래 추가
{
  ...Spot,
  "description": "string",
  "address": "string",
  "operatingHours": "string",
  "photos": ["string"]
}
```

### `GET /api/spots/{id}/related`

```json
// response 200
{ "spots": [ /* Spot[], 최대 6개 */ ] }
```

### `GET /api/spots/{id}/congestion?days=30`

```json
// response 200
{
  "spotId": "string",
  "forecast": [ { "date": "2026-07-13", "level": "low", "score": 0 } ],
  "recommendedDates": ["2026-07-15", "2026-07-16"]
}
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

`order`는 요청한 `spots` 쿼리 순서를 그대로 반영(경로 최적화는 v1.0 범위 밖).

---

## SNS 기능 — 구현 완료 (좋아요/댓글), 로그인 필요

`LikeController`/`CommentController` 실제 동작. `spotId`는 지금은 TourAPI 캐시 없이 문자열 그대로 받아서 저장하며, 실존 관광지인지 검증하지 않음(TourAPI 연동 후 `spots_cache` 기준으로 검증 추가 예정).

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

# IYK Backend (Spring Boot)

Spring Boot 3.5 / Java 21 / Gradle 기반 백엔드입니다.

## 실행 방법

1. JDK 21 필요. `settings.gradle`에 foojay-resolver-convention 플러그인을 넣어뒀기 때문에, 로컬에 JDK 21이 없어도 `./gradlew build` 실행 시 Gradle이 알아서 JDK 21 툴체인을 내려받습니다(인터넷 필요).
2. `./gradlew bootRun` (Windows: `gradlew.bat bootRun`)
3. 기본 포트: `http://localhost:8080`. 헬스체크: `GET /api/health` → `{"status":"ok"}`
4. H2 콘솔(개발용 인메모리 DB): `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:iyk`, 유저 `sa`, 비밀번호 없음)

`./gradlew build`와 `bootRun`으로 헬스체크·추천·인증·좋아요·댓글까지 curl로 실제 기동 후 확인한 상태입니다.

## 패키지 구조

"외부 연동 vs 내부 로직" 담당 분리를 그대로 패키지로 반영했습니다.

```
com.iyk.backend
├── external/       # 외부 연동 — TourAPI 프록시, MBTI 추천 로직, 혼잡도 가공
│   ├── controller/ RecommendationController
│   ├── service/    RecommendationService (지금은 목데이터 반환)
│   └── dto/        SpotDto, MbtiStyleDto, RecommendationResponse
├── domain/         # 내부 로직 — DB 엔티티 · 리포지토리 · 인증/좋아요/댓글 API
│   ├── user/       User, UserRepository, AuthService, AuthController (회원가입/로그인)
│   ├── spot/       SpotCache, SpotCacheRepository (TourAPI 캐시, 아직 미사용)
│   ├── like/       Like, LikeRepository, LikeService, LikeController (찜 토글)
│   └── comment/    Comment, CommentRepository, CommentService, CommentController (댓글 CRUD)
├── config/         CorsConfig, SecurityConfig, JwtTokenProvider, JwtAuthenticationFilter
└── common/         HealthController, GlobalExceptionHandler
```

인증은 JWT(HS512, 24시간 만료) 방식입니다. 로그인 응답의 `accessToken`을 `Authorization: Bearer <token>` 헤더로 보내면 좋아요/댓글 작성·삭제가 가능합니다. GET 요청과 `/api/auth/**`는 인증 없이 열려 있습니다. `external` 쪽 `GET /api/recommendations?mbti=INFJ`는 여전히 목데이터로 동작하므로, 프론트엔드가 지금 바로 이 서버에 fetch해서 응답 형식을 검증할 수 있습니다.

API 계약 전체는 [docs/md/api-spec.md](../../docs/md/api-spec.md), DB 스키마는 [docs/md/db-schema.md](../../docs/md/db-schema.md), MBTI 카테고리 매핑 기준은 [docs/md/mbti-mapping.md](../../docs/md/mbti-mapping.md) 참고. 코드와 문서 중 하나를 바꾸면 반드시 다른 쪽도 맞춰주세요.

## CORS

로컬 프론트엔드(`http://localhost:5173`)에서의 요청만 우선 허용해뒀습니다(`config/CorsConfig.java`). 배포 도메인이 정해지면 여기에 추가해야 합니다.

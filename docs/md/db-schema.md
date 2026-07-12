# DB 스키마 초안 (v1.0)

- 작성일: 2026-07-13
- 담당: 내부 로직. 실제 JPA 엔티티는 `code/backend/src/main/java/com/iyk/backend/domain/`에 구현되어 있으며, 이 문서는 그 스키마를 사람이 읽기 쉽게 정리한 것입니다. 엔티티와 문서 중 하나를 바꾸면 반드시 다른 쪽도 맞춰주세요.
- 로컬 개발 DB: H2 인메모리(`jdbc:h2:mem:iyk`, MySQL 호환 모드), `ddl-auto: update`로 엔티티에서 스키마 자동 생성. 배포 시 MySQL로 전환 예정(드라이버 의존성은 이미 포함).

## ERD 요약

```
users (1) ──< likes >── (1) spots_cache
users (1) ──< comments >── (1) spots_cache
```

`spots_cache`는 TourAPI 원본 데이터를 캐싱하는 테이블이라 FK 제약은 애플리케이션 레벨에서만 관리합니다(외부 API 장애 시에도 좋아요/댓글 자체는 남아 있어야 하므로 DB FK로 강하게 묶지 않음).

## users

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT | |
| email | VARCHAR | UNIQUE, NOT NULL | 로그인 ID |
| password_hash | VARCHAR | NOT NULL | 평문 저장 금지, BCrypt 등 해시 |
| nickname | VARCHAR | NOT NULL | 댓글 작성자 표시명 |
| created_at | TIMESTAMP | | 가입일시 |

## spots_cache

TourAPI 국문관광정보 + 특화 API 응답을 주기적으로 동기화해 저장. TourAPI 호출량 제한 대응 및 목록 조회 성능 확보 목적.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | VARCHAR | PK | TourAPI `contentId` 그대로 사용 |
| name | VARCHAR | NOT NULL | |
| region | VARCHAR | | 예: "청주시" |
| area_code | VARCHAR | | TourAPI 지역코드 (충북 필터링용) |
| content_type_id | VARCHAR | | TourAPI 콘텐츠 분류 코드 |
| category | VARCHAR | | activity/wellness/nature/family/culture ([mbti-mapping.md](mbti-mapping.md)) |
| mapx | DOUBLE | | 경도 |
| mapy | DOUBLE | | 위도 |
| image_url | VARCHAR | | 대표 이미지 |
| summary | VARCHAR(1000) | | 목록용 한 줄 요약 |
| description | VARCHAR(4000) | | 상세 소개 |
| address | VARCHAR | | |
| operating_hours | VARCHAR | | |
| synced_at | TIMESTAMP | | 마지막 TourAPI 동기화 시각 |

## likes

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT | |
| user_id | BIGINT | NOT NULL | `users.id` (앱 레벨 참조) |
| spot_id | VARCHAR | NOT NULL | `spots_cache.id` (앱 레벨 참조) |
| created_at | TIMESTAMP | | |
| | | UNIQUE(user_id, spot_id) | 동일 유저-스팟 중복 좋아요 방지 |

인기 명소 집계는 `count(*) group by spot_id` 또는 `LikeRepository.countBySpotId`로 조회.

## comments

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT | |
| user_id | BIGINT | NOT NULL | |
| spot_id | VARCHAR | NOT NULL | |
| content | VARCHAR(1000) | NOT NULL | 여행 후기 텍스트 |
| created_at | TIMESTAMP | | |

## 향후 검토 (v1.0 범위 밖)

- 공유 로그 테이블(선택): 어떤 SNS로 몇 번 공유됐는지 집계하려면 `shares(id, user_id, spot_id, channel, created_at)` 추가 검토.
- `congestion_cache`: 관광지 집중률 방문자 추이 예측 API 응답을 매일 캐싱하고 싶다면 `spot_id, date, level, score, synced_at` 형태 테이블 추가 검토 — 지금은 실시간 호출로 충분한지 확인 후 필요 시 추가.

## 변경 이력

- v1.0 (2026-07-13): 최초 작성.

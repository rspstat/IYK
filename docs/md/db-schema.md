# DB 스키마 (v1.1)

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

TourAPI 국문관광정보 + 특화 API 응답을 서버 시작 시와 매일 새벽 4시 30분에 동기화해 저장. 개발계정 호출 한도(국문 관광정보 하루 1,000건) 대응 및 목록 조회 성능 확보 목적. 동기화 구현은 `external/sync/SpotSyncService`.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | VARCHAR | PK | TourAPI `contentId`. 고캠핑은 국문과 id 가 겹칠 수 있어 `camp-` 접두어(예: `camp-1441`) |
| name | VARCHAR | NOT NULL | |
| region | VARCHAR | | 시군구 이름. 예: "단양군", "청주시 상당구" |
| sigungu_code | VARCHAR | INDEX | 법정동 시군구 5자리(예: "43800"). 혼잡도·연관 관광지 API와 이름 매칭할 때 함께 쓴다 |
| area_code | VARCHAR | | 충북 = "43" (법정동 시도 코드 `lDongRegnCd`. 옛 `areaCode`=33 이 아님) |
| content_type_id | VARCHAR | | 관광지 12 / 문화시설 14 / 레포츠 28 / 고캠핑 "camp" |
| category | VARCHAR | INDEX | activity/wellness/nature/culture ([mbti-mapping.md](mbti-mapping.md)). family 는 아래 플래그로 판단 |
| mapx / mapy | DOUBLE | | 경도 / 위도 (좌표가 없는 항목은 저장하지 않음) |
| image_url | VARCHAR | | 대표 이미지(원본, 평균 500KB 안팎). https 로 변환해 저장 |
| thumbnail_url | VARCHAR | | 목록용 썸네일(평균 20KB). 없으면 null |
| summary | VARCHAR(1000) | | 목록용 한 줄 요약. 소개글에서 만들며, 목록에 처음 나올 때 채운다 |
| description | VARCHAR(4000) | | 상세 소개. 빈 문자열("")은 "조회했지만 소개가 없음"이라는 표시 |
| address | VARCHAR | | |
| operating_hours | VARCHAR(1000) | | "이용시간: … / 쉬는 날: …" |
| tel | VARCHAR | | |
| pet_friendly | BOOLEAN | | 반려동물 동반여행 서비스에 등록 |
| barrier_free | BOOLEAN | | 무장애 여행 정보에 등록 |
| photos_json | VARCHAR(4000) | | 상세 사진 URL 배열(JSON 문자열, 최대 10장) |
| detail_synced_at | TIMESTAMP | | 소개·이용시간·사진을 받아온 시각. null 이면 목록 정보만 있는 상태 — 상세를 처음 열 때 채운다 |
| synced_at | TIMESTAMP | | 목록 정보를 마지막으로 동기화한 시각 |

목록 동기화는 이미 받아 둔 상세 정보(description·summary·operating_hours·tel·photos_json·detail_synced_at)를 덮어쓰지 않고 이어받는다.

## congestion_forecast

관광지 집중률 방문자 추이 예측 정보(향후 30일)를 **이름(+시군구)으로 `spots_cache`에 매칭한 결과**만 저장한다. 집중률 API에 contentId 가 없기 때문이며, 매칭되지 않은 관광지는 행이 없다(=예측 정보 없음, 2026-09-19 기준 1,333곳 중 387곳만 연결). 이름 정규화는 `NameNormalizer`(공백·기호·괄호 무시).

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT | |
| spot_id | VARCHAR | NOT NULL, INDEX | `spots_cache.id` (앱 레벨 참조) |
| forecast_date | DATE | NOT NULL | |
| rate | DOUBLE | NOT NULL | 집중률(%) 원값. 등급은 33 미만 low / 58 미만 medium / 이상 high ([api-spec.md](api-spec.md)) |
| | | UNIQUE(spot_id, forecast_date) | |

동기화할 때마다 통째로 교체한다(하루 한 번). 일부 시군구 조회가 실패하면 부분 데이터로 덮어쓰지 않고 이전 예측을 유지한다.

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

## 변경 이력

- v1.0 (2026-07-13): 최초 작성.
- v1.1 (2026-09-19): TourAPI 실연동에 맞춰 `spots_cache` 컬럼 확장(시군구 코드·썸네일·전화·반려동물/무장애 플래그·상세 캐시)과 `congestion_forecast` 테이블 추가. area_code 를 법정동 코드(43)로 정정.

# MBTI → 카테고리 매핑 규칙 (v1.0)

- 작성일: 2026-07-13
- 이 문서는 [README.md](../../README.md)의 MBTI×API 매핑 표(5개 예시 유형)를 16개 전 유형으로 확장한 것으로, 프론트엔드(`code/frontend/src/data/mbtiStyles.ts`)와 백엔드(`code/backend/.../external/service/RecommendationService.java`)가 공유하는 단일 기준입니다. 한쪽만 고치면 반드시 다른 쪽도 맞춰야 합니다.

## 카테고리 정의

| 카테고리 ID | 라벨 | 활용 특화 API |
|---|---|---|
| `activity` | 액티비티·레저 중심 | 두루누비, 국문관광정보(레포츠) |
| `wellness` | 힐링·웰니스 중심 | 웰니스관광정보 |
| `nature` | 자연·캠핑 중심 | 고캠핑정보, 두루누비 |
| `family` | 동반·가족 중심 | 반려동물 동반여행, 무장애 여행정보 |
| `culture` | 문화·역사 중심 | 국문관광정보(문화시설·관광지) |

## 16개 유형 전체 매핑

| MBTI | 카테고리 |
|---|---|
| INTJ | culture |
| INTP | nature |
| ENTJ | culture |
| ENTP | activity |
| INFJ | wellness |
| INFP | wellness |
| ENFJ | family |
| ENFP | culture |
| ISTJ | nature |
| ISFJ | wellness |
| ESTJ | culture |
| ESFJ | family |
| ISTP | activity |
| ISFP | nature |
| ESTP | activity |
| ESFP | activity |

카테고리별 인원 수: culture 4 · activity 4 · wellness 3 · nature 3 · family 2.

## 비고

- 원본 README 표는 예시로 일부 유형(ISFJ)이 두 카테고리에 겹쳐 있었으나, 구현 편의를 위해 이 문서에서는 유형당 카테고리 1개로 확정했습니다(ISFJ → wellness).
- 유형별 여행 성향 한 줄 설명·태그·추천 팁 문구는 `code/frontend/src/data/mbtiStyles.ts`에 있습니다. 백엔드가 TourAPI 연동을 마치고 나면 이 문구도 백엔드 응답(`style` 필드, [api-spec.md](api-spec.md) 참고)으로 옮겨 단일 소스로 관리하는 것을 권장합니다.
- 실제 관광지 선별 시에는 카테고리만으로 끝나지 않고, 충북 지역코드(areaCode) 필터링과 각 특화 API 데이터를 함께 조합해야 합니다 (제안서 "데이터 활용 방안" 참고).

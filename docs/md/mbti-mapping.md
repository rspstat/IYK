# MBTI → 카테고리 매핑 규칙 (v1.0)

- 작성일: 2026-07-13
- 이 문서는 [README.md](../../README.md)의 MBTI×API 매핑 표(5개 예시 유형)를 16개 전 유형으로 확장한 것으로, 프론트엔드(`code/frontend/src/data/mbtiStyles.ts`)와 백엔드(`code/backend/.../external/service/RecommendationService.java`)가 공유하는 단일 기준입니다. 한쪽만 고치면 반드시 다른 쪽도 맞춰야 합니다.

## 카테고리 정의

| 카테고리 ID | 라벨 | 충북 관광지 후보 (2026-09-19 실데이터 기준) |
|---|---|---|
| `activity` | 액티비티·레저 중심 | 국문 관광정보 **레포츠(255)** + **체험관광**(신분류 `EX`, 관광지 중 117) |
| `wellness` | 힐링·웰니스 중심 | **웰니스관광정보(13)** + 온천·스파(구분류 `A02020300`) + 이름에 휴양림·치유·온천·스파·찜질·힐링·산림욕·족욕·명상이 든 곳 → 약 46곳 |
| `nature` | 자연·캠핑 중심 | **고캠핑(충북 227)** + 자연관광지(신분류 `NA`, 관광지 중 170) |
| `family` | 동반·가족 중심 | **반려동물 동반여행(120)** 또는 **무장애 여행(304)** 에 등록된 관광지·문화시설·레포츠(음식점·숙박·쇼핑은 제외) — 카테고리 컬럼이 아니라 `pet_friendly`/`barrier_free` 플래그로 판단 |
| `culture` | 문화·역사 중심 | 국문 관광정보 관광지 중 역사(`HS`, 338)·문화관광(`VE`, 123) + **문화시설(103)** |

한 관광지는 대표 카테고리 하나를 갖습니다(우선순위: 웰니스 > 레포츠 > 신분류 코드). 분류 규칙 구현은 `SpotCategoryClassifier`, 테스트는 `PureLogicTests`.

> **두루누비 정보 서비스는 충북 코스가 0건입니다.** 제공되는 140개 코스가 전부 해안·DMZ의 코리아둘레길(해파랑길·남파랑길·서해랑길·DMZ 평화의 길)이라 내륙인 충북에는 해당이 없습니다(2026-09-19 실호출 확인). 그래서 activity·nature 후보에서 두루누비를 뺐고, README·제출본 제안서에 적힌 "두루누비 활용"은 실제로는 구현되지 않습니다. 대신 국문 관광정보의 레포츠·체험, 고캠핑이 그 역할을 합니다.

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
- 유형별 여행 성향 문구는 백엔드 `MbtiStyleData`에 있고 `GET /api/recommendations`의 `style`로 내려갑니다(프론트 `code/frontend/src/data/mbtiStyles.ts`에서 옮겨온 같은 내용). 문구를 바꾸면 두 파일을 함께 고칩니다.
- 관광지 선별은 카테고리만으로 끝나지 않습니다. 충북 법정동 코드(`lDongRegnCd=43`)로 필터링한 관광공사 데이터를 카테고리로 나누고, 그 안에서 대표 이미지·혼잡도 예측이 있는 곳을 우선하며 시군구에 골고루 분산해 12곳을 고릅니다([api-spec.md](api-spec.md) 추천 참고).

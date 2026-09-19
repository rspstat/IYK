package com.iyk.backend.external.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

/**
 * TourAPI 항목을 서비스의 5개 카테고리(activity / wellness / nature / family / culture)로 분류한다.
 * 근거와 충북 데이터 규모는 docs/md/mbti-mapping.md 참고. family 는 분류가 아니라 반려동물·무장애 플래그로 따로 다룬다.
 */
public final class SpotCategoryClassifier {

    public static final String ACTIVITY = "activity";
    public static final String WELLNESS = "wellness";
    public static final String NATURE = "nature";
    public static final String CULTURE = "culture";

    /** 온천·스파 (신 분류체계가 아닌 구 분류코드 cat3). */
    private static final String HOT_SPRING_CAT3 = "A02020300";

    /** 이름에 이 낱말이 들어가면 힐링·웰니스로 본다. */
    private static final List<String> WELLNESS_KEYWORDS =
            List.of("휴양림", "치유", "온천", "스파", "찜질", "힐링", "산림욕", "족욕", "명상");

    private SpotCategoryClassifier() {}

    /**
     * 국문 관광정보(KorService2) 항목 분류.
     * 관광지(12)는 신 분류체계 lclsSystm1 로 나눈다: NA 자연 → nature, HS 역사 → culture, VE 문화관광 → culture, EX 체험 → activity.
     */
    public static String classifyKor(JsonNode item) {
        String title = item.path("title").asText("");
        if (isWellnessByName(title) || HOT_SPRING_CAT3.equals(item.path("cat3").asText())) {
            return WELLNESS;
        }
        return switch (item.path("contenttypeid").asText()) {
            case "14" -> CULTURE;
            case "28" -> ACTIVITY;
            default -> switch (item.path("lclsSystm1").asText()) {
                case "NA" -> NATURE;
                case "EX" -> ACTIVITY;
                case "HS", "VE" -> CULTURE;
                default -> "A01".equals(item.path("cat1").asText()) ? NATURE : CULTURE;
            };
        };
    }

    public static boolean isWellnessByName(String name) {
        return name != null && WELLNESS_KEYWORDS.stream().anyMatch(name::contains);
    }
}

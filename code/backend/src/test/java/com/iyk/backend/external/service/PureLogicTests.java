package com.iyk.backend.external.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class PureLogicTests {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static JsonNode item(String json) throws Exception {
        return MAPPER.readTree(json);
    }

    @Test
    void normalizerIgnoresSpacesPunctuationAndParentheses() {
        assertThat(NameNormalizer.normalize("고운골 남한강 갈대숲")).isEqualTo("고운골남한강갈대숲");
        assertThat(NameNormalizer.keys("각연사(괴산)")).contains("각연사괴산", "각연사");
        assertThat(NameNormalizer.keys("단양 구경-시장!")).containsExactly("단양구경시장");
        assertThat(NameNormalizer.keys(null)).isEmpty();
        assertThat(NameNormalizer.keys("()")).isEmpty();
    }

    @Test
    void levelsFollowTheDocumentedThresholds() {
        assertThat(CongestionLevel.fromRate(7.5)).isEqualTo("low");
        assertThat(CongestionLevel.fromRate(32.99)).isEqualTo("low");
        assertThat(CongestionLevel.fromRate(33)).isEqualTo("medium");
        assertThat(CongestionLevel.fromRate(57.99)).isEqualTo("medium");
        assertThat(CongestionLevel.fromRate(58)).isEqualTo("high");
        assertThat(CongestionLevel.fromRate(100)).isEqualTo("high");
    }

    @Test
    void textCleanerTurnsHtmlIntoPlainText() {
        assertThat(TextCleaner.paragraphs("첫 줄<br>둘째&nbsp;줄<br/><br/><br/>셋째 <b>줄</b> &amp; 끝")).isEqualTo("첫 줄\n둘째 줄\n\n셋째 줄 & 끝");
        assertThat(TextCleaner.oneLine("09:00~18:00<br>매주 월요일 휴무")).isEqualTo("09:00~18:00 / 매주 월요일 휴무");
        assertThat(TextCleaner.oneLine("  <br>연중무휴<br> ")).isEqualTo("연중무휴");
        assertThat(TextCleaner.oneLine(null)).isEmpty();
    }

    @Test
    void summaryCutsAtASentenceBoundaryWithinAHundredChars() {
        String sentence = "남한강을 따라 이어지는 아름다운 갈대숲으로 가을이면 은빛 물결이 장관을 이룬다.";
        assertThat(TextCleaner.summary(sentence)).isEqualTo(sentence);
        String longText = sentence + " " + "가".repeat(200);
        assertThat(TextCleaner.summary(longText)).isEqualTo(sentence);
        assertThat(TextCleaner.summary("가".repeat(300))).hasSize(101).endsWith("…");
    }

    @Test
    void chungbukRegionCodes() {
        assertThat(ChungbukRegions.sigunguCode5("800")).isEqualTo("43800");
        assertThat(ChungbukRegions.name("800")).isEqualTo("단양군");
        assertThat(ChungbukRegions.name("999")).isEqualTo("충청북도");
        assertThat(ChungbukRegions.codeFromName("제천시")).isEqualTo("43150");
        assertThat(ChungbukRegions.codeFromName("서울")).isNull();
        assertThat(ChungbukRegions.congestionCodes()).hasSize(14).doesNotContain("43110");
    }

    @Test
    void classifiesTouristSpotsByNewClassificationSystem() throws Exception {
        assertThat(SpotCategoryClassifier.classifyKor(item("{\"title\":\"화양구곡\",\"contenttypeid\":\"12\",\"lclsSystm1\":\"NA\"}")))
                .isEqualTo("nature");
        assertThat(SpotCategoryClassifier.classifyKor(item("{\"title\":\"충주 탄금대\",\"contenttypeid\":\"12\",\"lclsSystm1\":\"HS\"}")))
                .isEqualTo("culture");
        assertThat(SpotCategoryClassifier.classifyKor(item("{\"title\":\"청남대\",\"contenttypeid\":\"12\",\"lclsSystm1\":\"VE\"}")))
                .isEqualTo("culture");
        assertThat(SpotCategoryClassifier.classifyKor(item("{\"title\":\"건지마을\",\"contenttypeid\":\"12\",\"lclsSystm1\":\"EX\"}")))
                .isEqualTo("activity");
    }

    @Test
    void contentTypeOverridesForCultureFacilitiesAndLeports() throws Exception {
        assertThat(SpotCategoryClassifier.classifyKor(item("{\"title\":\"국립청주박물관\",\"contenttypeid\":\"14\",\"lclsSystm1\":\"VE\"}")))
                .isEqualTo("culture");
        assertThat(SpotCategoryClassifier.classifyKor(item("{\"title\":\"단양 패러글라이딩\",\"contenttypeid\":\"28\"}")))
                .isEqualTo("activity");
    }

    @Test
    void wellnessByHotSpringCodeOrNameKeywordTakesPrecedence() throws Exception {
        assertThat(SpotCategoryClassifier.classifyKor(item("{\"title\":\"앙성온천지구\",\"contenttypeid\":\"12\",\"lclsSystm1\":\"NA\",\"cat3\":\"A02020300\"}")))
                .isEqualTo("wellness");
        assertThat(SpotCategoryClassifier.classifyKor(item("{\"title\":\"소선암자연휴양림\",\"contenttypeid\":\"12\",\"lclsSystm1\":\"NA\"}")))
                .isEqualTo("wellness");
        assertThat(SpotCategoryClassifier.classifyKor(item("{\"title\":\"제천킹스파찜질방\",\"contenttypeid\":\"28\"}")))
                .isEqualTo("wellness");
    }

    @Test
    void fallsBackToOldCategoryWhenNewOneIsMissing() throws Exception {
        assertThat(SpotCategoryClassifier.classifyKor(item("{\"title\":\"어느 산\",\"contenttypeid\":\"12\",\"cat1\":\"A01\"}")))
                .isEqualTo("nature");
        assertThat(SpotCategoryClassifier.classifyKor(item("{\"title\":\"어느 곳\",\"contenttypeid\":\"12\"}")))
                .isEqualTo("culture");
    }
}

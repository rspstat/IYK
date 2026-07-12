package com.iyk.backend.external.service;

import com.iyk.backend.external.dto.MbtiStyleDto;
import com.iyk.backend.external.dto.RecommendationResponse;
import com.iyk.backend.external.dto.SpotDto;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * MBTI 유형을 성향 카테고리로 매핑하고 추천 명소를 조합하는 서비스.
 * 카테고리 배정 근거는 docs/md/mbti-mapping.md 참고.
 * TODO: 지금은 목데이터를 반환한다. TourAPI 국문관광정보 + 특화 API(반려동물/무장애/웰니스/고캠핑/두루누비) 호출로 교체하고,
 * 충북 지역코드(areaCode) 필터링을 적용해야 한다.
 */
@Service
public class RecommendationService {

    private static final Map<String, String> MBTI_CATEGORY = Map.ofEntries(
            Map.entry("INTJ", "culture"),
            Map.entry("INTP", "nature"),
            Map.entry("ENTJ", "culture"),
            Map.entry("ENTP", "activity"),
            Map.entry("INFJ", "wellness"),
            Map.entry("INFP", "wellness"),
            Map.entry("ENFJ", "family"),
            Map.entry("ENFP", "culture"),
            Map.entry("ISTJ", "nature"),
            Map.entry("ISFJ", "wellness"),
            Map.entry("ESTJ", "culture"),
            Map.entry("ESFJ", "family"),
            Map.entry("ISTP", "activity"),
            Map.entry("ISFP", "nature"),
            Map.entry("ESTP", "activity"),
            Map.entry("ESFP", "activity"));

    public RecommendationResponse getRecommendations(String mbti) {
        String upper = mbti.toUpperCase();
        String category = MBTI_CATEGORY.get(upper);
        if (category == null) {
            throw new IllegalArgumentException("Unknown MBTI type: " + mbti);
        }

        List<SpotDto> spots = List.of(
                SpotDto.builder()
                        .id("mock-spot-1")
                        .name("목데이터 관광지")
                        .region("청주시")
                        .category(category)
                        .congestion("low")
                        .summary("TourAPI 연동 전 임시 목데이터입니다.")
                        .imageUrl(null)
                        .mapx(127.489)
                        .mapy(36.641)
                        .build());

        MbtiStyleDto style = MbtiStyleDto.builder()
                .title("여행 스타일 준비 중")
                .description("MBTI별 상세 여행 성향 문구는 추후 추가됩니다.")
                .tags(List.of())
                .tip("추천 팁은 추후 추가됩니다.")
                .build();

        return RecommendationResponse.builder()
                .mbti(upper)
                .category(category)
                .style(style)
                .spots(spots)
                .build();
    }
}

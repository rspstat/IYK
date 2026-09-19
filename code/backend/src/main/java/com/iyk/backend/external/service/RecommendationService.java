package com.iyk.backend.external.service;

import com.iyk.backend.domain.spot.CongestionForecastRepository;
import com.iyk.backend.domain.spot.SpotCache;
import com.iyk.backend.domain.spot.SpotCacheRepository;
import com.iyk.backend.external.dto.RecommendationResponse;
import com.iyk.backend.external.dto.SpotDto;
import com.iyk.backend.external.exception.DataNotReadyException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * MBTI 유형 → 카테고리 → 충북 관광지 추천.
 * 카테고리 배정 근거는 docs/md/mbti-mapping.md, 후보 데이터는 TourAPI 동기화 결과(spots_cache)다.
 */
@Service
@RequiredArgsConstructor
public class RecommendationService {

    static final int LIMIT = 12;
    /** 한 시군구에 몰리지 않도록 처음에는 시군구당 이 수까지만 담는다. */
    private static final int PER_SIGUNGU = 3;
    static final String FAMILY = "family";

    private final SpotCacheRepository spotRepository;
    private final CongestionForecastRepository congestionRepository;
    private final SpotEnrichmentService enrichmentService;
    private final SpotMapper spotMapper;

    public RecommendationResponse getRecommendations(String mbti) {
        MbtiStyleData.Entry entry = MbtiStyleData.find(mbti);
        if (entry == null) {
            throw new IllegalArgumentException("알 수 없는 MBTI 유형입니다: " + mbti);
        }
        String upper = mbti.trim().toUpperCase();
        String category = entry.category();

        List<SpotCache> candidates = FAMILY.equals(category) ? spotRepository.findFamilyCandidates() : spotRepository.findByCategory(category);
        if (candidates.isEmpty() && spotRepository.count() == 0) {
            throw new DataNotReadyException();
        }

        List<SpotCache> picked = pick(candidates, upper);
        // 목록 카드에 한 줄 요약을 보여주려고, 고른 곳만 소개글을 받아 채운다(한 번 받으면 DB에 남는다).
        List<SpotCache> enriched = enrichmentService.ensureSummaries(picked);
        List<SpotDto> spots = spotMapper.toDtos(enriched, category);

        return RecommendationResponse.builder().mbti(upper).category(category).style(entry.style()).spots(spots).build();
    }

    /**
     * 대표 이미지가 있고 혼잡도 예측이 있는 곳을 먼저, 같은 조건 안에서는 MBTI 유형마다 다른 순서(유형+id 해시)로 고른다.
     * 그래서 같은 카테고리인 유형끼리도 서로 다른 곳을 추천받는다. 결과는 항상 같은 입력에 같은 출력이다.
     */
    List<SpotCache> pick(List<SpotCache> candidates, String mbti) {
        Set<String> withForecast = Set.copyOf(congestionRepository.findSpotIdsWithForecastFrom(LocalDate.now()));
        Comparator<SpotCache> order =
                Comparator.comparingInt((SpotCache spot) -> -score(spot, withForecast))
                        .thenComparingInt(spot -> Math.floorMod((mbti + spot.getId()).hashCode(), 1_000_003))
                        .thenComparing(SpotCache::getId);
        List<SpotCache> sorted = candidates.stream().sorted(order).toList();

        List<SpotCache> picked = new ArrayList<>();
        Map<String, Integer> perSigungu = new HashMap<>();
        for (SpotCache spot : sorted) {
            String region = String.valueOf(spot.getSigunguCode());
            if (perSigungu.getOrDefault(region, 0) < PER_SIGUNGU) {
                picked.add(spot);
                perSigungu.merge(region, 1, Integer::sum);
            }
            if (picked.size() == LIMIT) {
                return picked;
            }
        }
        for (SpotCache spot : sorted) { // 시군구 상한 때문에 모자라면 나머지에서 채운다
            if (picked.size() == LIMIT) {
                break;
            }
            if (!picked.contains(spot)) {
                picked.add(spot);
            }
        }
        return picked;
    }

    private static int score(SpotCache spot, Set<String> withForecast) {
        return (spot.getImageUrl() != null ? 2 : 0) + (withForecast.contains(spot.getId()) ? 1 : 0);
    }
}

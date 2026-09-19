package com.iyk.backend.external.service;

import com.iyk.backend.domain.spot.SpotCache;
import com.iyk.backend.domain.spot.SpotCacheRepository;
import com.iyk.backend.external.dto.RouteResponse;
import com.iyk.backend.external.dto.SpotDetailDto;
import com.iyk.backend.external.dto.SpotDto;
import com.iyk.backend.external.exception.SpotNotFoundException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** 관광지 상세·연관·검색·일괄 조회·경로. */
@Service
@RequiredArgsConstructor
public class SpotQueryService {

    static final int MAX_IDS = 50;
    static final int DEFAULT_LIMIT = 30;
    static final int MAX_LIMIT = 50;
    private static final Set<String> CATEGORIES = Set.of("activity", "wellness", "nature", "family", "culture");

    private final SpotCacheRepository spotRepository;
    private final SpotEnrichmentService enrichmentService;
    private final RelatedSpotService relatedSpotService;
    private final SpotMapper spotMapper;

    public SpotDetailDto detail(String id) {
        SpotCache spot = enrichmentService.ensureDetail(find(id));
        return SpotDetailDto.builder()
                .id(spot.getId())
                .name(spot.getName())
                .region(spot.getRegion())
                .category(spot.getCategory())
                .congestion(spotMapper.todayLevel(spot.getId()))
                .summary(spot.getSummary())
                .imageUrl(spot.getImageUrl())
                .mapx(spot.getMapx())
                .mapy(spot.getMapy())
                .description(blankToNull(spot.getDescription()))
                .address(spot.getAddress())
                .operatingHours(spot.getOperatingHours())
                .tel(spot.getTel())
                .photos(enrichmentService.photosOf(spot))
                .petFriendly(spot.isPetFriendly())
                .barrierFree(spot.isBarrierFree())
                .build();
    }

    public List<SpotDto> related(String id) {
        List<SpotCache> related = relatedSpotService.related(find(id));
        return spotMapper.toDtos(enrichmentService.ensureSummaries(related), null);
    }

    /** ids 순서를 유지해서 돌려준다. 없는 id 는 건너뛴다(찜한 뒤 데이터에서 사라진 경우 등). */
    public List<SpotDto> byIds(List<String> ids) {
        return spotMapper.toDtos(loadInOrder(ids), null);
    }

    public RouteResponse route(List<String> ids) {
        List<SpotCache> spots = loadInOrder(ids);
        List<RouteResponse.Stop> stops = new ArrayList<>();
        for (int i = 0; i < spots.size(); i++) {
            SpotCache spot = spots.get(i);
            stops.add(new RouteResponse.Stop(spot.getId(), spot.getName(), spot.getMapx(), spot.getMapy(), i + 1));
        }
        return new RouteResponse(stops);
    }

    /**
     * 이름·지역·요약 검색. category 가 있으면 그 카테고리만(family 는 반려동물·무장애 시설). 검색어가 비어 있으면 이미지가 있는 곳 위주로
     * 이름순 목록을 돌려준다.
     */
    public List<SpotDto> search(String q, String category, Integer limit) {
        if (category != null && !category.isBlank() && !CATEGORIES.contains(category)) {
            throw new IllegalArgumentException("category 는 " + CATEGORIES + " 중 하나여야 합니다.");
        }
        String query = q == null ? "" : q.trim();
        String categoryFilter = category == null || category.isBlank() ? null : category;
        int max = limit == null ? DEFAULT_LIMIT : Math.max(1, Math.min(limit, MAX_LIMIT));

        List<SpotCache> found;
        if (RecommendationService.FAMILY.equals(categoryFilter)) {
            String lowered = query.toLowerCase();
            found = spotRepository.findFamilyCandidates().stream().filter(spot -> matches(spot, lowered)).toList();
        } else {
            found = spotRepository.search(query, categoryFilter);
        }
        List<SpotCache> ordered =
                found.stream()
                        .sorted(Comparator.comparingInt((SpotCache spot) -> spot.getImageUrl() != null ? 0 : 1).thenComparing(SpotCache::getName))
                        .limit(max)
                        .toList();
        return spotMapper.toDtos(ordered, RecommendationService.FAMILY.equals(categoryFilter) ? categoryFilter : null);
    }

    private static boolean matches(SpotCache spot, String loweredQuery) {
        return loweredQuery.isEmpty()
                || spot.getName().toLowerCase().contains(loweredQuery)
                || (spot.getRegion() != null && spot.getRegion().toLowerCase().contains(loweredQuery))
                || (spot.getSummary() != null && spot.getSummary().toLowerCase().contains(loweredQuery));
    }

    private List<SpotCache> loadInOrder(List<String> ids) {
        if (ids.size() > MAX_IDS) {
            throw new IllegalArgumentException("한 번에 최대 " + MAX_IDS + "개까지 조회할 수 있습니다.");
        }
        Map<String, SpotCache> byId = new LinkedHashMap<>();
        spotRepository.findByIdIn(ids).forEach(spot -> byId.put(spot.getId(), spot));
        return ids.stream().distinct().map(byId::get).filter(java.util.Objects::nonNull).toList();
    }

    private SpotCache find(String id) {
        return spotRepository.findById(id).orElseThrow(() -> new SpotNotFoundException(id));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}

package com.iyk.backend.external.service;

import static com.iyk.backend.external.client.TourApiEndpoints.CHUNGBUK;
import static com.iyk.backend.external.client.TourApiEndpoints.RELATED_LIST;

import com.fasterxml.jackson.databind.JsonNode;
import com.iyk.backend.domain.spot.SpotCache;
import com.iyk.backend.domain.spot.SpotCacheRepository;
import com.iyk.backend.external.client.TourApiClient;
import com.iyk.backend.external.config.TourApiService;
import java.time.Duration;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * "이런 곳도 가보세요": 관광지별 연관 관광지 정보(TarRlteTarService1)로 함께 방문한 곳을 찾고, 모자라면 가까운 관광지로 채운다.
 * 연관 관광지 API는 contentId 없이 이름만 오므로 이름(NameNormalizer)으로 우리 관광지와 맞춘다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RelatedSpotService {

    static final int LIMIT = 6;
    private static final int MAX_MONTHS_BACK = 14;

    /** 연관 후보 한 줄: 연관 관광지 이름과 그 시군구(5자리). */
    private record Candidate(String name, String sigunguCode) {}

    private final TourApiClient client;
    private final SpotCacheRepository spotRepository;

    /** 시군구 → (정규화한 기준 관광지 이름 → 연관 후보, 순위 순). 시군구 하나가 한 번의 조회로 채워져서 12시간 캐시한다. */
    private final TtlCache<String, Map<String, List<Candidate>>> bySigungu = new TtlCache<>(Duration.ofHours(12));

    /** 데이터가 있었던 마지막 기준월(YYYY-MM). 다음 조회는 그 근처부터 시작한다. */
    private volatile YearMonth workingBaseYm;

    public List<SpotCache> related(SpotCache spot) {
        Map<String, SpotCache> chosen = new LinkedHashMap<>();
        if (spot.getSigunguCode() != null && client.hasKey(TourApiService.RELATED)) {
            try {
                Map<String, List<SpotCache>> poolBySigungu = new HashMap<>();
                for (Candidate candidate : candidatesFor(spot)) {
                    List<SpotCache> pool =
                            poolBySigungu.computeIfAbsent(candidate.sigunguCode(), code -> spotRepository.findBySigunguCode(code));
                    for (SpotCache match : matches(candidate.name(), pool)) {
                        if (!match.getId().equals(spot.getId())) {
                            chosen.putIfAbsent(match.getId(), match);
                        }
                    }
                    if (chosen.size() >= LIMIT) {
                        break;
                    }
                }
            } catch (RuntimeException e) {
                log.warn("연관 관광지 조회 실패 [{}]: {}", spot.getId(), e.getMessage());
            }
        }
        if (chosen.size() < LIMIT) {
            fillWithNearby(spot, chosen);
        }
        return chosen.values().stream().limit(LIMIT).toList();
    }

    private List<Candidate> candidatesFor(SpotCache spot) {
        Map<String, List<Candidate>> byName = bySigungu.get(spot.getSigunguCode(), () -> load(spot.getSigunguCode()));
        for (String key : NameNormalizer.keys(spot.getName())) {
            List<Candidate> candidates = byName.get(key);
            if (candidates != null) {
                return candidates;
            }
        }
        return List.of();
    }

    /** 최신 기준월부터 거슬러 올라가며 데이터가 있는 달을 찾는다(공개 시점이 한 달 이상 늦을 수 있다). */
    private Map<String, List<Candidate>> load(String sigunguCode) {
        YearMonth now = YearMonth.now();
        YearMonth known = workingBaseYm;
        YearMonth start = known == null ? now : (known.plusMonths(1).isAfter(now) ? now : known.plusMonths(1));
        for (int back = 0; back <= MAX_MONTHS_BACK; back++) {
            YearMonth baseYm = start.minusMonths(back);
            List<JsonNode> rows =
                    client.fetchAll(
                            TourApiService.RELATED,
                            RELATED_LIST,
                            Map.of("baseYm", baseYm.toString().replace("-", ""), "areaCd", CHUNGBUK, "signguCd", sigunguCode),
                            1000);
            if (!rows.isEmpty()) {
                workingBaseYm = baseYm;
                return group(rows);
            }
        }
        return Map.of();
    }

    private static Map<String, List<Candidate>> group(List<JsonNode> rows) {
        List<JsonNode> ranked = new ArrayList<>(rows);
        ranked.sort(Comparator.comparingInt(row -> row.path("rlteRank").asInt(Integer.MAX_VALUE)));
        Map<String, List<Candidate>> grouped = new HashMap<>();
        for (JsonNode row : ranked) {
            String related = row.path("rlteTatsNm").asText("");
            String relatedSigungu = row.path("rlteSignguCd").asText("");
            if (related.isBlank() || relatedSigungu.isBlank()) {
                continue;
            }
            for (String key : NameNormalizer.keys(row.path("tAtsNm").asText())) {
                grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(new Candidate(related, relatedSigungu));
            }
        }
        return grouped;
    }

    private static List<SpotCache> matches(String name, List<SpotCache> pool) {
        Set<String> keys = NameNormalizer.keys(name);
        return pool.stream().filter(spot -> NameNormalizer.keys(spot.getName()).stream().anyMatch(keys::contains)).toList();
    }

    /** 연관 정보로 6곳을 못 채우면 충북 전체에서 가까운 순(대개 같은 시군구)으로 채운다. */
    private void fillWithNearby(SpotCache spot, Map<String, SpotCache> chosen) {
        if (spot.getMapx() == null || spot.getMapy() == null) {
            return;
        }
        List<SpotCache> nearby =
                spotRepository.findAll().stream()
                        .filter(other -> !other.getId().equals(spot.getId()) && !chosen.containsKey(other.getId()))
                        .filter(other -> other.getMapx() != null && other.getMapy() != null)
                        .sorted(Comparator.comparingDouble(other -> distanceKm(spot, other)))
                        .limit(LIMIT)
                        .toList();
        for (SpotCache other : nearby) {
            if (chosen.size() >= LIMIT) {
                break;
            }
            chosen.putIfAbsent(other.getId(), other);
        }
    }

    /** 두 관광지 사이 직선거리(km, Haversine). */
    static double distanceKm(SpotCache a, SpotCache b) {
        double earthRadius = 6371;
        double dLat = Math.toRadians(b.getMapy() - a.getMapy());
        double dLng = Math.toRadians(b.getMapx() - a.getMapx());
        double h =
                Math.sin(dLat / 2) * Math.sin(dLat / 2)
                        + Math.cos(Math.toRadians(a.getMapy())) * Math.cos(Math.toRadians(b.getMapy())) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * earthRadius * Math.asin(Math.sqrt(h));
    }
}

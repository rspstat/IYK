package com.iyk.backend.external.sync;

import static com.iyk.backend.external.client.TourApiEndpoints.BARRIER_FREE_LIST;
import static com.iyk.backend.external.client.TourApiEndpoints.CAMPING_LIST;
import static com.iyk.backend.external.client.TourApiEndpoints.CHUNGBUK;
import static com.iyk.backend.external.client.TourApiEndpoints.CONGESTION_LIST;
import static com.iyk.backend.external.client.TourApiEndpoints.KOR_LIST;
import static com.iyk.backend.external.client.TourApiEndpoints.PET_LIST;
import static com.iyk.backend.external.client.TourApiEndpoints.WELLNESS_LIST;

import com.fasterxml.jackson.databind.JsonNode;
import com.iyk.backend.domain.spot.CongestionForecast;
import com.iyk.backend.domain.spot.CongestionForecastRepository;
import com.iyk.backend.domain.spot.SpotCache;
import com.iyk.backend.domain.spot.SpotCacheRepository;
import com.iyk.backend.external.client.TourApiClient;
import com.iyk.backend.external.config.TourApiService;
import com.iyk.backend.external.service.ChungbukRegions;
import com.iyk.backend.external.service.NameNormalizer;
import com.iyk.backend.external.service.SpotCategoryClassifier;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 충북 관광지 데이터를 TourAPI 에서 받아 DB 캐시(spots_cache, congestion_forecast)에 채운다.
 * 개발계정 호출 한도(국문 관광정보 하루 1,000건) 때문에 화면 요청마다 호출하지 않고, 서버 시작 시와 매일 새벽에 한 번 동기화한다.
 * 소스별로 실패를 격리해서 한 API가 죽어도 나머지는 반영한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SpotSyncService {

    private static final int PAGE_SIZE = 100;
    private static final List<String> KOR_CONTENT_TYPES = List.of("12", "14", "28");
    private static final DateTimeFormatter BASE_YMD = DateTimeFormatter.BASIC_ISO_DATE;
    public static final String CAMPING_ID_PREFIX = "camp-";

    private final TourApiClient client;
    private final SpotCacheRepository spotRepository;
    private final CongestionForecastRepository congestionRepository;
    private final TransactionTemplate transactionTemplate;

    private final AtomicBoolean running = new AtomicBoolean(false);

    public boolean isRunning() {
        return running.get();
    }

    /** 동기화 결과 요약 (로그·테스트용). */
    public record Summary(int spots, int spotsWithForecast, List<String> failures, boolean skipped) {}

    public Summary syncAll() {
        if (!running.compareAndSet(false, true)) {
            log.info("TourAPI 동기화가 이미 진행 중이라 건너뜁니다.");
            return new Summary(0, 0, List.of(), true);
        }
        long started = System.currentTimeMillis();
        List<String> failures = new ArrayList<>();
        try {
            Map<String, SpotCache> spots = new LinkedHashMap<>();
            Map<String, SpotCache> existing = new HashMap<>();
            spotRepository.findAll().forEach(spot -> existing.put(spot.getId(), spot));
            LocalDateTime now = LocalDateTime.now();

            runStep("국문 관광정보", failures, () -> loadKorSpots(spots, now));
            runStep("반려동물 동반여행", failures, () -> markFlags(spots, TourApiService.PET, PET_LIST, true, now));
            runStep("무장애 여행", failures, () -> markFlags(spots, TourApiService.BARRIER_FREE, BARRIER_FREE_LIST, false, now));
            runStep("웰니스관광", failures, () -> loadWellness(spots, now));
            runStep("고캠핑", failures, () -> loadCamping(spots, now));

            if (spots.isEmpty()) {
                // 국문 관광정보까지 실패했다면 기존 캐시를 그대로 둔다.
                log.warn("TourAPI 동기화: 받아온 관광지가 없어 기존 캐시를 유지합니다.");
                return new Summary(0, 0, failures, false);
            }
            List<SpotCache> merged = new ArrayList<>();
            spots.forEach((id, fresh) -> merged.add(mergeExisting(fresh, existing.get(id))));
            transactionTemplate.executeWithoutResult(status -> spotRepository.saveAll(merged));

            int withForecast = syncCongestion(merged, failures);
            log.info(
                    "TourAPI 동기화 완료: 관광지 {}곳, 혼잡도 예측 연결 {}곳, 실패 {}건, {}ms",
                    merged.size(),
                    withForecast,
                    failures.size(),
                    System.currentTimeMillis() - started);
            return new Summary(merged.size(), withForecast, failures, false);
        } finally {
            running.set(false);
        }
    }

    private void runStep(String name, List<String> failures, Runnable step) {
        try {
            step.run();
        } catch (RuntimeException e) {
            // TourApiException 메시지에는 키·주소가 들어 있지 않다.
            log.warn("TourAPI 동기화 단계 실패 [{}]: {}", name, e.getMessage());
            failures.add(name);
        }
    }

    // ---- 관광지 ----

    private void loadKorSpots(Map<String, SpotCache> spots, LocalDateTime now) {
        for (String contentType : KOR_CONTENT_TYPES) {
            List<JsonNode> items =
                    client.fetchAll(
                            TourApiService.KOR,
                            KOR_LIST,
                            Map.of("lDongRegnCd", CHUNGBUK, "contentTypeId", contentType),
                            PAGE_SIZE);
            for (JsonNode item : items) {
                SpotCache spot = fromKorItem(item, now);
                if (spot != null) {
                    spots.put(spot.getId(), spot);
                }
            }
        }
    }

    /** 국문 관광정보 계열(반려동물·무장애 포함) 항목 → SpotCache. 좌표가 없으면 지도·경로에 못 쓰므로 제외한다. */
    SpotCache fromKorItem(JsonNode item, LocalDateTime now) {
        Double mapx = parseDouble(item.path("mapx").asText());
        Double mapy = parseDouble(item.path("mapy").asText());
        String id = item.path("contentid").asText("");
        String title = item.path("title").asText("").trim();
        if (id.isEmpty() || title.isEmpty() || mapx == null || mapy == null) {
            return null;
        }
        String signgu = item.path("lDongSignguCd").asText("");
        return SpotCache.builder()
                .id(id)
                .name(title)
                .region(ChungbukRegions.name(signgu))
                .sigunguCode(ChungbukRegions.sigunguCode5(signgu))
                .areaCode(CHUNGBUK)
                .contentTypeId(item.path("contenttypeid").asText())
                .category(SpotCategoryClassifier.classifyKor(item))
                .mapx(mapx)
                .mapy(mapy)
                .imageUrl(secureImage(item.path("firstimage").asText()))
                .thumbnailUrl(secureImage(item.path("firstimage2").asText()))
                .address(joinAddress(item.path("addr1").asText(), item.path("addr2").asText()))
                .tel(blankToNull(item.path("tel").asText()))
                .syncedAt(now)
                .build();
    }

    private void markFlags(Map<String, SpotCache> spots, TourApiService service, String path, boolean pet, LocalDateTime now) {
        List<JsonNode> items = client.fetchAll(service, path, Map.of("lDongRegnCd", CHUNGBUK), PAGE_SIZE);
        for (JsonNode item : items) {
            String id = item.path("contentid").asText("");
            SpotCache spot = spots.get(id);
            if (spot == null && KOR_CONTENT_TYPES.contains(item.path("contenttypeid").asText())) {
                spot = fromKorItem(item, now); // 국문 목록에 없던 시설이면 이 데이터로 추가
            }
            if (spot != null) {
                spots.put(spot.getId(), pet ? spot.toBuilder().petFriendly(true).build() : spot.toBuilder().barrierFree(true).build());
            }
        }
    }

    private void loadWellness(Map<String, SpotCache> spots, LocalDateTime now) {
        List<JsonNode> items =
                client.fetchAll(TourApiService.WELLNESS, WELLNESS_LIST, Map.of("langDivCd", "KOR", "lDongRegnCd", CHUNGBUK), PAGE_SIZE);
        for (JsonNode item : items) {
            String id = item.path("contentId").asText("");
            SpotCache spot = spots.get(id);
            if (spot == null) {
                Double mapx = parseDouble(item.path("mapX").asText());
                Double mapy = parseDouble(item.path("mapY").asText());
                String title = item.path("title").asText("").trim();
                if (id.isEmpty() || title.isEmpty() || mapx == null || mapy == null) {
                    continue;
                }
                String signgu = item.path("lDongSignguCd").asText("");
                spot =
                        SpotCache.builder()
                                .id(id)
                                .name(title)
                                .region(ChungbukRegions.name(signgu))
                                .sigunguCode(ChungbukRegions.sigunguCode5(signgu))
                                .areaCode(CHUNGBUK)
                                .contentTypeId(item.path("contentTypeId").asText())
                                .mapx(mapx)
                                .mapy(mapy)
                                .imageUrl(secureImage(firstNonBlank(item.path("orgImage").asText(), item.path("thumbImage").asText())))
                                .thumbnailUrl(secureImage(item.path("thumbImage").asText()))
                                .address(joinAddress(item.path("baseAddr").asText(), item.path("detailAddr").asText()))
                                .tel(blankToNull(item.path("tel").asText()))
                                .syncedAt(now)
                                .build();
            }
            spots.put(id, spot.toBuilder().category(SpotCategoryClassifier.WELLNESS).build());
        }
    }

    private void loadCamping(Map<String, SpotCache> spots, LocalDateTime now) {
        // 고캠핑에는 지역 필터가 없어 전국(약 3천 곳)을 받아 충북만 남긴다.
        List<JsonNode> items = client.fetchAll(TourApiService.CAMPING, CAMPING_LIST, Map.of(), 500);
        for (JsonNode item : items) {
            String doNm = item.path("doNm").asText("");
            if (!doNm.equals("충청북도") && !doNm.equals("충북")) {
                continue;
            }
            String contentId = item.path("contentId").asText("");
            Double mapx = parseDouble(item.path("mapX").asText());
            Double mapy = parseDouble(item.path("mapY").asText());
            String name = item.path("facltNm").asText("").trim();
            if (contentId.isEmpty() || name.isEmpty() || mapx == null || mapy == null) {
                continue;
            }
            String sigunguName = item.path("sigunguNm").asText("");
            String operating = joinNonBlank(" / ", labeled("운영기간", item.path("operPdCl").asText()), labeled("운영일", item.path("operDeCl").asText()));
            SpotCache spot =
                    SpotCache.builder()
                            .id(CAMPING_ID_PREFIX + contentId)
                            .name(name)
                            .region(sigunguName.isBlank() ? "충청북도" : sigunguName)
                            .sigunguCode(ChungbukRegions.codeFromName(sigunguName))
                            .areaCode(CHUNGBUK)
                            .contentTypeId("camp")
                            .category(SpotCategoryClassifier.NATURE)
                            .mapx(mapx)
                            .mapy(mapy)
                            .imageUrl(secureImage(item.path("firstImageUrl").asText()))
                            .summary(blankToNull(item.path("lineIntro").asText()))
                            .description(blankToNull(item.path("intro").asText()))
                            .address(joinAddress(item.path("addr1").asText(), item.path("addr2").asText()))
                            .operatingHours(blankToNull(operating))
                            .tel(blankToNull(item.path("tel").asText()))
                            .detailSyncedAt(now) // 고캠핑 목록 응답에 소개·이용정보가 이미 들어 있다
                            .syncedAt(now)
                            .build();
            spots.put(spot.getId(), spot);
        }
    }

    /** 이전 동기화에서 받아 둔 상세 정보(소개·사진 등)는 새 목록 응답이 덮어쓰지 않게 이어받는다. */
    private SpotCache mergeExisting(SpotCache fresh, SpotCache old) {
        if (old == null) {
            return fresh;
        }
        SpotCache.SpotCacheBuilder builder = fresh.toBuilder();
        if (fresh.getDescription() == null) {
            builder.description(old.getDescription());
        }
        if (fresh.getSummary() == null) {
            builder.summary(old.getSummary());
        }
        if (fresh.getOperatingHours() == null) {
            builder.operatingHours(old.getOperatingHours());
        }
        if (fresh.getTel() == null) {
            builder.tel(old.getTel());
        }
        if (fresh.getDetailSyncedAt() == null) {
            builder.detailSyncedAt(old.getDetailSyncedAt());
        }
        return builder.photosJson(old.getPhotosJson()).build();
    }

    // ---- 혼잡도 예측 ----

    /**
     * 집중률 예측 행을 이름(+시군구)으로 관광지에 연결해 저장한다. 연결된 관광지 수를 돌려준다.
     * 일부 시군구 조회가 실패하면 부분 데이터로 기존 예측을 덮어쓰지 않는다.
     */
    private int syncCongestion(List<SpotCache> spots, List<String> failures) {
        Map<String, List<SpotCache>> bySigunguAndName = new HashMap<>();
        Map<String, List<SpotCache>> byName = new HashMap<>();
        for (SpotCache spot : spots) {
            for (String key : NameNormalizer.keys(spot.getName())) {
                bySigunguAndName.computeIfAbsent(spot.getSigunguCode() + "|" + key, k -> new ArrayList<>()).add(spot);
                byName.computeIfAbsent(key, k -> new ArrayList<>()).add(spot);
            }
        }

        Map<String, Map<LocalDate, Double>> forecasts = new HashMap<>();
        boolean complete = true;
        for (String signguCd : ChungbukRegions.congestionCodes()) {
            List<JsonNode> rows;
            try {
                rows = client.fetchAll(TourApiService.CONGESTION, CONGESTION_LIST, Map.of("areaCd", CHUNGBUK, "signguCd", signguCd), 1000);
            } catch (RuntimeException e) {
                log.warn("혼잡도 예측 조회 실패 [{}]: {}", signguCd, e.getMessage());
                failures.add("혼잡도 예측 " + signguCd);
                complete = false;
                continue;
            }
            for (JsonNode row : rows) {
                LocalDate date = parseDate(row.path("baseYmd").asText());
                Double rate = parseDouble(row.path("cnctrRate").asText());
                if (date == null || rate == null) {
                    continue;
                }
                for (SpotCache spot : matchSpots(signguCd, row.path("tAtsNm").asText(), bySigunguAndName, byName)) {
                    forecasts.computeIfAbsent(spot.getId(), id -> new TreeMap<>()).putIfAbsent(date, rate);
                }
            }
        }
        if (!complete && !forecasts.isEmpty()) {
            log.warn("혼잡도 예측 일부만 받아 기존 예측을 유지합니다.");
            return (int) congestionRepository.findAll().stream().map(CongestionForecast::getSpotId).distinct().count();
        }
        if (forecasts.isEmpty()) {
            return 0;
        }
        List<CongestionForecast> rowsToSave = new ArrayList<>();
        forecasts.forEach((spotId, byDate) -> byDate.forEach((date, rate) -> rowsToSave.add(CongestionForecast.builder().spotId(spotId).date(date).rate(rate).build())));
        transactionTemplate.executeWithoutResult(
                status -> {
                    congestionRepository.deleteAllRows();
                    congestionRepository.saveAll(rowsToSave);
                });
        return forecasts.size();
    }

    /** 같은 시군구 안의 같은 이름을 우선하고, 없으면 충북 전체에서 이름이 유일할 때만 연결한다(동명 관광지 오연결 방지). */
    static List<SpotCache> matchSpots(
            String signguCd,
            String forecastName,
            Map<String, List<SpotCache>> bySigunguAndName,
            Map<String, List<SpotCache>> byName) {
        Set<String> keys = NameNormalizer.keys(forecastName);
        for (String key : keys) {
            List<SpotCache> local = bySigunguAndName.get(signguCd + "|" + key);
            if (local != null && !local.isEmpty()) {
                return local;
            }
        }
        for (String key : keys) {
            List<SpotCache> global = byName.get(key);
            if (global != null && global.size() == 1) {
                return global;
            }
        }
        return List.of();
    }

    // ---- 값 변환 도우미 ----

    static Double parseDouble(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            double parsed = Double.parseDouble(value.trim());
            return parsed == 0 ? null : parsed; // 좌표 0,0 은 "없음"으로 취급
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static LocalDate parseDate(String yyyymmdd) {
        try {
            return LocalDate.parse(yyyymmdd, BASE_YMD);
        } catch (RuntimeException e) {
            return null;
        }
    }

    /** 관광공사 이미지 주소가 http 로 오는 경우가 있어, https 페이지에서 차단(mixed content)되지 않게 바꾼다. */
    public static String secureImage(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String trimmed = url.trim();
        return trimmed.startsWith("http://") ? "https://" + trimmed.substring(7) : trimmed;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String firstNonBlank(String a, String b) {
        return a != null && !a.isBlank() ? a : b;
    }

    private static String joinAddress(String addr1, String addr2) {
        return blankToNull(joinNonBlank(" ", addr1, addr2));
    }

    private static String labeled(String label, String value) {
        return value == null || value.isBlank() ? null : label + ": " + value.trim();
    }

    private static String joinNonBlank(String separator, String... parts) {
        List<String> nonBlank = new ArrayList<>();
        for (String part : parts) {
            if (part != null && !part.isBlank()) {
                nonBlank.add(part.trim());
            }
        }
        return String.join(separator, nonBlank);
    }
}

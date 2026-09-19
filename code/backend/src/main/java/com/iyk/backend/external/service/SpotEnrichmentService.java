package com.iyk.backend.external.service;

import static com.iyk.backend.external.client.TourApiEndpoints.KOR_DETAIL_COMMON;
import static com.iyk.backend.external.client.TourApiEndpoints.KOR_DETAIL_IMAGE;
import static com.iyk.backend.external.client.TourApiEndpoints.KOR_DETAIL_INTRO;
import static com.iyk.backend.external.client.TourApiEndpoints.PHOTO_SEARCH;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iyk.backend.domain.spot.SpotCache;
import com.iyk.backend.domain.spot.SpotCacheRepository;
import com.iyk.backend.external.client.TourApiClient;
import com.iyk.backend.external.config.TourApiService;
import com.iyk.backend.external.sync.SpotSyncService;
import jakarta.annotation.PreDestroy;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 동기화된 목록 정보(spots_cache)에 없는 소개·이용시간·사진을 TourAPI 에서 필요할 때 한 번만 받아 DB에 채운다.
 * 전 관광지(약 1,400곳)를 미리 받으면 개발계정 하루 한도를 넘기 때문에, 사용자가 실제로 본 관광지만 채운다.
 */
@Slf4j
@Service
public class SpotEnrichmentService {

    private static final int MAX_PHOTOS = 10;
    private static final int MAX_GALLERY_PHOTOS = 4;

    private final TourApiClient client;
    private final SpotCacheRepository spotRepository;
    private final ObjectMapper objectMapper;
    private final ExecutorService pool =
            Executors.newFixedThreadPool(
                    4,
                    runnable -> {
                        Thread thread = new Thread(runnable, "spot-enrich");
                        thread.setDaemon(true);
                        return thread;
                    });

    public SpotEnrichmentService(TourApiClient client, SpotCacheRepository spotRepository, ObjectMapper objectMapper) {
        this.client = client;
        this.spotRepository = spotRepository;
        this.objectMapper = objectMapper;
    }

    @PreDestroy
    void shutdown() {
        pool.shutdownNow();
    }

    /**
     * 목록에 보여줄 한 줄 요약이 없는 관광지들의 소개글(detailCommon2)을 병렬로 받아 채운다. 실패한 곳은 그대로 두고(요약 대신 주소가
     * 보인다) 다음 요청 때 다시 시도한다. 입력과 같은 순서로 최신 상태를 돌려준다.
     */
    public List<SpotCache> ensureSummaries(List<SpotCache> spots) {
        List<CompletableFuture<SpotCache>> futures = new ArrayList<>();
        for (SpotCache spot : spots) {
            if (spot.getDescription() != null || !isKorContent(spot) || !client.hasKey(TourApiService.KOR)) {
                futures.add(CompletableFuture.completedFuture(spot));
            } else {
                futures.add(CompletableFuture.supplyAsync(() -> fetchOverview(spot), pool));
            }
        }
        return futures.stream().map(CompletableFuture::join).toList();
    }

    /** 상세 화면용: 소개·이용시간·사진까지 채운다. 이미 채워졌다면 그대로 돌려준다. */
    public SpotCache ensureDetail(SpotCache spot) {
        if (spot.getDetailSyncedAt() != null || !isKorContent(spot) || !client.hasKey(TourApiService.KOR)) {
            return spot;
        }
        SpotCache.SpotCacheBuilder builder = spot.toBuilder();
        boolean complete = true;

        if (spot.getDescription() == null) {
            try {
                applyOverview(builder, client.fetchFirst(TourApiService.KOR, KOR_DETAIL_COMMON, Map.of("contentId", spot.getId())));
            } catch (RuntimeException e) {
                complete = false;
                log.warn("상세 소개 조회 실패 [{}]: {}", spot.getId(), e.getMessage());
            }
        }
        try {
            String hours = operatingHours(spot, client.fetchFirst(TourApiService.KOR, KOR_DETAIL_INTRO, Map.of("contentId", spot.getId(), "contentTypeId", spot.getContentTypeId())));
            if (hours != null) {
                builder.operatingHours(hours);
            }
        } catch (RuntimeException e) {
            complete = false;
            log.warn("이용정보 조회 실패 [{}]: {}", spot.getId(), e.getMessage());
        }

        Set<String> photos = new LinkedHashSet<>();
        if (spot.getImageUrl() != null) {
            photos.add(spot.getImageUrl());
        }
        try {
            for (JsonNode image : client.fetchAll(TourApiService.KOR, KOR_DETAIL_IMAGE, Map.of("contentId", spot.getId(), "imageYN", "Y"), 20)) {
                String url = SpotSyncService.secureImage(image.path("originimgurl").asText());
                if (url != null) {
                    photos.add(url);
                }
            }
        } catch (RuntimeException e) {
            complete = false;
            log.warn("사진 조회 실패 [{}]: {}", spot.getId(), e.getMessage());
        }
        // 관광사진 정보 API: 공모전 수상작 등 전문 사진. 이름이 실제로 일치하는 것만 쓴다.
        try {
            photos.addAll(galleryPhotos(spot));
        } catch (RuntimeException e) {
            log.warn("관광사진 검색 실패 [{}]: {}", spot.getId(), e.getMessage()); // 부가 사진이라 완료 여부에는 영향을 주지 않는다
        }
        builder.photosJson(toJson(photos.stream().limit(MAX_PHOTOS).toList()));

        if (complete) {
            builder.detailSyncedAt(LocalDateTime.now());
        }
        return spotRepository.save(builder.build());
    }

    /** 상세 사진 URL 목록. 아직 없으면 대표 이미지만. */
    public List<String> photosOf(SpotCache spot) {
        if (spot.getPhotosJson() != null) {
            try {
                List<String> parsed = objectMapper.readValue(spot.getPhotosJson(), new TypeReference<List<String>>() {});
                if (!parsed.isEmpty()) {
                    return parsed;
                }
            } catch (JsonProcessingException e) {
                log.warn("사진 목록 해석 실패 [{}]", spot.getId());
            }
        }
        return spot.getImageUrl() == null ? List.of() : List.of(spot.getImageUrl());
    }

    private SpotCache fetchOverview(SpotCache spot) {
        try {
            SpotCache.SpotCacheBuilder builder = spot.toBuilder();
            applyOverview(builder, client.fetchFirst(TourApiService.KOR, KOR_DETAIL_COMMON, Map.of("contentId", spot.getId())));
            return spotRepository.save(builder.build());
        } catch (RuntimeException e) {
            log.warn("소개 조회 실패 [{}]: {}", spot.getId(), e.getMessage());
            return spot;
        }
    }

    /** 소개글이 비어 있는 관광지도 "확인했음"을 남기려고 빈 문자열을 넣는다(매번 다시 조회하지 않도록). */
    private void applyOverview(SpotCache.SpotCacheBuilder builder, JsonNode common) {
        String overview = common == null ? "" : TextCleaner.paragraphs(common.path("overview").asText());
        String trimmed = overview.length() > 4000 ? overview.substring(0, 4000) : overview;
        builder.description(trimmed);
        builder.summary(trimmed.isEmpty() ? null : TextCleaner.summary(trimmed));
        if (common != null && !common.path("tel").asText().isBlank()) {
            builder.tel(TextCleaner.oneLine(common.path("tel").asText()));
        }
    }

    /** 콘텐츠 유형마다 이용시간·휴무일 필드 이름이 달라서(usetime / usetimeculture / usetimeleports) 유형별로 읽는다. */
    private String operatingHours(SpotCache spot, JsonNode intro) {
        if (intro == null) {
            return null;
        }
        String suffix =
                switch (spot.getContentTypeId()) {
                    case "14" -> "culture";
                    case "28" -> "leports";
                    default -> "";
                };
        String use = TextCleaner.oneLine(intro.path("usetime" + suffix).asText());
        String rest = TextCleaner.oneLine(intro.path("restdate" + suffix).asText());
        List<String> parts = new ArrayList<>();
        if (!use.isEmpty()) {
            parts.add("이용시간: " + use);
        }
        if (!rest.isEmpty()) {
            parts.add("쉬는 날: " + rest);
        }
        return parts.isEmpty() ? null : String.join(" / ", parts);
    }

    private List<String> galleryPhotos(SpotCache spot) {
        Set<String> nameKeys = NameNormalizer.keys(spot.getName());
        List<String> urls = new ArrayList<>();
        for (JsonNode photo : client.fetchAll(TourApiService.PHOTO, PHOTO_SEARCH, Map.of("keyword", spot.getName()), 30)) {
            String title = NameNormalizer.normalize(photo.path("galTitle").asText());
            boolean related = nameKeys.stream().anyMatch(key -> title.contains(key) || (!title.isEmpty() && key.contains(title)));
            String url = SpotSyncService.secureImage(photo.path("galWebImageUrl").asText());
            if (related && url != null) {
                urls.add(url);
            }
            if (urls.size() >= MAX_GALLERY_PHOTOS) {
                break;
            }
        }
        return urls;
    }

    /** 국문 관광정보 API로 상세를 조회할 수 있는 항목(고캠핑 등은 목록 응답에 이미 상세가 들어 있다). */
    private static boolean isKorContent(SpotCache spot) {
        return spot.getId() != null && !spot.getId().startsWith(SpotSyncService.CAMPING_ID_PREFIX) && spot.getContentTypeId() != null;
    }

    private String toJson(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}

package com.iyk.backend.external.sync;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iyk.backend.domain.spot.CongestionForecast;
import com.iyk.backend.domain.spot.CongestionForecastRepository;
import com.iyk.backend.domain.spot.SpotCache;
import com.iyk.backend.domain.spot.SpotCacheRepository;
import com.iyk.backend.external.client.TourApiClient;
import com.iyk.backend.external.client.TourApiEndpoints;
import com.iyk.backend.external.client.TourApiException;
import com.iyk.backend.external.config.TourApiService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
class SpotSyncServiceTests {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String TODAY = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
    private static final String TOMORROW = LocalDate.now().plusDays(1).format(DateTimeFormatter.BASIC_ISO_DATE);

    @MockitoBean TourApiClient client;
    @Autowired SpotSyncService syncService;
    @Autowired SpotCacheRepository spotRepository;
    @Autowired CongestionForecastRepository congestionRepository;

    private static JsonNode json(String text) {
        try {
            return MAPPER.readTree(text);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static JsonNode kor(String id, String title, String type, String lcls, String signgu, String mapx, String image) {
        return json(
                String.format(
                        "{\"contentid\":\"%s\",\"title\":\"%s\",\"contenttypeid\":\"%s\",\"lclsSystm1\":\"%s\","
                                + "\"lDongSignguCd\":\"%s\",\"mapx\":\"%s\",\"mapy\":\"36.9\",\"firstimage\":\"%s\",\"firstimage2\":\"%s\","
                                + "\"addr1\":\"충청북도 어딘가 1\",\"addr2\":\"\",\"tel\":\"\"}",
                        id, title, type, lcls, signgu, mapx, image, image.replace("a.jpg", "a_thumb.jpg")));
    }

    /** 경로·파라미터별로 가짜 TourAPI 응답을 돌려주는 라우터. */
    private void stubClient(boolean wellnessFails, boolean congestionFailsFor43111) {
        when(client.fetchAll(any(), anyString(), anyMap(), anyInt()))
                .thenAnswer(
                        invocation -> {
                            TourApiService service = invocation.getArgument(0);
                            String path = invocation.getArgument(1);
                            Map<String, String> params = invocation.getArgument(2);
                            switch (path) {
                                case TourApiEndpoints.KOR_LIST:
                                    return switch (params.get("contentTypeId")) {
                                        case "12" -> List.of(
                                                kor("100", "고운골 남한강 갈대숲", "12", "NA", "800", "128.3", "http://tong.visitkorea.or.kr/a.jpg"),
                                                kor("101", "충주 탄금대", "12", "HS", "130", "127.9", ""),
                                                kor("102", "좌표 없는 곳", "12", "NA", "130", "", ""),
                                                kor("105", "소선암자연휴양림", "12", "NA", "800", "128.4", ""));
                                        case "14" -> List.of(kor("103", "국립청주박물관", "14", "VE", "111", "127.5", ""));
                                        case "28" -> List.of(kor("104", "단양 패러글라이딩", "28", "LS", "800", "128.35", ""));
                                        default -> List.of();
                                    };
                                case TourApiEndpoints.PET_LIST:
                                    return List.of(
                                            kor("101", "충주 탄금대", "12", "HS", "130", "127.9", ""),
                                            kor("999", "반려동물 동반 카페", "39", "FD", "130", "127.9", ""));
                                case TourApiEndpoints.BARRIER_FREE_LIST:
                                    return List.of(
                                            kor("100", "고운골 남한강 갈대숲", "12", "NA", "800", "128.3", ""),
                                            kor("104", "단양 패러글라이딩", "28", "LS", "800", "128.35", ""));
                                case TourApiEndpoints.WELLNESS_LIST:
                                    if (wellnessFails) {
                                        throw new TourApiException("웰니스 서버 오류");
                                    }
                                    return List.of(
                                            json(
                                                    "{\"contentId\":\"106\",\"title\":\"능암탄산온천\",\"contentTypeId\":\"12\","
                                                            + "\"lDongSignguCd\":\"130\",\"mapX\":\"127.8\",\"mapY\":\"37.0\","
                                                            + "\"baseAddr\":\"충청북도 충주시\",\"detailAddr\":\"\",\"orgImage\":\"http://tong.visitkorea.or.kr/w.jpg\"}"));
                                case TourApiEndpoints.CAMPING_LIST:
                                    return List.of(
                                            json(
                                                    "{\"contentId\":\"1441\",\"facltNm\":\"단양 숲속 캠핑장\",\"doNm\":\"충청북도\",\"sigunguNm\":\"단양군\","
                                                            + "\"mapX\":\"128.3\",\"mapY\":\"36.98\",\"lineIntro\":\"숲속의 캠핑장\",\"intro\":\"자세한 소개\","
                                                            + "\"addr1\":\"충청북도 단양군\",\"addr2\":\"\",\"operPdCl\":\"봄,가을\",\"operDeCl\":\"평일+주말\","
                                                            + "\"firstImageUrl\":\"https://gocamping.or.kr/x.jpg\"}"),
                                            json(
                                                    "{\"contentId\":\"77\",\"facltNm\":\"경북 캠핑장\",\"doNm\":\"경상북도\",\"sigunguNm\":\"영주시\","
                                                            + "\"mapX\":\"128.6\",\"mapY\":\"36.8\"}"));
                                case TourApiEndpoints.CONGESTION_LIST:
                                    String code = params.get("signguCd");
                                    if (code.equals("43111") && congestionFailsFor43111) {
                                        throw new TourApiException("혼잡도 서버 오류");
                                    }
                                    if (code.equals("43800")) {
                                        return List.of(
                                                congestion("43800", "고운골남한강갈대숲", TODAY, "20.5"),
                                                congestion("43800", "고운골남한강갈대숲", TOMORROW, "70"),
                                                congestion("43800", "단양 패러글라이딩", TODAY, "45"),
                                                congestion("43800", "어느 집중률에만 있는 곳", TODAY, "10"));
                                    }
                                    return List.of();
                                default:
                                    return List.of();
                            }
                        });
    }

    private static JsonNode congestion(String signguCd, String name, String ymd, String rate) {
        return json(
                String.format(
                        "{\"baseYmd\":\"%s\",\"areaCd\":\"43\",\"signguCd\":\"%s\",\"tAtsNm\":\"%s\",\"cnctrRate\":\"%s\"}",
                        ymd, signguCd, name, rate));
    }

    @BeforeEach
    void clean() {
        congestionRepository.deleteAll();
        spotRepository.deleteAll();
    }

    @Test
    void syncsSpotsFromAllSourcesWithCategoriesFlagsAndSecureImages() {
        stubClient(false, false);

        SpotSyncService.Summary summary = syncService.syncAll();

        assertThat(summary.failures()).isEmpty();
        // 좌표 없는 102와 경북 캠핑장은 제외
        assertThat(spotRepository.findAll()).extracting(SpotCache::getId)
                .containsExactlyInAnyOrder("100", "101", "103", "104", "105", "106", "camp-1441");

        Map<String, SpotCache> byId = new java.util.HashMap<>();
        spotRepository.findAll().forEach(spot -> byId.put(spot.getId(), spot));
        assertThat(byId.get("100").getCategory()).isEqualTo("nature");
        assertThat(byId.get("101").getCategory()).isEqualTo("culture");
        assertThat(byId.get("103").getCategory()).isEqualTo("culture");
        assertThat(byId.get("104").getCategory()).isEqualTo("activity");
        assertThat(byId.get("105").getCategory()).isEqualTo("wellness"); // 이름에 '휴양림'
        assertThat(byId.get("106").getCategory()).isEqualTo("wellness"); // 웰니스 API 에서만 온 항목도 추가됨
        assertThat(byId.get("camp-1441").getCategory()).isEqualTo("nature");

        assertThat(byId.get("101").isPetFriendly()).isTrue();
        assertThat(byId.get("100").isPetFriendly()).isFalse();
        assertThat(byId.get("100").isBarrierFree()).isTrue();
        assertThat(byId.get("104").isBarrierFree()).isTrue();
        assertThat(byId).doesNotContainKey("999"); // 관광지·문화시설·레포츠가 아닌 반려동물 시설은 제외

        assertThat(byId.get("100").getImageUrl()).isEqualTo("https://tong.visitkorea.or.kr/a.jpg");
        assertThat(byId.get("100").getThumbnailUrl()).isEqualTo("https://tong.visitkorea.or.kr/a_thumb.jpg");
        assertThat(byId.get("101").getThumbnailUrl()).isNull(); // 썸네일이 없으면 null
        assertThat(byId.get("106").getImageUrl()).startsWith("https://");
        assertThat(byId.get("100").getRegion()).isEqualTo("단양군");
        assertThat(byId.get("100").getSigunguCode()).isEqualTo("43800");
        assertThat(byId.get("103").getRegion()).isEqualTo("청주시 상당구");

        SpotCache camping = byId.get("camp-1441");
        assertThat(camping.getRegion()).isEqualTo("단양군");
        assertThat(camping.getSummary()).isEqualTo("숲속의 캠핑장");
        assertThat(camping.getOperatingHours()).isEqualTo("운영기간: 봄,가을 / 운영일: 평일+주말");
        assertThat(camping.getDetailSyncedAt()).isNotNull(); // 캠핑은 목록에 소개가 있어 상세 조회가 필요 없다
    }

    @Test
    void linksCongestionForecastByNameAndSkipsUnmatchedNames() {
        stubClient(false, false);

        SpotSyncService.Summary summary = syncService.syncAll();

        assertThat(summary.spotsWithForecast()).isEqualTo(2);
        List<CongestionForecast> rows = congestionRepository.findAll();
        assertThat(rows).extracting(CongestionForecast::getSpotId).containsOnly("100", "104");
        assertThat(rows.stream().filter(row -> row.getSpotId().equals("100")).map(CongestionForecast::getRate))
                .containsExactlyInAnyOrder(20.5, 70.0);
    }

    @Test
    void oneFailingSourceDoesNotStopTheOthers() {
        stubClient(true, false);

        SpotSyncService.Summary summary = syncService.syncAll();

        assertThat(summary.failures()).containsExactly("웰니스관광");
        // 웰니스 API 에서만 오던 106 만 빠지고, 국문·캠핑 데이터는 모두 반영된다.
        assertThat(spotRepository.findAll()).extracting(SpotCache::getId)
                .containsExactlyInAnyOrder("100", "101", "103", "104", "105", "camp-1441");
    }

    @Test
    void resyncKeepsAlreadyFetchedDetailsAndRefreshesListFields() {
        stubClient(false, false);
        syncService.syncAll();
        SpotCache detailed = spotRepository.findById("100").orElseThrow();
        spotRepository.save(
                detailed.toBuilder()
                        .description("이미 받아 둔 상세 소개")
                        .photosJson("[\"https://x/1.jpg\"]")
                        .detailSyncedAt(LocalDateTime.now())
                        .build());

        syncService.syncAll();

        SpotCache after = spotRepository.findById("100").orElseThrow();
        assertThat(after.getDescription()).isEqualTo("이미 받아 둔 상세 소개");
        assertThat(after.getPhotosJson()).isEqualTo("[\"https://x/1.jpg\"]");
        assertThat(after.getDetailSyncedAt()).isNotNull();
    }

    @Test
    void partialCongestionFailureKeepsPreviousForecast() {
        stubClient(false, false);
        syncService.syncAll();
        long before = congestionRepository.count();
        assertThat(before).isGreaterThan(0);

        stubClient(false, true); // 두 번째 동기화에서는 청주 상당구 조회가 실패
        SpotSyncService.Summary summary = syncService.syncAll();

        assertThat(summary.failures()).contains("혼잡도 예측 43111");
        assertThat(congestionRepository.count()).isEqualTo(before);
    }

    @Test
    void whenKorSourceFailsExistingCacheIsKept() {
        stubClient(false, false);
        syncService.syncAll();
        long before = spotRepository.count();

        when(client.fetchAll(any(), anyString(), anyMap(), anyInt())).thenThrow(new TourApiException("전부 실패"));
        SpotSyncService.Summary summary = syncService.syncAll();

        assertThat(summary.spots()).isZero();
        assertThat(summary.failures()).isNotEmpty();
        assertThat(spotRepository.count()).isEqualTo(before);
    }

    @Test
    void matchingPrefersSameSigunguAndRejectsAmbiguousNames() {
        SpotCache a = SpotCache.builder().id("1").name("중앙공원").sigunguCode("43130").build();
        SpotCache b = SpotCache.builder().id("2").name("중앙공원").sigunguCode("43150").build();
        Map<String, List<SpotCache>> local = Map.of("43130|중앙공원", List.of(a), "43150|중앙공원", List.of(b));
        Map<String, List<SpotCache>> global = Map.of("중앙공원", List.of(a, b));

        assertThat(SpotSyncService.matchSpots("43150", "중앙 공원", local, global)).containsExactly(b);
        // 시군구가 달라 로컬 매칭이 없고, 충북 전체에 동명이 둘이면 잘못 연결하지 않는다
        assertThat(SpotSyncService.matchSpots("43800", "중앙공원", local, global)).isEmpty();
    }
}

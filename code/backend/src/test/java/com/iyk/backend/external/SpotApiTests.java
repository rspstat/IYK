package com.iyk.backend.external;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.iyk.backend.domain.spot.CongestionForecast;
import com.iyk.backend.domain.spot.CongestionForecastRepository;
import com.iyk.backend.domain.spot.SpotCache;
import com.iyk.backend.domain.spot.SpotCacheRepository;
import com.iyk.backend.external.client.TourApiClient;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** 추천·상세·혼잡도·연관·검색·일괄·경로 API. TourAPI 는 가짜(키 없음)라 DB 에 심은 데이터만으로 동작한다. */
@SpringBootTest
@AutoConfigureMockMvc
class SpotApiTests {

    @Autowired MockMvc mvc;
    @Autowired SpotCacheRepository spotRepository;
    @Autowired CongestionForecastRepository congestionRepository;
    @MockitoBean TourApiClient client; // hasKey() 가 false 를 돌려주므로 소개 보강·연관 API 호출은 건너뛴다

    @BeforeEach
    @AfterEach
    void clean() {
        congestionRepository.deleteAll();
        spotRepository.deleteAll();
    }

    private SpotCache.SpotCacheBuilder spot(String id, String name, String category, String sigunguCode, String region, double x, double y) {
        return SpotCache.builder()
                .id(id)
                .name(name)
                .region(region)
                .sigunguCode(sigunguCode)
                .contentTypeId("12")
                .category(category)
                .mapx(x)
                .mapy(y)
                .imageUrl("https://img.test/" + id + ".jpg")
                .thumbnailUrl("https://img.test/" + id + "_thumb.jpg")
                .summary("요약 " + id)
                .description("소개 " + id)
                .address("충청북도 " + region + " " + id)
                .syncedAt(LocalDateTime.now());
    }

    /** 문화 15곳(충주 8, 제천 5, 단양 2) + 웰니스 3곳 + 가족(반려동물·무장애) 후보. */
    private void seedStandard() {
        List<SpotCache> spots = new ArrayList<>();
        for (int i = 1; i <= 15; i++) {
            String[] area = i <= 8 ? new String[] {"43130", "충주시"} : i <= 13 ? new String[] {"43150", "제천시"} : new String[] {"43800", "단양군"};
            spots.add(spot(String.format("c%02d", i), "문화 " + i, "culture", area[0], area[1], 127.9 + i * 0.01, 36.9).build());
        }
        for (int i = 1; i <= 3; i++) {
            spots.add(spot("w" + i, "웰니스 " + i, "wellness", "43150", "제천시", 128.1 + i * 0.01, 37.0).build());
        }
        spots.add(spot("f1", "반려동물 관광지", "nature", "43130", "충주시", 127.95, 36.95).petFriendly(true).build());
        spots.add(spot("f2", "무장애 문화시설", "culture", "43150", "제천시", 128.2, 37.1).contentTypeId("14").barrierFree(true).build());
        spots.add(spot("f3", "반려동물 식당", "culture", "43130", "충주시", 127.96, 36.96).contentTypeId("39").petFriendly(true).build()); // 음식점: 후보 아님
        spotRepository.saveAll(spots);
    }

    @Test
    void recommendationsUseBackendStyleAndOnlySpotsOfTheMappedCategory() throws Exception {
        seedStandard();

        mvc.perform(get("/api/recommendations").param("mbti", "infj"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mbti", is("INFJ")))
                .andExpect(jsonPath("$.category", is("wellness")))
                .andExpect(jsonPath("$.style.title", is("조용한 힐링 추구자")))
                .andExpect(jsonPath("$.style.tags", hasSize(3)))
                .andExpect(jsonPath("$.spots", hasSize(3)))
                .andExpect(jsonPath("$.spots[*].category", everyItem(is("wellness"))))
                .andExpect(jsonPath("$.spots[0].imageUrl").exists())
                .andExpect(jsonPath("$.spots[0].thumbnailUrl", org.hamcrest.Matchers.endsWith("_thumb.jpg")))
                .andExpect(jsonPath("$.spots[0].congestion", nullValue())); // 예측이 없으면 null (지어내지 않는다)
    }

    @Test
    void familyTypesGetPetOrBarrierFreeAttractionsLabelledAsFamily() throws Exception {
        seedStandard();

        mvc.perform(get("/api/recommendations").param("mbti", "ENFJ"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category", is("family")))
                .andExpect(jsonPath("$.spots[*].id", org.hamcrest.Matchers.containsInAnyOrder("f1", "f2")))
                .andExpect(jsonPath("$.spots[*].category", everyItem(is("family"))));
    }

    @Test
    void recommendationsAreDeterministicButDifferBetweenTypesOfTheSameCategory() throws Exception {
        seedStandard();
        String intj = mvc.perform(get("/api/recommendations").param("mbti", "INTJ")).andReturn().getResponse().getContentAsString();
        String intjAgain = mvc.perform(get("/api/recommendations").param("mbti", "INTJ")).andReturn().getResponse().getContentAsString();
        String enfp = mvc.perform(get("/api/recommendations").param("mbti", "ENFP")).andReturn().getResponse().getContentAsString();

        org.assertj.core.api.Assertions.assertThat(intjAgain).isEqualTo(intj);
        // 둘 다 culture 지만 유형마다 순서가 달라 목록 전체가 같지 않다
        org.assertj.core.api.Assertions.assertThat(enfp).isNotEqualTo(intj.replace("INTJ", "ENFP"));
    }

    @Test
    void recommendationsSpreadAcrossSigunguBeforeFillingUp() throws Exception {
        seedStandard();

        String body = mvc.perform(get("/api/recommendations").param("mbti", "INTJ")).andExpect(jsonPath("$.spots", hasSize(12))).andReturn().getResponse().getContentAsString();
        com.fasterxml.jackson.databind.JsonNode spots = new com.fasterxml.jackson.databind.ObjectMapper().readTree(body).get("spots");
        // 처음 8곳(시군구당 최대 3곳씩 채우는 구간)에서 충주 3, 제천 3, 단양 2 여야 한다
        long chungju = 0;
        long jecheon = 0;
        long danyang = 0;
        for (int i = 0; i < 8; i++) {
            String region = spots.get(i).get("region").asText();
            chungju += region.equals("충주시") ? 1 : 0;
            jecheon += region.equals("제천시") ? 1 : 0;
            danyang += region.equals("단양군") ? 1 : 0;
        }
        org.assertj.core.api.Assertions.assertThat(new long[] {chungju, jecheon, danyang}).containsExactly(3, 3, 2);
    }

    @Test
    void spotsWithForecastRankFirstAndCarryTodaysLevel() throws Exception {
        seedStandard();
        LocalDate today = LocalDate.now();
        congestionRepository.saveAll(
                List.of(
                        CongestionForecast.builder().spotId("c15").date(today).rate(70).build(),
                        CongestionForecast.builder().spotId("c15").date(today.plusDays(1)).rate(20).build(),
                        CongestionForecast.builder().spotId("c15").date(today.plusDays(2)).rate(40).build()));

        mvc.perform(get("/api/recommendations").param("mbti", "INTJ"))
                .andExpect(jsonPath("$.spots[0].id", is("c15")))
                .andExpect(jsonPath("$.spots[0].congestion", is("high")));
    }

    @Test
    void congestionEndpointReturnsForecastLevelsAndThreeLowestDays() throws Exception {
        seedStandard();
        LocalDate today = LocalDate.now();
        double[] rates = {50, 10, 80, 30, 20, 90};
        List<CongestionForecast> rows = new ArrayList<>();
        for (int i = 0; i < rates.length; i++) {
            rows.add(CongestionForecast.builder().spotId("c01").date(today.plusDays(i)).rate(rates[i]).build());
        }
        congestionRepository.saveAll(rows);

        mvc.perform(get("/api/spots/c01/congestion").param("days", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spotId", is("c01")))
                .andExpect(jsonPath("$.forecast", hasSize(5)))
                .andExpect(jsonPath("$.forecast[0].date", is(today.toString())))
                .andExpect(jsonPath("$.forecast[0].level", is("medium")))
                .andExpect(jsonPath("$.forecast[1].level", is("low")))
                .andExpect(jsonPath("$.forecast[2].level", is("high")))
                .andExpect(jsonPath("$.forecast[2].score", is(80.0)))
                // 5일 범위(50,10,80,30,20)에서 가장 낮은 3일 = 10, 20, 30 → 날짜순
                .andExpect(jsonPath("$.recommendedDates", contains(today.plusDays(1).toString(), today.plusDays(3).toString(), today.plusDays(4).toString())));
    }

    @Test
    void spotWithoutForecastReturnsEmptyListsNotInventedValues() throws Exception {
        seedStandard();

        mvc.perform(get("/api/spots/c01/congestion"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.forecast", hasSize(0)))
                .andExpect(jsonPath("$.recommendedDates", hasSize(0)));
        mvc.perform(get("/api/spots/c01/congestion").param("days", "0")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/spots/nope/congestion")).andExpect(status().isNotFound()).andExpect(jsonPath("$.error.code", is("SPOT_NOT_FOUND")));
    }

    @Test
    void spotDetailReturnsCachedDetailWithPhotosAndFlags() throws Exception {
        spotRepository.save(
                spot("d1", "상세 관광지", "nature", "43800", "단양군", 128.3, 36.98)
                        .operatingHours("이용시간: 09:00~18:00")
                        .tel("043-000-0000")
                        .photosJson("[\"https://img.test/a.jpg\",\"https://img.test/b.jpg\"]")
                        .petFriendly(true)
                        .detailSyncedAt(LocalDateTime.now())
                        .build());

        mvc.perform(get("/api/spots/d1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is("d1")))
                .andExpect(jsonPath("$.description", is("소개 d1")))
                .andExpect(jsonPath("$.operatingHours", is("이용시간: 09:00~18:00")))
                .andExpect(jsonPath("$.tel", is("043-000-0000")))
                .andExpect(jsonPath("$.photos", contains("https://img.test/a.jpg", "https://img.test/b.jpg")))
                .andExpect(jsonPath("$.petFriendly", is(true)))
                .andExpect(jsonPath("$.barrierFree", is(false)))
                .andExpect(jsonPath("$.mapx", is(128.3)));
        mvc.perform(get("/api/spots/missing")).andExpect(status().isNotFound());
    }

    @Test
    void detailFallsBackToRepresentativeImageWhenNoPhotosAreStored() throws Exception {
        spotRepository.save(spot("d2", "사진 없는 곳", "nature", "43800", "단양군", 128.3, 36.98).detailSyncedAt(LocalDateTime.now()).build());

        mvc.perform(get("/api/spots/d2")).andExpect(jsonPath("$.photos", contains("https://img.test/d2.jpg")));
    }

    @Test
    void relatedFallsBackToNearestSpotsWhenNoRelatedApiKey() throws Exception {
        List<SpotCache> spots = new ArrayList<>();
        for (int i = 0; i < 9; i++) {
            spots.add(spot("near-" + i, "가까운 곳 " + i, "culture", "43800", "단양군", 128.30 + 0.01 * i, 36.98).build());
        }
        spotRepository.saveAll(spots);

        mvc.perform(get("/api/spots/near-0/related"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spots", hasSize(6)))
                .andExpect(jsonPath("$.spots[*].id", contains("near-1", "near-2", "near-3", "near-4", "near-5", "near-6")));
    }

    @Test
    void batchByIdsKeepsRequestOrderAndSkipsUnknownIds() throws Exception {
        seedStandard();

        mvc.perform(get("/api/spots").param("ids", "c02,unknown,c01,c02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spots[*].id", contains("c02", "c01")));
    }

    @Test
    void routeReturnsStopsInRequestedOrderWithCoordinates() throws Exception {
        seedStandard();

        mvc.perform(get("/api/routes").param("spots", "c02,c01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spots[0].id", is("c02")))
                .andExpect(jsonPath("$.spots[0].order", is(1)))
                .andExpect(jsonPath("$.spots[1].id", is("c01")))
                .andExpect(jsonPath("$.spots[1].order", is(2)))
                .andExpect(jsonPath("$.spots[0].mapx").exists())
                .andExpect(jsonPath("$.spots[0].mapy").exists());
    }

    @Test
    void searchMatchesNameRegionAndFiltersByCategory() throws Exception {
        seedStandard();

        mvc.perform(get("/api/spots/search").param("q", "웰니스")).andExpect(jsonPath("$.spots", hasSize(3)));
        mvc.perform(get("/api/spots/search").param("q", "단양")).andExpect(jsonPath("$.spots", hasSize(2))); // 지역명으로도 검색
        mvc.perform(get("/api/spots/search").param("category", "wellness")).andExpect(jsonPath("$.spots", hasSize(3)));
        mvc.perform(get("/api/spots/search").param("q", "문화").param("category", "culture").param("limit", "4"))
                .andExpect(jsonPath("$.spots", hasSize(4)));
        mvc.perform(get("/api/spots/search").param("category", "family"))
                .andExpect(jsonPath("$.spots[*].id", org.hamcrest.Matchers.containsInAnyOrder("f1", "f2")))
                .andExpect(jsonPath("$.spots[*].category", everyItem(is("family"))));
        mvc.perform(get("/api/spots/search").param("category", "bogus")).andExpect(status().isBadRequest());
    }

    @Test
    void emptyCacheAnswersDataNotReadyInsteadOfAnEmptyList() throws Exception {
        mvc.perform(get("/api/recommendations").param("mbti", "INFJ"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error.code", is("DATA_NOT_READY")));
    }

    @Test
    void unknownMbtiIsStillABadRequest() throws Exception {
        mvc.perform(get("/api/recommendations").param("mbti", "ZZZZ"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_REQUEST")))
                .andExpect(jsonPath("$.error.message", not("")));
    }
}

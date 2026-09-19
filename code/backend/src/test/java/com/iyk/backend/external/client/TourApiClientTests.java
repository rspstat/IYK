package com.iyk.backend.external.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iyk.backend.external.config.TourApiProperties;
import com.iyk.backend.external.config.TourApiService;
import java.io.IOException;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class TourApiClientTests {

    private static final String BASE = "http://tour.test/api/";
    private static final String KEY = "s3cr+et/key==";

    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();

    private TourApiClient client(String key) {
        TourApiProperties properties = new TourApiProperties(key, Map.of(), "http://tour.test/api");
        return new TourApiClient(properties, builder.build(), new ObjectMapper());
    }

    private static String ok(String items, int total) {
        return "{\"response\":{\"header\":{\"resultCode\":\"0000\",\"resultMsg\":\"OK\"},"
                + "\"body\":{\"items\":"
                + items
                + ",\"numOfRows\":10,\"pageNo\":1,\"totalCount\":"
                + total
                + "}}}";
    }

    @Test
    void parsesArrayItems() {
        server.expect(requestTo(containsString(BASE + "KorService2/areaBasedList2")))
                .andRespond(
                        withSuccess(
                                ok("{\"item\":[{\"contentid\":\"1\"},{\"contentid\":\"2\"}]}", 2), MediaType.APPLICATION_JSON));

        TourApiClient.Page page =
                client(KEY).fetchPage(TourApiService.KOR, "KorService2/areaBasedList2", Map.of("lDongRegnCd", "43"), 1, 10);

        assertThat(page.totalCount()).isEqualTo(2);
        assertThat(page.items()).extracting(item -> item.get("contentid").asText()).containsExactly("1", "2");
    }

    @Test
    void singleItemComesAsObjectNotArray() {
        server.expect(requestTo(containsString("detailCommon2")))
                .andRespond(withSuccess(ok("{\"item\":{\"contentid\":\"9\"}}", 1), MediaType.APPLICATION_JSON));

        assertThat(client(KEY).fetchFirst(TourApiService.KOR, "KorService2/detailCommon2", Map.of("contentId", "9"))
                        .get("contentid")
                        .asText())
                .isEqualTo("9");
    }

    @Test
    void emptyItemsStringMeansNoData() {
        server.expect(requestTo(containsString("areaBasedList2")))
                .andRespond(withSuccess(ok("\"\"", 0), MediaType.APPLICATION_JSON));

        assertThat(client(KEY).fetchPage(TourApiService.KOR, "KorService2/areaBasedList2", Map.of(), 1, 10).items())
                .isEmpty();
    }

    @Test
    void errorShapeWithoutResponseWrapperThrowsWithResultCode() {
        server.expect(requestTo(containsString("tatsCnctrRatedList")))
                .andRespond(
                        withSuccess(
                                "{\"resultCode\":\"11\",\"resultMsg\":\"NO_MANDATORY_REQUEST_PARAMETERS_ERROR1(signguCd)\"}",
                                MediaType.APPLICATION_JSON));

        assertThatThrownBy(
                        () -> client(KEY).fetchPage(TourApiService.CONGESTION, "TatsCnctrRateService/tatsCnctrRatedList", Map.of(), 1, 10))
                .isInstanceOfSatisfying(
                        TourApiException.class,
                        e -> {
                            assertThat(e.resultCode()).isEqualTo("11");
                            assertThat(e.getMessage()).contains("signguCd");
                        });
    }

    @Test
    void xmlErrorIsReportedWithoutLeakingTheKey() {
        server.expect(requestTo(containsString("areaBasedList2")))
                .andRespond(
                        withSuccess(
                                "<OpenAPI_ServiceResponse><cmmMsgHeader><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR "
                                        + KEY
                                        + "</returnAuthMsg></cmmMsgHeader></OpenAPI_ServiceResponse>",
                                MediaType.APPLICATION_XML));

        assertThatThrownBy(() -> client(KEY).fetchPage(TourApiService.KOR, "KorService2/areaBasedList2", Map.of(), 1, 10))
                .isInstanceOf(TourApiException.class)
                .hasMessageContaining("SERVICE_KEY_IS_NOT_REGISTERED_ERROR")
                .satisfies(e -> assertThat(e.getMessage()).doesNotContain(KEY));
    }

    @Test
    void decodedAndEncodedKeysAreSentEncodedExactlyOnce() {
        String expected = "serviceKey=s3cr%2Bet%2Fkey%3D%3D";
        server.expect(requestTo(containsString(expected)))
                .andRespond(withSuccess(ok("\"\"", 0), MediaType.APPLICATION_JSON));
        server.expect(requestTo(containsString(expected)))
                .andRespond(withSuccess(ok("\"\"", 0), MediaType.APPLICATION_JSON));

        client("s3cr+et/key==").fetchPage(TourApiService.KOR, "KorService2/areaBasedList2", Map.of(), 1, 10);
        client("s3cr%2Bet%2Fkey%3D%3D").fetchPage(TourApiService.KOR, "KorService2/areaBasedList2", Map.of(), 1, 10);

        server.verify();
    }

    @Test
    void sendsRequiredCommonParametersAndPaging() {
        server.expect(method(HttpMethod.GET))
                .andExpect(requestTo(containsString("MobileOS=ETC")))
                .andExpect(requestTo(containsString("MobileApp=IYK")))
                .andExpect(requestTo(containsString("_type=json")))
                .andExpect(requestTo(containsString("lDongRegnCd=43")))
                .andExpect(requestTo(containsString("numOfRows=100")))
                .andExpect(requestTo(containsString("pageNo=3")))
                .andRespond(withSuccess(ok("\"\"", 0), MediaType.APPLICATION_JSON));

        client(KEY).fetchPage(TourApiService.KOR, "KorService2/areaBasedList2", Map.of("lDongRegnCd", "43"), 3, 100);

        server.verify();
    }

    @Test
    void fetchAllFollowsPagesUntilTotalCountIsReached() {
        server.expect(requestTo(containsString("pageNo=1")))
                .andRespond(withSuccess(ok("{\"item\":[{\"n\":1},{\"n\":2}]}", 3), MediaType.APPLICATION_JSON));
        server.expect(requestTo(containsString("pageNo=2")))
                .andRespond(withSuccess(ok("{\"item\":{\"n\":3}}", 3), MediaType.APPLICATION_JSON));

        assertThat(client(KEY).fetchAll(TourApiService.KOR, "KorService2/areaBasedList2", Map.of(), 2)).hasSize(3);

        server.verify();
    }

    @Test
    void connectionFailureMessageNeverContainsKeyOrUrl() {
        server.expect(requestTo(containsString("areaBasedList2")))
                .andRespond(
                        request -> {
                            throw new IOException("connect failed for " + request.getURI());
                        });

        assertThatThrownBy(() -> client(KEY).fetchPage(TourApiService.KOR, "KorService2/areaBasedList2", Map.of(), 1, 10))
                .isInstanceOf(TourApiException.class)
                .satisfies(
                        e -> {
                            assertThat(e.getMessage()).doesNotContain("s3cr").doesNotContain("serviceKey").doesNotContain("tour.test");
                        });
    }

    @Test
    void serverErrorStatusBecomesTourApiExceptionWithoutDetails() {
        server.expect(requestTo(containsString("areaBasedList2"))).andRespond(withServerError());

        assertThatThrownBy(() -> client(KEY).fetchPage(TourApiService.KOR, "KorService2/areaBasedList2", Map.of(), 1, 10))
                .isInstanceOf(TourApiException.class)
                .satisfies(e -> assertThat(e.getMessage()).doesNotContain("s3cr"));
    }

    @Test
    void missingKeyFailsFastWithoutCallingTheNetwork() {
        assertThatThrownBy(() -> client("").fetchPage(TourApiService.KOR, "KorService2/areaBasedList2", Map.of(), 1, 10))
                .isInstanceOf(TourApiException.class)
                .hasMessageContaining("인증키");
        server.verify(); // 기대한 요청이 없으므로 호출이 없었어야 한다
    }
}

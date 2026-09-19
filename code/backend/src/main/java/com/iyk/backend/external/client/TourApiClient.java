package com.iyk.backend.external.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iyk.backend.external.config.TourApiProperties;
import com.iyk.backend.external.config.TourApiService;
import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * 한국관광공사 OpenAPI(공공데이터포털) 호출 클라이언트.
 *
 * <p>공통 규칙: 응답은 JSON, 성공 코드는 "0000". 오류는 {"resultCode":"11","resultMsg":"..."} 처럼 response 래퍼 없이 HTTP 200으로
 * 오기도 한다. 요청 주소에는 인증키가 들어 있으므로 주소나 원본 예외 메시지는 로그·예외에 절대 남기지 않는다.
 */
@Slf4j
@Component
public class TourApiClient {

    private static final String SUCCESS = "0000";
    private static final String NO_DATA = "03";
    private static final int MAX_PAGES = 60;
    private static final Pattern XML_MESSAGE =
            Pattern.compile("<(?:returnAuthMsg|resultMsg|errMsg)>([^<]*)</");

    private final TourApiProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public TourApiClient(TourApiProperties properties, RestClient tourApiRestClient, ObjectMapper objectMapper) {
        this.properties = properties;
        this.restClient = tourApiRestClient;
        this.objectMapper = objectMapper;
    }

    /** 한 페이지 결과. */
    public record Page(int totalCount, List<JsonNode> items) {}

    public boolean hasKey(TourApiService service) {
        return properties.hasKeyFor(service);
    }

    /** 한 페이지를 조회한다. */
    public Page fetchPage(
            TourApiService service, String path, Map<String, String> params, int pageNo, int pageSize) {
        Map<String, String> query = new LinkedHashMap<>();
        query.put("MobileOS", "ETC");
        query.put("MobileApp", "IYK");
        query.put("_type", "json");
        query.putAll(params);
        query.put("numOfRows", String.valueOf(pageSize));
        query.put("pageNo", String.valueOf(pageNo));

        String body = get(service, path, query);
        return parse(service, body);
    }

    /** 모든 페이지를 이어서 조회한다. */
    public List<JsonNode> fetchAll(TourApiService service, String path, Map<String, String> params, int pageSize) {
        List<JsonNode> all = new ArrayList<>();
        for (int pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
            Page page = fetchPage(service, path, params, pageNo, pageSize);
            all.addAll(page.items());
            if (page.items().isEmpty() || all.size() >= page.totalCount()) {
                break;
            }
        }
        return all;
    }

    /** 결과가 0~1건인 상세 조회용. */
    public JsonNode fetchFirst(TourApiService service, String path, Map<String, String> params) {
        List<JsonNode> items = fetchPage(service, path, params, 1, 1).items();
        return items.isEmpty() ? null : items.get(0);
    }

    private String get(TourApiService service, String path, Map<String, String> query) {
        String key = properties.keyFor(service);
        if (key == null) {
            throw new TourApiException(service.displayName() + " 인증키가 설정되지 않았습니다 (code/backend/.env).");
        }
        URI uri = buildUri(path, key, query);
        try {
            String body =
                    restClient.get().uri(uri).accept(MediaType.APPLICATION_JSON).retrieve().body(String.class);
            return body == null ? "" : body;
        } catch (RestClientException e) {
            // e.getMessage() 에는 인증키가 든 요청 주소가 포함될 수 있어 클래스 이름만 남긴다.
            log.warn("TourAPI 호출 실패: {} ({})", path, e.getClass().getSimpleName());
            throw new TourApiException("관광 데이터 서버에 연결하지 못했습니다: " + e.getClass().getSimpleName());
        }
    }

    /**
     * 인증키는 Encoding 키(이미 %인코딩됨)와 Decoding 키 어느 쪽이 들어와도, 한 번만 인코딩되도록 정규화한다. 이중 인코딩되면 서버가
     * 키를 인식하지 못한다(SERVICE_KEY_IS_NOT_REGISTERED_ERROR).
     */
    URI buildUri(String path, String key, Map<String, String> query) {
        String decodedKey = key.contains("%") ? URLDecoder.decode(key, StandardCharsets.UTF_8) : key;
        StringBuilder url = new StringBuilder(properties.baseUrl()).append(path).append("?serviceKey=");
        url.append(URLEncoder.encode(decodedKey, StandardCharsets.UTF_8));
        query.forEach(
                (name, value) ->
                        url.append('&')
                                .append(name)
                                .append('=')
                                .append(URLEncoder.encode(value, StandardCharsets.UTF_8)));
        return URI.create(url.toString());
    }

    private Page parse(TourApiService service, String body) {
        String trimmed = body.trim();
        if (trimmed.isEmpty()) {
            throw new TourApiException("관광 데이터 서버가 빈 응답을 보냈습니다.");
        }
        if (trimmed.startsWith("<")) {
            // _type=json 을 무시하고 XML 오류를 돌려주는 경우 (예: 등록되지 않은 인증키)
            Matcher matcher = XML_MESSAGE.matcher(trimmed);
            String message = matcher.find() ? matcher.group(1) : "알 수 없는 XML 오류";
            throw new TourApiException("관광 데이터 서버 오류: " + redact(service, message));
        }
        JsonNode root;
        try {
            root = objectMapper.readTree(trimmed);
        } catch (Exception e) {
            throw new TourApiException("관광 데이터 서버 응답을 해석하지 못했습니다.");
        }

        boolean wrapped = root.has("response");
        JsonNode header = wrapped ? root.path("response").path("header") : root;
        String code = header.path("resultCode").asText("");
        String message = header.path("resultMsg").asText("");
        if (NO_DATA.equals(code)) {
            return new Page(0, List.of());
        }
        if (!SUCCESS.equals(code)) {
            throw new TourApiException(code, "관광 데이터 서버 오류 " + code + ": " + redact(service, message));
        }

        JsonNode responseBody = root.path("response").path("body");
        int total = responseBody.path("totalCount").asInt(0);
        // 결과가 없으면 items 가 "" (문자열)로 오고, 1건이면 item 이 배열이 아니라 객체로 온다.
        JsonNode item = responseBody.path("items").path("item");
        List<JsonNode> items = new ArrayList<>();
        if (item.isArray()) {
            item.forEach(items::add);
        } else if (item.isObject()) {
            items.add(item);
        }
        return new Page(total, items);
    }

    private String redact(TourApiService service, String text) {
        String key = properties.keyFor(service);
        if (key == null || text == null) {
            return text;
        }
        String decoded = key.contains("%") ? URLDecoder.decode(key, StandardCharsets.UTF_8) : key;
        return text.replace(key, "***").replace(decoded, "***");
    }
}

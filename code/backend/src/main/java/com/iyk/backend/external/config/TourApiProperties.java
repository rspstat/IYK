package com.iyk.backend.external.config;

import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * application.yml 의 tourapi.* — 한국관광공사 OpenAPI(공공데이터포털) 설정.
 *
 * @param serviceKey 공용 키. API별 키가 따로 없을 때 모든 API에 쓴다.
 * @param keys API별 키. 키 이름은 {@link TourApiService#yamlKey()}.
 * @param baseUrl API 공통 주소. 비우면 공공데이터포털 기본 주소를 쓴다(테스트에서만 바꾼다).
 */
@ConfigurationProperties(prefix = "tourapi")
public record TourApiProperties(String serviceKey, Map<String, String> keys, String baseUrl) {

    public static final String DEFAULT_BASE_URL = "https://apis.data.go.kr/B551011/";

    public TourApiProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = DEFAULT_BASE_URL;
        }
        if (!baseUrl.endsWith("/")) {
            baseUrl = baseUrl + "/";
        }
    }

    /** 해당 API의 개별 키가 있으면 그것을, 없으면 공용 키를 돌려준다. 둘 다 없으면 null. */
    public String keyFor(TourApiService service) {
        String specific = keys == null ? null : keys.get(service.yamlKey());
        if (specific != null && !specific.isBlank()) {
            return specific.trim();
        }
        return serviceKey == null || serviceKey.isBlank() ? null : serviceKey.trim();
    }

    public boolean hasKeyFor(TourApiService service) {
        return keyFor(service) != null;
    }
}

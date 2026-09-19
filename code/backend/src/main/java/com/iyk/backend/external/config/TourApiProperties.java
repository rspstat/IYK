package com.iyk.backend.external.config;

import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * application.yml 의 tourapi.* — 한국관광공사 OpenAPI(공공데이터포털) 인증키 설정.
 *
 * @param serviceKey 공용 키. API별 키가 따로 없을 때 모든 API에 쓴다.
 * @param keys API별 키. 키 이름은 {@link TourApiService#yamlKey()}.
 */
@ConfigurationProperties(prefix = "tourapi")
public record TourApiProperties(String serviceKey, Map<String, String> keys) {

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

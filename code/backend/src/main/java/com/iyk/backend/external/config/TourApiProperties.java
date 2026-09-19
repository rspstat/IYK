package com.iyk.backend.external.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** application.yml 의 tourapi.* — 한국관광공사 OpenAPI(공공데이터포털) 설정. */
@ConfigurationProperties(prefix = "tourapi")
public record TourApiProperties(String serviceKey) {

    public boolean hasServiceKey() {
        return serviceKey != null && !serviceKey.isBlank();
    }
}

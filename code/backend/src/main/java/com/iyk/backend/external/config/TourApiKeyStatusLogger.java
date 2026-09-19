package com.iyk.backend.external.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** 서버 시작 시 API 9종의 인증키가 설정됐는지만 로그로 알려준다. 키 값은 절대 출력하지 않는다. */
@Slf4j
@Component
@RequiredArgsConstructor
public class TourApiKeyStatusLogger implements ApplicationRunner {

    private final TourApiProperties properties;

    @Override
    public void run(ApplicationArguments args) {
        StringBuilder missing = new StringBuilder();
        int configured = 0;
        for (TourApiService service : TourApiService.values()) {
            if (properties.hasKeyFor(service)) {
                configured++;
            } else {
                missing.append("\n  - ").append(service.displayName()).append(" (TOURAPI_KEY_").append(service.name()).append(')');
            }
        }
        if (missing.isEmpty()) {
            log.info("TourAPI 인증키: {}종 모두 설정됨", configured);
        } else {
            log.warn(
                    "TourAPI 인증키 {}종 설정됨, 미설정:{}\n  code/backend/.env 에 채우면 됩니다(.env.example 참고).",
                    configured,
                    missing);
        }
    }
}

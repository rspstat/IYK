package com.iyk.backend.external.config;

import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.RestClient;

@Configuration
@EnableScheduling
public class TourApiConfig {

    /** TourAPI 호출 전용 RestClient. 응답이 느린 서버 때문에 스레드가 오래 묶이지 않도록 타임아웃을 둔다. */
    @Bean
    RestClient tourApiRestClient(RestClient.Builder builder) {
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(20));
        return builder.requestFactory(requestFactory).build();
    }
}

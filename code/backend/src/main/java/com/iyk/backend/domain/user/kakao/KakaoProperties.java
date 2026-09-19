package com.iyk.backend.domain.user.kakao;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * application.yml 의 kakao.* — 카카오 로그인(OAuth) 설정. 값은 code/backend/.env 에서 받는다(.env.example 참고).
 *
 * @param restApiKey Kakao Developers 앱의 [플랫폼 키] > REST API 키
 * @param clientSecret 그 REST API 키의 클라이언트 시크릿(기본으로 활성화돼 있어 토큰 요청에 필요). 서버에서만 쓰고 절대 프론트로 보내지 않는다.
 */
@ConfigurationProperties(prefix = "kakao")
public record KakaoProperties(String restApiKey, String clientSecret) {

    public boolean isConfigured() {
        return restApiKey != null && !restApiKey.isBlank();
    }
}

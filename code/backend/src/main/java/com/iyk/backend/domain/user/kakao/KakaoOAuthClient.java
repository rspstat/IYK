package com.iyk.backend.domain.user.kakao;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * 카카오 로그인(OAuth 인가 코드 방식) 서버 쪽 처리. 문서: https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api
 *
 * <p>흐름: 프론트가 카카오 로그인 창으로 보냄(authorizeUrl) → 카카오가 redirect_uri 로 code 를 돌려줌 → 프론트가 code 를 서버로 보냄 →
 * 서버가 code 를 토큰으로 바꾸고(클라이언트 시크릿 사용) 회원 정보를 조회(fetchProfile). 인가 코드·토큰·시크릿은 로그와 예외 메시지에
 * 절대 남기지 않는다.
 */
@Slf4j
@Component
public class KakaoOAuthClient {

    static final String AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";
    static final String TOKEN_URL = "https://kauth.kakao.com/oauth/token";
    static final String USER_ME_URL = "https://kapi.kakao.com/v2/user/me";

    /** 프론트의 카카오 로그인 콜백 화면 경로. 다른 경로로는 코드를 받지 않는다. */
    public static final String CALLBACK_PATH = "/auth/kakao/callback";

    private static final Pattern STATE_FORMAT = Pattern.compile("[A-Za-z0-9_-]{1,128}");
    private static final ObjectMapper JSON = new ObjectMapper();

    /** 카카오 회원번호와, 있으면 닉네임(동의항목 설정에 따라 없을 수 있다). */
    public record Profile(String id, String nickname) {}

    private final KakaoProperties properties;
    private final RestClient restClient;

    @Autowired
    public KakaoOAuthClient(KakaoProperties properties, RestClient.Builder builder) {
        this(properties, builder.requestFactory(timeouts()).build());
    }

    KakaoOAuthClient(KakaoProperties properties, RestClient restClient) {
        this.properties = properties;
        this.restClient = restClient;
        log.info("카카오 로그인: {}", properties.isConfigured() ? "설정됨" : "미설정 (code/backend/.env 의 KAKAO_REST_API_KEY)");
    }

    private static JdkClientHttpRequestFactory timeouts() {
        JdkClientHttpRequestFactory factory =
                new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(10));
        return factory;
    }

    public boolean isConfigured() {
        return properties.isConfigured();
    }

    /** redirect_uri 는 우리 콜백 경로여야 한다(카카오 콘솔에 등록한 값과도 같아야 한다). */
    public static void requireCallbackUri(String redirectUri) {
        try {
            URI uri = URI.create(redirectUri);
            boolean ok =
                    ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme()))
                            && uri.getHost() != null
                            && CALLBACK_PATH.equals(uri.getPath())
                            && uri.getQuery() == null
                            && uri.getFragment() == null;
            if (ok) {
                return;
            }
        } catch (IllegalArgumentException ignored) {
            // 아래에서 같은 오류로 처리
        }
        throw new IllegalArgumentException("올바르지 않은 redirectUri 입니다.");
    }

    /** 사용자를 보낼 카카오 로그인 주소. state 는 프론트가 만든 CSRF 방지용 임의 문자열이다. */
    public String authorizeUrl(String redirectUri, String state) {
        requireConfigured();
        requireCallbackUri(redirectUri);
        if (state == null || !STATE_FORMAT.matcher(state).matches()) {
            throw new IllegalArgumentException("올바르지 않은 state 입니다.");
        }
        return AUTHORIZE_URL
                + "?client_id=" + encode(properties.restApiKey())
                + "&redirect_uri=" + encode(redirectUri)
                + "&response_type=code"
                + "&state=" + encode(state);
    }

    /** 인가 코드를 토큰으로 바꾸고 회원 정보를 가져온다. */
    public Profile fetchProfile(String code, String redirectUri) {
        requireConfigured();
        requireCallbackUri(redirectUri);
        return requestProfile(requestAccessToken(code, redirectUri));
    }

    private String requestAccessToken(String code, String redirectUri) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", properties.restApiKey());
        form.add("redirect_uri", redirectUri);
        form.add("code", code);
        if (properties.clientSecret() != null && !properties.clientSecret().isBlank()) {
            form.add("client_secret", properties.clientSecret());
        }
        try {
            JsonNode body =
                    restClient
                            .post()
                            .uri(TOKEN_URL)
                            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                            .body(form)
                            .retrieve()
                            .body(JsonNode.class);
            String token = body == null ? "" : body.path("access_token").asText("");
            if (token.isBlank()) {
                throw new KakaoLoginException("카카오 서버 응답에 토큰이 없습니다.");
            }
            return token;
        } catch (HttpClientErrorException e) {
            // 이미 쓴 코드, 만료된 코드, redirect_uri 불일치, 클라이언트 시크릿 오류 등. 카카오 오류 코드(KOE...)만 남긴다.
            log.warn("카카오 토큰 요청 거절: {}", errorCode(e));
            throw new IllegalArgumentException("카카오 로그인 인증에 실패했어요. 처음부터 다시 시도해주세요.");
        } catch (RestClientException e) {
            log.warn("카카오 토큰 요청 실패: {}", e.getClass().getSimpleName());
            throw new KakaoLoginException("카카오 서버와 통신하지 못했어요. 잠시 후 다시 시도해주세요.");
        }
    }

    private Profile requestProfile(String accessToken) {
        try {
            JsonNode body =
                    restClient
                            .get()
                            .uri(USER_ME_URL)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                            .retrieve()
                            .body(JsonNode.class);
            String id = body == null ? "" : body.path("id").asText("");
            if (id.isBlank()) {
                throw new KakaoLoginException("카카오 서버 응답에 회원 정보가 없습니다.");
            }
            String nickname =
                    firstNonBlank(
                            body.path("kakao_account").path("profile").path("nickname").asText(""),
                            body.path("properties").path("nickname").asText(""));
            return new Profile(id, nickname);
        } catch (HttpClientErrorException e) {
            log.warn("카카오 회원 정보 요청 거절: {}", errorCode(e));
            throw new IllegalArgumentException("카카오 로그인 인증에 실패했어요. 처음부터 다시 시도해주세요.");
        } catch (RestClientException e) {
            log.warn("카카오 회원 정보 요청 실패: {}", e.getClass().getSimpleName());
            throw new KakaoLoginException("카카오 서버와 통신하지 못했어요. 잠시 후 다시 시도해주세요.");
        }
    }

    private void requireConfigured() {
        if (!properties.isConfigured()) {
            throw new KakaoNotConfiguredException();
        }
    }

    private static String errorCode(HttpClientErrorException e) {
        try {
            JsonNode json = JSON.readTree(e.getResponseBodyAsString());
            String code = json.path("error_code").asText(json.path("error").asText(""));
            return code.isBlank() ? "HTTP " + e.getStatusCode().value() : code;
        } catch (Exception parseFailure) {
            return "HTTP " + e.getStatusCode().value();
        }
    }

    private static String firstNonBlank(String a, String b) {
        if (!a.isBlank()) {
            return a;
        }
        return b.isBlank() ? null : b;
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}

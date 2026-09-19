package com.iyk.backend.domain.user.kakao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class KakaoOAuthClientTests {

    private static final String REDIRECT = "http://localhost:5173/auth/kakao/callback";

    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();

    private KakaoOAuthClient client(String restKey, String secret) {
        return new KakaoOAuthClient(new KakaoProperties(restKey, secret), builder.build());
    }

    private void expectTokenThenProfile(String profileJson, String secretMatcherPart) {
        server.expect(requestTo(KakaoOAuthClient.TOKEN_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Content-Type", containsString("application/x-www-form-urlencoded")))
                .andExpect(content().string(containsString("grant_type=authorization_code")))
                .andExpect(content().string(containsString("client_id=REST-KEY")))
                .andExpect(content().string(containsString("code=CODE1")))
                .andExpect(content().string(containsString("redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fkakao%2Fcallback")))
                .andRespond(withSuccess("{\"access_token\":\"AT-1\",\"token_type\":\"bearer\"}", MediaType.APPLICATION_JSON));
        server.expect(requestTo(KakaoOAuthClient.USER_ME_URL))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer AT-1"))
                .andRespond(withSuccess(profileJson, MediaType.APPLICATION_JSON));
    }

    @Test
    void authorizeUrlCarriesClientIdEncodedRedirectAndState() {
        String url = client("REST-KEY", "SECRET").authorizeUrl(REDIRECT, "abc_123-XYZ");

        assertThat(url)
                .startsWith("https://kauth.kakao.com/oauth/authorize?")
                .contains("client_id=REST-KEY")
                .contains("redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fkakao%2Fcallback")
                .contains("response_type=code")
                .contains("state=abc_123-XYZ")
                .doesNotContain("SECRET"); // 클라이언트 시크릿은 주소에 절대 들어가지 않는다
    }

    @Test
    void authorizeUrlRejectsUnsafeRedirectUrisAndStates() {
        KakaoOAuthClient client = client("REST-KEY", "SECRET");
        for (String bad : new String[] {"http://localhost:5173/other", "javascript:alert(1)", "/auth/kakao/callback", "http://localhost:5173/auth/kakao/callback?x=1", "not a uri"}) {
            assertThatThrownBy(() -> client.authorizeUrl(bad, "state1")).as(bad).isInstanceOf(IllegalArgumentException.class);
        }
        assertThatThrownBy(() -> client.authorizeUrl(REDIRECT, "bad state&x=1")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> client.authorizeUrl(REDIRECT, "")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void notConfiguredFailsFastWithoutCallingKakao() {
        KakaoOAuthClient client = client("", "");

        assertThat(client.isConfigured()).isFalse();
        assertThatThrownBy(() -> client.authorizeUrl(REDIRECT, "s")).isInstanceOf(KakaoNotConfiguredException.class);
        assertThatThrownBy(() -> client.fetchProfile("CODE1", REDIRECT)).isInstanceOf(KakaoNotConfiguredException.class);
        server.verify(); // 기대한 요청이 없으므로 카카오 호출이 없었어야 한다
    }

    @Test
    void exchangesCodeForTokenThenReadsProfileWithClientSecret() {
        expectTokenThenProfile("{\"id\":12345,\"kakao_account\":{\"profile\":{\"nickname\":\"길동\"}}}", null);
        // 클라이언트 시크릿이 토큰 요청 본문에 실린다
        server.reset();
        server.expect(requestTo(KakaoOAuthClient.TOKEN_URL))
                .andExpect(content().string(containsString("client_secret=SECRET")))
                .andRespond(withSuccess("{\"access_token\":\"AT-1\"}", MediaType.APPLICATION_JSON));
        server.expect(requestTo(KakaoOAuthClient.USER_ME_URL))
                .andRespond(withSuccess("{\"id\":12345,\"kakao_account\":{\"profile\":{\"nickname\":\"길동\"}}}", MediaType.APPLICATION_JSON));

        KakaoOAuthClient.Profile profile = client("REST-KEY", "SECRET").fetchProfile("CODE1", REDIRECT);

        assertThat(profile).isEqualTo(new KakaoOAuthClient.Profile("12345", "길동"));
        server.verify();
    }

    @Test
    void tokenAndProfileRequestsUseTheDocumentedFormat() {
        expectTokenThenProfile("{\"id\":777,\"properties\":{\"nickname\":\"옛방식\"}}", null);

        KakaoOAuthClient.Profile profile = client("REST-KEY", "").fetchProfile("CODE1", REDIRECT);

        assertThat(profile).isEqualTo(new KakaoOAuthClient.Profile("777", "옛방식")); // kakao_account 없으면 properties.nickname
        server.verify();
    }

    @Test
    void clientSecretIsOmittedWhenNotConfigured() {
        server.expect(requestTo(KakaoOAuthClient.TOKEN_URL))
                .andExpect(content().string(not(containsString("client_secret"))))
                .andRespond(withSuccess("{\"access_token\":\"AT-1\"}", MediaType.APPLICATION_JSON));
        server.expect(requestTo(KakaoOAuthClient.USER_ME_URL)).andRespond(withSuccess("{\"id\":1}", MediaType.APPLICATION_JSON));

        client("REST-KEY", "").fetchProfile("CODE1", REDIRECT);

        server.verify();
    }

    @Test
    void missingNicknameComesBackAsNull() {
        server.expect(requestTo(KakaoOAuthClient.TOKEN_URL)).andRespond(withSuccess("{\"access_token\":\"AT-1\"}", MediaType.APPLICATION_JSON));
        server.expect(requestTo(KakaoOAuthClient.USER_ME_URL)).andRespond(withSuccess("{\"id\":4242}", MediaType.APPLICATION_JSON));

        assertThat(client("REST-KEY", "S").fetchProfile("CODE1", REDIRECT)).isEqualTo(new KakaoOAuthClient.Profile("4242", null));
    }

    @Test
    void rejectedCodeBecomesAFriendlyBadRequestWithoutLeakingCodeOrSecret() {
        server.expect(requestTo(KakaoOAuthClient.TOKEN_URL))
                .andRespond(withBadRequest().contentType(MediaType.APPLICATION_JSON).body("{\"error\":\"invalid_grant\",\"error_code\":\"KOE320\",\"error_description\":\"authorization code not found for code=SUPER-SECRET-CODE\"}"));

        assertThatThrownBy(() -> client("REST-KEY", "SUPER-SECRET").fetchProfile("SUPER-SECRET-CODE", REDIRECT))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("카카오 로그인 인증에 실패")
                .satisfies(e -> assertThat(e.getMessage()).doesNotContain("SUPER-SECRET").doesNotContain("KOE320"));
    }

    @Test
    void kakaoServerErrorsBecomeKakaoLoginException() {
        server.expect(requestTo(KakaoOAuthClient.TOKEN_URL)).andRespond(withServerError());

        assertThatThrownBy(() -> client("REST-KEY", "S").fetchProfile("CODE1", REDIRECT))
                .isInstanceOf(KakaoLoginException.class)
                .hasMessageContaining("카카오 서버와 통신하지 못했어요");
    }

    @Test
    void profileWithoutIdIsAnError() {
        server.expect(requestTo(KakaoOAuthClient.TOKEN_URL)).andRespond(withSuccess("{\"access_token\":\"AT-1\"}", MediaType.APPLICATION_JSON));
        server.expect(requestTo(KakaoOAuthClient.USER_ME_URL)).andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client("REST-KEY", "S").fetchProfile("CODE1", REDIRECT)).isInstanceOf(KakaoLoginException.class);
    }

    @Test
    void tokenResponseWithoutAccessTokenIsAnError() {
        server.expect(requestTo(KakaoOAuthClient.TOKEN_URL)).andRespond(withSuccess("{\"token_type\":\"bearer\"}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client("REST-KEY", "S").fetchProfile("CODE1", REDIRECT)).isInstanceOf(KakaoLoginException.class);
    }
}

package com.iyk.backend.domain.user.kakao;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** 카카오 로그인 API. 카카오 서버 호출(KakaoOAuthClient)은 가짜로 대체한다. */
@SpringBootTest
@AutoConfigureMockMvc
class KakaoLoginApiTests {

    private static final String REDIRECT = "http://localhost:5173/auth/kakao/callback";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean KakaoOAuthClient kakao;

    private static String uniqueKakaoId() {
        return String.valueOf(Math.abs(UUID.randomUUID().getMostSignificantBits() % 1_000_000_000L)) + "1234";
    }

    private JsonNode kakaoLogin(String code) throws Exception {
        String body =
                mvc.perform(
                                post("/api/auth/kakao")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content("{\"code\":\"" + code + "\",\"redirectUri\":\"" + REDIRECT + "\"}"))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        return objectMapper.readTree(body);
    }

    @Test
    void providersReportsWhetherKakaoLoginIsConfigured() throws Exception {
        when(kakao.isConfigured()).thenReturn(false);
        mvc.perform(get("/api/auth/providers")).andExpect(status().isOk()).andExpect(jsonPath("$.kakao", is(false)));

        when(kakao.isConfigured()).thenReturn(true);
        mvc.perform(get("/api/auth/providers")).andExpect(jsonPath("$.kakao", is(true)));
    }

    @Test
    void loginUrlComesFromTheServerSoTheRestKeyStaysOutOfTheFrontend() throws Exception {
        when(kakao.authorizeUrl(REDIRECT, "st-1")).thenReturn("https://kauth.kakao.com/oauth/authorize?client_id=X&state=st-1");

        mvc.perform(get("/api/auth/kakao/login-url").param("redirectUri", REDIRECT).param("state", "st-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url", is("https://kauth.kakao.com/oauth/authorize?client_id=X&state=st-1")));
    }

    @Test
    void loginUrlIs503WhenKakaoIsNotConfigured() throws Exception {
        when(kakao.authorizeUrl(anyString(), anyString())).thenThrow(new KakaoNotConfiguredException());

        mvc.perform(get("/api/auth/kakao/login-url").param("redirectUri", REDIRECT).param("state", "s"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error.code", is("KAKAO_NOT_CONFIGURED")));
    }

    @Test
    void firstLoginCreatesAccountAndTokenWorksOnProtectedEndpoints() throws Exception {
        String id = uniqueKakaoId();
        when(kakao.fetchProfile("code-a", REDIRECT)).thenReturn(new KakaoOAuthClient.Profile(id, "길동"));

        JsonNode response = kakaoLogin("code-a");

        String token = response.get("accessToken").asText();
        org.assertj.core.api.Assertions.assertThat(response.at("/user/nickname").asText()).isEqualTo("길동");
        org.assertj.core.api.Assertions.assertThat(response.at("/user/id").asLong()).isPositive();
        mvc.perform(get("/api/me/likes").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
    }

    @Test
    void sameKakaoAccountGetsTheSameUserAndDifferentAccountsGetDifferentOnes() throws Exception {
        String id = uniqueKakaoId();
        String otherId = uniqueKakaoId() + "9";
        when(kakao.fetchProfile("code-1", REDIRECT)).thenReturn(new KakaoOAuthClient.Profile(id, "첫번째 닉네임"));
        when(kakao.fetchProfile("code-2", REDIRECT)).thenReturn(new KakaoOAuthClient.Profile(id, "바뀐 닉네임"));
        when(kakao.fetchProfile("code-3", REDIRECT)).thenReturn(new KakaoOAuthClient.Profile(otherId, "다른 사람"));

        long first = kakaoLogin("code-1").at("/user/id").asLong();
        JsonNode second = kakaoLogin("code-2");
        long other = kakaoLogin("code-3").at("/user/id").asLong();

        org.assertj.core.api.Assertions.assertThat(second.at("/user/id").asLong()).isEqualTo(first);
        org.assertj.core.api.Assertions.assertThat(second.at("/user/nickname").asText()).isEqualTo("첫번째 닉네임"); // 재로그인이 닉네임을 덮어쓰지 않는다
        org.assertj.core.api.Assertions.assertThat(other).isNotEqualTo(first);
    }

    @Test
    void missingNicknameGetsAGeneratedOne() throws Exception {
        when(kakao.fetchProfile("code-n", REDIRECT)).thenReturn(new KakaoOAuthClient.Profile("55550001234", null));

        org.assertj.core.api.Assertions.assertThat(kakaoLogin("code-n").at("/user/nickname").asText()).isEqualTo("카카오사용자1234");
    }

    @Test
    void kakaoAccountsHaveNoEmailAndCannotUsePasswordLogin() throws Exception {
        when(kakao.fetchProfile("code-p", REDIRECT)).thenReturn(new KakaoOAuthClient.Profile(uniqueKakaoId(), "카카오유저"));
        kakaoLogin("code-p");

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"\",\"password\":\"anything\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"kakao@nowhere.com\",\"password\":\"anything\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message", is("이메일 또는 비밀번호가 올바르지 않습니다.")));
    }

    @Test
    void invalidRedirectUriAndBlankCodeAreBadRequests() throws Exception {
        mvc.perform(post("/api/auth/kakao").contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"c\",\"redirectUri\":\"http://evil.example/steal\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_REQUEST")));
        mvc.perform(post("/api/auth/kakao").contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"\",\"redirectUri\":\"" + REDIRECT + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void kakaoFailuresMapToClearStatusCodes() throws Exception {
        when(kakao.fetchProfile("bad-code", REDIRECT)).thenThrow(new IllegalArgumentException("카카오 로그인 인증에 실패했어요. 처음부터 다시 시도해주세요."));
        when(kakao.fetchProfile("down", REDIRECT)).thenThrow(new KakaoLoginException("카카오 서버와 통신하지 못했어요. 잠시 후 다시 시도해주세요."));
        when(kakao.fetchProfile("unset", REDIRECT)).thenThrow(new KakaoNotConfiguredException());

        String body = "{\"code\":\"%s\",\"redirectUri\":\"" + REDIRECT + "\"}";
        mvc.perform(post("/api/auth/kakao").contentType(MediaType.APPLICATION_JSON).content(body.formatted("bad-code")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/kakao").contentType(MediaType.APPLICATION_JSON).content(body.formatted("down")))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.error.code", is("KAKAO_ERROR")));
        mvc.perform(post("/api/auth/kakao").contentType(MediaType.APPLICATION_JSON).content(body.formatted("unset")))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error.code", is("KAKAO_NOT_CONFIGURED")));
    }
}

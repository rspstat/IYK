package com.iyk.backend;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import org.springframework.test.web.servlet.MockMvc;

/** docs/md/api-spec.md 의 에러 포맷과 인증·좋아요·댓글 계약을 검증한다. */
@SpringBootTest
@AutoConfigureMockMvc
class ApiContractTests {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;

    private record Session(long userId, String token) {}

    private Session signUpAndLogin(String nickname) throws Exception {
        String email = UUID.randomUUID() + "@test.com";
        String credentials = "{\"email\":\"" + email + "\",\"password\":\"pw12345!\"";
        mvc.perform(
                        post("/api/auth/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(credentials + ",\"nickname\":\"" + nickname + "\"}"))
                .andExpect(status().isCreated());
        String body =
                mvc.perform(
                                post("/api/auth/login")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(credentials + "}"))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        JsonNode json = objectMapper.readTree(body);
        return new Session(json.at("/user/id").asLong(), json.get("accessToken").asText());
    }

    private static String bearer(Session session) {
        return "Bearer " + session.token();
    }

    @Test
    void protectedEndpointWithoutTokenReturns401Json() throws Exception {
        mvc.perform(post("/api/spots/s1/like"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code", is("UNAUTHORIZED")));
        mvc.perform(post("/api/spots/s1/like").header("Authorization", "Bearer not.a.jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code", is("UNAUTHORIZED")));
        mvc.perform(get("/api/me/likes"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code", is("UNAUTHORIZED")));
    }

    @Test
    void invalidRequestsReturn400JsonInsteadOfEmpty403() throws Exception {
        Session session = signUpAndLogin("tester");
        mvc.perform(
                        post("/api/spots/s1/comments")
                                .header("Authorization", bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"content\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_REQUEST")));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{bad"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_REQUEST")));
    }

    @Test
    void unknownPathAndWrongMethodUseErrorFormatWithoutStackTrace() throws Exception {
        mvc.perform(get("/api/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")))
                .andExpect(jsonPath("$.trace").doesNotExist());
        mvc.perform(get("/api/auth/login"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.error.code", is("METHOD_NOT_ALLOWED")));
    }

    @Test
    void myLikesReturnsOnlyOwnLikesNewestFirstAndTracksToggle() throws Exception {
        Session me = signUpAndLogin("me");
        Session other = signUpAndLogin("other");
        String spotA = "spot-" + UUID.randomUUID();
        String spotB = "spot-" + UUID.randomUUID();

        mvc.perform(post("/api/spots/" + spotA + "/like").header("Authorization", bearer(me)))
                .andExpect(jsonPath("$.liked", is(true)));
        mvc.perform(post("/api/spots/" + spotB + "/like").header("Authorization", bearer(me)))
                .andExpect(jsonPath("$.liked", is(true)));
        mvc.perform(post("/api/spots/" + spotA + "/like").header("Authorization", bearer(other)));

        mvc.perform(get("/api/me/likes").header("Authorization", bearer(me)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likes", hasSize(2)))
                .andExpect(jsonPath("$.likes[0].spotId", is(spotB)))
                .andExpect(jsonPath("$.likes[1].spotId", is(spotA)))
                .andExpect(jsonPath("$.likes[0].createdAt").exists());

        mvc.perform(post("/api/spots/" + spotB + "/like").header("Authorization", bearer(me)))
                .andExpect(jsonPath("$.liked", is(false)));
        mvc.perform(get("/api/me/likes").header("Authorization", bearer(me)))
                .andExpect(jsonPath("$.likes", hasSize(1)))
                .andExpect(jsonPath("$.likes[0].spotId", is(spotA)));
    }

    @Test
    void nicknameChangeRequiresLoginTrimsAndValidates() throws Exception {
        mvc.perform(put("/api/me/nickname").contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"x\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code", is("UNAUTHORIZED")));

        Session me = signUpAndLogin("before");
        mvc.perform(
                        put("/api/me/nickname")
                                .header("Authorization", bearer(me))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"nickname\":\"  새 닉네임  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is((int) me.userId())))
                .andExpect(jsonPath("$.nickname", is("새 닉네임")));

        // 빈 값·공백뿐·누락·21자 초과는 400, 기존 닉네임은 그대로
        for (String body :
                new String[] {
                    "{\"nickname\":\"\"}",
                    "{\"nickname\":\"    \"}",
                    "{}",
                    "{\"nickname\":\"" + "가".repeat(21) + "\"}",
                    "{\"nickname\":\"a\\nb\"}"
                }) {
            mvc.perform(
                            put("/api/me/nickname")
                                    .header("Authorization", bearer(me))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.code", is("INVALID_REQUEST")));
        }
        mvc.perform(
                        put("/api/me/nickname")
                                .header("Authorization", bearer(me))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"nickname\":\"" + "가".repeat(20) + "\"}"))
                .andExpect(status().isOk());
        mvc.perform(
                        put("/api/me/nickname")
                                .header("Authorization", bearer(me))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"nickname\":\"새 닉네임\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void nicknameChangeShowsUpOnExistingComments() throws Exception {
        Session me = signUpAndLogin("옛이름");
        String spot = "spot-" + UUID.randomUUID();
        mvc.perform(
                        post("/api/spots/" + spot + "/comments")
                                .header("Authorization", bearer(me))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"content\":\"good\"}"))
                .andExpect(status().isCreated());

        mvc.perform(
                        put("/api/me/nickname")
                                .header("Authorization", bearer(me))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"nickname\":\"새이름\"}"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/spots/" + spot + "/comments"))
                .andExpect(jsonPath("$.comments[0].author", is("새이름")));
    }

    @Test
    void commentExposesAuthorIdAndOnlyOwnerCanDelete() throws Exception {
        Session owner = signUpAndLogin("owner");
        Session other = signUpAndLogin("other");
        String spot = "spot-" + UUID.randomUUID();

        String created =
                mvc.perform(
                                post("/api/spots/" + spot + "/comments")
                                        .header("Authorization", bearer(owner))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content("{\"content\":\"good place\"}"))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.authorId", is((int) owner.userId())))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        long commentId = objectMapper.readTree(created).get("id").asLong();

        mvc.perform(get("/api/spots/" + spot + "/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comments", hasSize(1)))
                .andExpect(jsonPath("$.comments[0].authorId", is((int) owner.userId())))
                .andExpect(jsonPath("$.comments[0].author", is("owner")));

        mvc.perform(delete("/api/comments/" + commentId).header("Authorization", bearer(other)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_REQUEST")));
        mvc.perform(delete("/api/comments/" + commentId).header("Authorization", bearer(owner)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/spots/" + spot + "/comments"))
                .andExpect(jsonPath("$.comments", hasSize(0)));
    }
}

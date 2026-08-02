package com.iyk.backend.domain.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private UserSummary user;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class UserSummary {
        private Long id;
        private String nickname;
    }
}

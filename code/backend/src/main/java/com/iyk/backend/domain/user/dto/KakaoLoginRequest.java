package com.iyk.backend.domain.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class KakaoLoginRequest {

    /** 카카오가 리다이렉트로 돌려준 인가 코드 (1회용). */
    @NotBlank
    private String code;

    /** 인가 코드를 받을 때 쓴 redirect_uri 와 정확히 같아야 한다. */
    @NotBlank
    private String redirectUri;
}

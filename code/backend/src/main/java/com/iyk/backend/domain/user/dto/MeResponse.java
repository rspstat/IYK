package com.iyk.backend.domain.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class MeResponse {
    private Long id;
    /** 카카오 계정은 이메일을 받지 않아 null. */
    private String email;
    private String nickname;
    /** data URL. 프로필 사진이 없으면 null. */
    private String profileImage;
}

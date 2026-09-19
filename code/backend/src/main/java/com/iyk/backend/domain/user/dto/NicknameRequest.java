package com.iyk.backend.domain.user.dto;

import lombok.Getter;

@Getter
public class NicknameRequest {

    // 길이·공백 검증은 UserService 에서 한다(사용자에게 보여줄 문구를 직접 정하려고).
    private String nickname;
}

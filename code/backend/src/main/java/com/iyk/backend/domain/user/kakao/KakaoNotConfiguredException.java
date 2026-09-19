package com.iyk.backend.domain.user.kakao;

/** 카카오 로그인 키가 서버에 설정되지 않았을 때 (503 KAKAO_NOT_CONFIGURED). */
public class KakaoNotConfiguredException extends RuntimeException {

    public KakaoNotConfiguredException() {
        super("카카오 로그인이 아직 설정되지 않았습니다.");
    }
}

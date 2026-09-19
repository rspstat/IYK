package com.iyk.backend.domain.user.kakao;

/** 카카오 서버와 통신하지 못했거나 카카오가 5xx 로 응답했을 때 (502 KAKAO_ERROR). 메시지에는 코드·토큰·시크릿을 넣지 않는다. */
public class KakaoLoginException extends RuntimeException {

    public KakaoLoginException(String message) {
        super(message);
    }
}

package com.iyk.backend.external.exception;

/** 요청한 관광지 id 가 캐시에 없을 때 (404 SPOT_NOT_FOUND). */
public class SpotNotFoundException extends RuntimeException {

    public SpotNotFoundException(String spotId) {
        super("해당 관광지를 찾을 수 없습니다: " + spotId);
    }
}

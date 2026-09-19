package com.iyk.backend.external.exception;

/** 서버 시작 직후 TourAPI 동기화가 끝나기 전이라 관광지 데이터가 아직 비어 있을 때 (503 DATA_NOT_READY). */
public class DataNotReadyException extends RuntimeException {

    public DataNotReadyException() {
        super("관광 데이터를 준비하는 중입니다. 잠시 후 다시 시도해주세요.");
    }
}

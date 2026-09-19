package com.iyk.backend.external.client;

/** TourAPI 호출 실패(키 없음, 네트워크 오류, 서비스 오류 코드). 메시지에는 인증키나 요청 주소를 절대 넣지 않는다. */
public class TourApiException extends RuntimeException {

    private final String resultCode;

    public TourApiException(String message) {
        this(null, message);
    }

    public TourApiException(String resultCode, String message) {
        super(message);
        this.resultCode = resultCode;
    }

    /** 공공데이터포털 resultCode (예: "11" 필수 파라미터 누락). 네트워크 오류 등은 null. */
    public String resultCode() {
        return resultCode;
    }
}

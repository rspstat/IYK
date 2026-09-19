package com.iyk.backend.external.service;

/**
 * 집중률(cnctrRate, 0~100)을 화면용 3단계로 나눈다.
 * 충북 관광지 3,750개 일별 값의 분포(중앙값 42, 하위 1/3 경계 31, 상위 1/3 경계 58)를 기준으로 삼분위에 가깝게 잡았다.
 * 값의 의미는 절대적인 붐빔 정도가 아니라 예측 기간 안에서의 상대적 집중도다.
 */
public final class CongestionLevel {

    public static final double LOW_BELOW = 33;
    public static final double HIGH_FROM = 58;

    private CongestionLevel() {}

    public static String fromRate(double rate) {
        if (rate < LOW_BELOW) {
            return "low";
        }
        return rate < HIGH_FROM ? "medium" : "high";
    }
}

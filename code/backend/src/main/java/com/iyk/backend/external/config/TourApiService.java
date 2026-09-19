package com.iyk.backend.external.config;

/**
 * 사용하는 한국관광공사 OpenAPI 9종. 공공데이터포털은 API마다 활용신청을 하므로 인증키가 API별로 다를 수 있다.
 * application.yml 의 tourapi.keys.{yamlKey} 로 개별 키를 지정하고, 없으면 tourapi.service-key(공용)를 쓴다.
 */
public enum TourApiService {
    KOR("국문 관광정보 서비스"),
    RELATED("관광지별 연관 관광지 정보"),
    PHOTO("관광사진 정보"),
    CONGESTION("관광지 집중률 방문자 추이 예측 정보"),
    PET("반려동물 동반여행 서비스"),
    BARRIER_FREE("무장애 여행 정보"),
    WELLNESS("웰니스관광정보"),
    CAMPING("고캠핑 정보 조회서비스"),
    DURUNUBI("두루누비 정보 서비스");

    private final String displayName;

    TourApiService(String displayName) {
        this.displayName = displayName;
    }

    public String displayName() {
        return displayName;
    }

    /** application.yml 의 tourapi.keys 아래 키 이름 (예: BARRIER_FREE → barrier-free). */
    public String yamlKey() {
        return name().toLowerCase().replace('_', '-');
    }
}

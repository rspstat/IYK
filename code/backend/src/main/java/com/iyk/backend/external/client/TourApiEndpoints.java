package com.iyk.backend.external.client;

/**
 * 2026-09-19 실호출로 확인한 엔드포인트. 상세한 파라미터와 충북 데이터 규모는 docs/md/api-spec.md, mbti-mapping.md 참고.
 * (KorService1 은 종료되어 KorService2 를 쓴다. 지역 필터는 areaCode 가 아니라 lDongRegnCd 이다.)
 */
public final class TourApiEndpoints {

    private TourApiEndpoints() {}

    public static final String KOR_LIST = "KorService2/areaBasedList2";
    public static final String KOR_DETAIL_COMMON = "KorService2/detailCommon2";
    public static final String KOR_DETAIL_INTRO = "KorService2/detailIntro2";
    public static final String KOR_DETAIL_IMAGE = "KorService2/detailImage2";
    public static final String PET_LIST = "KorPetTourService2/areaBasedList2";
    public static final String BARRIER_FREE_LIST = "KorWithService2/areaBasedList2";
    public static final String WELLNESS_LIST = "WellnessTursmService/areaBasedList";
    public static final String CAMPING_LIST = "GoCamping/basedList";
    public static final String CONGESTION_LIST = "TatsCnctrRateService/tatsCnctrRatedList";
    public static final String RELATED_LIST = "TarRlteTarService1/areaBasedList1";
    public static final String PHOTO_SEARCH = "PhotoGalleryService1/gallerySearchList1";

    /** 충청북도 법정동 시도 코드 (lDongRegnCd / areaCd). */
    public static final String CHUNGBUK = "43";
}

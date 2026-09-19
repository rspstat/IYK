package com.iyk.backend.domain.spot;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * TourAPI 응답을 주기적으로 동기화해 저장하는 캐시 테이블.
 * TourAPI 호출량 제한 대응 및 목록 조회 성능 확보 목적. 스키마 설명은 docs/md/db-schema.md 참고.
 */
@Entity
@Table(
        name = "spots_cache",
        indexes = {
            @Index(name = "idx_spots_category", columnList = "category"),
            @Index(name = "idx_spots_sigungu", columnList = "sigunguCode")
        })
@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class SpotCache {

    @Id
    private String id; // TourAPI contentId. 고캠핑은 contentId 가 국문과 겹칠 수 있어 "camp-" 접두어를 붙인다.

    @Column(nullable = false)
    private String name;

    /** 시군구 이름 (예: "단양군", "청주시 상당구"). */
    private String region;

    /** 법정동 시군구 코드 5자리 (예: "43800"). 혼잡도·연관 관광지 API와의 매칭에 쓴다. */
    private String sigunguCode;

    private String areaCode;
    private String contentTypeId;

    /** activity / wellness / nature / family / culture 중 대표 분류 (docs/md/mbti-mapping.md). */
    private String category;

    private Double mapx;
    private Double mapy;
    /** 대표 이미지(원본, 보통 수백 KB). 상세 화면용. */
    private String imageUrl;

    /** 목록용 썸네일(약 20KB). 없으면 null 이고 화면은 imageUrl 을 쓴다. */
    private String thumbnailUrl;

    @Column(length = 1000)
    private String summary;

    @Column(length = 4000)
    private String description;

    private String address;

    @Column(length = 1000)
    private String operatingHours;

    private String tel;

    /** 반려동물 동반여행 서비스에 등록된 곳. */
    private boolean petFriendly;

    /** 무장애 여행 정보에 등록된 곳. */
    private boolean barrierFree;

    /** 상세 사진 URL 목록(JSON 배열 문자열). 상세 조회 때 채운다. */
    @Column(length = 4000)
    private String photosJson;

    /** 소개·이용시간·사진을 TourAPI 에서 받아온 시각. null 이면 아직 목록 정보만 있는 상태. */
    private LocalDateTime detailSyncedAt;

    private LocalDateTime syncedAt;
}

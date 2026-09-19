package com.iyk.backend.external.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** GET /api/spots/{id}: Spot 필드 + 상세 정보. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpotDetailDto {
    private String id;
    private String name;
    private String region;
    private String category;
    /** 오늘 기준 혼잡도(low/medium/high). 예측 정보가 없으면 null. */
    private String congestion;
    private String summary;
    private String imageUrl;
    private Double mapx;
    private Double mapy;
    private String description;
    private String address;
    private String operatingHours;
    private String tel;
    private List<String> photos;
    private boolean petFriendly;
    private boolean barrierFree;
}

package com.iyk.backend.external.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpotDto {
    private String id;
    private String name;
    private String region;
    private String category;
    private String congestion;
    private String summary;
    private String imageUrl;
    private Double mapx;
    private Double mapy;
}

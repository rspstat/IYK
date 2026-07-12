package com.iyk.backend.domain.spot;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * TourAPI 응답을 주기적으로 동기화해 저장하는 캐시 테이블.
 * TourAPI 호출량 제한 대응 및 목록 조회 성능 확보 목적.
 */
@Entity
@Table(name = "spots_cache")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpotCache {

    @Id
    private String id; // TourAPI contentId

    @Column(nullable = false)
    private String name;

    private String region;
    private String areaCode;
    private String contentTypeId;
    private String category;
    private Double mapx;
    private Double mapy;
    private String imageUrl;

    @Column(length = 1000)
    private String summary;

    @Column(length = 4000)
    private String description;

    private String address;
    private String operatingHours;
    private LocalDateTime syncedAt;
}

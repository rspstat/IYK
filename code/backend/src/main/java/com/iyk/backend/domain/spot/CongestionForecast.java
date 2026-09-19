package com.iyk.backend.domain.spot;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 관광지 집중률 방문자 추이 예측 정보를 관광지(spots_cache)에 이름으로 매칭해 저장한 일별 예측(향후 30일).
 * 이름이 매칭되지 않은 관광지는 행이 없다 — 그 경우 "예측 정보 없음"으로 다룬다.
 */
@Entity
@Table(
        name = "congestion_forecast",
        uniqueConstraints = @UniqueConstraint(columnNames = {"spot_id", "forecast_date"}),
        indexes = @Index(name = "idx_congestion_spot", columnList = "spot_id"))
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CongestionForecast {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "spot_id", nullable = false)
    private String spotId;

    @Column(name = "forecast_date", nullable = false)
    private LocalDate date;

    /** 집중률(%). API의 cnctrRate 그대로. 등급(low/medium/high)은 CongestionLevel 에서 계산한다. */
    @Column(nullable = false)
    private double rate;
}

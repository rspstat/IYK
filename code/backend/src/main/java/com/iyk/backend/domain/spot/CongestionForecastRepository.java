package com.iyk.backend.domain.spot;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface CongestionForecastRepository extends JpaRepository<CongestionForecast, UUID> {

    List<CongestionForecast> findBySpotIdAndDateGreaterThanEqualOrderByDate(String spotId, LocalDate from);

    List<CongestionForecast> findBySpotIdInAndDateGreaterThanEqualOrderByDate(
            Collection<String> spotIds, LocalDate from);

    /** 예측 행이 하나라도 있는 관광지 id (추천 시 "예측 정보 있는 곳"을 우선하기 위함). */
    @Query("select distinct c.spotId from CongestionForecast c where c.date >= :from")
    List<String> findSpotIdsWithForecastFrom(LocalDate from);

    @Modifying
    @Query("delete from CongestionForecast c")
    void deleteAllRows();
}

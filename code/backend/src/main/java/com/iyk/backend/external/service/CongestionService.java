package com.iyk.backend.external.service;

import com.iyk.backend.domain.spot.CongestionForecast;
import com.iyk.backend.domain.spot.CongestionForecastRepository;
import com.iyk.backend.domain.spot.SpotCacheRepository;
import com.iyk.backend.external.dto.CongestionResponse;
import com.iyk.backend.external.exception.SpotNotFoundException;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CongestionService {

    static final int MAX_DAYS = 30;
    private static final int RECOMMENDED_COUNT = 3;

    private final SpotCacheRepository spotRepository;
    private final CongestionForecastRepository congestionRepository;

    /**
     * 오늘부터 days일 동안의 일별 혼잡도 예측과 추천 방문일(집중률이 가장 낮은 3일, 날짜순).
     * 예측이 없는 관광지(이름이 집중률 API와 맞지 않음)는 빈 목록을 돌려준다 — 값을 지어내지 않는다.
     */
    public CongestionResponse forecast(String spotId, int days) {
        if (days < 1) {
            throw new IllegalArgumentException("days 는 1 이상이어야 합니다.");
        }
        if (!spotRepository.existsById(spotId)) {
            throw new SpotNotFoundException(spotId);
        }
        LocalDate today = LocalDate.now();
        LocalDate lastDay = today.plusDays(Math.min(days, MAX_DAYS) - 1L);
        List<CongestionForecast> rows =
                congestionRepository.findBySpotIdAndDateGreaterThanEqualOrderByDate(spotId, today).stream()
                        .filter(row -> !row.getDate().isAfter(lastDay))
                        .toList();

        List<CongestionResponse.Day> forecast =
                rows.stream()
                        .map(row -> new CongestionResponse.Day(row.getDate().toString(), CongestionLevel.fromRate(row.getRate()), row.getRate()))
                        .toList();
        List<String> recommended =
                rows.stream()
                        .sorted(Comparator.comparingDouble(CongestionForecast::getRate).thenComparing(CongestionForecast::getDate))
                        .limit(RECOMMENDED_COUNT)
                        .map(row -> row.getDate())
                        .sorted()
                        .map(LocalDate::toString)
                        .toList();
        return new CongestionResponse(spotId, forecast, recommended);
    }
}

package com.iyk.backend.external.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** GET /api/spots/{id}/congestion. 예측 정보가 없는 관광지는 forecast, recommendedDates 가 빈 배열이다. */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CongestionResponse {
    private String spotId;
    private List<Day> forecast;
    private List<String> recommendedDates;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Day {
        private String date;
        private String level;
        /** 집중률(%) 원값. */
        private double score;
    }
}

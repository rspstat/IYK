package com.iyk.backend.external.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** GET /api/routes?spots=id1,id2. order 는 요청한 순서(1부터). */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class RouteResponse {
    private List<Stop> spots;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Stop {
        private String id;
        private String name;
        private Double mapx;
        private Double mapy;
        private int order;
    }
}

package com.iyk.backend.external.controller;

import com.iyk.backend.external.dto.CongestionResponse;
import com.iyk.backend.external.dto.RouteResponse;
import com.iyk.backend.external.dto.SpotDetailDto;
import com.iyk.backend.external.dto.SpotListResponse;
import com.iyk.backend.external.service.CongestionService;
import com.iyk.backend.external.service.SpotQueryService;
import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 관광지 상세·연관·혼잡도·검색·일괄 조회·경로. 명세는 docs/md/api-spec.md. */
@RestController
@RequiredArgsConstructor
public class SpotController {

    private final SpotQueryService spotQueryService;
    private final CongestionService congestionService;

    @GetMapping("/api/spots/{id}")
    public SpotDetailDto getSpot(@PathVariable String id) {
        return spotQueryService.detail(id);
    }

    @GetMapping("/api/spots/{id}/related")
    public SpotListResponse getRelated(@PathVariable String id) {
        return new SpotListResponse(spotQueryService.related(id));
    }

    @GetMapping("/api/spots/{id}/congestion")
    public CongestionResponse getCongestion(@PathVariable String id, @RequestParam(defaultValue = "30") int days) {
        return congestionService.forecast(id, days);
    }

    /** 여러 관광지를 한 번에 (찜 목록, 저장한 경로 표시용). ids 는 쉼표로 구분, 요청 순서 유지. */
    @GetMapping("/api/spots")
    public SpotListResponse getSpots(@RequestParam String ids) {
        return new SpotListResponse(spotQueryService.byIds(splitIds(ids)));
    }

    @GetMapping("/api/spots/search")
    public SpotListResponse search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Integer limit) {
        return new SpotListResponse(spotQueryService.search(q, category, limit));
    }

    @GetMapping("/api/routes")
    public RouteResponse getRoute(@RequestParam String spots) {
        return spotQueryService.route(splitIds(spots));
    }

    private static List<String> splitIds(String csv) {
        return Arrays.stream(csv.split(",")).map(String::trim).filter(id -> !id.isEmpty()).toList();
    }
}

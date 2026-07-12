package com.iyk.backend.external.controller;

import com.iyk.backend.external.dto.RecommendationResponse;
import com.iyk.backend.external.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping("/api/recommendations")
    public RecommendationResponse getRecommendations(@RequestParam String mbti) {
        return recommendationService.getRecommendations(mbti);
    }
}

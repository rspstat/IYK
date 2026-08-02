package com.iyk.backend.domain.like;

import com.iyk.backend.domain.like.dto.LikeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class LikeController {

    private final LikeService likeService;

    @PostMapping("/api/spots/{id}/like")
    public LikeResponse toggleLike(@PathVariable("id") String spotId, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return likeService.toggleLike(userId, spotId);
    }
}

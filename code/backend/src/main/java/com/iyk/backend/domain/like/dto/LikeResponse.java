package com.iyk.backend.domain.like.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class LikeResponse {
    private String spotId;
    private boolean liked;
    private long likeCount;
}

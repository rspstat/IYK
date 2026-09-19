package com.iyk.backend.domain.like.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class MyLikeResponse {
    private String spotId;
    private LocalDateTime createdAt;
}

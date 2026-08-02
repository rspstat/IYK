package com.iyk.backend.domain.comment.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class CommentResponse {
    private Long id;
    private String author;
    private String content;
    private LocalDateTime createdAt;
}

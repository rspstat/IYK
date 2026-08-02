package com.iyk.backend.domain.comment;

import com.iyk.backend.domain.comment.dto.CommentRequest;
import com.iyk.backend.domain.comment.dto.CommentResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping("/api/spots/{id}/comments")
    public Map<String, List<CommentResponse>> getComments(@PathVariable("id") String spotId) {
        return Map.of("comments", commentService.getComments(spotId));
    }

    @PostMapping("/api/spots/{id}/comments")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable("id") String spotId,
            @Valid @RequestBody CommentRequest request,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commentService.addComment(userId, spotId, request));
    }

    @DeleteMapping("/api/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long commentId, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        commentService.deleteComment(userId, commentId);
        return ResponseEntity.noContent().build();
    }
}

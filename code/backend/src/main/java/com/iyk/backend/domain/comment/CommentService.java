package com.iyk.backend.domain.comment;

import com.iyk.backend.domain.comment.dto.CommentRequest;
import com.iyk.backend.domain.comment.dto.CommentResponse;
import com.iyk.backend.domain.user.User;
import com.iyk.backend.domain.user.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;

    public List<CommentResponse> getComments(String spotId) {
        return commentRepository.findBySpotIdOrderByCreatedAtDesc(spotId).stream()
                .map(this::toResponse)
                .toList();
    }

    public CommentResponse addComment(Long userId, String spotId, CommentRequest request) {
        Comment comment =
                Comment.builder()
                        .userId(userId)
                        .spotId(spotId)
                        .content(request.getContent())
                        .createdAt(LocalDateTime.now())
                        .build();
        Comment saved = commentRepository.save(comment);
        return toResponse(saved);
    }

    public void deleteComment(Long userId, Long commentId) {
        Comment comment =
                commentRepository
                        .findById(commentId)
                        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 댓글입니다."));
        if (!comment.getUserId().equals(userId)) {
            throw new IllegalArgumentException("본인 댓글만 삭제할 수 있습니다.");
        }
        commentRepository.delete(comment);
    }

    private CommentResponse toResponse(Comment comment) {
        String author =
                userRepository.findById(comment.getUserId()).map(User::getNickname).orElse("알 수 없음");
        return CommentResponse.builder()
                .id(comment.getId())
                .author(author)
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .build();
    }
}

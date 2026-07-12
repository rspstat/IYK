package com.iyk.backend.domain.comment;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findBySpotIdOrderByCreatedAtDesc(String spotId);
}

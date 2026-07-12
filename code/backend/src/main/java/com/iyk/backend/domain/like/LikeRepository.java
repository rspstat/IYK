package com.iyk.backend.domain.like;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LikeRepository extends JpaRepository<Like, Long> {
    long countBySpotId(String spotId);

    Optional<Like> findByUserIdAndSpotId(Long userId, String spotId);
}

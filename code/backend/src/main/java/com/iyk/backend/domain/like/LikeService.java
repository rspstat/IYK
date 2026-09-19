package com.iyk.backend.domain.like;

import com.iyk.backend.domain.like.dto.LikeResponse;
import com.iyk.backend.domain.like.dto.MyLikeResponse;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LikeService {

    private final LikeRepository likeRepository;

    public LikeResponse toggleLike(Long userId, String spotId) {
        var existing = likeRepository.findByUserIdAndSpotId(userId, spotId);
        boolean liked;
        if (existing.isPresent()) {
            likeRepository.delete(existing.get());
            liked = false;
        } else {
            likeRepository.save(
                    Like.builder().userId(userId).spotId(spotId).createdAt(LocalDateTime.now()).build());
            liked = true;
        }
        long count = likeRepository.countBySpotId(spotId);
        return LikeResponse.builder().spotId(spotId).liked(liked).likeCount(count).build();
    }

    // 내가 찜한 관광지 목록, 최근에 찜한 순
    public List<MyLikeResponse> getMyLikes(Long userId) {
        return likeRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(like -> MyLikeResponse.builder().spotId(like.getSpotId()).createdAt(like.getCreatedAt()).build())
                .toList();
    }
}

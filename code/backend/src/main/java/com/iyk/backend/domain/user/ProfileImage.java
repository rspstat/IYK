package com.iyk.backend.domain.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 프로필 사진. 프론트가 작게 줄인 이미지를 data URL 문자열 그대로 저장한다(별도 파일 저장소 없이 동작).
 * 댓글 조회 등에서 users 를 읽을 때 이미지까지 딸려오지 않도록 users 와 분리한 테이블이다.
 */
@Entity
@Table(name = "user_profile_images")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileImage {

    /** users.id (앱 레벨 참조). 사용자당 한 장이라 그대로 PK 로 쓴다. */
    @Id private Long userId;

    @Lob
    @Column(nullable = false)
    private String dataUrl;

    private LocalDateTime updatedAt;
}

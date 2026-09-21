package com.iyk.backend.domain.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
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

    // @Lob 을 쓰면 Hibernate 가 MySQL 에서 이 문자열 컬럼을 tinytext(255바이트)로 만들어 사진이 잘린다(H2 에서는 티가 안 난다).
    // length 를 명시하면 MySQL 이 mediumtext 로 만든다. 서버 상한(150KB 사진 → base64 약 200K자)보다 넉넉하게 잡는다.
    @Column(nullable = false, length = 400_000)
    private String dataUrl;

    private LocalDateTime updatedAt;
}

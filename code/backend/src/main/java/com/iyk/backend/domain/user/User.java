package com.iyk.backend.domain.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "users",
        uniqueConstraints = @UniqueConstraint(columnNames = {"provider", "provider_id"}))
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    public static final String PROVIDER_LOCAL = "LOCAL";
    public static final String PROVIDER_KAKAO = "KAKAO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 이메일 가입 계정만 가진다. 카카오 계정은 이메일을 받지 않아 null 이다(유일 제약은 null 을 여러 개 허용). */
    @Column(unique = true)
    private String email;

    /** 이메일 가입 계정만 가진다. 카카오 계정은 null 이라 비밀번호로는 로그인할 수 없다. */
    private String passwordHash;

    @Column(nullable = false)
    private String nickname;

    /** 가입 경로: LOCAL(이메일) / KAKAO. 이 컬럼이 생기기 전에 만들어진 행은 null 이며 LOCAL 로 본다. */
    private String provider;

    /** 가입 경로 쪽 회원 식별자(카카오 회원번호). 이메일 가입 계정은 null. */
    @Column(name = "provider_id")
    private String providerId;

    private LocalDateTime createdAt;

    public void changeNickname(String nickname) {
        this.nickname = nickname;
    }
}

package com.iyk.backend.domain.user;

import com.iyk.backend.config.JwtTokenProvider;
import com.iyk.backend.domain.user.dto.AuthResponse;
import com.iyk.backend.domain.user.dto.KakaoLoginRequest;
import com.iyk.backend.domain.user.dto.LoginRequest;
import com.iyk.backend.domain.user.dto.RegisterRequest;
import com.iyk.backend.domain.user.dto.UserResponse;
import com.iyk.backend.domain.user.kakao.KakaoOAuthClient;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final KakaoOAuthClient kakaoOAuthClient;

    public UserResponse register(RegisterRequest request) {
        userRepository
                .findByEmail(request.getEmail())
                .ifPresent(
                        u -> {
                            throw new IllegalArgumentException("이미 가입된 이메일입니다.");
                        });

        User user =
                User.builder()
                        .email(request.getEmail())
                        .passwordHash(passwordEncoder.encode(request.getPassword()))
                        .nickname(request.getNickname())
                        .provider(User.PROVIDER_LOCAL)
                        .createdAt(LocalDateTime.now())
                        .build();
        User saved = userRepository.save(user);

        return UserResponse.builder()
                .id(saved.getId())
                .email(saved.getEmail())
                .nickname(saved.getNickname())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user =
                userRepository
                        .findByEmail(request.getEmail())
                        .orElseThrow(() -> new IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다."));

        // 카카오 계정은 비밀번호가 없다(passwordHash == null). 존재 여부가 드러나지 않도록 같은 메시지를 쓴다.
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        return issueToken(user);
    }

    /**
     * 카카오 로그인: 인가 코드로 카카오 회원 정보를 받아, 처음이면 계정을 만들고 이미 있으면 그 계정으로 로그인시킨다.
     * 이메일은 받지 않으며(이메일 가입 계정과 자동으로 합치지 않는다) 카카오 회원번호로만 계정을 구분한다.
     */
    public AuthResponse loginWithKakao(KakaoLoginRequest request) {
        KakaoOAuthClient.requireCallbackUri(request.getRedirectUri());
        KakaoOAuthClient.Profile profile = kakaoOAuthClient.fetchProfile(request.getCode(), request.getRedirectUri());
        User user =
                userRepository
                        .findByProviderAndProviderId(User.PROVIDER_KAKAO, profile.id())
                        .orElseGet(() -> createKakaoUser(profile));
        return issueToken(user);
    }

    private User createKakaoUser(KakaoOAuthClient.Profile profile) {
        String id = profile.id();
        String nickname =
                profile.nickname() != null ? profile.nickname() : "카카오사용자" + id.substring(Math.max(0, id.length() - 4));
        try {
            return userRepository.save(
                    User.builder()
                            .nickname(nickname)
                            .provider(User.PROVIDER_KAKAO)
                            .providerId(id)
                            .createdAt(LocalDateTime.now())
                            .build());
        } catch (DataIntegrityViolationException raced) {
            // 같은 카카오 계정이 동시에 처음 로그인해서 다른 요청이 먼저 만든 경우
            return userRepository.findByProviderAndProviderId(User.PROVIDER_KAKAO, id).orElseThrow(() -> raced);
        }
    }

    private AuthResponse issueToken(User user) {
        String token = jwtTokenProvider.generateToken(user.getId(), user.getNickname());
        return AuthResponse.builder()
                .accessToken(token)
                .user(AuthResponse.UserSummary.builder().id(user.getId()).nickname(user.getNickname()).build())
                .build();
    }
}

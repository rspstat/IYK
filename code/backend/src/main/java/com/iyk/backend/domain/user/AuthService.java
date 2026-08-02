package com.iyk.backend.domain.user;

import com.iyk.backend.config.JwtTokenProvider;
import com.iyk.backend.domain.user.dto.AuthResponse;
import com.iyk.backend.domain.user.dto.LoginRequest;
import com.iyk.backend.domain.user.dto.RegisterRequest;
import com.iyk.backend.domain.user.dto.UserResponse;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

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

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getNickname());

        return AuthResponse.builder()
                .accessToken(token)
                .user(AuthResponse.UserSummary.builder().id(user.getId()).nickname(user.getNickname()).build())
                .build();
    }
}

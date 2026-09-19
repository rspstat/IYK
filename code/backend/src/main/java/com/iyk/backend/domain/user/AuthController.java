package com.iyk.backend.domain.user;

import com.iyk.backend.domain.user.dto.AuthResponse;
import com.iyk.backend.domain.user.dto.KakaoLoginRequest;
import com.iyk.backend.domain.user.dto.LoginRequest;
import com.iyk.backend.domain.user.dto.RegisterRequest;
import com.iyk.backend.domain.user.dto.UserResponse;
import com.iyk.backend.domain.user.kakao.KakaoOAuthClient;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final KakaoOAuthClient kakaoOAuthClient;

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /** 로그인 방식별 사용 가능 여부. 프론트가 카카오 로그인 버튼을 보여줄지 정하는 데 쓴다. */
    @GetMapping("/providers")
    public Map<String, Boolean> providers() {
        return Map.of("kakao", kakaoOAuthClient.isConfigured());
    }

    /** 사용자를 보낼 카카오 로그인 주소. client_id(REST API 키)를 프론트 코드에 두지 않으려고 서버가 만들어 준다. */
    @GetMapping("/kakao/login-url")
    public Map<String, String> kakaoLoginUrl(@RequestParam String redirectUri, @RequestParam String state) {
        return Map.of("url", kakaoOAuthClient.authorizeUrl(redirectUri, state));
    }

    @PostMapping("/kakao")
    public ResponseEntity<AuthResponse> kakaoLogin(@Valid @RequestBody KakaoLoginRequest request) {
        return ResponseEntity.ok(authService.loginWithKakao(request));
    }
}

package com.iyk.backend.domain.user;

import com.iyk.backend.domain.user.dto.AuthResponse;
import com.iyk.backend.domain.user.dto.MeResponse;
import com.iyk.backend.domain.user.dto.NicknameRequest;
import com.iyk.backend.domain.user.dto.ProfileImageRequest;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/api/me")
    public MeResponse me(Authentication authentication) {
        return userService.getMe((Long) authentication.getPrincipal());
    }

    // CORS 설정이 PUT 까지만 허용하므로 PATCH 대신 PUT 을 쓴다.
    @PutMapping("/api/me/nickname")
    public AuthResponse.UserSummary changeNickname(
            @RequestBody NicknameRequest request, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return userService.changeNickname(userId, request.getNickname());
    }

    @PutMapping("/api/me/profile-image")
    public Map<String, String> changeProfileImage(
            @RequestBody ProfileImageRequest request, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return Map.of("profileImage", userService.changeProfileImage(userId, request.getImage()));
    }

    @DeleteMapping("/api/me/profile-image")
    public ResponseEntity<Void> deleteProfileImage(Authentication authentication) {
        userService.deleteProfileImage((Long) authentication.getPrincipal());
        return ResponseEntity.noContent().build();
    }
}

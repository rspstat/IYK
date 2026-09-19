package com.iyk.backend.domain.user;

import com.iyk.backend.domain.user.dto.AuthResponse;
import com.iyk.backend.domain.user.dto.NicknameRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // CORS 설정이 PUT 까지만 허용하므로 PATCH 대신 PUT 을 쓴다.
    @PutMapping("/api/me/nickname")
    public AuthResponse.UserSummary changeNickname(
            @RequestBody NicknameRequest request, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return userService.changeNickname(userId, request.getNickname());
    }
}

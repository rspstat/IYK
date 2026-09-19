package com.iyk.backend.domain.user;

import com.iyk.backend.domain.user.dto.AuthResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    public static final int NICKNAME_MAX_LENGTH = 20;

    private final UserRepository userRepository;

    /** 닉네임을 바꾼다. 댓글 작성자명은 조회할 때마다 users 에서 읽으므로 이미 쓴 댓글에도 바로 반영된다. */
    public AuthResponse.UserSummary changeNickname(Long userId, String rawNickname) {
        String nickname = rawNickname == null ? "" : rawNickname.strip();
        if (nickname.isEmpty()) {
            throw new IllegalArgumentException("닉네임을 입력해주세요.");
        }
        if (nickname.codePointCount(0, nickname.length()) > NICKNAME_MAX_LENGTH) {
            throw new IllegalArgumentException("닉네임은 " + NICKNAME_MAX_LENGTH + "자 이하로 입력해주세요.");
        }
        if (nickname.codePoints().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("닉네임에 사용할 수 없는 문자가 들어 있어요.");
        }

        // 토큰은 유효한데 계정이 없는 경우(계정 삭제 등)는 다시 로그인하게 한다.
        User user =
                userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("존재하지 않는 계정입니다."));
        user.changeNickname(nickname);
        userRepository.save(user);
        return AuthResponse.UserSummary.builder().id(user.getId()).nickname(user.getNickname()).build();
    }
}

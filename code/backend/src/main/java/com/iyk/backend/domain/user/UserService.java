package com.iyk.backend.domain.user;

import com.iyk.backend.domain.user.dto.AuthResponse;
import com.iyk.backend.domain.user.dto.MeResponse;
import java.time.LocalDateTime;
import java.util.Base64;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    public static final int NICKNAME_MAX_LENGTH = 20;

    /** 프로필 사진(디코딩한 바이트) 상한. 프론트는 256px 로 줄여 보내므로 보통 수십 KB 다. */
    public static final int PROFILE_IMAGE_MAX_BYTES = 150 * 1024;

    private final UserRepository userRepository;
    private final ProfileImageRepository profileImageRepository;

    public MeResponse getMe(Long userId) {
        User user = findUser(userId);
        String image = profileImageRepository.findById(userId).map(ProfileImage::getDataUrl).orElse(null);
        return MeResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .profileImage(image)
                .build();
    }

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

        User user = findUser(userId);
        user.changeNickname(nickname);
        userRepository.save(user);
        return AuthResponse.UserSummary.builder().id(user.getId()).nickname(user.getNickname()).build();
    }

    /** 프로필 사진을 저장한다(이미 있으면 교체). image 는 jpeg/png/webp 의 base64 data URL 이어야 한다. */
    public String changeProfileImage(Long userId, String image) {
        validateImageDataUrl(image);
        findUser(userId);
        profileImageRepository.save(
                ProfileImage.builder().userId(userId).dataUrl(image).updatedAt(LocalDateTime.now()).build());
        return image;
    }

    public void deleteProfileImage(Long userId) {
        // 없어도 오류로 보지 않는다(이미 원하는 상태).
        profileImageRepository.deleteById(userId);
    }

    // 토큰은 유효한데 계정이 없는 경우(계정 삭제 등)는 다시 로그인하게 한다.
    private User findUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("존재하지 않는 계정입니다."));
    }

    private static void validateImageDataUrl(String image) {
        String invalid = "사진 파일을 확인할 수 없어요. JPG, PNG, WEBP 사진을 선택해주세요.";
        if (image == null) {
            throw new IllegalArgumentException(invalid);
        }
        // 디코딩 전에 문자열 길이부터 막아 큰 요청을 일찍 거른다(base64 는 원본의 약 4/3 배).
        if (image.length() > PROFILE_IMAGE_MAX_BYTES / 3 * 4 + 64) {
            throw new IllegalArgumentException("사진 용량이 너무 커요.");
        }

        String type;
        String prefix;
        if (image.startsWith(prefix = "data:image/jpeg;base64,")) {
            type = "jpeg";
        } else if (image.startsWith(prefix = "data:image/png;base64,")) {
            type = "png";
        } else if (image.startsWith(prefix = "data:image/webp;base64,")) {
            type = "webp";
        } else {
            throw new IllegalArgumentException(invalid);
        }

        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(image.substring(prefix.length()));
        } catch (IllegalArgumentException notBase64) {
            throw new IllegalArgumentException(invalid);
        }
        if (bytes.length > PROFILE_IMAGE_MAX_BYTES) {
            throw new IllegalArgumentException("사진 용량이 너무 커요.");
        }
        // 선언한 형식과 실제 파일 내용(매직 바이트)이 맞는지 확인한다.
        boolean matches =
                switch (type) {
                    case "jpeg" -> startsWith(bytes, 0xFF, 0xD8, 0xFF);
                    case "png" -> startsWith(bytes, 0x89, 0x50, 0x4E, 0x47);
                    default ->
                            bytes.length >= 12
                                    && startsWith(bytes, 'R', 'I', 'F', 'F')
                                    && bytes[8] == 'W'
                                    && bytes[9] == 'E'
                                    && bytes[10] == 'B'
                                    && bytes[11] == 'P';
                };
        if (!matches) {
            throw new IllegalArgumentException(invalid);
        }
    }

    private static boolean startsWith(byte[] bytes, int... expected) {
        if (bytes.length < expected.length) {
            return false;
        }
        for (int i = 0; i < expected.length; i++) {
            if ((bytes[i] & 0xFF) != expected[i]) {
                return false;
            }
        }
        return true;
    }
}

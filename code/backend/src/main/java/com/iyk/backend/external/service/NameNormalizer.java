package com.iyk.backend.external.service;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 혼잡도 예측·연관 관광지 API는 contentId 없이 관광지 "이름"으로만 오기 때문에, 국문 관광정보의 이름과 맞출 때 쓰는 정규화.
 * 공백·기호 차이("고운골 남한강 갈대숲" ↔ "고운골남한강갈대숲")와 괄호 설명("각연사(괴산)" ↔ "각연사")을 무시한다.
 */
public final class NameNormalizer {

    private static final Pattern PARENTHETICAL = Pattern.compile("[(（\\[【][^)）\\]】]*[)）\\]】]");
    private static final Pattern NON_LETTER_DIGIT = Pattern.compile("[^\\p{L}\\p{N}]");

    private NameNormalizer() {}

    /** 글자와 숫자만 남기고 소문자로 바꾼다. */
    public static String normalize(String name) {
        return name == null ? "" : NON_LETTER_DIGIT.matcher(name).replaceAll("").toLowerCase();
    }

    /** 매칭에 쓸 후보 키들: 전체 이름, 괄호 부분을 뺀 이름. 빈 값은 제외한다. */
    public static Set<String> keys(String name) {
        Set<String> keys = new LinkedHashSet<>();
        if (name == null) {
            return keys;
        }
        String full = normalize(name);
        if (!full.isEmpty()) {
            keys.add(full);
        }
        String withoutParentheses = normalize(PARENTHETICAL.matcher(name).replaceAll(""));
        if (!withoutParentheses.isEmpty()) {
            keys.add(withoutParentheses);
        }
        return keys;
    }
}

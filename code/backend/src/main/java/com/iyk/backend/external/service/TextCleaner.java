package com.iyk.backend.external.service;

import java.util.regex.Pattern;

/** TourAPI 본문 텍스트에 섞여 오는 HTML(<br>, 태그, 엔티티)을 화면용 평문으로 바꾼다. */
public final class TextCleaner {

    private static final Pattern BR = Pattern.compile("(?i)<br\\s*/?>");
    private static final Pattern TAGS = Pattern.compile("<[^>]+>");
    private static final Pattern SPACES = Pattern.compile("[ \\t\\u00A0]+");
    private static final Pattern BLANK_LINES = Pattern.compile("\\s*\\n\\s*(\\n\\s*)+");

    private TextCleaner() {}

    /** 줄바꿈은 유지하고 태그를 제거한다. 소개글(overview)용. */
    public static String paragraphs(String html) {
        if (html == null) {
            return "";
        }
        String text = BR.matcher(html).replaceAll("\n");
        text = TAGS.matcher(text).replaceAll("");
        text = unescape(text);
        text = SPACES.matcher(text).replaceAll(" ");
        text = BLANK_LINES.matcher(text).replaceAll("\n\n");
        return text.trim();
    }

    /** 줄바꿈도 " / " 로 이어 한 줄로 만든다. 이용시간·휴무일 같은 짧은 정보용. */
    public static String oneLine(String html) {
        if (html == null) {
            return "";
        }
        String text = BR.matcher(html).replaceAll(" / ");
        text = TAGS.matcher(text).replaceAll("");
        text = unescape(text);
        text = text.replaceAll("[\\r\\n]+", " / ");
        text = SPACES.matcher(text).replaceAll(" ");
        return text.replaceAll("(\\s*/\\s*)+", " / ").replaceAll("^\\s*/\\s*|\\s*/\\s*$", "").trim();
    }

    /** 목록용 한 줄 요약: 100자 안쪽의 마지막 문장 끝에서 자르고, 문장 경계가 없으면 말줄임표로 자른다. */
    public static String summary(String overview) {
        String flat = SPACES.matcher(paragraphs(overview).replace('\n', ' ')).replaceAll(" ").trim();
        if (flat.length() <= 100) {
            return flat;
        }
        int end = flat.lastIndexOf('.', 100);
        if (end >= 30) {
            return flat.substring(0, end + 1);
        }
        return flat.substring(0, 100).trim() + "…";
    }

    private static String unescape(String text) {
        return text.replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#39;", "'");
    }
}

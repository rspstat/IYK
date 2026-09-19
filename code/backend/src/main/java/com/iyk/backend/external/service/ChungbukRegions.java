package com.iyk.backend.external.service;

import java.util.LinkedHashMap;
import java.util.Map;

/** 충청북도 시군구 (KorService2/ldongCode2 로 확인한 법정동 코드). 코드 3자리 → 이름. */
public final class ChungbukRegions {

    private static final Map<String, String> NAMES = new LinkedHashMap<>();

    static {
        NAMES.put("110", "청주시");
        NAMES.put("111", "청주시 상당구");
        NAMES.put("112", "청주시 서원구");
        NAMES.put("113", "청주시 흥덕구");
        NAMES.put("114", "청주시 청원구");
        NAMES.put("130", "충주시");
        NAMES.put("150", "제천시");
        NAMES.put("720", "보은군");
        NAMES.put("730", "옥천군");
        NAMES.put("740", "영동군");
        NAMES.put("745", "증평군");
        NAMES.put("750", "진천군");
        NAMES.put("760", "괴산군");
        NAMES.put("770", "음성군");
        NAMES.put("800", "단양군");
    }

    private ChungbukRegions() {}

    /** 혼잡도·연관 관광지 API에 넘기는 5자리 시군구 코드 (예: "800" → "43800"). */
    public static String sigunguCode5(String code3) {
        return code3 == null || code3.isBlank() ? null : "43" + code3;
    }

    /** 3자리 코드 → 이름. 모르는 코드면 "충청북도". */
    public static String name(String code3) {
        return NAMES.getOrDefault(code3, "충청북도");
    }

    /** 혼잡도 조회 대상 시군구(청주시 통합 코드 110 은 데이터가 없어 제외). */
    public static java.util.List<String> congestionCodes() {
        return NAMES.keySet().stream().filter(code -> !code.equals("110")).map(ChungbukRegions::sigunguCode5).toList();
    }

    /** 고캠핑처럼 시군구 이름만 오는 경우 5자리 코드로 바꾼다. 못 찾으면 null. */
    public static String codeFromName(String sigunguName) {
        if (sigunguName == null) {
            return null;
        }
        return NAMES.entrySet().stream()
                .filter(entry -> entry.getValue().equals(sigunguName.trim()))
                .map(entry -> sigunguCode5(entry.getKey()))
                .findFirst()
                .orElse(null);
    }
}

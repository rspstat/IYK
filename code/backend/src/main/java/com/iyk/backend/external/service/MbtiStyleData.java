package com.iyk.backend.external.service;

import com.iyk.backend.external.dto.MbtiStyleDto;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * MBTI 16개 유형별 카테고리와 여행 스타일 문구. 카테고리 배정 근거는 docs/md/mbti-mapping.md.
 * 프론트엔드 code/frontend/src/data/mbtiStyles.ts 와 같은 내용이며(그 파일에서 옮겨왔다), 문구를 바꾸면 양쪽을 함께 고친다.
 */
public final class MbtiStyleData {

    public record Entry(String category, MbtiStyleDto style) {}

    private static final Map<String, Entry> ENTRIES = new LinkedHashMap<>();

    static {
        put("INTJ", "culture", "전략적인 역사 탐방가",
                "계획적으로 동선을 짜고 깊이 있는 역사·문화 스토리를 좋아합니다. 유명세보다 의미 있는 장소를 선호해요.",
                List.of("#역사여행", "#계획형", "#조용한동선"),
                "충북의 고찰과 박물관을 미리 동선 짜서 둘러보세요.");
        put("INTP", "nature", "호기심 많은 자연 탐구자",
                "새로운 자연환경과 조용한 캠핑지를 좋아하며, 정보 탐색 자체를 즐깁니다.",
                List.of("#자연탐구", "#나홀로캠핑", "#조용한자연"),
                "충주호 주변 한적한 캠핑장에서 나만의 시간을 가져보세요.");
        put("ENTJ", "culture", "목표지향 리더형 여행가",
                "효율적인 일정과 랜드마크 중심의 알찬 코스를 선호합니다.",
                List.of("#효율적동선", "#랜드마크", "#리더십여행"),
                "청주 도심의 대표 문화시설을 알차게 묶은 코스를 추천해요.");
        put("ENTP", "activity", "즉흥적인 모험가",
                "새로운 액티비티와 즉흥적인 일정 변경을 즐기는 타입입니다.",
                List.of("#즉흥여행", "#액티비티", "#새로운경험"),
                "단양 짚와이어 등 즉흥적으로 즐길 레포츠를 찾아보세요.");
        put("INFJ", "wellness", "조용한 힐링 추구자",
                "자연 속에서 사색하며 마음을 정리하는 여행을 선호합니다.",
                List.of("#힐링", "#사색여행", "#자연치유"),
                "제천의 한방테마파크 등 조용한 웰니스 명소를 추천해요.");
        put("INFP", "wellness", "감성적인 이야기꾼",
                "감성적인 풍경과 나만의 의미를 찾는 소소한 여행을 좋아합니다.",
                List.of("#감성여행", "#소소한힐링", "#나만의의미"),
                "충북의 골목과 카페거리에서 감성적인 순간을 기록해보세요.");
        put("ENFJ", "family", "따뜻한 동행 메이커",
                "함께하는 사람들을 세심하게 챙기며 다같이 즐길 수 있는 여행을 계획합니다.",
                List.of("#동반여행", "#가족친화", "#다함께"),
                "무장애 여행지와 반려동물 동반 명소로 모두가 편한 코스를 짜보세요.");
        put("ENFP", "culture", "호기심 넘치는 스토리헌터",
                "다양한 문화와 사람 이야기에 관심이 많아 새로운 장소마다 의미를 찾습니다.",
                List.of("#문화탐방", "#스토리여행", "#호기심"),
                "충북 곳곳의 숨은 이야기가 있는 문화유산을 찾아가보세요.");
        put("ISTJ", "nature", "체계적인 아웃도어형",
                "안정적이고 검증된 자연 코스를 계획대로 차근차근 즐기는 편입니다.",
                List.of("#체계적캠핑", "#안정적동선", "#아웃도어"),
                "검증된 고캠핑 인증 캠핑장 위주로 여정을 계획해보세요.");
        put("ISFJ", "wellness", "다정한 보살핌형",
                "편안하고 익숙한 분위기에서 여유롭게 힐링하는 여행을 선호합니다.",
                List.of("#여유로운힐링", "#편안한여행", "#웰니스"),
                "제천·단양의 온천·스파 웰니스 명소에서 여유를 즐겨보세요.");
        put("ESTJ", "culture", "실속형 코스 마스터",
                "실용적이고 알찬 일정으로 대표 명소를 놓치지 않는 스타일입니다.",
                List.of("#실속코스", "#대표명소", "#알찬일정"),
                "청주 도심의 핵심 문화관광지를 효율적으로 묶어보세요.");
        put("ESFJ", "family", "정 많은 여행 플래너",
                "가족·지인과 함께 편하게 즐길 수 있는 여행을 세심하게 준비합니다.",
                List.of("#가족여행", "#다정함", "#함께하는여행"),
                "무장애·반려동물 동반 명소로 온 가족이 편한 여행을 계획해요.");
        put("ISTP", "activity", "실전형 모험가",
                "직접 몸으로 부딪히는 액티비티와 자유로운 일정을 선호합니다.",
                List.of("#실전액티비티", "#자유일정", "#몸으로부딪히기"),
                "충북의 레포츠 명소에서 직접 체험하는 여행을 즐겨보세요.");
        put("ISFP", "nature", "자유로운 자연인",
                "정해진 틀 없이 자연 속을 자유롭게 유영하며 순간을 즐깁니다.",
                List.of("#자유로운자연", "#감성캠핑", "#순간을즐기다"),
                "충북의 계곡·산자락 캠핑지에서 자유로운 하루를 보내보세요.");
        put("ESTP", "activity", "에너지 넘치는 모험가",
                "스릴 있는 액티비티와 즉각적인 재미를 최우선으로 여깁니다.",
                List.of("#스릴만점", "#액티비티", "#즉흥재미"),
                "단양의 짚라인·래프팅 등 스릴 넘치는 레포츠를 즐겨보세요.");
        put("ESFP", "activity", "분위기 메이커 여행가",
                "사람들과 어울리며 그 순간의 분위기를 즐기는 자유로운 여행을 선호합니다.",
                List.of("#분위기메이커", "#사교적여행", "#즐거운순간"),
                "충북의 액티비티 핫플에서 사람들과 함께 즐거운 시간을 보내세요.");
    }

    private MbtiStyleData() {}

    private static void put(String type, String category, String title, String description, List<String> tags, String tip) {
        ENTRIES.put(
                type,
                new Entry(
                        category,
                        MbtiStyleDto.builder().title(title).description(description).tags(tags).tip(tip).build()));
    }

    /** 대소문자 무관. 16개 유형이 아니면 null. */
    public static Entry find(String mbti) {
        return mbti == null ? null : ENTRIES.get(mbti.trim().toUpperCase());
    }

    public static Map<String, Entry> all() {
        return Map.copyOf(ENTRIES);
    }
}

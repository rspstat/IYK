package com.iyk.backend.external.service;

import com.iyk.backend.domain.spot.CongestionForecast;
import com.iyk.backend.domain.spot.CongestionForecastRepository;
import com.iyk.backend.domain.spot.SpotCache;
import com.iyk.backend.external.dto.SpotDto;
import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** SpotCache → 응답 DTO. 오늘 기준 혼잡도 등급을 함께 붙인다. */
@Component
@RequiredArgsConstructor
public class SpotMapper {

    private final CongestionForecastRepository congestionRepository;

    /** 관광지 id → 오늘 혼잡도 등급. 오늘 예측이 없는 관광지는 키가 없다(= 예측 정보 없음). */
    public Map<String, String> todayLevels(Collection<String> spotIds) {
        Map<String, String> levels = new HashMap<>();
        if (spotIds.isEmpty()) {
            return levels;
        }
        LocalDate today = LocalDate.now();
        for (CongestionForecast row : congestionRepository.findBySpotIdInAndDateGreaterThanEqualOrderByDate(spotIds, today)) {
            if (row.getDate().equals(today)) {
                levels.putIfAbsent(row.getSpotId(), CongestionLevel.fromRate(row.getRate()));
            }
        }
        return levels;
    }

    public String todayLevel(String spotId) {
        return todayLevels(List.of(spotId)).get(spotId);
    }

    /** categoryOverride 가 있으면 그 카테고리로 표기한다(예: 가족 추천 목록에서는 모두 family). */
    public List<SpotDto> toDtos(List<SpotCache> spots, String categoryOverride) {
        Map<String, String> levels = todayLevels(spots.stream().map(SpotCache::getId).toList());
        return spots.stream().map(spot -> toDto(spot, levels.get(spot.getId()), categoryOverride)).toList();
    }

    public SpotDto toDto(SpotCache spot, String congestionLevel, String categoryOverride) {
        return SpotDto.builder()
                .id(spot.getId())
                .name(spot.getName())
                .region(spot.getRegion())
                .category(categoryOverride != null ? categoryOverride : spot.getCategory())
                .congestion(congestionLevel)
                // 요약이 아직 없으면 실제 정보인 주소를 대신 보여준다(지어낸 문구를 넣지 않는다).
                .summary(spot.getSummary() != null && !spot.getSummary().isBlank() ? spot.getSummary() : spot.getAddress())
                .imageUrl(spot.getImageUrl())
                .thumbnailUrl(spot.getThumbnailUrl())
                .mapx(spot.getMapx())
                .mapy(spot.getMapy())
                .build();
    }
}

package com.iyk.backend.external.sync;

import com.iyk.backend.domain.spot.SpotCacheRepository;
import com.iyk.backend.external.client.TourApiClient;
import com.iyk.backend.external.config.TourApiService;
import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 동기화 실행 시점을 정한다: 서버 시작 직후(백그라운드)와 매일 새벽.
 * tourapi.sync.enabled=false 로 끌 수 있다(테스트는 기본으로 끈다).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SpotSyncRunner {

    private static final long FRESH_HOURS = 20;

    private final SpotSyncService syncService;
    private final SpotCacheRepository spotRepository;
    private final TourApiClient client;

    @Value("${tourapi.sync.enabled:true}")
    private boolean enabled;

    @Value("${tourapi.sync.on-startup:true}")
    private boolean onStartup;

    @EventListener(ApplicationReadyEvent.class)
    public void syncOnStartup() {
        if (!enabled || !onStartup) {
            return;
        }
        if (!client.hasKey(TourApiService.KOR)) {
            log.warn("TourAPI 국문 관광정보 인증키가 없어 시작 시 동기화를 건너뜁니다 (code/backend/.env 설정).");
            return;
        }
        LocalDateTime last = spotRepository.findLastSyncedAt();
        if (last != null && last.isAfter(LocalDateTime.now().minusHours(FRESH_HOURS))) {
            log.info("TourAPI 캐시가 최근({})에 동기화되어 시작 시 동기화를 건너뜁니다.", last);
            return;
        }
        // 서버가 요청을 받기 시작한 뒤 백그라운드에서 진행한다. 끝나기 전 요청은 DATA_NOT_READY 로 안내된다.
        CompletableFuture.runAsync(syncService::syncAll);
    }

    @Scheduled(cron = "${tourapi.sync.cron:0 30 4 * * *}")
    public void syncDaily() {
        if (enabled && client.hasKey(TourApiService.KOR)) {
            syncService.syncAll();
        }
    }
}

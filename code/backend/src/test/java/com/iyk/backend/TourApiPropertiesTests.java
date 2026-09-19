package com.iyk.backend;

import static org.assertj.core.api.Assertions.assertThat;

import com.iyk.backend.external.config.TourApiProperties;
import com.iyk.backend.external.config.TourApiService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(
        properties = {
            "tourapi.service-key=shared-key",
            "tourapi.keys.photo= photo-key ",
            "tourapi.keys.barrier-free=barrier-free-key",
            "tourapi.keys.pet="
        })
class TourApiPropertiesTests {

    @Autowired TourApiProperties properties;

    @Test
    void specificKeyOverridesSharedKeyAndIsTrimmed() {
        assertThat(properties.keyFor(TourApiService.PHOTO)).isEqualTo("photo-key");
        assertThat(properties.keyFor(TourApiService.BARRIER_FREE)).isEqualTo("barrier-free-key");
    }

    @Test
    void blankOrMissingSpecificKeyFallsBackToSharedKey() {
        assertThat(properties.keyFor(TourApiService.PET)).isEqualTo("shared-key");
        assertThat(properties.keyFor(TourApiService.KOR)).isEqualTo("shared-key");
    }

    @Test
    void yamlKeyMatchesConfigurationNames() {
        assertThat(TourApiService.BARRIER_FREE.yamlKey()).isEqualTo("barrier-free");
        assertThat(TourApiService.KOR.yamlKey()).isEqualTo("kor");
    }
}

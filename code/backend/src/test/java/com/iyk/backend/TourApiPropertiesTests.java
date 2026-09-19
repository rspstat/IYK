package com.iyk.backend;

import static org.assertj.core.api.Assertions.assertThat;

import com.iyk.backend.external.config.TourApiProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = "tourapi.service-key=test-key-from-property")
class TourApiPropertiesTests {

    @Autowired TourApiProperties properties;

    @Test
    void serviceKeyIsBoundFromConfiguration() {
        assertThat(properties.serviceKey()).isEqualTo("test-key-from-property");
        assertThat(properties.hasServiceKey()).isTrue();
    }
}

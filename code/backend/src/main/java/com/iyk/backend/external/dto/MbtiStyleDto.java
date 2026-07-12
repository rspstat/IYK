package com.iyk.backend.external.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MbtiStyleDto {
    private String title;
    private String description;
    private List<String> tags;
    private String tip;
}

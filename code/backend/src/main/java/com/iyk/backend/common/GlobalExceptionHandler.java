package com.iyk.backend.common;

import com.iyk.backend.domain.user.kakao.KakaoLoginException;
import com.iyk.backend.domain.user.kakao.KakaoNotConfiguredException;
import com.iyk.backend.external.client.TourApiException;
import com.iyk.backend.external.exception.DataNotReadyException;
import com.iyk.backend.external.exception.SpotNotFoundException;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return invalidRequest(ex.getMessage());
    }

    // @Valid 검증 실패 (예: 빈 댓글, 이메일 형식 오류)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String fields =
                ex.getBindingResult().getFieldErrors().stream()
                        .map(error -> error.getField())
                        .distinct()
                        .collect(Collectors.joining(", "));
        return invalidRequest("요청 값이 올바르지 않습니다: " + fields);
    }

    // 본문이 비었거나 JSON 형식/타입이 잘못된 경우
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadable(HttpMessageNotReadableException ex) {
        return invalidRequest("요청 본문을 읽을 수 없습니다. JSON 형식을 확인해주세요.");
    }

    @ExceptionHandler(SpotNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleSpotNotFound(SpotNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, "SPOT_NOT_FOUND", "해당 관광지를 찾을 수 없습니다.");
    }

    // 서버 시작 직후 TourAPI 동기화가 끝나기 전
    @ExceptionHandler(DataNotReadyException.class)
    public ResponseEntity<Map<String, Object>> handleDataNotReady(DataNotReadyException ex) {
        return error(HttpStatus.SERVICE_UNAVAILABLE, "DATA_NOT_READY", ex.getMessage());
    }

    @ExceptionHandler(KakaoNotConfiguredException.class)
    public ResponseEntity<Map<String, Object>> handleKakaoNotConfigured(KakaoNotConfiguredException ex) {
        return error(HttpStatus.SERVICE_UNAVAILABLE, "KAKAO_NOT_CONFIGURED", ex.getMessage());
    }

    @ExceptionHandler(KakaoLoginException.class)
    public ResponseEntity<Map<String, Object>> handleKakaoError(KakaoLoginException ex) {
        return error(HttpStatus.BAD_GATEWAY, "KAKAO_ERROR", ex.getMessage());
    }

    // 한국관광공사 API 장애·한도 초과 등. 원인(주소·키 포함 가능)은 응답에 싣지 않고 로그에만 남긴다.
    @ExceptionHandler(TourApiException.class)
    public ResponseEntity<Map<String, Object>> handleTourApi(TourApiException ex) {
        log.warn("TourAPI 오류: {}", ex.getMessage());
        return error(HttpStatus.BAD_GATEWAY, "UPSTREAM_ERROR", "관광 데이터 서버에 문제가 있어 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.");
    }

    // 존재하지 않는 경로
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NoResourceFoundException ex) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", "요청한 경로를 찾을 수 없습니다.");
    }

    // 경로는 맞지만 HTTP 메서드가 다른 경우 (예: POST 전용 엔드포인트에 GET)
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMethodNotAllowed(
            HttpRequestMethodNotSupportedException ex) {
        return error(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", "지원하지 않는 HTTP 메서드입니다.");
    }

    // 쿼리/경로 파라미터 타입 오류 (예: 숫자 자리에 문자열)
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return invalidRequest("요청 파라미터 형식이 올바르지 않습니다: " + ex.getName());
    }

    // 위에서 처리하지 못한 모든 예외. 내부 정보(스택트레이스, 예외 메시지)는 응답에 싣지 않고 로그로만 남긴다.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        // 415(잘못된 Content-Type), 필수 파라미터 누락 등 Spring MVC가 자체 상태코드를 정해둔 예외는 500으로 바꾸지 않는다.
        if (ex instanceof ErrorResponse errorResponse) {
            HttpStatus status = HttpStatus.valueOf(errorResponse.getStatusCode().value());
            if (status.is4xxClientError()) {
                return error(status, "INVALID_REQUEST", "잘못된 요청입니다.");
            }
        }
        log.error("처리되지 않은 예외", ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "서버 내부 오류가 발생했습니다.");
    }

    private ResponseEntity<Map<String, Object>> invalidRequest(String message) {
        return error(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", message);
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status)
                .body(Map.of("error", Map.of("code", code, "message", message)));
    }
}

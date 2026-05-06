package com.apiautopsy.monitoring;

public enum AssertionType {
    STATUS_CODE,
    JSON_PATH_EXISTS,
    JSON_PATH_EQUALS,
    BODY_CONTAINS,
    MAX_LATENCY_MS,
    MAX_RESPONSE_SIZE_BYTES
}

package com.iyk.backend.external.service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/** 프로세스 안에서만 쓰는 단순 만료 캐시. 로더가 예외를 던지면 캐시하지 않는다. */
final class TtlCache<K, V> {

    private record Entry<V>(V value, long loadedAtMillis) {}

    private final Map<K, Entry<V>> entries = new ConcurrentHashMap<>();
    private final long ttlMillis;

    TtlCache(Duration ttl) {
        this.ttlMillis = ttl.toMillis();
    }

    V get(K key, Supplier<V> loader) {
        long now = System.currentTimeMillis();
        Entry<V> cached = entries.get(key);
        if (cached != null && now - cached.loadedAtMillis() < ttlMillis) {
            return cached.value();
        }
        V loaded = loader.get();
        entries.put(key, new Entry<>(loaded, now));
        return loaded;
    }

    void clear() {
        entries.clear();
    }
}

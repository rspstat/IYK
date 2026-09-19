package com.iyk.backend.domain.spot;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SpotCacheRepository extends JpaRepository<SpotCache, String> {

    List<SpotCache> findByCategory(String category);

    List<SpotCache> findBySigunguCode(String sigunguCode);

    List<SpotCache> findByIdIn(Collection<String> ids);

    /** 가족·동반 여행 후보: 반려동물 동반 또는 무장애 등록 시설 중 관광지(12)·문화시설(14)·레포츠(28). */
    @Query(
            "select s from SpotCache s where (s.petFriendly = true or s.barrierFree = true)"
                    + " and s.contentTypeId in ('12', '14', '28')")
    List<SpotCache> findFamilyCandidates();

    /** 이름·지역·요약에 검색어가 들어간 관광지. category 가 null 이면 전체. */
    @Query(
            "select s from SpotCache s where (:category is null or s.category = :category)"
                    + " and (lower(s.name) like lower(concat('%', :q, '%'))"
                    + " or lower(s.region) like lower(concat('%', :q, '%'))"
                    + " or lower(coalesce(s.summary, '')) like lower(concat('%', :q, '%')))"
                    + " order by s.name")
    List<SpotCache> search(@Param("q") String q, @Param("category") String category);

    @Query("select max(s.syncedAt) from SpotCache s")
    java.time.LocalDateTime findLastSyncedAt();
}

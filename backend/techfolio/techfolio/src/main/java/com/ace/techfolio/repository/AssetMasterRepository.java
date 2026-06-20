package com.ace.techfolio.repository;

import com.ace.techfolio.entity.AssetMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssetMasterRepository extends JpaRepository<AssetMaster, String> {

    /**
     * Case-insensitive autocomplete search using native SQL ILIKE query.
     * Capped at 10 results to maintain low heap usage and comply with the 512MB RAM limit.
     */
    @Query(value = "SELECT * FROM asset_master WHERE ticker ILIKE %:query% OR name ILIKE %:query% LIMIT 10", nativeQuery = true)
    List<AssetMaster> searchAssets(@Param("query") String query);
}

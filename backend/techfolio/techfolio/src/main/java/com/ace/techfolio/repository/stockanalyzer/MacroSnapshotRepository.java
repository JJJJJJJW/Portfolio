package com.ace.techfolio.repository.stockanalyzer;

import com.ace.techfolio.entity.stockanalyzer.MacroSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link MacroSnapshot} weekly macro environment data.
 */
@Repository
public interface MacroSnapshotRepository extends JpaRepository<MacroSnapshot, UUID> {

    /** Get the most recent macro snapshot. */
    Optional<MacroSnapshot> findTopByOrderByDateDesc();

    /** Check if a snapshot already exists for a given date. */
    Optional<MacroSnapshot> findByDate(LocalDate date);
}

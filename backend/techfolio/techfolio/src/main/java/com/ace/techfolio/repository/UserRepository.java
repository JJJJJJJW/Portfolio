package com.ace.techfolio.repository;

import com.ace.techfolio.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data Repository for {@link AppUser} entity.
 */
@Repository
public interface UserRepository extends JpaRepository<AppUser, UUID> {
    
    /**
     * Find user by their email address.
     *
     * @param email user email
     * @return optional containing the user if found
     */
    Optional<AppUser> findByEmail(String email);
}

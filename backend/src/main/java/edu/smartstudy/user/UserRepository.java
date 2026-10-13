package edu.smartstudy.user;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    List<User> findTop100ByOrderByCreatedAtDesc();
    long countByRole(String role);
    boolean existsByEmailIgnoreCase(String email);

    @Query("SELECT u FROM User u WHERE u.email = :email AND u.enabled = true")
    Optional<User> findEnabledByEmailIgnoreCase(@Param("email") String email);

    @Query("SELECT u FROM User u WHERE u.passwordResetTokenHash = :tokenHash AND u.passwordResetExpires > CURRENT_TIMESTAMP")
    Optional<User> findByValidPasswordResetToken(@Param("tokenHash") String tokenHash);

    List<User> findByRoleAndEnabledTrue(String role);
    List<User> findByRoleOrderByCreatedAtDesc(String role);

    @Query("SELECT u FROM User u WHERE LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY u.createdAt DESC")
    List<User> searchUsers(@Param("query") String query);
}
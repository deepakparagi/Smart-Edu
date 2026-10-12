package edu.smartstudy.tutor;
import java.util.*;import org.springframework.data.jpa.repository.JpaRepository;
public interface TutorConversationRepository extends JpaRepository<TutorConversation,Long>{List<TutorConversation> findTop50ByOwnerIdOrderByCreatedAtDesc(Long ownerId);Optional<TutorConversation> findByIdAndOwnerId(Long id,Long ownerId);}

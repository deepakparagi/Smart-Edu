package edu.smartstudy.tutor;
import java.util.*;import org.springframework.data.jpa.repository.JpaRepository;
public interface TutorMessageRepository extends JpaRepository<TutorMessage,Long>{List<TutorMessage> findByConversationIdOrderByCreatedAtAsc(Long conversationId);}

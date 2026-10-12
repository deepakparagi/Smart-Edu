package edu.smartstudy.admin;

import edu.smartstudy.user.*;
import edu.smartstudy.material.MaterialRepository;
import edu.smartstudy.quiz.QuizAttemptRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final UserRepository users; private final MaterialRepository materials; private final QuizAttemptRepository attempts;
    public AdminController(UserRepository users,MaterialRepository materials,QuizAttemptRepository attempts){this.users=users;this.materials=materials;this.attempts=attempts;}
    @GetMapping("/users") public List<Map<String,Object>> users(){return users.findTop100ByOrderByCreatedAtDesc().stream().map(u->Map.<String,Object>of("id",u.getId(),"name",u.getName(),"email",u.getEmail(),"role",u.getRole(),"createdAt",u.getCreatedAt())).toList();}
    public record RoleInput(@Pattern(regexp="STUDENT|PARENT|ADMIN") String role){}
    @PatchMapping("/users/{id}/role") public ResponseEntity<?> updateRole(@PathVariable Long id,@RequestBody @Valid RoleInput input,Authentication auth){
        User admin=users.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        if(admin.getId().equals(id))return ResponseEntity.status(409).body(Map.of("error","You cannot change your own role."));
        return users.findById(id).<ResponseEntity<?>>map(user->{if("ADMIN".equals(user.getRole())&&!"ADMIN".equals(input.role())&&users.countByRole("ADMIN")<=1)return ResponseEntity.status(409).body(Map.of("error","Promote another administrator before changing the last admin account."));user.setRole(input.role());users.save(user);return ResponseEntity.ok(Map.of("id",user.getId(),"name",user.getName(),"email",user.getEmail(),"role",user.getRole(),"notice","Role changes take effect on the user's next sign in."));}).orElseGet(()->ResponseEntity.notFound().build());
    }
    @GetMapping("/system") public Map<String,Object> system(){Map<String,Long> states=new LinkedHashMap<>();for(String s:List.of("UPLOADED","PROCESSING","COMPLETED","FAILED"))states.put(s,materials.countByStatus(s));return Map.of("users",users.count(),"students",users.countByRole("STUDENT"),"parents",users.countByRole("PARENT"),"admins",users.countByRole("ADMIN"),"quizAttempts",attempts.count(),"documentProcessing",states,"mode","single-instance");}
}

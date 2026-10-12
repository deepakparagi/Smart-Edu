package edu.smartstudy.dev;

import edu.smartstudy.material.Material;
import edu.smartstudy.material.MaterialRepository;
import edu.smartstudy.user.User;
import edu.smartstudy.user.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
@ConditionalOnProperty(name = "app.dev-seed-enabled", havingValue = "true", matchIfMissing = false)
public class DevDataSeeder {

    private final UserRepository users;
    private final MaterialRepository materials;
    private final PasswordEncoder passwords;

    public DevDataSeeder(UserRepository users, MaterialRepository materials, PasswordEncoder passwords) {
        this.users = users;
        this.materials = materials;
        this.passwords = passwords;
    }

    @PostConstruct
    @Transactional
    public void seed() {
        // Only seed if no users exist
        if (users.count() > 0) {
            return;
        }

        // Create demo student
        User student = new User("Alex Morgan", "alex@example.test", passwords.encode("password123"), "STUDENT");
        student.setTimezone("Asia/Kolkata");
        student.setEmailVerified(true);
        users.save(student);

        // Create demo parent
        User parent = new User("Jordan Morgan", "jordan@example.test", passwords.encode("password123"), "PARENT");
        parent.setTimezone("Asia/Kolkata");
        parent.setEmailVerified(true);
        users.save(parent);

        // Create admin
        User admin = new User("Admin User", "admin@example.test", passwords.encode("admin123"), "ADMIN");
        admin.setTimezone("Asia/Kolkata");
        admin.setEmailVerified(true);
        users.save(admin);

        // Create sample materials for student
        Material mat1 = new Material(student.getId(), "Cell Biology — Unit 3", "cell-biology-unit-3.pdf",
                "sample-key-1", "application/pdf", 102400);
        mat1.processing();
        mat1.complete(
                "Cells use specialized structures to keep internal conditions stable. The cell membrane controls what enters and leaves, while mitochondria release usable energy through cellular respiration.",
                "Cells use specialized structures to keep internal conditions stable. The cell membrane controls what enters and leaves, while mitochondria release usable energy through cellular respiration.",
                "[{\"topic\":\"Cell membrane\",\"importance\":0.9,\"difficulty\":0.6},{\"topic\":\"Organelles\",\"importance\":0.8,\"difficulty\":0.5},{\"topic\":\"Cellular respiration\",\"importance\":0.95,\"difficulty\":0.7}]",
                "[{\"keyword\":\"homeostasis\",\"count\":5},{\"keyword\":\"mitochondria\",\"count\":8},{\"keyword\":\"ATP\",\"count\":12}]"
        );
        materials.save(mat1);

        Material mat2 = new Material(student.getId(), "Algebra — Functions & Graphs", "algebra-functions.docx",
                "sample-key-2", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 51200);
        mat2.processing();
        mat2.complete(
                "A function maps every input to exactly one output. The slope of a linear graph describes its rate of change, and the y-intercept gives the output when x is zero.",
                "A function maps every input to exactly one output. The slope of a linear graph describes its rate of change, and the y-intercept gives the output when x is zero.",
                "[{\"topic\":\"Functions\",\"importance\":0.9,\"difficulty\":0.5},{\"topic\":\"Linear equations\",\"importance\":0.85,\"difficulty\":0.6},{\"topic\":\"Graph interpretation\",\"importance\":0.8,\"difficulty\":0.55}]",
                "[{\"keyword\":\"domain\",\"count\":6},{\"keyword\":\"slope\",\"count\":10},{\"keyword\":\"intercept\",\"count\":8}]"
        );
        materials.save(mat2);

        Material mat3 = new Material(student.getId(), "World History — The Silk Roads", "silk-roads-notes.txt",
                "sample-key-3", "text/plain", 25600);
        mat3.processing();
        mat3.complete(
                "The Silk Roads connected communities across Asia, Africa, and Europe. Merchants moved goods along the network, while travelers also carried technologies, ideas, and religious traditions.",
                "The Silk Roads connected communities across Asia, Africa, and Europe. Merchants moved goods along the network, while travelers also carried technologies, ideas, and religious traditions.",
                "[{\"topic\":\"Trade networks\",\"importance\":0.85,\"difficulty\":0.5},{\"topic\":\"Cultural exchange\",\"importance\":0.9,\"difficulty\":0.55},{\"topic\":\"Technology\",\"importance\":0.75,\"difficulty\":0.6}]",
                "[{\"keyword\":\"caravans\",\"count\":7},{\"keyword\":\"Eurasia\",\"count\":5},{\"keyword\":\"exchange\",\"count\":9}]"
        );
        materials.save(mat3);

        System.out.println("✓ Dev seed data created: 1 student, 1 parent, 1 admin, 3 materials");
    }
}
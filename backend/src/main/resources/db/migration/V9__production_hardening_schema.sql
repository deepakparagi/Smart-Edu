-- V9: Production hardening schema changes
-- 1. Convert TEXT columns to LONGTEXT for large content
-- 2. Add users.timezone, users.token_version, users.enabled, users.email_verified
-- 3. Add password reset token columns
-- 4. Add material_chunks table for search and grounding
-- 5. Add flashcard_reviews table for retention analytics
-- 6. Add audit_log table
-- 7. Add REVOKED status to parent_student_links
-- 8. Add indexes for common query patterns

-- 1. Convert TEXT columns to LONGTEXT (MySQL TEXT = 64KB, LONGTEXT = 4GB)
ALTER TABLE materials 
    MODIFY COLUMN extracted_text LONGTEXT,
    MODIFY COLUMN summary LONGTEXT,
    MODIFY COLUMN topics_json LONGTEXT,
    MODIFY COLUMN keywords_json LONGTEXT,
    MODIFY COLUMN processing_error LONGTEXT;

ALTER TABLE quizzes 
    MODIFY COLUMN questions_json LONGTEXT;

ALTER TABLE tutor_messages 
    MODIFY COLUMN content LONGTEXT,
    MODIFY COLUMN sources_json LONGTEXT;

ALTER TABLE flashcards 
    MODIFY COLUMN front LONGTEXT,
    MODIFY COLUMN back LONGTEXT;

-- 2. Add user columns for timezone, session revocation, account status
ALTER TABLE users 
    ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata' AFTER role,
    ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER timezone,
    ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT TRUE AFTER token_version,
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE AFTER enabled,
    ADD COLUMN password_reset_token_hash VARBINARY(32) NULL AFTER email_verified,
    ADD COLUMN password_reset_expires TIMESTAMP NULL AFTER password_reset_token_hash;

-- 3. Create material_chunks table for search, tutor grounding, quiz/flashcard generation
CREATE TABLE material_chunks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    material_id BIGINT NOT NULL,
    chunk_ordinal INT NOT NULL,
    page_number INT NULL,
    heading VARCHAR(500) NULL,
    text LONGTEXT NOT NULL,
    token_count INT NOT NULL DEFAULT 0,
    embedding BLOB NULL, -- for future vector embeddings (serialized float32[])
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chunk_material FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    INDEX idx_chunk_material_ordinal (material_id, chunk_ordinal),
    INDEX idx_chunk_material_page (material_id, page_number)
);

-- 4. Create flashcard_reviews table for retention analytics
CREATE TABLE flashcard_reviews (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    flashcard_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    quality INT NOT NULL, -- 0=Again, 1=Hard, 2=Good, 3=Easy
    previous_interval_days INT NOT NULL,
    new_interval_days INT NOT NULL,
    previous_ease_factor DOUBLE NOT NULL,
    new_ease_factor DOUBLE NOT NULL,
    reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_flashcard FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_review_flashcard_time (flashcard_id, reviewed_at),
    INDEX idx_review_user_time (user_id, reviewed_at)
);

-- 5. Create audit_log table
CREATE TABLE audit_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    actor_id BIGINT NULL,
    actor_email VARCHAR(254) NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(64) NULL,
    target_id BIGINT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_actor_time (actor_id, created_at),
    INDEX idx_audit_action_time (action, created_at),
    INDEX idx_audit_target (target_type, target_id)
);

-- 6. Add REVOKED status to parent_student_links (update enum-like constraint)
ALTER TABLE parent_student_links 
    MODIFY COLUMN status VARCHAR(16) NOT NULL DEFAULT 'PENDING';

-- Note: Application enforces status values: PENDING, APPROVED, REJECTED, REVOKED

-- 7. Add indexes for common query patterns
-- Materials: owner + status + created_at
CREATE INDEX idx_material_owner_status_created ON materials(owner_id, status, created_at DESC);

-- Study tasks: student + status + scheduled_date (already exists via idx_task_date)
-- Add index for overdue queries
CREATE INDEX idx_task_student_status_date ON study_tasks(student_id, status, scheduled_date);

-- Focus sessions: student + status + started_at (already exists)

-- Quizzes: owner + material + created_at (already exists)

-- Flashcards: owner + next_review (already exists via idx_flashcard_due)
-- Add index for material + owner
CREATE INDEX idx_flashcard_owner_material ON flashcards(owner_id, material_id);

-- Tutor conversations: owner + created_at (already exists)

-- Parent links: student + status (already exists)

-- 8. Add version column for optimistic locking on mutable aggregates
ALTER TABLE study_tasks ADD COLUMN version BIGINT NOT NULL DEFAULT 0 AFTER created_at;
ALTER TABLE flashcards ADD COLUMN version BIGINT NOT NULL DEFAULT 0 AFTER created_at;
ALTER TABLE study_plans ADD COLUMN version BIGINT NOT NULL DEFAULT 0 AFTER created_at;

-- Career Management System

ALTER TABLE user_permissions
ADD COLUMN can_manage_careers BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS career_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NULL,
  job_id VARCHAR(100) NOT NULL,
  cover_letter TEXT NULL,
  resume_name VARCHAR(255) NOT NULL,
  resume LONGBLOB NOT NULL,
  resume_mime VARCHAR(100) NOT NULL,
  status ENUM('new', 'reviewed', 'interview', 'rejected', 'hired')
    NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_career_status (status),
  INDEX idx_career_job (job_id),
  INDEX idx_career_created (created_at),
  INDEX idx_career_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

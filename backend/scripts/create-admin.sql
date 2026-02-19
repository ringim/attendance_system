-- Set the schema
SET search_path TO attendance_system;

-- Insert admin user
INSERT INTO users (username, email, password_hash, full_name, role, status)
VALUES (
  'admin',
  'admin@example.com',
  '$2a$10$gb.rZ8y0./a3PjN7TGZAse89uMfEZ1cF8Fp6MkdAI.mHm5hBSuMBK',
  'System Administrator',
  'admin',
  'active'
);

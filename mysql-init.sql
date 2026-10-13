ALTER USER 'root'@'localhost' IDENTIFIED BY 'dev-root-password-change-me';
CREATE DATABASE IF NOT EXISTS smart_study;
CREATE USER IF NOT EXISTS 'smart_study'@'localhost' IDENTIFIED BY 'dev-password-change-me';
GRANT ALL PRIVILEGES ON smart_study.* TO 'smart_study'@'localhost';
FLUSH PRIVILEGES;
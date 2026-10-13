@echo off
set SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/smart_study?useSSL=false^&allowPublicKeyRetrieval=true^&serverTimezone=UTC
set SPRING_DATASOURCE_USERNAME=smart_study
set SPRING_DATASOURCE_PASSWORD=dev-password-change-me
set ML_SERVICE_URL=http://localhost:8000
set ML_INTERNAL_TOKEN=dev-internal-token-change-me
set JWT_SECRET=local-development-secret-key-change-me-please-0123456789
set COOKIE_SECURE=false
set WEB_ORIGIN=http://localhost:3000
set UPLOAD_DIR=./uploads
cd /d "D:\Smart Edu\backend"
echo Starting backend...
start "Backend Server" cmd /c "java -jar target/smart-study-api-0.1.0.jar > backend.log 2>&1"
echo Backend started in separate window.
pause
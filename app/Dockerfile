# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 가상환경을 사용하지 않고, 시스템에 직접 패키지를 설치합니다.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# .env 파일은 docker-compose에서 환경변수로 주입합니다.

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# SKT Fly AI Multi-Agent Debate Application

## 🚀 프로젝트 소개
이 프로젝트는 여러 AI 에이전트들이 주어진 주제에 대해 토론을 펼치는 웹 기반 애플리케이션입니다. 프론트엔드는 React와 Vite를 사용하여 사용자 친화적인 인터페이스를 제공하며, 백엔드는 FastAPI 기반의 Python 애플리케이션으로 에이전트의 로직 처리와 API를 담당합니다. 각 에이전트는 고유한 페르소나를 가지고 토론에 참여하며, 이를 통해 역동적이고 흥미로운 대화 시뮬레이션을 구현합니다.

## ✨ 주요 기능
*   **다중 에이전트 토론:** 다양한 캐릭터들이 특정 주제에 대해 번갈아 가며 발언하는 토론 시뮬레이션.
*   **캐릭터 페르소나 관리:** 각 캐릭터는 나무위키 등에서 가져온 고유한 페르소나를 기반으로 발언을 생성.
*   **실시간 토론 스트리밍:** 토론 진행 상황을 실시간으로 프론트엔드에 스트리밍하여 사용자에게 제공.
*   **웹 기반 UI:** React를 통해 직관적인 토론 참여 및 관찰 경험 제공.

## 💻 로컬 개발 환경 실행 방법

### 1. 전제 조건
*   Node.js (v18 이상 권장) 및 npm (또는 yarn)
*   Python (v3.11 이상 권장) 및 pip
*   Git

### 2. 프로젝트 클론
```bash
git clone https://github.com/your-repo/sktflyai-multiagent.git
cd sktflyai-multiagent
```

### 3. 백엔드 설정 및 실행
```bash
cd backend

# 가상 환경 생성 및 활성화 (선택 사항이지만 권장)
python -m venv .venv
source .venv/bin/activate # Linux/macOS
# .venv\Scripts\activate # Windows

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정 (필요한 경우 .env 파일 생성)
# .env 파일 예시:
# OPENAI_API_KEY="YOUR_OPENAI_API_KEY"

# 백엔드 서버 실행
python main.py
# 또는 uvicorn main:app --host 0.0.0.0 --port 8000
```
백엔드 서버는 기본적으로 `http://localhost:8000`에서 실행됩니다.

### 4. 프론트엔드 설정 및 실행
새로운 터미널을 열고 프로젝트 루트 디렉토리로 이동합니다.
```bash
cd frontend

# 의존성 설치
npm install

# 프론트엔드 개발 서버 실행
npm run dev
```
프론트엔드 개발 서버는 기본적으로 `http://localhost:5173`에서 실행됩니다.

## 🐳 Docker Compose를 사용한 실행 방법

### 1. 전제 조건
*   Docker 및 Docker Compose 설치

### 2. 환경 변수 설정 (백엔드)
`docker-compose.yml` 파일에서 `multiagent-backend` 서비스 섹션의 `environment:` 주석 부분을 해제하고 필요한 환경 변수(예: `OPENAI_API_KEY`)를 설정하십시오.

```yaml
services:
  multiagent-backend:
    # ...
    environment:
      - OPENAI_API_KEY=your_openai_api_key_here # 실제 API 키로 대체
      # - ANOTHER_VAR=another_value
    # ...
```

### 3. Docker Compose 빌드 및 실행
프로젝트의 루트 디렉토리에서 다음 명령어를 실행합니다.
```bash
docker-compose up -d --build
```
*   `-d` 옵션은 컨테이너를 백그라운드에서 실행합니다.
*   `--build` 옵션은 `Dockerfile` 변경 사항이 있거나 이미지가 없는 경우 이미지를 다시 빌드합니다.

### 4. 서비스 확인
모든 서비스가 정상적으로 실행되면 웹 브라우저에서 `http://localhost:5173`에 접속하여 프론트엔드 애플리케이션을 확인할 수 있습니다.

### 5. 서비스 중지
```bash
docker-compose down
```

## 📝 프로젝트 변동 사항 (Gemini Agent에 의해 수행된 작업)

*   **백엔드 CORS 설정 업데이트**: `backend/main.py`에 배포 환경에서 CORS 오류를 방지하기 위해 `CORSMiddleware`의 `allow_origins`를 `["*"]`로 설정했습니다.
*   **`backend/Dockerfile` 생성**: Python FastAPI 백엔드 서비스를 위한 `Dockerfile`을 생성하고, `numpy` 의존성 문제 해결을 위해 Python 버전을 `3.10-slim-buster`에서 `3.11-slim-buster`로 업데이트했습니다.
*   **`backend/.dockerignore` 생성**: `.env` 파일이 Docker 이미지에 포함되지 않도록 `backend/.dockerignore` 파일을 생성했습니다.
*   **프론트엔드 API 경로 수정**: `frontend/src/App.tsx`에서 백엔드 API 호출 기본 경로를 `http://multiagent-backend:8000`에서 상대 경로인 `/api`로 변경했습니다. 이는 Nginx 프록시를 통해 통신하기 위함입니다.
*   **`frontend/nginx.conf` 생성**: Nginx를 사용하여 프론트엔드 정적 파일을 서빙하고 `/api` 요청을 백엔드 서비스로 프록시하는 `nginx.conf` 파일을 생성했습니다.
*   **`frontend/Dockerfile` 생성**: React 앱 빌드 및 Nginx를 통한 서빙을 위한 멀티 스테이지 `Dockerfile`을 생성했습니다.
*   **`docker-compose.yml` 생성**: `multiagent-backend`와 `multiagent-frontend` 서비스를 정의하고 `codespeed` 네트워크를 구성했습니다. 또한, 백엔드 서비스에 환경 변수를 추가할 수 있는 주석 플레이스홀더를 포함했습니다.
*   **루트 `.gitignore` 업데이트**: `node_modules/`, `.vite/`, `npm-debug.log*`, `.DS_Store` 등 Node.js 및 프론트엔드 관련 불필요한 파일/폴더들을 `.gitignore`에 추가했습니다.

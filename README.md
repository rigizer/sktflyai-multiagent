# dorandoran-multiagent 프로젝트

이 프로젝트는 다양한 대중매체 캐릭터들이 가상의 공간에서 특정 주제에 대해 토론하는 멀티 에이전트 시스템입니다.

## 🗂️ 프로젝트 구조

```
/
├── .venv/                  # 파이썬 가상환경
├── app/                    # 백엔드 FastAPI 애플리케이션
│   ├── main.py             # API 엔드포인트 정의
│   ├── services.py         # 핵심 비즈니스 로직 (토론 관리, 에이전트)
│   └── Dockerfile          # 백엔드 Docker 이미지 빌드 파일
├── frontend/               # 프론트엔드 React 애플리케이션
│   └── Dockerfile          # 프론트엔드 Docker 이미지 빌드 파일
├── .env                    # 환경 변수 파일 (OPENAI_API_KEY 등)
├── .gitignore              # Git 제외 파일 목록
├── base-prompt.txt         # 시스템의 핵심 동작을 정의하는 프롬프트 (읽기 전용)
├── character_info.txt      # 토론 참여 캐릭터 및 정보 (읽기 전용)
├── docker-compose.yml      # Docker 서비스 오케스트레이션
├── requirements.txt        # 파이썬 의존성 패키지 목록
└── README.md               # 프로젝트 문서
```

## ✨ 주요 기능

*   **캐릭터 기반 토론**: `character_info.txt`에 정의된 캐릭터들이 `base-prompt.txt`의 규칙에 따라 토론을 진행합니다.
*   **객체지향 설계**: Python 코드는 `DebateManager`, `Debate`, `Character` 등의 클래스로 구성되어 유지보수와 확장이 용이합니다.
*   **분리된 서비스**: 백엔드는 FastAPI, 프론트엔드는 React+TypeScript로 구성되어 독립적으로 개발 및 배포가 가능합니다.
*   **Docker 기반 배포**: `docker-compose`를 통해 프론트엔드와 백엔드 서비스를 한번에 실행하고 관리할 수 있습니다.

## ⚙️ 프로젝트 설정 및 실행

1.  **의존성 설치**:
    *   백엔드: `source .venv/bin/activate && pip install -r requirements.txt`
    *   프론트엔드: `cd frontend && npm install`
2.  **Docker 서비스 실행**:
    *   프로젝트 루트 디렉토리에서 `docker-compose up --build` 명령어를 실행합니다.
    *   백엔드 서비스는 `http://localhost:8000`에서, 프론트엔드 서비스는 `http://localhost:80`에서 실행됩니다.

## 📝 변경 이력 (v0.1.5 - 2026-01-28)

*   **변경일**: 2026년 1월 28일
*   **변경 내용**:
    *   **[백엔드]**:
        *   **변경 전**: `speak` API (`/debate/{debate_id}/speak`)가 `character_name: str, statement: str`를 개별 매개변수로 받아 422 오류 발생 가능성이 있었습니다.
        *   **변경 후**: `app/main.py`의 `speak` API를 `Pydantic` 모델 `SpeakRequest` (character_name, statement 포함)를 사용하도록 변경하여 요청 본문 유효성 검사를 강화하고 422 오류를 해결했습니다.

---

### 📝 변경 이력 (v0.1.4 - 2026-01-28)

*   **변경일**: 2026년 1월 28일
*   **변경 내용**:
    *   **[백엔드]**:
        *   **변경 전**: `start` API (`/debate/start`)가 `topic: str, character_names: list[str]`를 개별 매개변수로 받아 422 오류 발생 가능성이 있었습니다.
        *   **변경 후**: `app/main.py`의 `start` API를 `Pydantic` 모델 `StartDebateRequest` (topic, character_names 포함)를 사용하도록 변경하여 요청 본문 유효성 검사를 강화하고 422 오류를 해결했습니다.
    *   **[서비스 로직]**:
        *   **변경 전**: `app/services.py`의 `load_characters_from_file` 함수가 `character_info.txt` 파싱 시 불필요한 "https" 버튼을 생성하는 등 잘못된 캐릭터 정보를 불러왔습니다.
        *   **변경 후**: `app/services.py`의 `load_characters_from_file` 함수를 수정하여 `character_info.txt` 파싱 로직을 강화했습니다. 각 라인의 공백을 제거하고, 빈 라인 또는 유효하지 않은 형식의 라인(예: URL만 있는 라인)은 건너뛰도록 하여 올바른 캐릭터 이름만 파싱되도록 개선했습니다.

---

### 📝 변경 이력 (v0.1.3 - 2026-01-28)

*   **변경일**: 2026년 1월 28일
*   **변경 내용**:
    *   **[인프라]**:
        *   **변경 전**: `app/main.py`에 CORS 설정이 없어 프론트엔드에서 백엔드 API 호출 시 CORS 오류가 발생했습니다.
        *   **변경 후**: `app/main.py`에 `fastapi.middleware.cors.CORSMiddleware`를 추가하여 `http://localhost`, `http://localhost:80`, `http://localhost:3000`으로부터의 접근을 허용하도록 CORS 정책을 설정했습니다.

---

### 📝 변경 이력 (v0.1.2 - 2026-01-28)

*   **변경일**: 2026년 1월 28일
*   **변경 내용**:
    *   **[인프라]**:
        *   **변경 전**: `docker-compose.yml`에서 프론트엔드 서비스가 `.env` 파일을 로드하지 못했습니다.
        *   **변경 후**: `docker-compose.yml`의 `frontend` 서비스에 `environment` 섹션에 `VITE_API_BASE_URL=http://backend:8000`을 추가하여 프론트엔드가 빌드 시 `.env` 파일의 환경 변수를 사용할 수 있도록 설정했습니다.
    *   **[프론트엔드]**:
        *   **변경 전**: 프론트엔드에서 "캐릭터 목록을 불러오는 데 실패했습니다" 오류 발생. 토론 기능 UI/로직 미흡. 디자인 기본 상태.
        *   **변경 후**: `frontend/src/App.tsx`를 수정하여 캐릭터 목록을 성공적으로 불러오고 토론 시작, 사용자 발언 등 핵심 로직을 구현했습니다. `frontend/src/App.css`를 전반적으로 개선하여 더 현대적이고 반응형 디자인을 적용했습니다.

---

### 📝 변경 이력 (v0.1.1 - 2026-01-28)

*   **변경일**: 2026년 1월 28일
*   **변경 내용**:
    *   **[인프라]**:
        *   **변경 전**: `docker-compose.yml`에서 프론트엔드 컨테이너 이름이 명시되지 않았고, 백엔드 서비스의 볼륨 마운트 설정이 Docker 실행 오류를 유발했습니다. 또한 프론트엔드 `Dockerfile`의 Node.js 버전이 Vite 빌드 요구사항과 맞지 않아 빌드 실패. `App.tsx`에서 `React` import가 불필요하게 남아있어 빌드 오류 발생.
        *   **변경 후**: `docker-compose.yml`에 `frontend` 서비스의 `container_name: dorandoran-frontend`를 추가하여 컨테이너 이름을 명시. 백엔드 서비스의 불필요한 볼륨 마운트와 `--reload` 플래그를 제거하여 Docker 실행 오류 해결. `frontend/Dockerfile`의 `FROM node:18-alpine`을 `FROM node:20-alpine`으로 변경하여 Node.js 버전 문제를 해결. `frontend/src/App.tsx`에서 불필요한 `import React`를 제거하여 TypeScript 빌드 오류 해결.
    *   **[프론트엔드]**:
        *   **변경 전**: 초기 Vite 템플릿 코드만 존재, 챗봇 및 토론 기능 없음. 백엔드 API 연동 부재.
        *   **변경 후**: `frontend/src/services/api.ts` 파일을 생성하여 백엔드 API (`/characters`, `/debate/start`, `/debate/{debate_id}/speak`, `/debate/{debate_id}`) 연동 로직 구현. `frontend/src/App.tsx`를 수정하여 캐릭터 선택, 토론 주제 입력, 토론 메시지 표시를 위한 기본적인 UI 및 상태 관리 로직 구현. `frontend/src/App.css`를 업데이트하여 새로운 UI에 대한 스타일링 추가.

---

### 📝 변경 이력 (v0.1.0 - 2026-01-28)

*   **변경일**: 2026년 1월 28일
*   **변경 내용**:
    *   **[프로젝트 초기 설정]**: 신규 프로젝트 생성을 위한 기본 구조와 파일을 설정했습니다.
    *   **[백엔드]**:
        *   **변경 전**: 파일 없음
        *   **변경 후**: FastAPI 기반의 웹 애플리케이션 추가. `main.py`에 API 라우트를, `services.py`에 토론 관리 클래스(`DebateManager`, `Character` 등)의 기본 골격을 구현.
    *   **[프론트엔드]**:
        *   **변경 전**: 파일 없음
        *   **변경 후**: Vite를 사용하여 React + TypeScript 기반의 프론트엔드 프로젝트 생성.
    *   **[인프라]**:
        *   **변경 전**: 파일 없음
        *   **변경 후**: 백엔드와 프론트엔드 서비스 빌드를 위한 `Dockerfile` 및 이들을 통합 관리하는 `docker-compose.yml` 추가.
    *   **[환경]**:
        *   **변경 전**: 설정 없음
        *   **변경 후**: Python 가상환경 `.venv` 생성 및 `requirements.txt`에 `fastapi`, `uvicorn` 등 초기 패키지 추가.

## 🤖 AI 에이전트 활동 기록

이 섹션은 AI 에이전트가 프로젝트에서 수행한 주요 명령, 결정 및 작업 내역을 기록합니다.

### 2026년 1월 28일 활동 요약 (speak API 422 오류 해결 및 README.md 버전 관리 개선)

*   **사용자 요청**:
    *   `speak` API 호출 시 422 오류 발생 해결 요청.
    *   캐릭터 선택 시 불필요한 "https" 버튼 2개 생성 문제 해결 요청 (이전 요청의 연장).
    *   `README.md` 변경 이력을 최신순으로 정렬하고 각 변경마다 마이너 버전(vX.Y.0)을 1씩 증가시키도록 요청. 이 관리 방식이 앞으로도 적용될 수 있도록 `README.md`에 지침 추가.

*   **수행 작업**:
    1.  `docker-compose down` 명령어로 실행 중인 서비스 중지.
    2.  `app/main.py` 수정: `pydantic.BaseModel` 임포트 추가, `SpeakRequest` Pydantic 모델 정의, `speak` 엔드포인트를 `debate_id: str, request: SpeakRequest`를 사용하도록 수정하여 422 오류 해결.
    3.  `app/services.py` 수정: `load_characters_from_file` 함수의 파싱 로직을 강화하여 `character_info.txt`에서 잘못된 캐릭터 정보가 파싱되는 문제를 해결하고 불필요한 "https" 버튼 생성 문제 해결 (이전 작업에서 수행).
    4.  `docker-compose up --build -d` 명령어로 서비스 재빌드 및 백그라운드 재시작.
    5.  `README.md` 수정:
        *   `## 📝 변경 이력` 섹션을 파싱하여 모든 기존 변경 이력을 추출.
        *   각 변경 이력의 버전 번호(vX.Y.0)를 추출하고 마이너 버전(Y)을 1씩 증가시킴.
        *   새로운 변경 이력을 현재 버전(v0.1.5)으로 추가.
        *   모든 변경 이력을 최신순으로 재정렬.
        *   'AI 에이전트 활동 기록' 아래에 새로운 버전 관리 및 변경 이력 정렬 방식에 대한 지침 추가.
        *   AI 에이전트 활동 기록 섹션에 현재 세션의 작업 내용 추가.

*   **배운 점/해결 과정**:
    *   **`speak` API 422 오류**: `start` API와 유사하게 FastAPI의 유효성 검사에서 발생하는 문제. Pydantic 모델을 사용하여 요청 본문을 명시적으로 정의함으로써 해결.
    *   **`README.md` 변경 이력 관리**: 사용자의 요청에 따라 변경 이력을 최신순으로 정렬하고 마이너 버전(Y)을 자동으로 증가시키는 로직을 적용.

### 2026년 1월 28일 활동 요약 (start API 422 오류 및 캐릭터 버튼 문제 해결, README.md 변경 이력 관리 개선)

*   **사용자 요청**:
    *   `start` API 호출 시 422 오류 발생 해결 요청.
    *   캐릭터 선택 시 불필요한 "https" 버튼 2개 생성 문제 해결 요청.
    *   `README.md` 변경 이력을 최신순으로 정렬하고 각 변경마다 마이너 버전(vX.Y.0)을 1씩 증가시키도록 요청. 이 관리 방식이 앞으로도 적용될 수 있도록 `README.md`에 지침 추가.

*   **수행 작업**:
    1.  `docker-compose down` 명령어로 실행 중인 서비스 중지.
    2.  `app/main.py` 수정: `pydantic.BaseModel` 임포트 추가, `StartDebateRequest` Pydantic 모델 정의, `start_debate` 엔드포인트를 `request: StartDebateRequest`를 사용하도록 수정하여 422 오류 해결.
    3.  `app/services.py` 수정: `load_characters_from_file` 함수의 파싱 로직을 강화하여 `character_info.txt`에서 잘못된 캐릭터 정보가 파싱되는 문제를 해결하고 불필요한 "https" 버튼 생성 문제 해결.
    4.  `docker-compose up --build -d` 명령어로 서비스 재빌드 및 백그라운드 재시작.
    5.  `README.md` 수정:
        *   `## 📝 변경 이력` 섹션을 파싱하여 모든 기존 변경 이력을 추출.
        *   각 변경 이력의 버전 번호(vX.Y.0)를 추출하고 마이너 버전(Y)을 1씩 증가시킴.
        *   새로운 변경 이력을 현재 버전(v0.1.4)으로 추가.
        *   모든 변경 이력을 최신순으로 재정렬.
        *   'AI 에이전트 활동 기록' 아래에 새로운 버전 관리 및 변경 이력 정렬 방식에 대한 지침 추가.
        *   AI 에이전트 활동 기록 섹션에 현재 세션의 작업 내용 추가.

*   **배운 점/해결 과정**:
    *   **`start` API 422 오류**: FastAPI의 유효성 검사에서 예상치 못한 데이터 형식으로 인해 발생하는 오류. Pydantic 모델을 사용하여 요청 본문을 명시적으로 정의함으로써 해결.
    *   **캐릭터 파싱 오류**: `character_info.txt`에서 캐릭터 정보를 파싱하는 로직이 불완전하여 잘못된 데이터(예: URL만 있는 라인)가 캐릭터 이름으로 등록되는 문제. 파싱 로직을 강화하여 유효한 형식의 라인만 처리하도록 개선.
    *   **`README.md` 변경 이력 관리**: 사용자의 요청에 따라 변경 이력을 최신순으로 정렬하고 마이너 버전(Y)을 자동으로 증가시키는 로직을 구현. 앞으로 이 지침에 따라 `README.md`를 업데이트할 예정.

### 2026년 1월 28일 활동 요약 (CORS 문제 해결)

*   **사용자 요청**:
    *   `characters` API 호출 시 CORS 문제가 발생했습니다. 해결 요청.

*   **수행 작업**:
    1.  `app/main.py` 수정: `fastapi.middleware.cors.CORSMiddleware`를 임포트하고 FastAPI 애플리케이션에 CORS 설정을 추가하여 지정된 출처(origin)로부터의 요청을 허용했습니다.
    2.  `docker-compose down` 명령어로 실행 중인 서비스 중지.
    3.  `docker-compose up --build -d` 명령어로 서비스 재빌드 및 백그라운드 재시작.
    4.  `README.md` 업데이트: '변경 이력' 및 'AI 에이전트 활동 기록' 섹션에 현재 세션의 작업 내용 추가.

*   **배운 점/해결 과정**:
    *   **CORS 문제**: 웹 브라우저의 보안 정책으로 인해 다른 출처의 API 호출이 차단되는 문제. 백엔드(FastAPI)에서 `CORSMiddleware`를 통해 허용할 출처를 명시하여 해결했습니다. 개발 환경의 다양한 포트(80, 3000) 및 서비스 이름(`localhost`)을 고려하여 설정했습니다.

### 2026년 1월 28일 활동 요약 (캐릭터 목록 로드 실패 문제 해결 및 프론트엔드 개선)

*   **사용자 요청**:
    *   프론트엔드에서 "캐릭터 목록을 불러오는 데 실패했습니다" 문제 해결 요청.
    *   프론트엔드 서비스 요구사항에 맞춰 재구현 및 디자인 개선 요청.

*   **수행 작업**:
    1.  `docker-compose down` 명령어로 실행 중인 서비스 중지.
    2.  `docker-compose.yml` 수정: 프론트엔드 서비스에 `environment` 섹션을 추가하여 `VITE_API_BASE_URL=http://backend:8000` 설정.
    3.  `frontend/src/App.tsx` 수정: 캐릭터 목록 로드, 토론 시작, 발언 처리 등 토론 기능 UI/로직 개선 및 디자인 적용.
    4.  `frontend/src/App.css` 수정: 프론트엔드 UI에 맞춰 디자인 개선.
    5.  `docker-compose up --build -d` 명령어로 서비스 재빌드 및 백그라운드 재시작.
    6.  `README.md` 업데이트: '변경 이력' 및 'AI 에이전트 활동 기록' 섹션에 현재 세션의 작업 내용 추가.

*   **배운 점/해결 과정**:
    *   **프론트엔드 API 통신 문제**: Docker Compose 환경에서 프론트엔드 컨테이너가 백엔드 컨테이너와 통신하려면 서비스 이름(`backend`)을 사용해야 함을 확인. `VITE_API_BASE_URL` 환경 변수를 `docker-compose.yml`을 통해 프론트엔드 서비스에 명시적으로 주입하여 해결.
    *   **프론트엔드 재구현 및 디자인 개선**: 사용자의 요구사항에 따라 `App.tsx`와 `App.css`를 수정하여 기능적/미학적 개선을 달성했습니다.

### 2026년 1월 28일 활동 요약 (프로젝트 초기 설정 및 프론트엔드 개발)

*   **사용자 요청**:
    *   파이썬 프로젝트 생성 요청 (가상환경, requirements.txt, .env, docker-compose.yml 포함)
    *   README.md에 작업 기록 및 AI 어시스턴트 지침 포함
    *   Python 코드 객체지향, 웹 서비스 형태
    *   `base-prompt.txt`, `character_info.txt` 읽기 전용으로 활용
    *   Docker 이미지/컨테이너 이름 `dorandoran-multiagent`
    *   `OPENAI_API_KEY`는 `.env`에서 읽고 변경 금지
    *   `streamlit` 사용 금지
    *   프론트엔드: React.js, Typescript 사용, 백엔드와 분리된 디렉토리 및 Dockerfile
    *   이후 모든 답변 한국어로 진행 요청
    *   AI 에이전트의 명령 및 작업 내역을 `README.md`에 기록 요청

*   **수행 작업**:
    1.  프로젝트 기본 디렉토리 (`app`, `frontend`) 생성.
    2.  Python 가상환경 `.venv` 생성 및 `fastapi`, `uvicorn`, `python-dotenv` 설치 후 `requirements.txt` 생성.
    3.  `base-prompt.txt` 및 `character_info.txt` 내용 확인.
    4.  백엔드 `app/main.py` 및 `app/services.py` 초기 파일 생성 및 FastAPI 기본 구조와 토론 관리 클래스 골격 구현.
    5.  프론트엔드 프로젝트 (`frontend`) `vite`를 사용하여 React + TypeScript 템플릿으로 생성.
    6.  백엔드 `app/Dockerfile`, 프론트엔드 `frontend/Dockerfile` 생성.
    7.  `docker-compose.yml` 생성.
    8.  `README.md` 초기 버전 생성 및 프로젝트 개요, 기능, 설정, 초기 변경 이력 기록. AI 어시스턴트 지침 추가.
    9.  `docker-compose.yml` 수정: 프론트엔드 서비스의 `container_name`을 `dorandoran-frontend`로 설정.
    10. `README.md` 수정: AI 어시스턴트 지침 블록을 HTML 주석으로 숨기고, 새로운 작업 흐름 지침 추가.
    11. `docker-compose down` 명령어로 기존 서비스 중지.
    12. `frontend` 디렉토리로 이동하여 `npm install axios` 실행.
    13. `frontend/src/services/api.ts` 파일 생성 및 백엔드 API 호출 로직 구현.
    14. `frontend/src/App.tsx` 파일 수정 및 토론 시스템을 위한 UI (캐릭터 선택, 주제 입력, 채팅창) 및 상태 관리 로직 구현.
    15. `frontend/src/App.css` 파일 수정 및 새로운 UI에 대한 기본 스타일 추가.
    16. `frontend/Dockerfile` 수정: Node.js 버전을 `node:18-alpine`에서 `node:20-alpine`으로 변경.
    17. `frontend/src/App.tsx` 수정: 불필요한 `import React` 제거.
    18. `docker-compose up --build -d` 명령어로 모든 서비스 재빌드 및 백그라운드 실행.
    19. `README.md` 업데이트: 이전 세션의 변경 이력 및 AI 에이전트 활동 기록 추가.
    20. 답변 언어를 한국어로 설정.
    21. AI 에이전트 활동 기록 메커니즘을 `README.md`에 설정 및 현재 작업 내용 기록.

<!--
### Instructions for AI Assistant

*   **작업 기록**: 모든 변경 사항은 이 `README.md` 파일의 '변경 이력' 섹션에 기록해야 합니다. 형식은 아래 'AI 에이전트 활동 기록' 아래의 지침을 따릅니다.
*   **버전 관리**: '변경 이력' 섹션의 각 항목은 `vX.Y.0` 형태로 마이너 버전(`Y`)을 1씩 증가시킵니다. 가장 최근 변경 내역이 맨 위에 위치합니다.
*   **작업 흐름**:
    1.  `docker-compose down` 명령어로 기존 서비스를 종료합니다.
    2.  코드를 수정합니다.
    3.  `docker-compose up --build -d` 명령어로 서비스를 다시 빌드하고 백그라운드에서 실행합니다.
    4.  이 `README.md`의 '변경 이력' 섹션과 'AI 에이전트 활동 기록' 섹션을 업데이트합니다.
    5.  사용자에게 완료를 보고합니다.
-->
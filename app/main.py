from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .services import DebateManager, Character

app = FastAPI()

# CORS 설정
origins = [
    "http://localhost",      # 프론트엔드 서비스 주소 (도커 환경)
    "http://localhost:80",   # 프론트엔드 서비스 주소 (도커 환경)
    "http://localhost:3000", # 개발 환경에서 프론트엔드가 실행될 수 있는 주소
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StartDebateRequest(BaseModel):
    topic: str
    character_names: list[str]

class SpeakRequest(BaseModel):
    character_name: str
    statement: str

debate_manager = DebateManager()

@app.on_event("startup")
async def startup_event():
    """
    애플리케이션 시작 시 캐릭터 정보를 로드합니다.
    """
    debate_manager.load_characters_from_file("character_info.txt")

@app.post("/debate/start")
async def start_debate(request: StartDebateRequest):
    """
    선택된 캐릭터들과 함께 새로운 토론을 시작합니다.
    """
    try:
        result = debate_manager.start_debate(request.topic, request.character_names)
        return {"message": "Debate started successfully.", "debate_id": result}
    except ValueError as e:
        return {"error": str(e)}

@app.post("/debate/{debate_id}/speak")
async def speak(debate_id: str, request: SpeakRequest):
    """
    특정 캐릭터가 발언합니다.
    """
    # 임시 구현: 다음 발언자를 라우팅 에이전트가 결정해야 함
    next_speaker = "..."
    # 실제 토론 로직 (에이전트 발언 생성, 라우팅 등)은 services.py의 DebateManager에서 처리
    # 현재는 요청을 받아서 간단히 응답
    return {
        "debate_id": debate_id,
        "current_speaker": request.character_name,
        "statement": request.statement,
        "next_speaker": next_speaker # 이 부분은 실제 라우팅 로직 구현 시 업데이트 필요
    }

@app.get("/debate/{debate_id}")
async def get_debate_status(debate_id: str):
    """
    현재 토론 상태를 가져옵니다.
    """
    return debate_manager.get_debate_status(debate_id)

@app.get("/characters")
async def get_characters():
    """
    선택 가능한 모든 캐릭터 목록을 반환합니다.
    """
    return {"characters": [char.name for char in debate_manager.get_all_characters()]}

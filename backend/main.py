from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import List, Optional
import json
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from scraper import fetch_namuwiki_persona
from graph import app_graph
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

app = FastAPI()

# React(5173 포트)에서 오는 요청 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 모든 출처 허용
    allow_credentials=True,
    allow_methods=["*"], # 모든 HTTP 메서드 허용
    allow_headers=["*"], # 모든 헤더 허용
)

class Character(BaseModel):
    name: str
    slug: str
    persona: Optional[str] = None

class DebateState(BaseModel):
    messages: List[dict]
    participants: List[Character]
    next_speaker: str
    turn_count: int
    topic: str
    status: str

# # 서버 시작 시 실행될 로직
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     print("🚀 모든 캐릭터의 페르소나를 미리 로드합니다...")
#     character_slugs = ["유시진", "노하라 신노스케", "리정혁", "도라에몽(도라에몽)", "궁예(태조 왕건)", "피카츄", "강호동", "장첸", "안성재", "김상중"]
#     for slug in character_slugs:
#         # 이 함수 내부에서 파일 캐싱을 수행하므로, 서버가 켜질 때 한 번만 고생하면 됩니다.
#         fetch_namuwiki_persona(slug)
#     print("✅ 모든 데이터 준비 완료!")
#     yield

@app.get("/character/{slug}")
async def get_character_data(slug: str):
    """프론트에서 캐릭터를 선택하는 '그 순간'에만 호출됩니다."""
    # 1. 캐시 폴더 확인 (scraper.py의 캐싱 로직 활용)
    # 2. 캐시 없으면 그때서야 해당 slug만 크롤링 진행
    persona = fetch_namuwiki_persona(slug) 
    
    name_map = {
        "노하라 신노스케": "짱구", "유시진": "유시진", "지예은": "지예은", "도라에몽(도라에몽)": "도라에몽", 
        "피카츄": "피카츄", "강호동": "강호동", "장첸": "장첸", 
        "궁예(태조 왕건)": "궁예", "김상중": "김상중", "안성재": "안성재", "나무늘보": "나무늘보"
    }
    return {"name": name_map.get(slug, slug), "slug": slug, "persona": persona}

def convert_to_langchain_messages(messages: List[dict]):
    """JSON 딕셔너리 리스트를 LangChain 메시지 객체 리스트로 변환"""
    converted = []
    for msg in messages:
        role = msg.get("role")
        content = msg.get("content", "")
        name = msg.get("name") # 캐릭터 이름 유지
        
        if role == "system":
            converted.append(SystemMessage(content=content))
        elif role == "user":
            # 캐릭터의 발언은 HumanMessage로 취급하되 이름을 포함
            converted.append(HumanMessage(content=content, name=name))
        elif role == "assistant":
            converted.append(AIMessage(content=content))
        else:
            converted.append(HumanMessage(content=content, name=name))
    return converted

@app.post("/debate/step")
async def debate_step(state: DebateState):
    try:
        # 1. 프론트엔드에서 받은 dict 데이터를 변환
        input_state = state.dict()
        input_state['messages'] = convert_to_langchain_messages(input_state['messages'])
        
        # 2. LangGraph 실행
        result = app_graph.invoke(input_state)
        
        # 3. 반환할 때 다시 JSON으로 직렬화할 수 있게 변환 (객체 -> dict)
        # LangGraph의 결과물은 객체이므로 다시 프론트엔드가 이해할 수 있는 형식으로 바꿉니다.
        output_messages = []
        for msg in result['messages']:
            output_messages.append({
                "role": "user" if isinstance(msg, HumanMessage) else "assistant",
                "name": getattr(msg, 'name', None),
                "content": msg.content
            })
        
        result['messages'] = output_messages
        return result
    except Exception as e:
        print(f"Error in graph execution: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/debate/stream")
async def debate_stream(state: DebateState):
    async def event_generator():
        input_state = state.dict()
        input_state['messages'] = convert_to_langchain_messages(input_state['messages'])
        
        # 재귀 제한을 턴 수에 맞춰 넉넉히 설정 (20턴이면 약 60회 방문)
        config = {"recursion_limit": 100}

        async for event in app_graph.astream_events(input_state, config=config, version="v1"):
            kind = event["event"]
            
            # # [신호 1] 모델이 발언을 시작할 때 (누가 말하는지 알림)
            # if kind == "on_chat_model_start":
            #     speaker_name = event["data"]["input"].get("next_speaker", "Unknown")
            #     yield f"data: {json.dumps({'type': 'speaker_start', 'name': speaker_name})}\n\n"

            if kind == "on_chain_start":
                # character_agent 노드가 시작될 때만
                if event.get("name") == "character_agent":
                    # 여기 input은 보통 그래프 state(dict)임
                    speaker_name = event.get("data", {}).get("input", {}).get("next_speaker", "Unknown")
                    yield f"data: {json.dumps({'type': 'speaker_start', 'name': speaker_name})}\n\n"

            # [신호 2] 글자가 생성될 때
            elif kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"
            
            # [신호 3] 특정 캐릭터의 발언이 끝났을 때
            elif kind == "on_chat_model_end":
                yield f"data: {json.dumps({'type': 'speaker_end'})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
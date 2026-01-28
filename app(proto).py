import streamlit as st
import os
import requests
import operator
import urllib.parse
from typing import Annotated, List, TypedDict, Literal
from bs4 import BeautifulSoup
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END

# 환경 변수 로드
load_dotenv()

# --- [1. 캐릭터 프리셋 정의] ---
CHARACTER_PRESETS = {
    "유시진(태양의 후예)": "유시진",
    "짱구(크레용 신짱)": "노하라 신노스케",
    "리정혁(사랑의 불시착)": "리정혁",
    "도라에몽": "도라에몽(도라에몽)",
    "궁예(태조 왕건)": "궁예(태조 왕건)",
    "피카츄(포켓몬)": "피카츄",
    "강호동": "강호동",
    "장첸(범죄도시)": "장첸",
    "안성재(셰프)": "안성재",
    "김상중": "김상중"
}

# --- [2. 정밀 RAG Persona Agent: 섹션 크롤러] ---
def fetch_namuwiki_context(slug: str) -> str:
    """캐릭터의 배경, 인물 관계, 어록 섹션을 중점적으로 추출합니다."""
    encoded_slug = urllib.parse.quote(slug)
    url = f"https://namu.wiki/w/{encoded_slug}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    # 우리가 집중적으로 찾을 섹션 키워드
    target_sections = ["개요", "특징", "인물 관계", "어록", "명대사", "말투", "성격", "유행어"]
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            return "배경 지식 로드 실패. 대중적인 인지도를 바탕으로 연기하세요."
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 나무위키 섹션 파싱 로직
        persona_parts = []
        # 모든 헤딩(h1~h6)과 그 다음 형제 요소들을 탐색
        for header in soup.find_all(['h1', 'h2', 'h3', 'h4']):
            header_text = header.get_text()
            # 타겟 키워드가 헤더에 포함되어 있는지 확인
            if any(keyword in header_text for keyword in target_sections):
                persona_parts.append(f"\n### {header_text}\n")
                # 헤더 다음의 내용들을 수집 (다음 헤더가 나오기 전까지)
                curr = header.next_sibling
                while curr and curr.name not in ['h1', 'h2', 'h3', 'h4']:
                    if hasattr(curr, 'get_text'):
                        txt = curr.get_text(strip=True)
                        if len(txt) > 5: persona_parts.append(txt)
                    curr = curr.next_sibling
        
        full_persona = "\n".join(persona_parts)
        
        # 만약 섹션 추출에 실패했다면 전체 텍스트 상단이라도 반환
        if len(full_persona) < 200:
            return soup.get_text(separator=' ', strip=True)[:3000]
            
        return full_persona[:5000] # 섹션 기반으로 더 넉넉하게 추출
    except Exception as e:
        return f"데이터 연결 오류 ({e}). 기본 페르소나를 유지하세요."

# --- [3. 에이전트 및 그래프 로직] ---
class DebateState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]
    participants: List[dict]
    next_speaker: str
    turn_count: int
    topic: str
    status: str

llm = ChatOpenAI(model="gpt-4o", temperature=0.8) # 창의성을 위해 temperature 약간 상승

def character_agent_node(state: DebateState):
    speaker = state['next_speaker']
    context = next(p['persona'] for p in state['participants'] if p['name'] == speaker)
    
    system_prompt = f"""
    당신은 '{speaker}'입니다. 제공된 나무위키 데이터의 '어록'과 '말투'를 최우선으로 참고하여 발언하세요.
    
    [캐릭터 정밀 분석 데이터]
    {context}
    
    [작동 규칙]
    1. [Internal Thought]: 상대의 논리를 자신의 가치관으로 필터링하고, 어떤 어록이나 말투를 섞을지 '독백'으로 정리하세요.
    2. [Public Speech]: 캐릭터 특유의 어투(반말/존댓말, 방언, 말버릇 등)를 완벽히 재현하여 대답하세요.
    3. 절대 AI임을 드러내지 마세요.
    """
    
    response = llm.invoke([SystemMessage(content=system_prompt)] + state['messages'])
    return {
        "messages": [HumanMessage(content=response.content, name=speaker)],
        "turn_count": state['turn_count'] + 1
    }

def moderator_node(state: DebateState):
    messages = state['messages']
    turn_count = state['turn_count']
    last_msg = messages[-1].content if messages else ""

    if "강제 종료" in last_msg or "종료합니다" in last_msg:
        return {"status": "forced_stop"}
    if any(k in last_msg for k in ["결론:", "합의합니다", "요약하자면"]):
        return {"status": "consensus"}
    if turn_count >= 100: # 100턴 제한 적용
        return {"status": "conflict"}

    names = [p['name'] for p in state['participants']]
    if not state['next_speaker'] or state['next_speaker'] not in names:
        next_speaker = names[0]
    else:
        curr_idx = names.index(state['next_speaker'])
        next_speaker = names[(curr_idx + 1) % len(names)]
        
    return {"next_speaker": next_speaker, "status": "proceeding"}

# 그래프 빌드
workflow = StateGraph(DebateState)
workflow.add_node("character", character_agent_node)
workflow.add_node("moderator", moderator_node)
workflow.set_entry_point("moderator")
workflow.add_conditional_edges("moderator", lambda x: "end" if x['status'] != "proceeding" else "continue", {"continue": "character", "end": END})
workflow.add_edge("character", "moderator")
app_graph = workflow.compile()

# --- [4. UI 구성] ---
st.set_page_config(page_title="캐릭터 토론 시스템 v2", layout="wide")
st.title("🎭 크로스오버 캐릭터 토론 오케스트레이터")
st.caption("나무위키의 개요, 인물 관계, 어록 섹션을 분석하여 페르소나를 강화합니다.")

with st.sidebar:
    st.header("👥 캐릭터 영입")
    selected_names = st.multiselect("참가자 선택 (최대 5명)", options=list(CHARACTER_PRESETS.keys()), max_selections=5)
    
    if st.button("데이터 정밀 동기화"):
        if selected_names:
            with st.spinner("섹션별 데이터 추출 중..."):
                participants = [{"name": n, "persona": fetch_namuwiki_context(CHARACTER_PRESETS[n])} for n in selected_names]
                st.session_state.ready_participants = participants
                st.success("에이전트 튜닝 완료!")

topic = st.text_input("💬 토론 주제", value="안성재 셰프의 심사 기준은 너무 엄격한가?")

col1, col2 = st.columns(2)
with col1:
    start = st.button("🚀 토론 시작 (최대 100턴)")
with col2:
    if st.button("🛑 강제 종료"):
        st.session_state.force_stop = True

if start:
    if "ready_participants" not in st.session_state:
        st.error("캐릭터 선택 후 동기화 버튼을 먼저 눌러주세요.")
    else:
        st.session_state.force_stop = False
        initial_state = {
            "messages": [HumanMessage(content=f"사회자: 주제는 '{topic}'입니다. 토론을 시작하세요.")],
            "participants": st.session_state.ready_participants,
            "next_speaker": "", "turn_count": 0, "topic": topic, "status": "proceeding"
        }
        
        for output in app_graph.stream(initial_state):
            if st.session_state.get("force_stop"):
                st.warning("토론이 강제 종료되었습니다.")
                break
                
            for key, value in output.items():
                if key == "character":
                    msg = value['messages'][-1]
                    with st.chat_message(msg.name):
                        content = msg.content
                        if "[Public Speech]" in content:
                            thought, speech = content.split("[Public Speech]")
                            with st.expander("캐릭터 내부 분석 (CoT)"):
                                st.write(thought.replace("[Internal Thought]", "").strip())
                            st.markdown(f"**{speech.strip()}**")
                        else: st.write(content)
                elif key == "moderator" and value['status'] != "proceeding":
                    st.info(f"시스템 알림: {value['status']}")
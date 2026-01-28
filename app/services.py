import uuid
from pydantic import BaseModel, Field
from typing import List, Dict

# --- Agent Skeletons ---

class RAGPersonaAgent:
    """
    캐릭터의 페르소나를 관리하고, 나무위키에서 관련 정보를 추출합니다.
    """
    def __init__(self, character_name: str, namuwiki_url: str):
        self.character_name = character_name
        self.namuwiki_url = namuwiki_url
        # TODO: 나무위키 파싱 및 페르소나 튜닝 로직 구현

    def get_persona_based_speech(self, internal_thought: str) -> str:
        # TODO: CoT와 RAG를 기반으로 최종 발언 생성
        return f"[Public Speech] {self.character_name}: '{internal_thought}'에 대한 저의 생각은..."

class ContextDBAgent:
    """
    토론의 전체 대화 기록을 관리하고 요약합니다.
    """
    def __init__(self):
        self.history = []

    def add_to_history(self, speaker: str, statement: str):
        self.history.append({"speaker": speaker, "statement": statement})

    def get_summary(self) -> str:
        # TODO: 대화 요약 로직 구현
        return "현재까지의 토론 요약입니다."

class RoutingAgent:
    """
    토론의 발언 순서를 결정합니다.
    """
    def __init__(self, characters: List['Character']):
        self.characters = characters
        self.turn_index = 0

    def get_next_speaker(self) -> 'Character':
        # TODO: 더 지능적인 라우팅 로직 구현
        speaker = self.characters[self.turn_index % len(self.characters)]
        self.turn_index += 1
        return speaker

class CoTReasoningModule:
    """
    캐릭터가 발언하기 전, 내적 독백(CoT)을 생성합니다.
    """
    def generate_thought(self, character: 'Character', topic: str, context: str) -> str:
        # TODO: 캐릭터의 성격과 토론 맥락을 기반으로 독백 생성
        return f"[Internal Thought] ({character.name}) 주제 '{topic}'와 현재 상황 '{context}'을 보니..."


# --- Core Models ---

class Character(BaseModel):
    """
    토론에 참여하는 캐릭터 모델
    """
    name: str
    url: str
    persona_agent: RAGPersonaAgent = Field(exclude=True)
    cot_module: CoTReasoningModule = Field(exclude=True)

    class Config:
        arbitrary_types_allowed = True

class Debate(BaseModel):
    """
    단일 토론 세션을 관리하는 모델
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    topic: str
    participants: List[Character]
    context_agent: ContextDBAgent = Field(default_factory=ContextDBAgent)
    routing_agent: RoutingAgent
    turn_count: int = 0
    max_turns: int = 100

    class Config:
        arbitrary_types_allowed = True


class DebateManager:
    """
    전체 토론 생성 및 관리를 담당합니다.
    """
    def __init__(self):
        self.available_characters: List[Character] = []
        self.active_debates: Dict[str, Debate] = {}

    def load_characters_from_file(self, file_path: str):
        """
        character_info.txt 파일에서 캐릭터 목록을 로드합니다.
        유효한 '캐릭터명 : URL' 형식의 라인만 파싱합니다.
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip() # 라인 앞뒤 공백 제거
                if not line: # 빈 라인 건너뛰기
                    continue

                if ':' in line:
                    try:
                        name, url = line.split(':', 1)
                        name = name.strip()
                        url = url.strip()
                        if name and url: # 이름과 URL이 모두 존재하는 경우에만 추가
                            self.available_characters.append(Character(
                                name=name,
                                url=url,
                                persona_agent=RAGPersonaAgent(name, url),
                                cot_module=CoTReasoningModule()
                            ))
                    except ValueError:
                        # 콜론은 있지만 파싱 오류 발생 시 (예: name:url:extra)
                        print(f"Warning: Failed to parse line in character_info.txt: {line}")
                else:
                    # 콜론이 없는 라인은 건너뛰거나 경고를 출력할 수 있습니다.
                    print(f"Warning: Skipping line without colon in character_info.txt: {line}")

    def get_all_characters(self) -> List[Character]:
        return self.available_characters

    def start_debate(self, topic: str, character_names: List[str]) -> str:
        """
        새로운 토론을 시작하고 ID를 반환합니다.
        """
        if len(character_names) > 5:
            raise ValueError("최대 5명의 캐릭터만 선택할 수 있습니다.")
        
        participants = [
            char for char in self.available_characters if char.name in character_names
        ]
        if len(participants) != len(character_names):
            raise ValueError("선택한 캐릭터 중 일부를 찾을 수 없습니다.")

        debate = Debate(
            topic=topic,
            participants=participants,
            routing_agent=RoutingAgent(participants)
        )
        self.active_debates[debate.id] = debate
        return debate.id

    def get_debate_status(self, debate_id: str) -> Dict:
        """
        ID로 특정 토론의 상태를 조회합니다.
        """
        debate = self.active_debates.get(debate_id)
        if not debate:
            return {"error": "Debate not found."}
        return {
            "id": debate.id,
            "topic": debate.topic,
            "participants": [p.name for p in debate.participants],
            "turn_count": debate.turn_count,
            "summary": debate.context_agent.get_summary()
        }

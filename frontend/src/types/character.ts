export interface Character {
  id: number;
  name: string;
  series: string;
  image: string;
  color: string;
  slug: string | null; // 백엔드 API 호출용 (null이면 캐시 없음)
}

export interface CharacterWithPersona extends Character {
  persona?: string;
}

export interface DebateMessage {
  characterId: number;
  characterName: string;
  message: string;
  isMonologue?: boolean;
  timestamp: Date;
  color: string;
}

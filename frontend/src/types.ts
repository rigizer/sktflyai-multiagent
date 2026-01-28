export interface Character {
  name: string;
  slug: string;
  persona?: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  name?: string;
  content: string;
}

export interface DebateState {
  messages: Message[];
  participants: Character[];
  next_speaker: string;
  turn_count: number;
  topic: string;
  status: 'proceeding' | 'consensus' | 'conflict' | 'forced_stop';
}
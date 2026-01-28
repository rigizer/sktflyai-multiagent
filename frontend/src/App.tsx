import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Users, Play, Loader2 } from 'lucide-react';
import { CharacterCard } from './components/CharacterCard';
import { DebateDisplay } from './components/DebateDisplay';
import { characters } from './data/characters';
import { DebateMessage } from './types/character';

const MAX_SELECTIONS = 5;
const API_BASE = '/api';

function App() {
  const [selectedCharacters, setSelectedCharacters] = useState<Set<number>>(new Set());
  const [debateTopic, setDebateTopic] = useState('');
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [isDebating, setIsDebating] = useState(false);
  const [loadedPersonas, setLoadedPersonas] = useState<Map<number, string>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleToggleCharacter = async (id: number) => {
    const newSelected = new Set(selectedCharacters);
    const char = characters.find(c => c.id === id);

    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (newSelected.size < MAX_SELECTIONS) {
        newSelected.add(id);

        // slug가 있고 아직 persona를 로드하지 않은 경우 백엔드에서 가져오기
        if (char?.slug && !loadedPersonas.has(id)) {
          try {
            const res = await fetch(`${API_BASE}/character/${encodeURIComponent(char.slug)}`);
            if (res.ok) {
              const data = await res.json();
              setLoadedPersonas(prev => new Map(prev).set(id, data.persona || ''));
            }
          } catch (err) {
            console.error('Failed to load persona:', err);
          }
        }
      }
    }
    setSelectedCharacters(newSelected);
  };

  const startDebate = async () => {
    if (selectedCharacters.size === 0 || !debateTopic.trim()) {
      return;
    }

    setIsDebating(true);
    setMessages([]);

    // 선택된 캐릭터 중 slug가 있는 것만 필터링
    const selectedChars = characters
      .filter(c => selectedCharacters.has(c.id) && c.slug)
      .map(c => ({
        name: c.name,
        slug: c.slug!,
        persona: loadedPersonas.get(c.id) || '',
      }));

    if (selectedChars.length === 0) {
      alert('캐시된 캐릭터를 최소 1명 이상 선택해주세요.');
      setIsDebating(false);
      return;
    }

    // 초기 상태 구성
    const initialState = {
      messages: [{ role: 'system', content: `토론 주제: ${debateTopic}`, name: null }],
      participants: selectedChars,
      next_speaker: selectedChars[0].name,
      turn_count: 0,
      topic: debateTopic,
      status: 'proceeding',
    };

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch(`${API_BASE}/debate/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialState),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Stream failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let currentSpeaker = '';
      let currentContent = '';
      let currentColor = '#ffffff';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);

          if (data === '[DONE]') break;

          try {
            const event = JSON.parse(data);

            if (event.type === 'speaker_start') {
              // 이전 메시지가 있으면 저장
              if (currentSpeaker && currentContent) {
                const isMonologue = currentContent.includes('<속마음>');
                const char = characters.find(c => c.name === currentSpeaker);
                setMessages(prev => [...prev, {
                  characterId: char?.id || 0,
                  characterName: currentSpeaker,
                  message: currentContent,
                  isMonologue,
                  timestamp: new Date(),
                  color: char?.color || currentColor,
                }]);
              }
              currentSpeaker = event.name;
              currentContent = '';
              const char = characters.find(c => c.name === event.name);
              currentColor = char?.color || '#ffffff';
            } else if (event.type === 'token') {
              currentContent += event.content;
              // 실시간 업데이트: 현재 말하는 중인 메시지 표시
              const char = characters.find(c => c.name === currentSpeaker);
              setMessages(prev => {
                const newMessages = [...prev];
                const lastIdx = newMessages.findIndex(
                  m => m.characterName === currentSpeaker && m.message === currentContent.slice(0, -event.content.length)
                );
                if (lastIdx >= 0) {
                  newMessages[lastIdx] = { ...newMessages[lastIdx], message: currentContent };
                  return newMessages;
                }
                // 새 메시지 추가 (스트리밍 중)
                if (prev.length === 0 || prev[prev.length - 1].characterName !== currentSpeaker) {
                  return [...prev, {
                    characterId: char?.id || 0,
                    characterName: currentSpeaker,
                    message: currentContent,
                    isMonologue: false,
                    timestamp: new Date(),
                    color: char?.color || currentColor,
                  }];
                }
                // 마지막 메시지 업데이트
                newMessages[newMessages.length - 1] = {
                  ...newMessages[newMessages.length - 1],
                  message: currentContent,
                };
                return newMessages;
              });
            } else if (event.type === 'speaker_end') {
              // 발언 종료 시 isMonologue 업데이트
              const isMonologue = currentContent.includes('<속마음>');
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > 0) {
                  newMessages[newMessages.length - 1] = {
                    ...newMessages[newMessages.length - 1],
                    isMonologue,
                  };
                }
                return newMessages;
              });
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Debate stream error:', err);
        alert('토론 중 오류가 발생했습니다.');
      }
    } finally {
      setIsDebating(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 mb-3">
            <Sparkles className="w-8 h-8 text-purple-400" />
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              세계관 합의소
            </h1>
            <Sparkles className="w-8 h-8 text-cyan-400" />
          </div>
          <p className="text-gray-400">AI 캐릭터들이 펼치는 흥미진진한 토론을 경험하세요</p>
        </motion.div>

        {/* Main Layout */}
        <div className="grid lg:grid-cols-[1fr,500px] gap-6">
          {/* Left Panel - Character Selection & Settings */}
          <div className="space-y-6">
            {/* Selection Counter */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-xl p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-purple-400" />
                  <h2 className="text-xl font-bold">캐릭터 선택</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">선택됨:</span>
                  <div className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 font-bold">
                    {selectedCharacters.size} / {MAX_SELECTIONS}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Character Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            >
              {characters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  isSelected={selectedCharacters.has(character.id)}
                  onToggle={handleToggleCharacter}
                  disabled={selectedCharacters.size >= MAX_SELECTIONS && !selectedCharacters.has(character.id)}
                />
              ))}
            </motion.div>

            {/* Debate Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-xl p-6 space-y-4"
            >
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Play className="w-5 h-5 text-cyan-400" />
                토론 주제 설정
              </h2>
              
              <textarea
                value={debateTopic}
                onChange={(e) => setDebateTopic(e.target.value)}
                placeholder="토론 주제를 입력하세요... (예: 인공지능의 윤리적 사용에 대해)"
                className="w-full h-32 px-4 py-3 glass rounded-lg text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />

              <button
                onClick={startDebate}
                disabled={selectedCharacters.size === 0 || !debateTopic.trim() || isDebating}
                className="w-full py-4 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2"
              >
                {isDebating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    토론 진행 중...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    토론 시작
                  </>
                )}
              </button>
            </motion.div>
          </div>

          {/* Right Panel - Live Debate Display */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-xl overflow-hidden h-[calc(100vh-8rem)] sticky top-8"
          >
            <DebateDisplay messages={messages} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default App;
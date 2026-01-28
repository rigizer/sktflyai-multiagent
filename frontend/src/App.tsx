import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Play, 
  // Square, 
  UserCheck, 
  MessageSquare, 
  Users, 
  XCircle, 
  Loader2,
  BrainCircuit
} from 'lucide-react';
import { CHARACTER_LIST } from './constants';
import type { Character, Message, DebateState } from './types';

function App() {
  // --- 상태 관리 ---
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isDebating, setIsDebating] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // 메시지 업데이트 시 자동 스크롤
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- 핸들러 함수 ---
  const toggleCharacter = async (slug: string) => {
  if (isDebating) return;

  if (selectedSlugs.includes(slug)) {
    setSelectedSlugs(prev => prev.filter(s => s !== slug));
  } else {
    if (selectedSlugs.length >= 5) return;
    
    // 선택하는 순간 백엔드에 크롤링 요청 (캐시되어 있으면 즉시 반환됨)
    // 이 방식은 '토론 시작' 버튼을 눌렀을 때 한꺼번에 긁는 것보다 훨씬 빠릅니다.
    try {
      await axios.get(`http://localhost:8000/character/${slug}`);
      setSelectedSlugs(prev => [...prev, slug]);
    } catch (e) {
      alert("데이터를 가져오는 데 실패했습니다.");
    }
  }
};

  const startDebate = async () => {
    if (selectedSlugs.length < 2) return alert("최소 2명의 캐릭터를 선택해 주세요.");
    if (!topic.trim()) return alert("토론 주제를 입력해 주세요.");

    setIsDebating(true);
    setMessages([{ role: 'assistant', content: "⏳ 나무위키에서 캐릭터들의 페르소나를 정밀 분석 중입니다..." }]);

    try {
      // 1. 선택된 캐릭터들의 데이터(Persona) 백엔드에서 실시간 스크래핑
      const participants = await Promise.all(
        selectedSlugs.map(async (slug) => {
          const res = await axios.get(`http://localhost:8000/character/${slug}`);
          return res.data; 
        })
      );

      let currentState: DebateState = {
        messages: [{ role: 'user', content: `토론 주제: ${topic}` }],
        participants: participants,
        next_speaker: "",
        turn_count: 0,
        topic: topic,
        status: 'proceeding'
      };

      setMessages(currentState.messages);

      // 2. 토론 루프 실행 (최대 100턴)
      while (currentState.status === 'proceeding' && currentState.turn_count < 100) {
        // 현재 발언자 표시
        setCurrentSpeaker(currentState.next_speaker || participants[0].name);

        const response = await axios.post('http://localhost:8000/debate/step', currentState);
        currentState = response.data;
        
        // 메시지 상태 업데이트 (React가 변화를 감지하여 렌더링)
        setMessages([...currentState.messages]);
        
        if (currentState.status !== 'proceeding') break;
        
        // 대화 가독성을 위한 인위적 지연 (0.8초)
        await new Promise(r => setTimeout(r, 800));
      }

      if (currentState.status === 'consensus') {
        setMessages(prev => [...prev, { role: 'assistant', content: "🏁 시스템: 캐릭터들이 합의에 도달하여 토론을 마칩니다." }]);
      } else if (currentState.status === 'conflict') {
        setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ 시스템: 100턴이 경과하여 결론 없이 종료되었습니다." }]);
      }

    } catch (error) {
      console.error(error);
      alert("서버 연결에 실패했습니다. 백엔드(FastAPI)가 실행 중인지 확인하세요.");
    } finally {
      setIsDebating(false);
      setCurrentSpeaker(null);
    }
  };

  // --- 메시지 렌더링 도우미 ---
  const renderMessageContent = (content: string) => {
    // 새로운 태그 형식에 대응
    if (content.includes("<대사>")) {
      const parts = content.split("<대사>");
      const thought = parts[0].replace("<속마음>", "").replace("</속마음>", "").trim();
      const speech = parts[1].trim();

      return (
        <div className="space-y-3">
          {thought && (
            <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
              <BrainCircuit size={12} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="italic">생각: {thought}</p>
            </div>
          )}
          <p className="text-slate-800 text-base font-medium leading-relaxed">
            {speech}
          </p>
        </div>
      );
    }
    // 시스템 메시지나 태그가 없는 경우
    return <p className="text-slate-600 text-sm">{content}</p>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 왼쪽 사이드바: 설정 영역 */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* 선택된 명단 요약 */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-700">
              <Users size={20}/> 참가자 ({selectedSlugs.length}/5)
            </h2>
            <div className="flex flex-wrap gap-2">
              {selectedSlugs.length === 0 ? (
                <p className="text-slate-400 text-sm italic">캐릭터를 영입해 주세요.</p>
              ) : (
                selectedSlugs.map(slug => {
                  const char = CHARACTER_LIST.find(c => c.slug === slug);
                  return (
                    <span key={slug} className="pl-3 pr-2 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-sm animate-in fade-in zoom-in duration-300">
                      {char?.name}
                      <button onClick={() => toggleCharacter(slug)} className="hover:text-red-300 transition-colors">
                        <XCircle size={14} />
                      </button>
                    </span>
                  );
                })
              )}
            </div>
          </div>

          {/* 영입 리스트 */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4">영입 가능 리스트</h2>
            <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {CHARACTER_LIST.map((char: Character) => {
                const isSelected = selectedSlugs.includes(char.slug);
                return (
                  <button
                    key={char.slug}
                    disabled={isDebating}
                    onClick={() => toggleCharacter(char.slug)}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                      isSelected 
                      ? 'bg-blue-50 border-blue-500 shadow-sm' 
                      : 'bg-white border-slate-50 hover:border-blue-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`font-bold ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                      {char.name}
                    </span>
                    {isSelected && <UserCheck size={20} className="text-blue-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 주제 입력 및 시작 */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><MessageSquare size={20}/> 토론 설정</h2>
            <textarea 
              disabled={isDebating}
              className="w-full p-4 border border-slate-100 bg-slate-50 rounded-2xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
              placeholder="주제를 입력하세요 (예: 부먹 vs 찍먹)"
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <button 
              onClick={startDebate}
              disabled={isDebating || selectedSlugs.length < 2}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
            >
              {isDebating ? (
                <><Loader2 size={20} className="animate-spin" /> 토론 오케스트레이션 중...</>
              ) : (
                <><Play size={18} fill="currentColor"/> 토론 시작</>
              )}
            </button>
          </div>
        </div>

        {/* 오른쪽 메인: 토론 스테이지 */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col h-[85vh] overflow-hidden">
          <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center px-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-black text-slate-400 tracking-widest uppercase">Live Debate</span>
            </div>
            {currentSpeaker && (
              <span className="text-xs font-bold text-blue-600 animate-bounce">
                🎤 {currentSpeaker} 발언 중...
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <MessageSquare size={48} className="mb-4 opacity-20" />
                <p>토론을 시작하여 캐릭터들의 충돌을 지켜보세요.</p>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.name ? 'justify-start' : 'justify-center'} animate-in slide-in-from-bottom-4 duration-500`}>
                <div className={`max-w-[90%] ${
                  msg.name 
                  ? 'bg-white border border-slate-100 shadow-sm p-6 rounded-3xl rounded-tl-none' 
                  : 'bg-slate-100 text-slate-500 text-xs font-bold py-2 px-6 rounded-full'
                }`}>
                  {msg.name && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-black">
                        {msg.name[0]}
                      </div>
                      <span className="font-black text-slate-900">{msg.name}</span>
                    </div>
                  )}
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Play, 
  UserCheck, 
  MessageSquare, 
  Users, 
  XCircle, 
  Loader2,
  BrainCircuit,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { CHARACTER_LIST } from './constants';
import type { Character, Message } from './types';

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
      
      try {
        // 선택 즉시 백엔드 호출하여 캐시 워밍업 및 데이터 확인
        await axios.get(`http://localhost:8000/character/${slug}`);
        setSelectedSlugs(prev => [...prev, slug]);
      } catch (e) {
        alert("캐릭터 데이터를 가져오는 데 실패했습니다.");
      }
    }
  };

  const startDebate = async () => {
    if (selectedSlugs.length < 2) return alert("최소 2명의 캐릭터를 선택해 주세요.");
    if (!topic.trim()) return alert("토론 주제를 입력해 주세요.");

    setIsDebating(true);
    setMessages([]); 

    try {
      // 1. 참여자 데이터 최종 수집
      const participants = await Promise.all(
        selectedSlugs.map(async (slug) => {
          const res = await axios.get(`http://localhost:8000/character/${slug}`);
          return res.data;
        })
      );

      const initialState = {
        messages: [{ role: 'user', content: `주제: ${topic}` }],
        participants,
        next_speaker: "",
        turn_count: 0,
        topic,
        status: 'proceeding'
      };

      // 2. 스트리밍 연결 시작
      const response = await fetch('http://localhost:8000/debate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialState),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let currentContent = "";

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
          
          try {
            const data = JSON.parse(line.replace("data: ", ""));

            if (data.type === 'speaker_start') {
              currentContent = "";
              setCurrentSpeaker(data.name);
              setMessages(prev => [...prev, { role: 'assistant', name: data.name, content: "" }]);
            } 
            else if (data.type === 'token') {
              currentContent += data.content;
              setMessages(prev => {
                const updated = [...prev];
                if (updated.length > 0) {
                  updated[updated.length - 1].content = currentContent;
                }
                return updated;
              });
            }
            else if (data.type === 'speaker_end') {
              setCurrentSpeaker(null);
            }
          } catch (e) {
            console.error("JSON 파싱 에러:", e);
          }
        }
      }

      // 3. 토론 결과 최종 판정 (20턴 종료 또는 합의 성공)
      // 마지막 발언 내용에서 합의 키워드 추출
      // const isConsensus = 
      //   currentContent.includes("최종 합의") || 
      //   currentContent.includes("합의합니다") || 
      //   currentContent.includes("단일화된 결론");
      const CONSENSUS_PATTERNS = [
        // 명시 합의/결론
        "합의", "합의합니다", "합의하자", "합의점", "의견을 모으",
        "결론적으로", "결론:", "최종 결론", "최종 결론:", "최종안", "최종안:",
        "공동 결론", "단일 결론", "단일화된 결론", "정리하면", "요약하면",

        // 동의/수용/양보
        "동의", "동의합니다", "수용", "수용합니다", "받아들이", "납득", "인정",
        "그 말이 맞", "그건 인정", "좋다", "좋습니다",
        "그렇게 하자", "그렇게 합시다", "좋은 타협", "타협하자",

        // 절충/공통분모
        "절충", "절충안", "중간 지점", "중재안", "공통분모", "공통점",
        "서로 양보", "서로 한 발", "합리적인 선",

        // 기존에 쓰던 시그널
        "🏁", "합의점에 도달"
      ];

      const isConsensus = CONSENSUS_PATTERNS.some(p => currentContent.includes(p));

      if (isConsensus) {
        setMessages(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            content: "🏁 토론 종료: 캐릭터들이 상호 이해를 바탕으로 최종 합의에 도달했습니다." 
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            content: "⚠️ 토론 종료: 20턴의 치열한 논쟁 끝에 최종 합의에 도달하지 못했습니다. (합의 실패)" 
          }
        ]);
      }

    } catch (e) {
      console.error("Stream Error:", e);
      setMessages(prev => [...prev, { role: 'assistant', content: "❌ 연결 에러: 서버와의 통신이 원활하지 않습니다." }]);
    } finally {
      setIsDebating(false);
      setCurrentSpeaker(null);
    }
  };

  // --- 메시지 렌더링 도우미 ---
  const renderMessageContent = (content: string) => {
    if (content.includes("<대사>")) {
      const parts = content.split("<대사>");
      const thought = parts[0].replace("<속마음>", "").replace("</속마음>", "").trim();
      const speech = parts[1].trim();

      return (
        <div className="space-y-3">
          {thought && (
            <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
              <BrainCircuit size={14} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="italic leading-snug">생각: {thought}</p>
            </div>
          )}
          <p className="text-slate-800 text-base leading-relaxed">
            {speech}
          </p>
        </div>
      );
    }

    // 시스템 메시지 스타일링 (🏁 또는 ⚠️ 로 시작하는 경우)
    if (content.startsWith("🏁") || content.startsWith("✅")) {
        return (
          <div className="flex items-center gap-2 text-emerald-700 font-bold justify-center bg-emerald-50 py-2 px-4 rounded-lg">
            <CheckCircle2 size={18} /> {content}
          </div>
        );
    }
    if (content.startsWith("⚠️") || content.startsWith("❌")) {
        return (
          <div className="flex items-center gap-2 text-red-700 font-bold justify-center bg-red-50 py-2 px-4 rounded-lg">
            <AlertCircle size={18} /> {content}
          </div>
        );
    }

    return <p className="text-slate-500 text-sm text-center italic py-2 px-4">{content}</p>;
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-900 font-sans antialiased">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 왼쪽 사이드바 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-700">
              <Users size={24}/> 참가자 ({selectedSlugs.length}/5)
            </h2>
            <div className="flex flex-wrap gap-2">
              {selectedSlugs.length === 0 ? (
                <p className="text-slate-400 text-sm italic">캐릭터를 선택해 주세요.</p>
              ) : (
                selectedSlugs.map(slug => {
                  const char = CHARACTER_LIST.find(c => c.slug === slug);
                  return (
                    <span key={slug} className="pl-3 pr-2 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-full flex items-center gap-2 shadow-md">
                      {char?.name}
                      <button onClick={() => toggleCharacter(slug)} className="hover:text-red-400">
                        <XCircle size={16} />
                      </button>
                    </span>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
            <h2 className="text-xl font-bold mb-4">영입 가능 리스트</h2>
            <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {CHARACTER_LIST.map((char: Character) => {
                const isSelected = selectedSlugs.includes(char.slug);
                return (
                  <button
                    key={char.slug}
                    disabled={isDebating}
                    onClick={() => toggleCharacter(char.slug)}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200 ${
                      isSelected 
                      ? 'bg-blue-50 border-blue-500 shadow-sm' 
                      : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <span className={`font-semibold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                      {char.name}
                    </span>
                    {isSelected && <UserCheck size={20} className="text-blue-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><MessageSquare size={24}/> 토론 설정</h2>
            <textarea 
              disabled={isDebating}
              className="w-full p-3 border border-slate-200 bg-slate-50 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-700"
              placeholder="토론 주제 입력..."
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <button 
              onClick={startDebate}
              disabled={isDebating || selectedSlugs.length < 2}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center gap-2 shadow-md transition-colors duration-200"
            >
              {isDebating ? (
                <><Loader2 size={20} className="animate-spin" /> 토론 진행 중...</>
              ) : (
                <><Play size={18} fill="currentColor"/> 토론 시작</>
              )}
            </button>
          </div>
        </div>

        {/* 오른쪽 메인: 토론 스테이지 */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-[85vh] overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-blue-50/50 flex justify-between items-center px-6">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-black text-slate-500 tracking-widest uppercase">Live Debate</span>
            </div>
            {currentSpeaker && (
              <span className="text-base font-bold text-blue-600 animate-pulse">
                🎤 {currentSpeaker} 발언 중...
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <MessageSquare size={56} className="mb-4 opacity-30" />
                <p className="text-lg">토론을 시작하여 캐릭터들의 충돌을 지켜보세요.</p>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.name ? 'justify-start' : 'justify-center'} animate-in slide-in-from-bottom-4 duration-500`}>
                <div className={`max-w-[85%] ${
                  msg.name 
                  ? 'bg-white border border-slate-100 shadow-md p-4 rounded-2xl rounded-tl-none' 
                  : 'bg-slate-100 py-2 px-5 rounded-full border border-slate-200'
                }`}>
                  {msg.name && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-black uppercase">
                        {/* {msg.name[0]} */}
                        👤
                      </div>
                      <span className="font-semibold text-slate-800 text-base">{msg.name}</span>
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
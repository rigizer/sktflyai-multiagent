import { useState, useEffect, useRef } from 'react';
import { getCharacters, startDebate, speak, getDebateStatus } from './services/api';
import './App.css';

interface Character {
  name: string;
  url: string;
}

interface Message {
  speaker: string;
  statement: string;
  timestamp: string;
}

function App() {
  const [availableCharacters, setAvailableCharacters] = useState<Character[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [debateTopic, setDebateTopic] = useState<string>('');
  const [debateId, setDebateId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userStatement, setUserStatement] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const chatWindowRef = useRef<HTMLDivElement>(null);

  // 컴포넌트 마운트 시 사용 가능한 캐릭터 목록을 불러옵니다.
  useEffect(() => {
    const fetchCharacters = async () => {
      setLoading(true);
      try {
        const charNames = await getCharacters(); // API가 문자열 배열을 반환한다고 가정
        setAvailableCharacters(charNames.map((name: string) => ({ name, url: '' })));
      } catch (err) {
        setError('캐릭터 목록을 불러오는 데 실패했습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCharacters();
  }, []);

  // 메시지가 업데이트될 때마다 채팅 창을 스크롤합니다.
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  // 캐릭터 선택/해제 토글 핸들러
  const handleCharacterToggle = (characterName: string) => {
    setSelectedCharacters(prev => {
      if (prev.includes(characterName)) {
        return prev.filter(name => name !== characterName);
      } else {
        if (prev.length < 5) { // 최대 5명 제한
          return [...prev, characterName];
        } else {
          setError('최대 5명의 캐릭터만 선택할 수 있습니다.');
          return prev;
        }
      }
    });
  };

  // 토론 시작 핸들러
  const handleStartDebate = async () => {
    if (!debateTopic.trim()) {
      setError('토론 주제를 입력해주세요.');
      return;
    }
    if (selectedCharacters.length === 0) {
      setError('토론에 참여할 캐릭터를 한 명 이상 선택해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const id = await startDebate(debateTopic, selectedCharacters);
      setDebateId(id);
      setMessages([{ speaker: '시스템', statement: `주제: "${debateTopic}" 토론이 시작되었습니다. 참가자: ${selectedCharacters.join(', ')}`, timestamp: new Date().toLocaleTimeString() }]);
      // 초기 상태 업데이트 또는 첫 번째 에이전트 발언 트리거 로직 추가 가능
    } catch (err) {
      setError('토론 시작에 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 사용자 발언 핸들러
  const handleUserSpeak = async () => {
    if (!debateId || !userStatement.trim()) {
      setError('발언 내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    const currentUserStatement = userStatement;
    setUserStatement(''); // 입력 필드 초기화

    setMessages(prev => [...prev, { speaker: '사용자', statement: currentUserStatement, timestamp: new Date().toLocaleTimeString() }]);
    
    try {
      // 백엔드의 'speak' 엔드포인트는 아직 실제 토론 로직을 포함하지 않습니다.
      // 여기서는 사용자의 발언을 백엔드에 전달하는 역할만 합니다.
      // 실제 응답을 받으려면 백엔드의 로직이 필요합니다.
      const response = await speak(debateId, '사용자', currentUserStatement); 
      console.log('백엔드 발언 처리 응답:', response);

      // 백엔드에서 에이전트의 응답을 받아오는 로직 (예: 폴링 또는 웹소켓)이 필요합니다.
      // 현재는 간단한 시스템 메시지를 추가합니다.
      setMessages(prev => [...prev, { speaker: '시스템', statement: '백엔드에서 발언을 처리 중입니다. 잠시 기다려주세요...', timestamp: new Date().toLocaleTimeString() }]);

    } catch (err) {
      setError('발언 전송에 실패했습니다.');
      console.error(err);
      setMessages(prev => [...prev, { speaker: '시스템', statement: '발언 전송 중 오류가 발생했습니다.', timestamp: new Date().toLocaleTimeString() }]);
    } finally {
      setLoading(false);
    }
  };

  // 토론 상태 새로고침 핸들러 (디버깅용 또는 수동 업데이트용)
  const handleRefreshStatus = async () => {
    if (!debateId) return;
    setLoading(true);
    try {
      const status = await getDebateStatus(debateId);
      console.log('Debate Status:', status);
      // 백엔드에서 토론 메시지를 반환한다면 여기에 추가할 수 있습니다.
      // 예: setMessages(prev => [...prev, ...status.new_messages]);
      setMessages(prev => [...prev, { speaker: '시스템', statement: `현재 턴: ${status.turn_count}, 요약: ${status.summary}`, timestamp: new Date().toLocaleTimeString() }]);
    } catch (err) {
      setError('토론 상태를 불러오는 데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>도란도란 멀티 에이전트 토론 시스템</h1>
      </header>

      {error && <p className="error-message">{error}</p>}
      {loading && <div className="loading-spinner"></div>}

      {!debateId ? (
        // 토론 설정 섹션
        <section className="setup-section">
          <h2>캐릭터 선택 (최대 5명)</h2>
          <div className="character-list">
            {availableCharacters.length > 0 ? (
              availableCharacters.map(char => (
                <button
                  key={char.name}
                  className={`character-button ${selectedCharacters.includes(char.name) ? 'selected' : ''}`}
                  onClick={() => handleCharacterToggle(char.name)}
                  disabled={selectedCharacters.length >= 5 && !selectedCharacters.includes(char.name)}
                >
                  {char.name}
                </button>
              ))
            ) : (
              <p>불러올 캐릭터가 없습니다.</p>
            )}
          </div>

          <h2>토론 주제</h2>
          <input
            type="text"
            placeholder="예: '인공지능의 윤리적 문제', '가상 현실의 미래'"
            value={debateTopic}
            onChange={(e) => setDebateTopic(e.target.value)}
            disabled={loading}
          />
          <button 
            onClick={handleStartDebate} 
            disabled={loading || !debateTopic.trim() || selectedCharacters.length === 0}
          >
            토론 시작
          </button>
        </section>
      ) : (
        // 토론 진행 섹션
        <section className="debate-section">
          <h2>진행 중인 토론</h2>
          <p className="debate-info"><strong>토론 ID:</strong> {debateId}</p>
          <p className="debate-info"><strong>주제:</strong> {debateTopic}</p>

          <div className="chat-window" ref={chatWindowRef}>
            {messages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.speaker === '사용자' ? 'user' : 'system'}`}>
                <span className="message-speaker">{msg.speaker}</span>
                <span className="message-content">{msg.statement}</span>
                <span className="message-timestamp">{msg.timestamp}</span>
              </div>
            ))}
          </div>

          <div className="user-input-area">
            <input
              type="text"
              placeholder="당신의 발언을 입력하세요..."
              value={userStatement}
              onChange={(e) => setUserStatement(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleUserSpeak()}
              disabled={loading}
            />
            <button onClick={handleUserSpeak} disabled={loading || !userStatement.trim()}>
              발언
            </button>
          </div>
          <button onClick={handleRefreshStatus} disabled={loading} className="refresh-button">
            상태 새로고침
          </button>
        </section>
      )}
    </div>
  );
}

export default App;

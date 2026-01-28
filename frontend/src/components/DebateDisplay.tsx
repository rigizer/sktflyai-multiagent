import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { DebateMessage } from '../types/character';
import { useState } from 'react';

interface DebateDisplayProps {
  messages: DebateMessage[];
}

export function DebateDisplay({ messages }: DebateDisplayProps) {
  const [expandedMonologues, setExpandedMonologues] = useState<Set<number>>(new Set());

  const toggleMonologue = (index: number) => {
    const newExpanded = new Set(expandedMonologues);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedMonologues(newExpanded);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-white/10">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">실시간 토론</h2>
          <p className="text-sm text-gray-400">Live Debate</p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>토론을 시작하면 대화가 여기에 표시됩니다</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="flex gap-3"
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: msg.color }}
                >
                  {msg.characterName.charAt(0)}
                </div>

                {/* Message Bubble */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-sm" style={{ color: msg.color }}>
                      {msg.characterName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {msg.timestamp.toLocaleTimeString('ko-KR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>

                  {msg.isMonologue ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => toggleMonologue(index)}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        {expandedMonologues.has(index) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        <span>[독백] {expandedMonologues.has(index) ? '접기' : '펼치기'}</span>
                      </button>
                      
                      <AnimatePresence>
                        {expandedMonologues.has(index) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="glass rounded-lg p-3 text-sm text-gray-300 italic overflow-hidden"
                            style={{ borderLeftWidth: 3, borderLeftColor: msg.color }}
                          >
                            {msg.message}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div
                      className="glass rounded-lg rounded-tl-none p-3 text-sm text-gray-200"
                      style={{ borderLeftWidth: 3, borderLeftColor: msg.color }}
                    >
                      {msg.message}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

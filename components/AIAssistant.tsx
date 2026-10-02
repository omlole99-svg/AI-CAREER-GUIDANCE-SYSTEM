import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, BrainCircuit, Bot, User, Loader2, Zap } from 'lucide-react';
import { aiService } from '../services/aiService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I am your Neural Mentor. Ask me anything about complex skills, career paths, or academic concepts. I'll explain them professionally but simply." }
  ]);
  const [input, setInput] = useState('');
  // isTyping is our single-flight guard — prevents ANY new request while one is in progress.
  const [isTyping, setIsTyping] = useState(false);
  const isTypingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // AbortController ref lets us cancel in-flight requests on unmount (React Strict Mode safe).
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup: abort any in-flight request when component unmounts.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Auto-scroll to bottom when messages update.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = useCallback(async () => {
    // Guard 1: No empty input.
    // Guard 2: isTyping lock prevents concurrent requests (double-click, Enter spam).
    if (!input.trim() || isTypingRef.current) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    
    setIsTyping(true);
    isTypingRef.current = true;

    // Create a fresh AbortController for this request.
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const responseText = await aiService.askAssistant(userMsg, controller.signal);

      // Only update state if the request wasn't aborted (component still mounted).
      if (!controller.signal.aborted) {
        setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return; // Component unmounted — do nothing.

      const isRateLimit =
        error.message?.includes('429') ||
        error.message?.includes('rate limit') ||
        error.message?.toLowerCase().includes('too many') ||
        error.message?.toLowerCase().includes('quota');

      const errorMsg = isRateLimit
        ? "AI quota temporarily exceeded. Please try again later."
        : "Neural handshake failed. Please check your connection and try again.";

      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      if (!controller.signal.aborted) {
        setIsTyping(false);
        isTypingRef.current = false;
      }
    }
  }, [input, isTyping]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex flex-col h-[75vh] animate-in fade-in duration-700">
      <header className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20">
            <BrainCircuit size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tighter dark:text-white">Neural Mentor</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Core Consciousness Active</span>
            </div>
          </div>
        </div>
      </header>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/30 dark:bg-black/10"
      >
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex gap-6 max-w-4xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'} animate-in slide-in-from-bottom-5`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'}`}>
              {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            <div className={`p-6 rounded-[2rem] border-transparent shadow-sm ${msg.role === 'user' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-slate-900 dark:text-indigo-100' : 'glass dark:text-white'}`}>
              <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-6 max-w-4xl mr-auto animate-pulse">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 text-white shadow-lg">
              <Loader2 size={20} className="animate-spin" />
            </div>
            <div className="p-6 rounded-[2rem] glass dark:text-white">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-indigo-600/50 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-indigo-600/50 animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 rounded-full bg-indigo-600/50 animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
        <div className="max-w-4xl mx-auto flex gap-4">
          <div className="relative flex-1 group">
            <Sparkles className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-600 opacity-50 group-focus-within:opacity-100 transition-opacity" size={20} />
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Query the Neural Oracle..."
              disabled={isTyping}
              className="w-full glass pl-14 pr-8 py-5 rounded-[2rem] border-transparent focus:border-indigo-600 outline-none transition-all font-bold text-sm dark:text-white shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={`p-5 rounded-[2rem] transition-all flex items-center justify-center gap-2 group ${input.trim() && !isTyping ? 'bg-indigo-600 text-white shadow-indigo-500/20 shadow-xl' : 'bg-slate-200 dark:bg-white/5 text-slate-400'}`}
          >
            <span className="hidden sm:inline font-black text-[10px] uppercase tracking-widest ml-2">Broadcast</span>
            <Send size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
        <p className="text-center mt-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Knowledge is generated in real-time. Verify complex data.</p>
      </div>
    </div>
  );
};

export default AIAssistant;

import React, { useState, useEffect, useRef } from 'react';
import { Student, SessionMode, QuizQuestion, RoadmapStep, LearningResource, ChatMessage } from '../types';
import { aiService } from '../services/aiService';
import { learningPathService } from '../services/learningPathService';
import { chatService } from '../services/chatService';
import { Clock, MapPin, MessageSquare, Monitor, Send, Search, Edit3, Zap, Sparkles, BookOpen, Compass, ChevronRight, Star, ShieldCheck, Video, Layout } from 'lucide-react';

interface SessionModuleProps {
  currentUser: Student;
  partner: Student;
  // Use string for skill name as it's the primary identifier and used by AI services
  skill: string;
  onFinish: (score: number) => void;
  onCancel: () => void;
}

const SessionModule: React.FC<SessionModuleProps> = ({ currentUser, partner, skill, onFinish, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'roadmap' | 'resources'>('roadmap');
  const [mode, setMode] = useState<SessionMode | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapStep[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [isLoadingRoadmap, setIsLoadingRoadmap] = useState(false);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [quizTimeLeft, setQuizTimeLeft] = useState(10 * 60);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AbortController — cancels in-flight AI requests when the component unmounts.
  // This makes the component React Strict Mode safe (double-mount/unmount cycle).
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'chat' && currentUser?.uid && partner?.uid) {
      const chatId = chatService.getChatId(currentUser.uid, partner.uid);
      const unsubscribe = chatService.subscribeToMessages(chatId, (fetchedMessages) => {
        setMessages(fetchedMessages);
      });
      return () => unsubscribe();
    }
  }, [activeTab, currentUser?.uid, partner?.uid]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  useEffect(() => {
    let timer: any;
    if (showQuiz && quizTimeLeft > 0) {
      timer = setInterval(() => setQuizTimeLeft(prev => prev - 1), 1000);
    } else if (quizTimeLeft === 0 && showQuiz) {
      onFinish(quizScore);
    }
    return () => clearInterval(timer);
  }, [showQuiz, quizTimeLeft]);

  // Only called when user explicitly clicks "Generate Roadmap"
  const handleGenerateRoadmap = async () => {
    // Guard: prevent concurrent requests (double-click protection)
    if (isLoadingRoadmap) return;
    setIsLoadingRoadmap(true);
    setApiError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let path = await learningPathService.getLearningPath(currentUser!.uid, skill);
      if (!path) {
        path = await learningPathService.generateAndSaveLearningPath(currentUser!.uid, skill, controller.signal);
      }
      
      if (controller.signal.aborted) return;
      if (path && path.roadmapDays && path.roadmapDays.length > 0) {
        // Map persistent RoadmapDays to the UI format expected by SessionModule
        const mappedRoadmap = path.roadmapDays.map(d => ({
          title: `Day ${d.day}: ${d.title}`,
          description: d.learningObjective
        }));
        setRoadmap(mappedRoadmap);
      } else {
        setApiError("Roadmap generation failed. Please try again.");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const msg = err.message?.includes('rate limit')
        ? "⚠️ Rate limit reached (429). Please wait ~60 seconds and try again."
        : "Roadmap generation failed. Please try again.";
      setApiError(msg);
    } finally {
      if (!controller.signal.aborted) setIsLoadingRoadmap(false);
    }
  };

  // Only called when user explicitly clicks "Fetch Resources"
  const handleFetchResources = async () => {
    if (isLoadingResources) return; // Guard: double-click protection
    setIsLoadingResources(true);
    setApiError(null);
    try {
      const res = await aiService.getWebResources(skill);
      setResources(res || []);
    } catch (err) {
      setApiError("Could not fetch resources. Please try again.");
    } finally {
      setIsLoadingResources(false);
    }
  };

  const handleStart = (m: SessionMode) => {
    setMode(m);
    // No automatic API calls — user must click "Generate Roadmap" or "Fetch Resources"
  };

  const handleEndSession = async () => {
    // Guard: prevent double-clicks from firing two quiz generation requests
    if (isLoadingQuiz) return;
    setIsLoadingQuiz(true);
    setApiError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const questions = await aiService.generateQuiz(skill, controller.signal);
      if (controller.signal.aborted) return;
      if (!questions || questions.length === 0) {
        setApiError("Quiz generation returned no questions. Please try again.");
        return;
      }
      setQuizQuestions(questions);
      setShowQuiz(true);
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      const isRateLimit = e.message?.includes('rate limit') || e.message?.includes('429');
      setApiError(
        isRateLimit
          ? "⚠️ Rate limit reached (429). Please wait ~60 seconds and try again."
          : "Quiz generation failed. Please try again."
      );
    } finally {
      if (!controller.signal.aborted) setIsLoadingQuiz(false);
    }
  };

  const handleQuizAnswer = (index: number) => {
    const isCorrect = index === quizQuestions[currentQuizIndex].correctIndex;
    const finalScore = isCorrect ? quizScore + 1 : quizScore;
    setQuizScore(finalScore);

    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
    } else {
      onFinish(finalScore);
    }
  };

  if (showQuiz) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 md:p-12 text-center animate-in zoom-in duration-500 min-h-[600px] bg-slate-50/20 dark:bg-slate-950/20">
        <div className="max-w-xl w-full glass p-8 md:p-14 rounded-[3.5rem] border-white/40 dark:border-white/5 shadow-2xl space-y-10">
          <div className="w-20 h-20 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-xl ring-8 ring-indigo-50 dark:ring-indigo-900/20">
            <ShieldCheck size={36} />
          </div>
          <div>
            <h2 className="text-4xl font-black mb-3 tracking-tight">Sync Complete</h2>
            <p className="text-slate-500 font-medium">Verify knowledge retention for <span className="text-indigo-600 font-bold">{skill}</span>.</p>
          </div>
          
          <div className="flex justify-center items-center gap-3 font-mono text-2xl font-black tracking-tighter text-red-500 animate-pulse bg-red-50 dark:bg-red-500/10 w-fit mx-auto px-6 py-2 rounded-2xl border border-red-100 dark:border-red-500/20">
            <Clock size={20} />
            {Math.floor(quizTimeLeft / 60)}:{String(quizTimeLeft % 60).padStart(2, '0')}
          </div>
          
          <div className="text-left space-y-8">
            <div className="p-8 bg-white dark:bg-white/5 rounded-[2.5rem] border border-slate-100 dark:border-white/10 relative overflow-hidden">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/20 px-3 py-1 rounded-full">Phase {currentQuizIndex + 1} of {quizQuestions.length}</span>
              <p className="font-bold text-xl mt-6 leading-snug dark:text-white">{quizQuestions[currentQuizIndex]?.question}</p>
            </div>
            <div className="grid gap-3">
              {quizQuestions[currentQuizIndex]?.options.map((opt, i) => (
                <button 
                  key={i}
                  onClick={() => handleQuizAnswer(i)}
                  className="w-full text-left p-5 rounded-2xl border-2 border-slate-100 dark:border-white/5 hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all font-black text-base dark:text-slate-200 group flex items-center justify-between"
                >
                  <span>{opt}</span>
                  <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 md:p-16 space-y-12 animate-in slide-in-from-bottom-10 min-h-[700px]">
        <div className="text-center space-y-4">
          <div className="inline-block px-4 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">System Handshake</div>
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-none dark:text-white">Start Sync with <span className="text-indigo-600">{partner.name.split(' ')[0]}</span></h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium text-lg leading-relaxed">Choose your modality for exchange on {skill}.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <button 
            onClick={() => handleStart('F2F')}
            className="neo-card p-10 rounded-[3rem] group flex flex-col items-center gap-6 text-center"
          >
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-[2.2rem] flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
              <MapPin size={40} />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black dark:text-white">Campus Meet</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">Physical hub at {partner.college}</p>
            </div>
            <div className="mt-4 px-5 py-2 glass rounded-full text-[10px] font-black uppercase tracking-widest text-blue-600 border-blue-100">Recommended</div>
          </button>
          
          <button 
            onClick={() => handleStart('ONLINE')}
            className="neo-card p-10 rounded-[3rem] group flex flex-col items-center gap-6 text-center"
          >
            <div className="w-20 h-20 bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 rounded-[2.2rem] flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
              <Video size={40} />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black dark:text-white">Neural Stream</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">Encrypted Video & Code Collab</p>
            </div>
            <div className="mt-4 px-5 py-2 glass rounded-full text-[10px] font-black uppercase tracking-widest text-fuchsia-600 border-fuchsia-100">Instant</div>
          </button>
        </div>
        
        <button onClick={onCancel} className="text-slate-400 font-black uppercase tracking-widest text-[11px] hover:text-red-500 transition-colors py-4 px-8">Abort Link</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-700">
      {/* Session Header */}
      <header className="p-6 md:p-10 flex flex-col lg:flex-row justify-between items-center border-b border-slate-100 dark:border-white/5 gap-8">
        <div className="flex items-center gap-5 w-full lg:w-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl">
            <Zap size={28} />
          </div>
          <div className="min-w-0">
            <h3 className="text-2xl font-black leading-none dark:text-white truncate">{skill}</h3>
            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Linked with {partner.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8 w-full lg:w-auto justify-between lg:justify-end">
          <button 
            onClick={handleEndSession}
            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20"
          >
            End Sync & Take Quiz
          </button>
        </div>
      </header>

      {/* Content Body */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Navigation Rail */}
        <div className="w-full lg:w-28 border-r border-slate-100 dark:border-white/5 flex lg:flex-col items-center justify-around lg:justify-start lg:py-12 p-4 gap-10 bg-slate-50/50 dark:bg-black/10">
          {[
            { id: 'roadmap', icon: Compass, label: 'Goals' },
            { id: 'chat', icon: MessageSquare, label: 'Chat' },
            { id: 'resources', icon: Search, label: 'Docs' }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`p-4 rounded-2xl transition-all flex flex-col items-center gap-2 group ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl scale-110' : 'text-slate-400 hover:text-indigo-600'}`}
              >
                <Icon size={24} />
                <span className="text-[8px] font-black uppercase tracking-widest hidden lg:block">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Workspace Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
          {activeTab === 'roadmap' && (
            <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-right-10 duration-500">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-6">
                <h4 className="text-3xl font-black dark:text-white tracking-tight">AI Curated Roadmap</h4>
                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                  <Sparkles size={12} /> Sync Active
                </div>
              </div>

              {apiError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800 rounded-2xl text-sm font-bold text-center">
                  {apiError}
                </div>
              )}
              
              {isLoadingRoadmap ? (
                <div className="space-y-6">
                  {[1,2,3,4].map(i => <div key={i} className="h-32 w-full bg-slate-50 dark:bg-white/5 animate-pulse rounded-[2.5rem]" />)}
                </div>
              ) : roadmap.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                  <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-[2rem] flex items-center justify-center">
                    <Compass size={36} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black dark:text-white mb-2">No Roadmap Yet</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-xs">Click the button below to generate an AI-curated learning path for <span className="text-indigo-600 font-bold">{skill}</span>.</p>
                  </div>
                  <button
                    onClick={handleGenerateRoadmap}
                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-3"
                  >
                    <Sparkles size={16} /> Generate Roadmap
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {roadmap.map((step, i) => (
                    <div key={i} className="neo-card p-8 rounded-[2.5rem] flex gap-8 items-start group relative">
                       <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-black text-xl tracking-tight mb-2 dark:text-white">{step.title}</h5>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{step.description}</p>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-8 flex justify-center border-t border-slate-100 dark:border-white/5">
                    <button 
                      onClick={handleEndSession}
                      className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-500/30 flex items-center gap-3"
                    >
                      <ShieldCheck size={20} /> Take Quiz
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="h-[60vh] flex flex-col gap-8 animate-in slide-in-from-right-10 duration-500 max-w-4xl mx-auto">
              <div className="flex-1 bg-slate-50/50 dark:bg-white/5 rounded-[3rem] p-6 md:p-10 flex flex-col border-2 border-dashed border-slate-200 dark:border-white/10 overflow-hidden relative">
                 {messages.length === 0 ? (
                   <div className="flex-1 flex flex-col items-center justify-center text-center">
                     <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mb-6 shadow-lg">
                        <Edit3 className="text-indigo-600" size={32} />
                     </div>
                     <h4 className="text-2xl font-black tracking-tight mb-2 dark:text-white">Workspace Collab</h4>
                     <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-sm">Share code snippets and logic diagrams with {partner.name.split(' ')[0]} here. Session history is indexed for the quiz.</p>
                   </div>
                 ) : (
                   <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar flex flex-col">
                     {messages.map((msg) => {
                       const isMine = msg.senderId === currentUser?.uid;
                       return (
                         <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[75%] rounded-2xl px-5 py-3 ${isMine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm shadow-sm'}`}>
                             <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                           </div>
                         </div>
                       );
                     })}
                     <div ref={messagesEndRef} />
                   </div>
                 )}
              </div>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newMessage.trim() || !currentUser?.uid || !partner?.uid) return;
                  const chatId = chatService.getChatId(currentUser.uid, partner.uid);
                  await chatService.sendMessage(chatId, newMessage.trim(), currentUser.uid, [currentUser.uid, partner.uid]);
                  setNewMessage('');
                }} 
                className="flex gap-4"
              >
                <input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 glass px-8 py-5 rounded-[2rem] outline-none border-transparent focus:border-indigo-600 transition-all font-bold text-sm dark:text-white" 
                  placeholder="Broadcast idea..." 
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="bg-indigo-600 p-5 rounded-[2rem] text-white shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Send size={24} />
                </button>
              </form>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-right-10 duration-500 pb-10">
              <div className="flex flex-col gap-2">
                <h4 className="text-3xl font-black dark:text-white tracking-tight">Sync-Grounded Docs</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Verified external links for deep-diving into {skill}.</p>
              </div>
              
              {isLoadingResources ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-50 dark:bg-white/5 animate-pulse rounded-[2.5rem]" />)}
                </div>
              ) : resources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                  <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-[2rem] flex items-center justify-center">
                    <Search size={36} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black dark:text-white mb-2">No Resources Loaded</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-xs">Click below to fetch AI-curated reference links for <span className="text-indigo-600 font-bold">{skill}</span>.</p>
                  </div>
                  <button
                    onClick={handleFetchResources}
                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-3"
                  >
                    <Search size={16} /> Fetch Resources
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {resources.map((res, i) => (
                    <a 
                      key={i} 
                      href={res.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="neo-card p-8 rounded-[2.5rem] hover:bg-indigo-50/50 dark:hover:bg-indigo-600/10 transition-all group flex flex-col"
                    >
                      <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                        <BookOpen size={28} />
                      </div>
                      <h5 className="font-black text-lg leading-tight mb-8 line-clamp-2 dark:text-white">{res.title}</h5>
                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                        <span className="text-[9px] text-indigo-600 font-black uppercase tracking-widest italic">Reference Link</span>
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Rail */}
        <div className="hidden xl:flex w-80 border-l border-slate-100 dark:border-white/5 p-10 flex-col gap-10 bg-slate-50/30">
          <div className="space-y-6">
            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Partner Link</h5>
            <div className="neo-card p-5 rounded-[2rem] flex items-center gap-4 border-transparent shadow-sm">
              <img src={partner.avatar} className="w-12 h-12 rounded-2xl object-cover shadow-md" />
              <div className="min-w-0">
                <p className="font-black text-base dark:text-white truncate">{partner.name}</p>
                <p className="text-[9px] text-indigo-500 font-bold uppercase truncate">{partner.branch}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 flex-1">
             <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Session Vitals</h5>
             <div className="p-6 glass rounded-[2rem] space-y-6 border-transparent">
                <div className="space-y-2">
                   <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                      <span>Sync Depth</span>
                      <span>85%</span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 w-[85%] rounded-full"></div>
                   </div>
                </div>
                <div className="space-y-2">
                   <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                      <span>Connection</span>
                      <span className="text-green-500">Stable</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 text-center">Mentor Rating</h5>
             <div className="flex justify-center gap-1.5">
                {[1,2,3,4,5].map(s => (
                  <button 
                    key={s} 
                    onClick={() => setUserRating(s)}
                    className={`p-2 rounded-lg transition-all ${userRating >= s ? 'text-amber-500 scale-110' : 'text-slate-200 dark:text-slate-800'}`}
                  >
                    <Star size={20} fill={userRating >= s ? "currentColor" : "none"} />
                  </button>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionModule;

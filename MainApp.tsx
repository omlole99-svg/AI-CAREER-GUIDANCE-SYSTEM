import { onAuthStateChanged } from "firebase/auth";
import { auth, rtdb } from "./services/firebase";
import { ref, onDisconnect, set, serverTimestamp as rtdbTimestamp, onValue, push } from "firebase/database";
import { logout } from "./services/authService";
import { apiService } from "./services/apiService";
import { firestoreService } from "./services/firestoreService";
import React, { useState, useEffect } from 'react';
import { streakService } from './services/streakService';
import { activityService } from './services/activityService';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Matching from './components/Matching';
import SessionModule from './components/SessionModule';
import Leaderboard from './components/Leaderboard';
import LearnHub from './components/LearnHub';
import Requests from './components/Requests';
import LoginModal from './components/LoginModal';
import AuthPage from './components/AuthPage';
import VerifyEmailPage from './components/VerifyEmailPage';
import AIAssistant from './components/AIAssistant';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { Student } from './types';
import { Ghost, RefreshCcw, Loader2, Layout, Users, Book, Trophy, MessageSquareCode, User, Zap, Inbox, Bell, Menu, Video, Calendar, MonitorPlay, MessageSquare, StickyNote, FolderOpen, History, Star, UserPlus, Clock, Target } from 'lucide-react';

const isProfileComplete = (profile: Student | null): boolean => {
  if (!profile) return false;
  const hasName = Boolean(profile.name || profile.displayName);
  const hasCollege = Boolean(profile.college?.trim());
  const hasBranch = Boolean(profile.branch?.trim());
  const hasStrongSkills = Array.isArray(profile.strongSkills) && profile.strongSkills.length > 0;
  const hasWeakSkills = Array.isArray(profile.weakSkills) && profile.weakSkills.length > 0;
  return hasName && hasCollege && hasBranch && hasStrongSkills && hasWeakSkills;
};

const MainApp: React.FC<{
  isLoggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
}> = ({ isLoggedIn, onLogin, onLogout }) => {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [user, setUser] = useState<Student | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const [isDark, setIsDark] = useState(localStorage.getItem('skillswap_theme') === 'dark');
  const [activeSession, setActiveSession] = useState<{ partner: Student; skill: string; sessionId?: string } | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setFirebaseUser(authUser);
      if (!authUser) {
        setUser(null);
        setIsInitialized(true);
        setProfileLoading(false);
      } else {
        try {
          const profile = await firestoreService.getUser(authUser.uid);
          setUser(profile);
        } catch (error) {
          setUser(null);
        } finally {
          setIsInitialized(true);
          setProfileLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to Firestore User Profile for real-time updates
  useEffect(() => {
    if (firebaseUser && isInitialized) {
      const unsubscribe = firestoreService.subscribeToUser(firebaseUser.uid, (data) => {
        if (data) {
          setUser(data);
        }
      });
      return () => unsubscribe();
    }
  }, [firebaseUser, isInitialized]);

  // RTDB Presence
  useEffect(() => {
    if (firebaseUser && user) {
      const connectedRef = ref(rtdb, '.info/connected');
      const unsubscribe = onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
          const myConnectionsRef = ref(rtdb, `/presence/${firebaseUser.uid}/connections`);
          const lastOnlineRef = ref(rtdb, `/presence/${firebaseUser.uid}/lastOnline`);
          
          const con = push(myConnectionsRef);
          
          onDisconnect(con).remove().then(() => {
            onDisconnect(lastOnlineRef).set(rtdbTimestamp());
            set(con, true);
          });
        }
      });
      return () => unsubscribe();
    }
  }, [firebaseUser, user]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('skillswap_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('skillswap_theme', 'light');
    }
  }, [isDark]);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSyncing(false);
    triggerNotification("Neural Link Resynchronized.");
  };

  const handleTabChange = (path: string) => {
    navigate(path);
    setActiveSession(null);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartSession = (partner: Student, skill: string, sessionId?: string) => {
    setActiveSession({ partner, skill, sessionId });
    setIsSidebarOpen(false);
    navigate('/workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinishSession = async (quizScore: number) => {
    if (!user || !firebaseUser) return;
    
    let xpGained = 0;
    
    if (quizScore >= 8) {
      xpGained = 500;
    } else if (quizScore >= 5) {
      xpGained = 250;
    } else {
      xpGained = 50;
    }

    const newPoints = (user.points || 0) + xpGained;
    
    let newRank = 'Novice';
    if (newPoints > 5000) newRank = 'Grandmaster';
    else if (newPoints > 2500) newRank = 'Master';
    else if (newPoints > 1000) newRank = 'Scholar';

    const newQuizHistory = [...(user.quizHistory || []), {
      date: new Date().toLocaleDateString(),
      score: quizScore,
      pointsEarned: xpGained
    }];

    await firestoreService.updateUser(firebaseUser.uid, {
      points: newPoints,
      rank: newRank,
      skillReputation: (user.skillReputation || 1) + 0.1,
      sessionsCount: (user.sessionsCount || 0) + 1,
      quizHistory: newQuizHistory
    });

    // Authoritative daily streak increment
    await streakService.recordLearningActivity(firebaseUser.uid, 'session');

    if (activeSession?.sessionId) {
      try {
        await apiService.completeSession(activeSession.sessionId);
        
        // Record Session History 
        // We use the sessionId as the activity ID to guarantee idempotency.
        const sessionActivityId = `session_${activeSession.sessionId}`;
        const partnerName = activeSession.partner ? activeSession.partner.name : 'peer';
        const sessionDesc = `Completed ${activeSession.skill} session with ${partnerName}`;
        
        await activityService.recordActivity(
          firebaseUser.uid,
          sessionActivityId,
          'session',
          `Session Completed`,
          sessionDesc,
          {
            sessionId: activeSession.sessionId,
            partnerUid: activeSession.partner?.uid || '',
            skill: activeSession.skill
          }
        );
        
        // Record Quiz History
        // We append _quiz to guarantee it's unique but tightly coupled to the session.
        const quizActivityId = `quiz_${activeSession.sessionId}`;
        await activityService.recordActivity(
          firebaseUser.uid,
          quizActivityId,
          'quiz',
          `Quiz Completed — ${quizScore}/10`,
          `Verified knowledge in ${activeSession.skill}`,
          {
            sessionId: activeSession.sessionId,
            skill: activeSession.skill
          }
        );
        
        // We use quizScore (0 to 10) to map to a 1 to 5 star rating
        const rating = Math.max(1, Math.min(5, Math.ceil(quizScore / 2)));
        await apiService.createReview(activeSession.sessionId, rating, `Automated review for scoring ${quizScore}/10 on quiz`);
      } catch (err) {
        triggerNotification("Could not sync session to Postgres, but XP was awarded.");
      }
    }

    setActiveSession(null);
    navigate('/dashboard');
    triggerNotification(`Quiz Score: ${quizScore}/10! Gained ${xpGained} XP.`);
  };

  const handleProfileSetup = async (name: string, college: string, branch: string, strongSkills: string[], weakSkills: string[], avatar: string | null, bio: string) => {
    if (!firebaseUser) throw new Error("No authenticated user found.");

    const updatedUser: Partial<Student> = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      name, college, branch, strongSkills, weakSkills, bio,
      profileComplete: true
    };
    
    if (avatar) {
      updatedUser.avatar = avatar;
    }

    if (firebaseUser.email) {
      updatedUser.email = firebaseUser.email;
    }

    if (!user) {
      Object.assign(updatedUser, {
        teachingScore: 0, learningScore: 0, skillReputation: 1,
        points: 0, rank: 'Novice', badges: [], streak: 0,
        completedTopics: [], sessionsCount: 0
      });
    }

    try {
      await Promise.race([
        firestoreService.updateUser(firebaseUser.uid, updatedUser),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Save operation timed out. Please try again.")), 10000))
      ]);
      setUser(prev => ({ ...(prev || {}), ...updatedUser } as Student));
      setIsLoginModalOpen(false);
      triggerNotification(`Hello, ${name.split(' ')[0]}! Neural Link Established.`);
    } catch (err) {
      throw err;
    }
  };

  // ROUTING LOGIC

  // 1. App Loading Screen
  if (!isInitialized || (firebaseUser && profileLoading)) {
    return (
      <div className={`h-screen w-full flex flex-col items-center justify-center p-6 text-center ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-indigo-500 font-black tracking-widest text-xs uppercase animate-pulse">Establishing Connection...</p>
      </div>
    );
  }

  // 2. Not Authenticated -> AuthPage
  if (!firebaseUser) {
    return <AuthPage />;
  }

  // 3. Check Email Verification (only for password auth)
  const isPasswordAuth = firebaseUser.providerData?.some((p: any) => p.providerId === 'password');
  if (isPasswordAuth && !firebaseUser.emailVerified) {
    return (
      <VerifyEmailPage 
        user={firebaseUser} 
        onVerified={() => setFirebaseUser({ ...firebaseUser, emailVerified: true })} 
        onLogout={onLogout} 
      />
    );
  }

  // 4. Profile Incomplete -> Force Profile Setup
  const complete = isProfileComplete(user);
  if (!complete) {
    return (
      <div className={`${isDark ? 'dark bg-slate-950' : 'bg-slate-50'} min-h-screen`}>
        {/* Render a dark background so it's not totally empty behind the modal */}
        <LoginModal 
          isOpen={true} 
          onClose={() => {}} // Cannot close until complete
          onLogin={handleProfileSetup} 
          currentUser={user} 
        />
      </div>
    );
  }

  // 4. Fully Authenticated and Complete -> Dashboard / Main App
  return (
    <div className={`${isDark ? 'text-slate-100 bg-slate-950' : 'text-slate-900 bg-[#f8faff]'} min-h-screen transition-colors duration-500`}>
      
      {notification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top-10 duration-500 pointer-events-none">
          <div className="glass px-6 py-4 rounded-3xl border-indigo-200 dark:border-indigo-500/30 shadow-2xl flex items-center gap-4">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg"><Bell size={14} /></div>
            <span className="text-sm font-black text-indigo-900 dark:text-white">{notification}</span>
          </div>
        </div>
      )}

      <header className="md:hidden sticky top-0 z-40 p-4 bg-inherit/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center justify-between">
          <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm"><Menu size={20} /></button>
          <Link to="/dashboard" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg">
            <Zap size={22} className="text-indigo-600 dark:text-cyan-400 fill-current" />
            <span className="font-black text-xl tracking-tighter">SkillSwap</span>
          </Link>
          <button onClick={() => setIsLoginModalOpen(true)} className="relative group">
            <div className={`w-10 h-10 rounded-2xl object-cover ring-2 ring-indigo-500 transition-transform active:scale-90 flex items-center justify-center bg-slate-800 ${isSyncing ? 'animate-pulse' : ''}`}>
               {user?.avatar || user?.photoURL ? (
                 <img src={user.avatar || user.photoURL} className="w-full h-full rounded-2xl object-cover" />
               ) : (
                 <User size={20} className="text-slate-400" />
               )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
          </button>
        </div>
      </header>

      <div className="flex relative">
        <aside className={`fixed md:sticky top-0 h-screen z-50 transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <Sidebar isDark={isDark} toggleDark={() => setIsDark(!isDark)} onLogout={onLogout} onClose={() => setIsSidebarOpen(false)}/>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="p-4 md:p-8 lg:p-12">
             <div className={`mx-auto w-full glass min-h-[85vh] rounded-[2.5rem] md:rounded-[4rem] border-white/50 dark:border-white/5 shadow-2xl overflow-hidden transition-all relative`}>
               
               {!activeSession && (
                 <div className="absolute top-8 right-8 z-30 hidden md:flex items-center gap-4">
                    <button onClick={handleSync} disabled={isSyncing} className="flex items-center gap-3 px-6 py-4 glass text-slate-900 dark:text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border-indigo-100 dark:border-white/10 hover:border-indigo-600 hover:scale-105 active:scale-95 transition-all shadow-sm">
                      {isSyncing ? <Loader2 size={16} className="animate-spin text-indigo-600" /> : <RefreshCcw size={16} className="text-indigo-600" />}
                      <span>{isSyncing ? 'Syncing...' : 'Neural Sync'}</span>
                    </button>
                    <button onClick={() => setIsLoginModalOpen(true)} className="flex items-center gap-4 px-6 py-4 glass text-slate-900 dark:text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border-indigo-100 dark:border-white/10 hover:border-indigo-600 hover:scale-105 active:scale-95 transition-all shadow-sm">
                      <User size={16} className="text-indigo-600" />
                      <span>Profile</span>
                    </button>
                 </div>
               )}

                {activeSession && location.pathname === '/workspace' ? (
                 <SessionModule currentUser={user!} partner={activeSession.partner} skill={activeSession.skill} onFinish={handleFinishSession} onCancel={() => { setActiveSession(null); navigate('/dashboard'); }} />
               ) : (
                 <div className="pb-24 md:pb-0">
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard onStartSession={handleStartSession} isSyncing={isSyncing} />} />
                      <Route path="/requests" element={<Requests onStartSession={handleStartSession} />} />
                      <Route path="/matches" element={<Matching onStartSession={handleStartSession} />} />
                      <Route path="/learn" element={<LearnHub />} />
                      <Route path="/leaderboard" element={<Leaderboard />} />
                      <Route path="/assistant" element={<AIAssistant />} />
                      <Route path="/sessions" element={
                        <div className="h-[70vh] flex flex-col items-center justify-center text-center p-12 space-y-6">
                          <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-[2.5rem] flex items-center justify-center animate-bounce shadow-xl shadow-indigo-100/50 dark:shadow-none">
                            <Ghost size={40} />
                          </div>
                          <h2 className="text-4xl font-black tracking-tight">Ethereal History</h2>
                          <p className="text-slate-500 max-w-sm font-medium leading-relaxed italic">Your learning journey is being indexed. Complete your first match to see records here.</p>
                          <button onClick={() => handleTabChange('/matches')} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all">Start Matching</button>
                        </div>
                      } />
                      <Route path="/marketplace" element={
                        <div className="flex flex-col items-center justify-start text-center py-8 space-y-12 w-full max-w-6xl mx-auto min-h-[70vh]">
                          <div className="space-y-4">
                            <h2 className="text-6xl md:text-8xl font-black text-slate-100 dark:text-slate-800/50 tracking-tighter uppercase italic select-none">V2 CORE</h2>
                            <div className="space-y-2">
                              <p className="text-indigo-600 font-black tracking-[0.4em] uppercase text-xs">Unlocking Next Quarter</p>
                              <p className="text-slate-400 font-medium text-sm">Exclusive learning assets and badge upgrades.</p>
                            </div>
                          </div>

                          <div className="w-full grid grid-cols-1 xl:grid-cols-5 gap-8 text-left mt-8">
                            {/* SKILLSWAP MEET */}
                            <div className="xl:col-span-3 glass p-6 md:p-10 rounded-[2.5rem] border-white/50 dark:border-white/5 shadow-2xl relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-500">
                              <div className="absolute top-0 right-0 p-6">
                                <span className="px-4 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest rounded-full shadow-sm">Coming Soon</span>
                              </div>
                              
                              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                                <Video size={32} />
                              </div>
                              
                              <h3 className="text-3xl font-black mb-3 tracking-tight">SkillSwap Meet</h3>
                              <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 max-w-xl">Real-time skill exchange sessions designed to make peer learning more interactive and collaborative.</p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex gap-4 items-start">
                                  <div className="mt-1 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-xl"><Clock size={20} /></div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Meet Now</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">Start an instant meeting after the swap is accepted. Both participants must approve before joining.</p>
                                  </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                  <div className="mt-1 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-xl"><Calendar size={20} /></div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Schedule Meet</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">Schedule a session for a future date and time. Includes topic/reason and meeting duration.</p>
                                  </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                  <div className="mt-1 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-xl"><Video size={20} /></div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Video & Voice</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">Real-time video and audio meetings powered by Jitsi for high-quality communication.</p>
                                  </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                  <div className="mt-1 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-xl"><MonitorPlay size={20} /></div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Screen Sharing</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">Share your screen for coding, demonstrations, tutorials, and technical discussions.</p>
                                  </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                  <div className="mt-1 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-xl"><MessageSquare size={20} /></div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">SkillSwap Chat</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">Dedicated chat alongside the meeting for dropping quick snippets and links.</p>
                                  </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                  <div className="mt-1 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-xl"><StickyNote size={20} /></div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Shared Notes</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">Both participants can collaboratively edit notes. Notes automatically save to SkillSwap history.</p>
                                  </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                  <div className="mt-1 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-xl"><FolderOpen size={20} /></div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Shared Resources</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">Easily share useful links, learning materials, and resources during the Meet.</p>
                                  </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                  <div className="mt-1 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-xl"><History size={20} /></div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Meet History</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">Completed meetings are recorded with participants, topic, duration, notes, and resources.</p>
                                  </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                  <div className="mt-1 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-xl"><Star size={20} /></div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Completion & Feedback</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">After the session, show a simple completion state and allow participants to provide quick feedback.</p>
                                  </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                  <div className="mt-1 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-xl"><Bell size={20} /></div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Notifications</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">Notify participants when an approved meeting is starting with a clear "Join Meet" action.</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* GROUP LEARNING */}
                            <div className="xl:col-span-2 glass p-6 md:p-10 rounded-[2.5rem] border-white/50 dark:border-white/5 shadow-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-500 flex flex-col">
                              <div className="absolute top-0 right-0 p-6">
                                <span className="px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest rounded-full shadow-sm">Coming Soon</span>
                              </div>
                              
                              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                                <UserPlus size={32} />
                              </div>
                              
                              <h3 className="text-3xl font-black mb-3 tracking-tight">Group Learning</h3>
                              <p className="text-slate-500 dark:text-slate-400 font-medium mb-10">Invite another SkillSwap member to join your learning session for small-group collaborative exchanges.</p>
                              
                              <div className="grid grid-cols-1 gap-6">
                                <div className="flex gap-4 items-start">
                                  <div className="mt-1 text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-xl"><UserPlus size={20} /></div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Add Member</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">Invite another SkillSwap member to join your learning session.</p>
                                  </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                  <div className="mt-1 text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-xl"><Users size={20} /></div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Permission Controlled</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">The invitation is permission-controlled. Only approved SkillSwap users can enter the private Meet.</p>
                                  </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                  <div className="mt-1 text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-xl"><Target size={20} /></div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Small-Group Focus</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">Optimized for 2-5 participants for maximum learning efficiency and focused discussions.</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-auto pt-10">
                                <div className="w-full py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center bg-white/30 dark:bg-slate-900/30">
                                  <p className="text-xs font-black tracking-widest uppercase text-slate-400">Future Expansion Module</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      } />

                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                 </div>
               )}
              </div>
            </div>
        </main>

        {/* Profile Side Panel (Desktop) / Modal (Mobile) */}
        {user && (
          <LoginModal 
            isOpen={isLoginModalOpen} 
            onClose={() => setIsLoginModalOpen(false)} 
            onLogin={handleProfileSetup} 
            currentUser={user} 
          />
        )}
      </div>

      {!activeSession && (
        <nav className="md:hidden fixed bottom-6 left-6 right-6 z-40 glass px-6 py-4 rounded-[2.5rem] border-white/20 dark:border-white/10 shadow-2xl flex items-center justify-around">
          {[
            { id: 'dashboard', path: '/dashboard', icon: Layout },
            { id: 'requests', path: '/requests', icon: Inbox },
            { id: 'matching', path: '/matches', icon: Users },
            { id: 'learnhub', path: '/learn', icon: Book },
            { id: 'leaderboard', path: '/leaderboard', icon: Trophy },
            { id: 'assistant', path: '/assistant', icon: MessageSquareCode }
          ].map(item => (
            <button key={item.id} onClick={() => handleTabChange(item.path)} className={`p-3 rounded-2xl transition-all ${location.pathname.startsWith(item.path) ? 'bg-indigo-600 text-white shadow-xl scale-110' : 'text-slate-400'}`}><item.icon size={20} /></button>
          ))}
        </nav>
      )}
    </div>
  );
};

export default MainApp;
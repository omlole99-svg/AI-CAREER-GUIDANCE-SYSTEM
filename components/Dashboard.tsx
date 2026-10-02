import React, { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { firestoreService } from '../services/firestoreService';
import { apiService } from '../services/apiService';
import { auth, rtdb } from '../services/firebase';
import { onValue, ref } from 'firebase/database';

import { 
  Award, BookOpen, Star, TrendingUp, Target, Flame, 
  Activity, Sparkles, Clock, Users, BrainCircuit, ArrowRight, Globe, User, MessageSquare, Radio
} from 'lucide-react';
import { Student } from '../types';
import { activityService, ActivityRecord } from '../services/activityService';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  onStartSession?: (partner: Student, skill: string, sessionId?: string) => void;
  isSyncing?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ onStartSession, isSyncing }) => {
  const [user, setUser] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [insight] = useState<string>("Every skill you master today is a node in the network of your future.");
  const [isMounted, setIsMounted] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [liveUsersCount, setLiveUsersCount] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    setIsMounted(true);
    
    // Fetch requests & sessions from Postgres
    const fetchRealData = async () => {
      try {
        const sess = await apiService.getSessions();
        setSessions(sess);
      } catch (e) {
        // Silent
      }
    };

    if (auth.currentUser) {
      fetchRealData();
      const unsubUser = firestoreService.subscribeToUser(auth.currentUser.uid, setUser);
      const unsubUsers = firestoreService.subscribeToUsers((allUsers) => {
        setStudents(allUsers.filter(s => s.uid !== auth.currentUser?.uid));
      });
      
      const unsubActivities = activityService.subscribeToRecentActivities(auth.currentUser.uid, (data) => {
        setActivities(data);
      }, 15);

      const presenceRef = ref(rtdb, 'presence');
      const unsubPresence = onValue(presenceRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          let count = 0;
          Object.keys(data).forEach(uid => {
            const connections = data[uid].connections;
            if (connections && Object.keys(connections).length > 0) {
              count++;
            }
          });
          setLiveUsersCount(count);
        } else {
          setLiveUsersCount(0);
        }
      });

      return () => {
        unsubUser();
        unsubUsers();
        unsubActivities();
        unsubPresence();
      };
    }
  }, []);



  const chartData = useMemo(() => {
    const days: { dateStr: string; name: string; score: number }[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString();
      const shortName = d.toLocaleDateString('en-US', { weekday: 'short' }); 
      
      days.push({
        dateStr,
        name: shortName,
        score: 0
      });
    }

    if (user && user.quizHistory) {
      user.quizHistory.forEach(q => {
        const dayMatch = days.find(d => d.dateStr === q.date);
        if (dayMatch) {
          dayMatch.score += (q.pointsEarned || 0);
        }
      });
    }
    
    return days;
  }, [user]);

  const recommendedMatches = useMemo(() => {
    if (!user || (!user.strongSkills?.length && !user.weakSkills?.length)) return [];
    
    const matches = students
      .filter(s => s.uid !== user.uid)
      .map(s => {
        const matchSkill = (s.strongSkills || []).find(sk => (user.weakSkills || []).includes(sk));
        if (!matchSkill) return null; // Real matches only
        
        const learnerCanTeach = (user.strongSkills || []).find(sk => (s.weakSkills || []).includes(sk));
        
        let score = 0;
        if (matchSkill && learnerCanTeach) {
          score = 90;
        } else if (matchSkill) {
          score = 60;
        }
        
        if (score > 0 && s.college === user.college) score += 10;        
        return { 
          partner: s, 
          matchScore: Math.min(100, score),
          suggestedSkill: matchSkill
        };
      })
      .filter(Boolean) as any[];
      
    return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 4);
  }, [user, students]);

  if (!isMounted || !user) return null;

  const completedTopicsCount = (user.completedTopics || []).length;
  const sessionsCount = user.sessionsCount || 0; // Use authoritative Firestore count for instant realtime updates

  return (
    <div className="p-6 md:p-10 lg:p-16 space-y-12 animate-in fade-in duration-1000">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-indigo-600/10 dark:bg-indigo-500/10 rounded-full w-fit border border-indigo-100 dark:border-indigo-500/20">
            <div className={`w-2 h-2 rounded-full bg-indigo-600 ${isSyncing ? 'animate-bounce' : 'animate-ping'}`}></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-400">
              {isSyncing ? 'Syncing Nodes...' : 'Network Interface Live'}
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-indigo-600 dark:text-cyan-400">
               <div className="w-16 h-16 glass rounded-3xl flex items-center justify-center shadow-xl border-white/50 relative overflow-hidden bg-slate-800">
                  {user.avatar || user.photoURL ? (
                    <img src={user.avatar || user.photoURL || undefined} className={`w-16 h-16 object-cover ${isSyncing ? 'opacity-50' : ''}`} />
                  ) : (
                    <User size={32} className="text-slate-400" />
                  )}
               </div>
               <div className="space-y-1">
                  <span className="text-sm font-black uppercase tracking-widest text-slate-400">Status: {user.rank || 'Unranked'}</span>
                  <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Welcome back, {(user.name || user.displayName || 'User').split(' ')[0]}</h2>
               </div>
            </div>
            <h1 className="text-6xl md:text-8xl font-black font-heading tracking-tighter text-slate-900 dark:text-white leading-[0.85]">
              System <br/>
              <span className="text-indigo-600 dark:text-cyan-400">Overview</span>
            </h1>
          </div>
          <div className="glass p-5 rounded-[2rem] border-transparent max-w-sm">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-bold italic leading-relaxed">
              <Sparkles size={16} className="inline mr-2 text-indigo-500" />
              "{insight}"
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 w-full lg:w-auto">
          <div className="glass p-4 sm:p-6 rounded-[2.5rem] border-orange-100 dark:border-orange-500/20 text-center flex flex-col items-center group hover:scale-105 transition-all">
            <Flame className="text-orange-500 mb-2 group-hover:scale-110 transition-transform" size={32} />
            <div className="text-3xl font-black dark:text-white">{user.streak || 0}</div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Daily Streak</div>
          </div>
          <div className="glass p-4 sm:p-6 rounded-[2.5rem] border-indigo-100 dark:border-indigo-500/20 text-center flex flex-col items-center group hover:scale-105 transition-all">
            <Globe className="text-indigo-600 mb-2 group-hover:scale-110 transition-transform" size={32} />
            <div className="text-3xl font-black dark:text-white">{(user.points || 0) > 0 ? (user.rank || 'Novice') : '--'}</div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Global Rank</div>
          </div>
          <div className="glass p-4 sm:p-6 rounded-[2.5rem] border-green-100 dark:border-green-500/20 text-center flex flex-col items-center group hover:scale-105 transition-all">
            <Radio className="text-green-500 mb-2 group-hover:scale-110 transition-transform animate-pulse" size={32} />
            <div className="text-3xl font-black dark:text-white">{liveUsersCount}</div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Live Users</div>
          </div>
        </div>
      </header>

      {/* Smart Recommendations Section */}
      <section className="space-y-6">
        <div className="flex justify-between items-center px-4">
          <h3 className="text-xl font-black flex items-center gap-3 dark:text-white uppercase tracking-tighter">
            <BrainCircuit className="text-indigo-600" size={24} /> Top Matches for You
          </h3>
          <button onClick={() => navigate('/matches')} className="text-[10px] font-black uppercase text-indigo-600 tracking-widest flex items-center gap-2 group hover:translate-x-1 transition-all">
            See Neural Network <ArrowRight size={14} />
          </button>
        </div>
        <div className="flex overflow-x-auto gap-6 pb-6 custom-scrollbar scroll-smooth px-2">
          {recommendedMatches.length > 0 ? recommendedMatches.map((m, i) => (
            <div key={i} className="neo-card min-w-[300px] p-6 rounded-[2.5rem] flex flex-col gap-6 group hover:border-indigo-600/50 transition-all border-transparent">
              <div className="flex justify-between items-start">
                <div className="relative w-14 h-14 bg-slate-800 rounded-2xl shadow-lg border-2 border-white dark:border-white/10 flex items-center justify-center overflow-hidden">
                  {m.partner.avatar || m.partner.photoURL ? (
                    <img src={m.partner.avatar || m.partner.photoURL || undefined} className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-full text-[9px] font-black text-indigo-600 border border-indigo-100 dark:border-indigo-500/20">
                  {m.matchScore}% Neural Match
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{m.partner.name || m.partner.displayName || 'Anonymous'}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{m.partner.college || 'Unknown College'}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                 <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Expert in</p>
                 <p className="text-xs font-black dark:text-white">{m.suggestedSkill}</p>
              </div>
              <button 
                onClick={() => onStartSession?.(m.partner, m.suggestedSkill)}
                className="w-full py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all hover:bg-indigo-700"
              >
                Instant Sync
              </button>
            </div>
          )) : (
            <div className="w-full p-12 glass rounded-3xl text-center text-slate-500 font-bold">
              No matches yet. Add skills you can teach and skills you want to learn to discover compatible peers.
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Momentum Chart Section */}
        <div className="lg:col-span-8 neo-card p-8 md:p-10 rounded-[3rem] md:rounded-[4rem] flex flex-col min-h-[500px] overflow-visible">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
            <h3 className="text-2xl font-black flex items-center gap-4 dark:text-white">
              <div className="p-4 bg-indigo-500/10 rounded-3xl">
                <TrendingUp className="text-indigo-600" size={24} />
              </div>
              Knowledge Accumulation
            </h3>
            <div className="px-6 py-2.5 glass rounded-2xl border-slate-100 dark:border-white/10 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Rolling 7-Day Matrix
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-[300px] relative">
          <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="rgba(99,102,241,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: '800'}} dy={15} height={40} />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', fontWeight: '900', padding: '20px', background: 'rgba(255,255,255,0.9)' }} />
                <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={6} fillOpacity={1} fill="url(#chartGradient)" animationDuration={3000}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pulse & Activity */}
        <div className="lg:col-span-4 flex flex-col gap-10">
          <div className="glass p-10 rounded-[3.5rem] border-white/20 dark:border-white/5 flex flex-col h-full">
            <h3 className="text-xl font-black mb-10 flex items-center gap-4 dark:text-white">
              <Activity className="text-indigo-600" size={20} /> Neural Activity
            </h3>
            <div className="space-y-10 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[400px]">
              {activities.length === 0 ? (
                <div className="text-center text-slate-500 text-sm mt-10">No recent activity. Connect with someone to get started!</div>
              ) : (
                activities.map((act) => {
                  let Icon = Target;
                  let color = 'text-slate-500';
                  
                  if (act.type === 'chat') { Icon = MessageSquare; color = 'text-blue-500'; }
                  else if (act.type === 'session') { Icon = Users; color = 'text-indigo-500'; }
                  else if (act.type === 'quiz') { Icon = BookOpen; color = 'text-amber-500'; }
                  else if (act.type === 'learning_task') { Icon = Target; color = 'text-green-500'; }

                  const d = new Date(act.timestamp);
                  const now = new Date();
                  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
                  let timeLabel = d.toLocaleDateString();
                  if (diffDays === 0 && d.getDate() === now.getDate()) timeLabel = 'Today';
                  else if (diffDays <= 1 && d.getDate() !== now.getDate()) timeLabel = 'Yesterday';

                  let titleText = act.title;
                  let descriptionText = act.description;

                  if (act.type === 'chat') {
                    const partner = students.find(s => s.uid === act.description);
                    const name = partner ? partner.name.split(' ')[0] : 'peer';
                    titleText = `Chatted with ${name}`;
                    descriptionText = '';
                  }

                  let isClickable = false;
                  let handleClick = () => {};

                  if (act.type === 'chat' && act.metadata?.partnerUid) {
                    isClickable = true;
                    handleClick = () => navigate('/matches', { state: { openChatWith: act.metadata!.partnerUid } });
                  } else if (act.type === 'session') {
                    isClickable = true;
                    handleClick = () => navigate('/sessions');
                  } else if (act.type === 'quiz') {
                    isClickable = true;
                    handleClick = () => navigate('/learn');
                  }

                  return (
                    <div 
                      key={act.id} 
                      onClick={handleClick}
                      className={`flex gap-6 items-start group ${isClickable ? 'cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 p-2 -m-2 rounded-2xl transition-colors' : ''}`}
                    >
                      <div className={`p-3 rounded-2xl bg-white dark:bg-slate-800 ${color} group-hover:scale-110 transition-all shadow-md`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-700 dark:text-slate-200 leading-tight mb-1">{titleText}</p>
                        {descriptionText && <p className="text-[10px] text-slate-500 mb-2 truncate">{descriptionText}</p>}
                        <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1.5"><Clock size={10}/> {timeLabel}</p>
                      </div>
                      {isClickable && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight size={14} className="text-slate-400" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {[
            { label: 'Skills Mastered', val: completedTopicsCount, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
            { label: 'Network Reputation', val: (user.skillReputation || 1).toFixed(1), icon: Award, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
            { label: 'Sessions Completed', val: sessionsCount, icon: Target, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10' },
            { label: 'Mentor Rating', val: user.teachingScore || 0, icon: Star, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-500/10' }
          ].map((s, i) => (
            <div key={i} className="neo-card p-6 sm:p-8 rounded-[3rem] flex items-center gap-4 sm:gap-6 group hover:translate-y-[-5px] transition-all">
              <div className={`p-4 sm:p-6 flex-shrink-0 rounded-[2rem] ${s.bg} ${s.color} group-hover:scale-110 transition-all shadow-inner`}>
                <s.icon size={32} className="sm:w-9 sm:h-9" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-tight">{s.label}</p>
                <p className="text-4xl sm:text-5xl font-black dark:text-white tracking-tighter leading-none truncate">{s.val}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;

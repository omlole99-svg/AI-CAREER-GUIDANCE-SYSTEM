import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Student, Match, SkillCategory } from '../types';
import { SKILL_CATEGORIES, SKILL_MAP } from '../constants';
import { auth, rtdb } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { apiService } from '../services/apiService';
import { onValue, ref } from 'firebase/database';
import ChatDrawer from './ChatDrawer';
import { 
  Heart, Search, Sparkles, Zap, MessageCircle, ArrowUpRight, 
  User, ExternalLink, Filter, Star, GraduationCap, MapPin,
  ChevronRight, BrainCircuit, Users
} from 'lucide-react';

interface MatchingProps {
  onStartSession: (partner: Student, skill: string, sessionId?: string) => void;
}

const Matching: React.FC<MatchingProps> = ({ onStartSession }) => {
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});
  
  const [viewMode, setViewMode] = useState<'recommended' | 'directory'>('recommended');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'All'>('All');
  
  const [chatPartner, setChatPartner] = useState<Student | null>(null);
  const [requestingUid, setRequestingUid] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const state = location.state as any;
    if (state?.openChatWith && students.length > 0) {
      const partner = students.find(s => s.uid === state.openChatWith);
      if (partner) {
        setChatPartner(partner);
        // Clean up the state so it doesn't reopen on refresh
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, students, navigate, location.pathname]);

  const handleRequestSwap = async (partnerUid: string, skillOffered: string, skillWanted: string) => {
    try {
      setRequestingUid(partnerUid);
      await apiService.createSwapRequest(partnerUid, skillOffered, skillWanted);
      alert('Skill Swap Request Sent successfully!');
    } catch (error) {
      alert('Failed to send request. You might have already sent one.');
    } finally {
      setRequestingUid(null);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      return firestoreService.subscribeToUser(auth.currentUser.uid, setCurrentUser);
    }
  }, []);

  useEffect(() => {
    return firestoreService.subscribeToUsers((data) => {
      setStudents(data.filter(s => s.uid !== auth.currentUser?.uid));
    });
  }, []);

  useEffect(() => {
    const presenceRef = ref(rtdb, 'presence');
    return onValue(presenceRef, (snapshot) => {
      const data = snapshot.val();
      const statuses: Record<string, boolean> = {};
      if (data) {
        Object.keys(data).forEach(uid => {
          const connections = data[uid].connections;
          statuses[uid] = connections && Object.keys(connections).length > 0;
        });
      }
      setOnlineStatuses(statuses);
    });
  }, []);

  const matches: Match[] = useMemo(() => {
    if (!currentUser || !currentUser.weakSkills || !currentUser.strongSkills) return [];
    return students.map(s => {
      const teacherCanTeach = (s.strongSkills || []).find(sk => (currentUser.weakSkills || []).includes(sk));
      const learnerCanTeach = (currentUser.strongSkills || []).find(sk => (s.weakSkills || []).includes(sk));
      
      let percentage = 0;
      if (teacherCanTeach && learnerCanTeach) {
        percentage = 90;
      } else if (teacherCanTeach || learnerCanTeach) {
        percentage = 60;
      }
      
      if (percentage > 0 && s.college === currentUser.college) percentage = Math.min(100, percentage + 10);
      return {
        partner: s,
        matchPercentage: percentage,
        mutualStrongSkill: teacherCanTeach || (s.strongSkills || [])[0] || '',
        mutualWeakSkill: learnerCanTeach || (currentUser.strongSkills || [])[0] || ''
      };
    }).sort((a, b) => b.matchPercentage - a.matchPercentage);
  }, [currentUser, students]);

  const filteredData = useMemo(() => {
    const baseList = viewMode === 'recommended' 
      ? matches.filter(m => m.matchPercentage > 0)
      : students.map(s => ({ 
          partner: s, 
          matchPercentage: 0, 
          mutualStrongSkill: (s.strongSkills || [])[0] || '', 
          mutualWeakSkill: '' 
        }));

    return baseList.filter(item => {
      const safeSearchTerm = (searchTerm || '').toLowerCase();
      const matchesSearch = 
        (item.partner.name || '').toLowerCase().includes(safeSearchTerm) ||
        (item.partner.strongSkills || []).some(s => (s || '').toLowerCase().includes(safeSearchTerm)) ||
        (item.partner.college || '').toLowerCase().includes(safeSearchTerm);
      
      let matchesCategory = false;
      if (selectedCategory === 'All') {
        matchesCategory = true;
      } else {
        const allSkills = [
          ...(item.partner.strongSkills || []),
          ...(item.partner.weakSkills || [])
        ];
        
        matchesCategory = allSkills.some(skill => {
          if (!skill) return false;
          const normalized = skill.trim().toLowerCase();
          for (const [mappedSkill, category] of Object.entries(SKILL_MAP)) {
            if (mappedSkill.trim().toLowerCase() === normalized) {
              return category === selectedCategory;
            }
          }
          return false;
        });
      }

      return matchesSearch && matchesCategory;
    });
  }, [viewMode, matches, students, searchTerm, selectedCategory]);

  return (
    <>
      <div className="p-4 md:p-8 lg:p-12 space-y-12 animate-in fade-in duration-700 overflow-visible">
          <header className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-6 flex-1 min-w-[280px]">
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setViewMode('recommended')}
                  className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    viewMode === 'recommended' 
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' 
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  Smart Recommendations
                </button>
                <button 
                  onClick={() => setViewMode('directory')}
                  className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    viewMode === 'directory' 
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' 
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  Peer Directory
                </button>
              </div>

              <div className="space-y-2">
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white leading-[0.9]">
                  {viewMode === 'recommended' ? 'Optimal ' : 'Neural '} 
                  <span className="text-indigo-600 dark:text-cyan-400">Nodes</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-base font-medium max-w-md">
                  {viewMode === 'recommended' 
                    ? "Proprietary algorithm matching your knowledge gaps with expert peers." 
                    : "Browse the entire network of verified student knowledge nodes."}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto xl:min-w-[400px] flex-1">
              <div className="relative group flex-1 min-w-0">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10" size={20} />
                <input 
                  type="text"
                  placeholder="Search expertise, names, or colleges..."
                  className="w-full glass pl-14 pr-6 py-5 rounded-[2rem] border-transparent focus:border-indigo-600 outline-none transition-all font-bold tracking-tight text-slate-900 dark:text-white shadow-xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="glass p-5 rounded-[2rem] text-slate-500 hover:text-indigo-600 transition-all">
                <Filter size={24} />
              </button>
            </div>
          </header>

          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setSelectedCategory('All')}
              className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                selectedCategory === 'All' 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'glass text-slate-500 border-slate-200 dark:border-white/5'
              }`}
            >
              All Domains
            </button>
            {SKILL_CATEGORIES.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                  selectedCategory === cat 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'glass text-slate-500 border-slate-200 dark:border-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid gap-8 pb-32 items-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 320px))', justifyContent: 'start' }}>
            {filteredData.length > 0 ? filteredData.map((item) => {
              const isOnline = item.partner.uid && onlineStatuses[item.partner.uid];
              return (
              <div 
                key={item.partner.id} 
                className="w-full h-fit neo-card rounded-[3rem] p-8 group relative flex flex-col transition-all hover:shadow-[0_20px_60px_-15px_rgba(99,102,241,0.2)]"
              >
                
                <div className="flex justify-between items-start mb-8 gap-4">
                  <div className="flex gap-4 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur-lg opacity-0 group-hover:opacity-20 transition-opacity"></div>
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white dark:border-white/10 shadow-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        {item.partner.avatar ? (
                          <img 
                            src={item.partner.avatar} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <User size={32} className="text-slate-400" />
                        )}
                      </div>
                      {isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full shadow-lg z-10"></div>
                      )}
                      {item.partner.streak > 5 && (
                        <div className="absolute -top-2 -right-2 bg-orange-500 text-white p-1 rounded-full shadow-lg z-10">
                          <Zap size={10} fill="currentColor" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors truncate">
                        {item.partner.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1 min-w-0">
                        <GraduationCap size={12} className="text-slate-400 shrink-0" />
                        <span className="text-[10px] text-slate-500 font-bold truncate">{item.partner.college}</span>
                      </div>
                    </div>
                  </div>

                  {viewMode === 'recommended' && (
                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <div className="text-2xl font-black text-indigo-600 leading-none">{item.matchPercentage}%</div>
                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter mt-1">Match Index</span>
                    </div>
                  )}
                </div>

                <div className="space-y-6 flex-1 mb-8">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-cyan-400 uppercase tracking-widest">
                        <Sparkles size={14} /> Can Teach
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 text-[10px] font-black">
                        <Star size={10} fill="currentColor" /> {item.partner.teachingScore || 0}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(item.partner.strongSkills || []).map(sk => (
                        <span 
                          key={sk} 
                          className={`px-3 py-1.5 rounded-xl text-[9px] font-bold border transition-all ${
                            (currentUser?.weakSkills || []).includes(sk)
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105'
                            : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-white/5'
                          }`}
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2 text-[10px] font-black text-fuchsia-600 dark:text-fuchsia-400 uppercase tracking-widest">
                      <BrainCircuit size={14} /> Wants to Learn
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(item.partner.weakSkills || []).map(sk => (
                        <span 
                          key={sk} 
                          className={`px-3 py-1.5 rounded-xl text-[9px] font-bold border ${
                            (currentUser?.strongSkills || []).includes(sk)
                            ? 'bg-fuchsia-500 text-white border-fuchsia-500'
                            : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-white/5'
                          }`}
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-auto">
                   <button 
                      onClick={() => handleRequestSwap(item.partner.uid, item.mutualWeakSkill || 'Any', item.mutualStrongSkill || 'Any')}
                      disabled={requestingUid === item.partner.uid}
                      className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group/btn disabled:opacity-50"
                    >
                      {requestingUid === item.partner.uid ? 'Sending...' : 'Request Skill Swap'} <ArrowUpRight size={14} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                    </button>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button className="flex items-center justify-center gap-2 py-3 glass rounded-xl text-[9px] font-black uppercase text-slate-500 hover:text-indigo-600 transition-colors">
                        <User size={12} /> Full Profile
                      </button>
                      <button onClick={() => setChatPartner(item.partner)} className="flex items-center justify-center gap-2 py-3 glass rounded-xl text-[9px] font-black uppercase text-slate-500 hover:text-indigo-600 transition-colors">
                        <MessageCircle size={12} /> Message
                      </button>
                    </div>
                </div>
              </div>
              );
            }) : (
              <div className="col-span-full py-40 text-center flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in">
                <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center">
                  <BrainCircuit size={48} className="text-slate-300 dark:text-slate-700" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-400">Zero Connectivity</h3>
                  <p className="text-sm font-medium text-slate-500 max-w-xs mx-auto">The network is currently empty. More peers will appear as they join.</p>
                </div>
                <button 
                  onClick={() => {setSearchTerm(''); setViewMode('directory');}}
                  className="px-8 py-3 bg-indigo-600/10 text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                >
                  Reset Protocols
                </button>
              </div>
            )}
          </div>
        </div>
        <ChatDrawer isOpen={!!chatPartner} onClose={() => setChatPartner(null)} currentUser={currentUser} partner={chatPartner} />
    </>
  );
};

export default Matching;

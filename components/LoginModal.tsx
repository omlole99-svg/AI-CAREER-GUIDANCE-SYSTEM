import React, { useState, useEffect } from 'react';
import { X, User, GraduationCap, BookOpen, UserCircle2, Plus, Trash2, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Student } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (name: string, college: string, branch: string, strongSkills: string[], weakSkills: string[], avatar: string | null, bio: string) => Promise<void>;
  currentUser: Student | null;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin, currentUser }) => {
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [branch, setBranch] = useState('');
  const [bio, setBio] = useState('');
  const [strongSkills, setStrongSkills] = useState<string[]>([]);
  const [weakSkills, setWeakSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [skillType, setSkillType] = useState<'strong' | 'weak'>('strong');
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || currentUser.displayName || '');
      setCollege(currentUser.college || '');
      setBranch(currentUser.branch || '');
      setBio(currentUser.bio || '');
      setStrongSkills(currentUser.strongSkills || currentUser.skillsOffered || []);
      setWeakSkills(currentUser.weakSkills || currentUser.skillsWanted || []);
    } else {
      setName('');
      setCollege('');
      setBranch('');
      setBio('');
      setStrongSkills([]);
      setWeakSkills([]);
    }
    setError(null);
    setIsSaving(false);
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (skillType === 'strong') {
      if (!strongSkills.includes(newSkill)) setStrongSkills([...strongSkills, newSkill]);
    } else {
      if (!weakSkills.includes(newSkill)) setWeakSkills([...weakSkills, newSkill]);
    }
    setNewSkill('');
  };

  const removeSkill = (skill: string, type: 'strong' | 'weak') => {
    if (type === 'strong') setStrongSkills(strongSkills.filter(s => s !== skill));
    else setWeakSkills(weakSkills.filter(s => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Full Name is required.");
      return;
    }
    
    setError(null);
    setIsSaving(true);
    
    try {
      const avatar = currentUser?.photoURL || currentUser?.avatar || null;
      await onLogin(name, college, branch, strongSkills, weakSkills, avatar, bio);
    } catch (err: any) {
      setError(err.message || "An error occurred while saving your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentAvatar = currentUser?.photoURL || currentUser?.avatar || null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      
      {/* Modal Container */}
      <div className={`relative w-full max-w-4xl bg-slate-900/95 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] border border-indigo-500/20 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar text-white transition-all duration-500 delay-100 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-10'}`}>
        {currentUser?.profileComplete && (
          <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-white/5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-10">
            <X size={20} />
          </button>
        )}

        <div className="mb-8 text-center space-y-3">
          <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto flex items-center justify-center text-slate-300 shadow-xl overflow-hidden border-2 border-indigo-500/30">
            {currentAvatar ? (
              <img src={currentAvatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserCircle2 size={40} />
            )}
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white">
            Complete Your Profile
          </h2>
          <p className="text-slate-400 text-sm font-medium">
            Tell us a little about yourself to get better skill matches.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Basic Info */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Full Name *</label>
              <div className="relative group">
                <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input type="text" required minLength={2} maxLength={50} pattern=".*\S+.*" title="Name must be 2-50 characters and cannot be empty spaces" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="w-full bg-white/5 pl-14 pr-6 py-4 rounded-2xl outline-none border border-white/10 focus:border-indigo-500 transition-all font-bold text-white placeholder:text-slate-600" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">College</label>
              <div className="relative group">
                <GraduationCap className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input type="text" maxLength={100} value={college} onChange={(e) => setCollege(e.target.value)} placeholder="e.g. Stanford University" className="w-full bg-white/5 pl-14 pr-6 py-4 rounded-2xl outline-none border border-white/10 focus:border-indigo-500 transition-all font-bold text-white placeholder:text-slate-600" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Branch / Major</label>
              <div className="relative group">
                <BookOpen className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input type="text" maxLength={100} value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. Computer Science" className="w-full bg-white/5 pl-14 pr-6 py-4 rounded-2xl outline-none border border-white/10 focus:border-indigo-500 transition-all font-bold text-white placeholder:text-slate-600" />
              </div>
            </div>
          </div>

          {/* Right Column: Skills */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Bio</label>
              <div className="relative group">
                <FileText className="absolute left-6 top-6 text-slate-400 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <textarea maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." className="w-full bg-white/5 pl-14 pr-6 py-4 rounded-2xl outline-none border border-white/10 focus:border-indigo-500 transition-all font-bold text-white placeholder:text-slate-600 min-h-[100px] resize-none"></textarea>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Skills</label>
              <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
                <button type="button" onClick={() => setSkillType('strong')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${skillType === 'strong' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>I Can Teach</button>
                <button type="button" onClick={() => setSkillType('weak')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${skillType === 'weak' ? 'bg-fuchsia-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>I Want to Learn</button>
              </div>
              
              <div className="relative">
                <input type="text" maxLength={50} value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())} placeholder={`Add skill to ${skillType === 'strong' ? 'teach' : 'learn'}...`} className="w-full bg-white/5 px-6 py-4 rounded-2xl outline-none border border-white/10 focus:border-indigo-500 transition-all font-bold text-sm text-white placeholder:text-slate-600" />
                <button type="button" onClick={handleAddSkill} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Plus size={16} /></button>
              </div>

              <div className="space-y-4 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex flex-wrap gap-2">
                  {strongSkills.map(s => (
                    <span key={s} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg text-[10px] font-black border border-indigo-500/20">
                      {s} <button type="button" onClick={() => removeSkill(s, 'strong')} className="hover:text-red-400"><Trash2 size={10} /></button>
                    </span>
                  ))}
                  {weakSkills.map(s => (
                    <span key={s} className="flex items-center gap-2 px-3 py-1.5 bg-fuchsia-500/10 text-fuchsia-400 rounded-lg text-[10px] font-black border border-fuchsia-500/20">
                      {s} <button type="button" onClick={() => removeSkill(s, 'weak')} className="hover:text-red-400"><Trash2 size={10} /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={isSaving} className="md:col-span-2 w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:hover:scale-100 mt-4">
            {isSaving ? (
              <><Loader2 size={16} className="animate-spin" /> Saving...</>
            ) : (
              <>Save Profile</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;

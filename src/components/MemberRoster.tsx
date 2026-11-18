import React, { useState, useEffect } from 'react';
import { Search, Copy, Check, UserPlus, Crown, Shield, Users, Sparkles, Filter, BookOpen } from 'lucide-react';
import { ClanMember, RegisteredAccount, accountToClanMember, formatTagnameUppercase } from '../data/clanData';
import { realtimeClient, OnlineMemberRecord } from '../utils/realtimeClient';
import { sounds } from '../utils/soundEffects';

interface MemberRosterProps {
  members: ClanMember[];
  onAddMember: (member: ClanMember) => void;
  lang: 'tl' | 'en';
  onlineUsers?: OnlineMemberRecord[];
}

export const MemberRoster: React.FC<MemberRosterProps> = ({
  members: initialMembers,
  onAddMember,
  lang,
  onlineUsers = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'leadership' | 'member'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('𝑴𝒃𝒓');
  const [newRoleTitle, setNewRoleTitle] = useState('Member');
  const [newCategory, setNewCategory] = useState<'leadership' | 'member'>('member');

  // Sync registered accounts to ensure all verified members appear in Libro ng Tatak
  const [registeredAccounts, setRegisteredAccounts] = useState<RegisteredAccount[]>(() => {
    try {
      const saved = localStorage.getItem('zvr_registered_accounts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    realtimeClient.fetchInitialState();
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('zvr_registered_accounts');
        if (saved) setRegisteredAccounts(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener('storage', handleStorage);

    const unsubWs = realtimeClient.onAccountsUpdate((accounts) => {
      setRegisteredAccounts(accounts);
    });

    const unsubInit = realtimeClient.onInit((state) => {
      if (Array.isArray(state.registeredAccounts)) {
        setRegisteredAccounts(state.registeredAccounts);
      }
    });

    return () => {
      window.removeEventListener('storage', handleStorage);
      unsubWs();
      unsubInit();
    };
  }, []);

  // Merge registered accounts with initial members (deduplicated by lowercase tagname)
  const combinedMembers: ClanMember[] = React.useMemo(() => {
    const map = new Map<string, ClanMember>();
    // First load registered accounts (verified via Create Tagname — persisted even offline)
    registeredAccounts.forEach((acc) => {
      map.set(acc.tagname.toLowerCase(), accountToClanMember(acc));
    });
    // Add any initial members passed in
    initialMembers.forEach((m) => {
      const key = m.tagname.toLowerCase();
      if (!map.has(key)) {
        map.set(key, m);
      }
    });
    return Array.from(map.values());
  }, [registeredAccounts, initialMembers]);

  const filteredMembers = combinedMembers.filter((m) => {
    const matchesFilter = filterType === 'all' || m.category === filterType;
    const matchesSearch =
      m.tagname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.roleTitle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleCopy = (id: string, tagname: string) => {
    sounds.playClick();
    navigator.clipboard.writeText(tagname);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    sounds.playSuccess();
    const upperName = newName.trim().toUpperCase();
    const fullTag = `ツ𝐙‧𝐕‧𝐑 ᥫ᭡${newRole}•${upperName}`;

    const newMember: ClanMember = {
      id: 'custom-' + Date.now(),
      tagname: fullTag,
      category: newCategory,
      roleTitle: newRoleTitle,
      displayName: upperName,
      joinedDate: new Date().toLocaleDateString(),
      status: newCategory === 'leadership' ? 'officer' : 'active'
    };

    onAddMember(newMember);
    setNewName('');
    setIsAdding(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-200 to-indigo-200 font-heading flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-300 shrink-0" />
              <span>Libro ng Tatak List FAM ng Z.V.R</span>
            </h2>
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 rounded-full font-bold">
              SHOW FOR ALL
            </span>
          </div>
          <p className="text-xs text-purple-200/70 mt-1">
            {lang === 'tl'
              ? 'Opisyal na aklat at talaan ng lahat ng rehistradong tagname (mananatili kahit offline). I-tap ang "Kopyahin" para ma-copy paste.'
              : 'Official record book of all Z.V.R Officials and Members (remains visible even offline). Tap "Copy" to copy-paste any tagname.'}
          </p>
        </div>

        <button
          onClick={() => {
            sounds.playClick();
            setIsAdding(!isAdding);
          }}
          className="px-3.5 py-2 liquid-glass-card-subtle hover:bg-white/10 text-purple-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border border-white/15"
        >
          <UserPlus className="w-4 h-4" />
          <span>{lang === 'tl' ? 'Magdagdag ng Miyembro' : 'Add New Member'}</span>
        </button>
      </div>

      {/* Add Member Form (Collapsible) */}
      {isAdding && (
        <form
          onSubmit={handleCreateMember}
          className="liquid-glass-panel rounded-3xl p-5 sm:p-6 space-y-4 animate-fade-in shadow-xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>{lang === 'tl' ? 'Magrehistro ng Bagong Tagname' : 'Register New Member Tag'}</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-purple-300/70 hover:text-white cursor-pointer"
            >
              {lang === 'tl' ? 'Kanselahin' : 'Cancel'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-purple-200/80 mb-1">
                {lang === 'tl' ? 'Pangalan / Nickname' : 'Nickname'}
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={lang === 'tl' ? "Hal. 'KENT'" : "e.g. 'KENT'"}
                className="liquid-glass-input w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-200/80 mb-1">
                {lang === 'tl' ? 'Tungkulin / Role' : 'Role'}
              </label>
              <select
                value={newRole}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewRole(val);
                  if (val === '𝑶𝒘𝒏𝒆𝒓') {
                    setNewRoleTitle('Owner');
                    setNewCategory('leadership');
                  } else if (val === '𝑪𝒐-𝒐𝒘𝒏𝒆𝒓') {
                    setNewRoleTitle('Co-Owner');
                    setNewCategory('leadership');
                  } else if (val === '𝑨𝒅𝒎𝒊𝒏') {
                    setNewRoleTitle('Admin');
                    setNewCategory('leadership');
                  } else {
                    setNewRoleTitle('Member');
                    setNewCategory('member');
                  }
                }}
                className="liquid-glass-input w-full rounded-xl px-3 py-2 text-sm text-white outline-none bg-slate-950"
              >
                <option value="𝑴𝒃𝒓">𝑴𝒃𝒓 (Regular Member)</option>
                <option value="𝑨𝒅𝒎𝒊𝒏">𝑨𝒅𝒎𝒊𝒏 (Admin)</option>
                <option value="𝑺-𝑨𝒅𝒎𝒏">𝑺-𝑨𝒅𝒎𝒏 (Sub-Admin)</option>
                <option value="𝑭𝒐𝒖𝒏𝒅𝒆𝒓">𝑭𝒐𝒖𝒏𝒅𝒆𝒓 (Founder)</option>
                <option value="𝑪𝒐-𝒐𝒘𝒏𝒆𝒓">𝑪𝒐-𝒐𝒘𝒏𝒆𝒓 (Co-Owner)</option>
                <option value="𝑶𝒘𝒏𝒆𝒓">𝑶𝒘𝒏𝒆𝒓 (Owner)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-200/80 mb-1">
                {lang === 'tl' ? 'Kategorya' : 'Category'}
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as 'leadership' | 'member')}
                className="liquid-glass-input w-full rounded-xl px-3 py-2 text-sm text-white outline-none bg-slate-950"
              >
                <option value="member">{lang === 'tl' ? 'General Member' : 'General Member'}</option>
                <option value="leadership">{lang === 'tl' ? 'Leadership / Admin' : 'Leadership / Admin'}</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="liquid-glass-btn-primary w-full py-2.5 text-white font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
          >
            {lang === 'tl' ? 'Idagdag sa Roster' : 'Save to Roster'}
          </button>
        </form>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 liquid-glass-card-subtle rounded-2xl p-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-purple-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === 'tl' ? 'Maghanap ng miyembro o tag...' : 'Search members or tags...'}
            className="liquid-glass-input w-full rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-purple-300/40 outline-none transition-colors"
          />
        </div>

        {/* Filter Segmented Buttons */}
        <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => {
              sounds.playClick();
              setFilterType('all');
            }}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-white/20 text-white shadow-sm border border-white/20'
                : 'text-purple-200/70 hover:text-white'
            }`}
          >
            {lang === 'tl' ? 'Lahat' : 'All'} ({combinedMembers.length})
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setFilterType('leadership');
            }}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              filterType === 'leadership'
                ? 'bg-white/20 text-white shadow-sm border border-white/20'
                : 'text-purple-200/70 hover:text-white'
            }`}
          >
            <Crown className="w-3 h-3 text-amber-300" />
            <span>{lang === 'tl' ? 'Admins' : 'Admins'}</span>
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setFilterType('member');
            }}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              filterType === 'member'
                ? 'bg-white/20 text-white shadow-sm border border-white/20'
                : 'text-purple-200/70 hover:text-white'
            }`}
          >
            <Users className="w-3 h-3 text-purple-300" />
            <span>{lang === 'tl' ? 'Miyembro' : 'Members'}</span>
          </button>
        </div>
      </div>

      {/* Members Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredMembers.map((member) => {
          const isCopied = copiedId === member.id;
          const isLeader = member.category === 'leadership';
          const isOnline = onlineUsers.some(
            (u) => u.tagname.trim().toLowerCase() === member.tagname.trim().toLowerCase()
          );

          return (
            <div
              key={member.id}
              className={`liquid-glass-card-subtle rounded-2xl p-4 transition-all duration-200 hover:border-white/30 hover:bg-white/[0.08] ${
                isLeader ? 'border-purple-400/30' : 'border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      isLeader
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                        : 'bg-purple-500/10 border border-purple-400/20 text-purple-300'
                    }`}
                  >
                    {isLeader ? <Crown className="w-4 h-4 text-amber-300" /> : <Shield className="w-4 h-4 text-purple-300" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                      <span>{member.displayName.toUpperCase()}</span>
                      <span className="text-[10px] text-purple-300/70 font-normal">
                        · {member.roleTitle}
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                        isOnline
                          ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-zinc-400'
                      }`}>
                        {isOnline ? '🟢 Online' : '⚫ Offline'}
                      </span>
                    </div>
                    <span className="text-[11px] text-purple-200/60">
                      {isLeader ? 'Z.V.R Officer Council' : lang === 'tl' ? 'Opisyal na Miyembro' : 'Active Z.V.R Member'}
                    </span>
                  </div>
                </div>

                {/* 1-click Copy Button */}
                <button
                  onClick={() => handleCopy(member.id, formatTagnameUppercase(member.tagname))}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-white/10 hover:bg-white/15 text-purple-200 hover:text-white border border-white/15'
                  }`}
                  title={lang === 'tl' ? 'Kopyahin ang opisyal na tagname' : 'Copy official tagname'}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{lang === 'tl' ? 'Kopya!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{lang === 'tl' ? 'Kopyahin' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Tagname preview bar */}
              <div className="mt-2 liquid-glass-input rounded-xl p-2.5 font-mono text-xs text-purple-200 select-all overflow-x-auto whitespace-nowrap">
                {formatTagnameUppercase(member.tagname)}
              </div>
            </div>
          );
        })}
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <p className="text-sm text-slate-400">
            {lang === 'tl'
              ? 'Walang nahanap na miyembro na tugma sa iyong search.'
              : 'No members match your search criteria.'}
          </p>
        </div>
      )}
    </div>
  );
};

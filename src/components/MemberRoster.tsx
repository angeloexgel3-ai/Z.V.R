import React, { useState } from 'react';
import { Search, Copy, Check, UserPlus, Crown, Shield, Users, Sparkles, Filter } from 'lucide-react';
import { ClanMember } from '../data/clanData';
import { sounds } from '../utils/soundEffects';

interface MemberRosterProps {
  members: ClanMember[];
  onAddMember: (member: ClanMember) => void;
  lang: 'tl' | 'en';
}

export const MemberRoster: React.FC<MemberRosterProps> = ({
  members,
  onAddMember,
  lang,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'leadership' | 'member'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('𝑴𝒃𝒓');
  const [newRoleTitle, setNewRoleTitle] = useState('Member');
  const [newCategory, setNewCategory] = useState<'leadership' | 'member'>('member');

  const filteredMembers = members.filter((m) => {
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
    // Convert newName to smallcaps
    const smallCapsMap: Record<string, string> = {
      a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ', i: 'ɪ',
      j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ',
      s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ',
    };
    const smallCapped = newName.toLowerCase().split('').map(ch => smallCapsMap[ch] || ch).join('');
    const fullTag = `ツ𝐙‧𝐕‧𝐑 ᥫ᭡${newRole}•${smallCapped}`;

    const newMember: ClanMember = {
      id: 'custom-' + Date.now(),
      tagname: fullTag,
      category: newCategory,
      roleTitle: newRoleTitle,
      displayName: newName.trim(),
      joinedDate: 'Nov 2026',
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
          <h2 className="text-2xl sm:text-3xl font-black text-white font-heading">
            {lang === 'tl' ? 'Talaan ng mga Miyembro' : 'Official Clan Roster'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'tl'
              ? 'Lahat ng opisyal na miyembro at pamunuan ng Z.V.R'
              : 'Verified roster and hierarchy of Z.V.R Clan'}
          </p>
        </div>

        <button
          onClick={() => {
            sounds.playClick();
            setIsAdding(!isAdding);
          }}
          className="px-3.5 py-2 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>{lang === 'tl' ? 'Magdagdag ng Miyembro' : 'Add New Member'}</span>
        </button>
      </div>

      {/* Add Member Form (Collapsible) */}
      {isAdding && (
        <form
          onSubmit={handleCreateMember}
          className="bg-slate-900 border border-sky-500/30 rounded-2xl p-5 space-y-4 animate-fade-in shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>{lang === 'tl' ? 'Magrehistro ng Bagong Tagname' : 'Register New Member Tag'}</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              {lang === 'tl' ? 'Kanselahin' : 'Cancel'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {lang === 'tl' ? 'Pangalan / Nickname' : 'Nickname'}
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Hal. 'KENT'"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
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
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-400 outline-none"
              >
                <option value="𝑴𝒃𝒓">𝑴𝒃𝒓 (Regular Member)</option>
                <option value="𝑨𝒅𝒎𝒊𝒏">𝑨𝒅𝒎𝒊𝒏 (Clan Admin)</option>
                <option value="𝑺-𝑨𝒅𝒎𝒏">𝑺-𝑨𝒅𝒎𝒏 (Sub-Admin)</option>
                <option value="𝑭𝒐𝒖𝒏𝒅𝒆𝒓">𝑭𝒐𝒖𝒏𝒅𝒆𝒓 (Founder)</option>
                <option value="𝑪𝒐-𝒐𝒘𝒏𝒆𝒓">𝑪𝒐-𝒐𝒘𝒏𝒆𝒓 (Co-Owner)</option>
                <option value="𝑶𝒘𝒏𝒆𝒓">𝑶𝒘𝒏𝒆𝒓 (Owner)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {lang === 'tl' ? 'Kategorya' : 'Category'}
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as 'leadership' | 'member')}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-400 outline-none"
              >
                <option value="member">{lang === 'tl' ? 'General Member' : 'General Member'}</option>
                <option value="leadership">{lang === 'tl' ? 'Leadership / Admin' : 'Leadership / Admin'}</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs sm:text-sm transition-all"
          >
            {lang === 'tl' ? 'Idagdag sa Roster' : 'Save to Roster'}
          </button>
        </form>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === 'tl' ? 'Maghanap ng miyembro o tag...' : 'Search members or tags...'}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-sky-400 outline-none transition-colors"
          />
        </div>

        {/* Filter Segmented Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => {
              sounds.playClick();
              setFilterType('all');
            }}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'all'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'tl' ? 'Lahat' : 'All'} ({members.length})
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setFilterType('leadership');
            }}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              filterType === 'leadership'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crown className="w-3 h-3" />
            <span>{lang === 'tl' ? 'Admins' : 'Admins'}</span>
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setFilterType('member');
            }}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              filterType === 'member'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>{lang === 'tl' ? 'Miyembro' : 'Members'}</span>
          </button>
        </div>
      </div>

      {/* Members Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredMembers.map((member) => {
          const isCopied = copiedId === member.id;
          const isLeader = member.category === 'leadership';

          return (
            <div
              key={member.id}
              className={`bg-slate-900/70 border rounded-2xl p-4 transition-all duration-200 hover:border-sky-500/40 hover:bg-slate-900 ${
                isLeader ? 'border-sky-900/50' : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      isLeader
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                        : 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
                    }`}
                  >
                    {isLeader ? <Crown className="w-4 h-4 text-amber-400" /> : <Shield className="w-4 h-4 text-sky-400" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{member.displayName}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        · {member.roleTitle}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {isLeader ? 'Z.V.R Officer Council' : 'Active Clan Fighter'}
                    </span>
                  </div>
                </div>

                {/* 1-click Copy Button */}
                <button
                  onClick={() => handleCopy(member.id, member.tagname)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 hover:text-white'
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
              <div className="mt-2 bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 font-mono text-xs text-sky-200 select-all overflow-x-auto whitespace-nowrap">
                {member.tagname}
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
              : 'No clan members match your search criteria.'}
          </p>
        </div>
      )}
    </div>
  );
};

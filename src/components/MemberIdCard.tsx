import React, { useState } from 'react';
import { Shield, Sparkles, Copy, Check, QrCode, Award } from 'lucide-react';
import { ClanMember, CLAN_LOGO_URL, CLAN_MOTTO, CLAN_FOUNDED_DATE } from '../data/clanData';
import { sounds } from '../utils/soundEffects';

interface MemberIdCardProps {
  member: ClanMember;
  lang: 'tl' | 'en';
}

export const MemberIdCard: React.FC<MemberIdCardProps> = ({ member, lang }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyTag = () => {
    sounds.playClick();
    navigator.clipboard.writeText(member.tagname);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOfficer = member.category === 'leadership';

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div className="text-center mb-2">
        <h3 className="text-xl font-black text-white font-heading">
          {lang === 'tl' ? 'Digital Clan ID Pass' : 'Digital Clan ID Pass'}
        </h3>
        <p className="text-xs text-purple-400 font-semibold tracking-wider uppercase">
          {CLAN_MOTTO}
        </p>
      </div>

      {/* The Physical-Style Pass Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950/60 to-slate-950 border border-purple-500/40 rounded-3xl p-6 shadow-2xl">
        {/* Holographic accent glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-purple-500/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header of Card */}
        <div className="flex items-center justify-between border-b border-purple-900/50 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-purple-400/50 bg-purple-950/80 shadow-md shrink-0">
              <img
                src={CLAN_LOGO_URL}
                alt="ZVR Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="text-base font-black tracking-wider text-purple-300 font-heading">
                Z.V.R
              </div>
              <div className="text-[9px] uppercase tracking-widest text-purple-300/80 font-mono">
                OFFICIAL CLAN PASS
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              ● VERIFIED
            </span>
          </div>
        </div>

        {/* Member Details */}
        <div className="space-y-4">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
              {lang === 'tl' ? 'Pangalan' : 'Member Name'}
            </span>
            <div className="text-lg font-bold text-white">
              {member.displayName}
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
              {lang === 'tl' ? 'Opisyal na Tagname' : 'Official Tagname'}
            </span>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 font-mono text-xs text-sky-300 break-all select-all">
              {member.tagname}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                {lang === 'tl' ? 'Tungkulin' : 'Role'}
              </span>
              <span className="text-xs font-semibold text-white">
                {member.roleTitle}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                {lang === 'tl' ? 'Kategorya' : 'Division'}
              </span>
              <span className="text-xs font-semibold text-slate-300">
                {isOfficer ? 'High Command' : 'Frontline Fighter'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Card Footer */}
        <div className="mt-6 pt-4 border-t border-purple-900/40 flex items-center justify-between text-[10px] text-purple-300/70 font-mono">
          <span>CODE: ZVR-2025</span>
          <span>EST. 9-15-25 (SEPT 15, 2025)</span>
        </div>
      </div>

      {/* Copy Action */}
      <button
        onClick={handleCopyTag}
        className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        <span>{copied ? (lang === 'tl' ? 'Nakopya ang Tagname!' : 'Tagname Copied!') : (lang === 'tl' ? 'Kopyahin ang Tagname' : 'Copy Tagname')}</span>
      </button>
    </div>
  );
};

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
        <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-200 to-indigo-200 font-heading">
          {lang === 'tl' ? 'Digital Z.V.R ID Pass' : 'Digital Z.V.R ID Pass'}
        </h3>
        <p className="text-xs text-purple-300 font-semibold tracking-wider uppercase">
          {CLAN_MOTTO}
        </p>
      </div>

      {/* The Liquid Glass Pass Card */}
      <div className="relative overflow-hidden liquid-glass-panel rounded-3xl p-6 shadow-2xl">
        {/* Holographic fluid accent glow */}
        <div className="absolute -top-10 -right-10 w-52 h-52 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-2xl pointer-events-none animate-liquid-morph"></div>

        {/* Top Header of Card */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/30 bg-purple-950/80 shadow-md shrink-0">
              <img
                src={CLAN_LOGO_URL}
                alt="ZVR Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="text-base font-black tracking-wider text-purple-200 font-heading">
                Z.V.R
              </div>
              <div className="text-[9px] uppercase tracking-widest text-purple-300/80 font-mono">
                OFFICIAL Z.V.R PASS
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-emerald-300 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30">
              ● VERIFIED
            </span>
          </div>
        </div>

        {/* Member Details */}
        <div className="space-y-4 relative z-10">
          <div>
            <span className="text-[10px] text-purple-200/70 uppercase tracking-wider block mb-0.5">
              {lang === 'tl' ? 'Pangalan' : 'Member Name'}
            </span>
            <div className="text-lg font-bold text-white">
              {member.displayName}
            </div>
          </div>

          <div>
            <span className="text-[10px] text-purple-200/70 uppercase tracking-wider block mb-0.5">
              {lang === 'tl' ? 'Opisyal na Tagname' : 'Official Tagname'}
            </span>
            <div className="liquid-glass-input rounded-xl p-2.5 font-mono text-xs text-purple-200 break-all select-all">
              {member.tagname}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="liquid-glass-card-subtle rounded-xl p-2.5">
              <span className="text-[10px] text-purple-300/70 uppercase tracking-wider block">
                {lang === 'tl' ? 'Tungkulin' : 'Role'}
              </span>
              <span className="text-xs font-semibold text-white">
                {member.roleTitle}
              </span>
            </div>

            <div className="liquid-glass-card-subtle rounded-xl p-2.5">
              <span className="text-[10px] text-purple-300/70 uppercase tracking-wider block">
                {lang === 'tl' ? 'Kategorya' : 'Division'}
              </span>
              <span className="text-xs font-semibold text-purple-200">
                {isOfficer ? 'High Command' : 'Frontline Fighter'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Card Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-purple-200/60 font-mono relative z-10">
          <span>CODE: ZVR-2025</span>
          <span>EST. 9-15-25 (SEPT 15, 2025)</span>
        </div>
      </div>

      {/* Copy Action */}
      <button
        onClick={handleCopyTag}
        className="liquid-glass-card-subtle hover:bg-white/10 border border-white/15 w-full py-2.5 px-4 text-purple-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        <span>{copied ? (lang === 'tl' ? 'Nakopya ang Tagname!' : 'Tagname Copied!') : (lang === 'tl' ? 'Kopyahin ang Tagname' : 'Copy Tagname')}</span>
      </button>
    </div>
  );
};

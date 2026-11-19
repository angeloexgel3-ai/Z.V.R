import React, { useState, useEffect } from 'react';
import { CheckCircle2, MessageCircle, Copy, Check, ExternalLink, ShieldCheck, ArrowRight, Sparkles, UserCheck, Settings, Flag } from 'lucide-react';
import { ClanMember, CLAN_FB_PROFILE_LINK, CLAN_LOGO_URL, CLAN_MOTTO, formatTagnameUppercase, isOfficialMember } from '../data/clanData';
import { sounds } from '../utils/soundEffects';

interface VerifiedScreenProps {
  member: ClanMember;
  onExploreClan: () => void;
  onEnterRoom: () => void;
  onOpenSettings?: () => void;
  onOpenReport?: () => void;
  lang: 'tl' | 'en';
}

export const VerifiedScreen: React.FC<VerifiedScreenProps> = ({
  member,
  onExploreClan,
  onEnterRoom,
  onOpenSettings,
  onOpenReport,
  lang,
}) => {
  const [copiedTag, setCopiedTag] = useState(false);
  const isOfficial = isOfficialMember(member);

  const handleCopyTag = () => {
    sounds.playClick();
    navigator.clipboard.writeText(member.tagname);
    setCopiedTag(true);
    setTimeout(() => setCopiedTag(false), 2000);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="liquid-glass-panel rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden">
        {/* Specular Liquid Rim Top Light */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-56 h-12 bg-white/20 rounded-full blur-xl pointer-events-none"></div>

        {/* Verification Emblem with Clan Logo */}
        <div className="relative inline-block mx-auto mb-4 relative z-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-white/30 shadow-[0_0_24px_rgba(168,85,247,0.35)] bg-purple-950/80 mx-auto">
            <img
              src={CLAN_LOGO_URL}
              alt="Z.V.R Official Logo"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-white shadow-md">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-200 to-indigo-200 font-heading relative z-10">
          {lang === 'tl' ? 'Matagumpay na Naberipika!' : 'Successfully Verified!'}
        </h2>
        <p className="text-xs font-semibold text-purple-300 mt-1 uppercase tracking-wider relative z-10">
          {CLAN_MOTTO}
        </p>
        <p className="text-xs text-purple-200/60 mt-0.5 mb-6 relative z-10">
          {lang === 'tl'
            ? 'Maligayang pagdating sa Z.V.R Gateway.'
            : 'Welcome to the Z.V.R Gateway.'}
        </p>

        {/* Member Profile Snapshot Card with Liquid Glass subtle well */}
        <div className="liquid-glass-card-subtle rounded-2xl p-4 text-left mb-6 relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
              {member.roleTitle} · {member.category === 'leadership' ? (lang === 'tl' ? 'Pamunuan ng Z.V.R' : 'Z.V.R Leadership') : (lang === 'tl' ? 'Aktibong Miyembro' : 'Active Member')}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              VERIFIED
            </span>
          </div>

          <div className="font-mono text-sm sm:text-base text-white break-all liquid-glass-input rounded-xl p-3 flex items-center justify-between gap-2">
            <span className="select-all font-semibold">{formatTagnameUppercase(member.tagname)}</span>
            <button
              onClick={handleCopyTag}
              className="p-1.5 text-purple-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors shrink-0 cursor-pointer"
              title={lang === 'tl' ? 'Kopyahin ang tagname' : 'Copy tagname'}
            >
              {copiedTag ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          {copiedTag && (
            <p className="text-[10px] text-emerald-400 mt-1.5 text-right font-medium">
              {lang === 'tl' ? 'Nakopya ang tagname!' : 'Tagname copied!'}
            </p>
          )}
        </div>

        {/* Helpful Opening Prompt */}
        <div className="mb-4 p-3 bg-purple-500/10 border border-purple-400/20 backdrop-blur-md rounded-xl text-xs text-purple-200 relative z-10">
          <p className="font-semibold text-purple-200">
            {lang === 'tl'
              ? 'Napatunayan ang iyong opisyal na Z.V.R Tagname! Pumasok na sa sariling Room GC:'
              : 'Official Z.V.R Tagname verified! Enter the private Room GC:'}
          </p>
        </div>

        {/* Direct Action Buttons */}
        <div className="space-y-3 relative z-10">
          <button
            onClick={() => {
              sounds.playClick();
              onEnterRoom();
            }}
            className="liquid-glass-btn-primary w-full py-4 px-4 text-white font-black rounded-xl text-base tracking-wide transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
          >
            <MessageCircle className="w-5 h-5 text-purple-200" />
            <span>{lang === 'tl' ? 'PUMASOK SA ROOM GC' : 'ENTER ROOM GC'}</span>
            <ArrowRight className="w-4 h-4 ml-0.5 opacity-90" />
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={CLAN_FB_PROFILE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sounds.playClick()}
              className="py-2.5 px-3 bg-white/10 hover:bg-white/15 text-purple-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-white/15"
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-300" />
              <span>{lang === 'tl' ? 'Opisyal na FB Profile' : 'Official FB Profile'}</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>

            <button
              onClick={() => {
                sounds.playClick();
                onExploreClan();
              }}
              className="py-2.5 px-3 bg-white/10 hover:bg-white/15 text-purple-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-white/15 cursor-pointer"
            >
              <span>{lang === 'tl' ? 'Talaan ng Miyembro' : 'Member Roster'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onOpenSettings();
              }}
              className="w-full py-2.5 px-3 bg-purple-500/15 hover:bg-purple-500/25 text-purple-100 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-purple-400/30 cursor-pointer min-h-[42px]"
            >
              <Settings className="w-4 h-4 text-purple-300" />
              <span>{lang === 'tl' ? 'Settings · Mga Opsyon' : 'Settings · Preferences'}</span>
            </button>
          )}

          {isOfficial && onOpenReport && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onOpenReport();
              }}
              className="w-full py-2.5 px-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-rose-400/35 cursor-pointer min-h-[42px]"
            >
              <Flag className="w-4 h-4 text-rose-300" />
              <span>Report Room (Officials Only)</span>
            </button>
          )}
        </div>

        {/* Helpful Tip */}
        <p className="text-[11px] text-purple-200/50 mt-5 pt-4 border-t border-white/10 relative z-10">
          {lang === 'tl'
            ? 'Paalala: Huwag kalimutang sumali sa TikTok group at gamitin ang iyong opisyal na tagname.'
            : 'Reminder: Remember to join the TikTok group and use your verified Z.V.R tagname.'}
        </p>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { CheckCircle2, MessageCircle, Copy, Check, ExternalLink, ShieldCheck, ArrowRight, Sparkles, UserCheck, Music2 } from 'lucide-react';
import { ClanMember, TIKTOK_GROUP_LINK, CLAN_FB_PROFILE_LINK, CLAN_LOGO_URL, CLAN_MOTTO } from '../data/clanData';
import { sounds } from '../utils/soundEffects';

interface VerifiedScreenProps {
  member: ClanMember;
  onExploreClan: () => void;
  lang: 'tl' | 'en';
}

export const VerifiedScreen: React.FC<VerifiedScreenProps> = ({
  member,
  onExploreClan,
  lang,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTag, setCopiedTag] = useState(false);

  const handleCopyLink = () => {
    sounds.playClick();
    navigator.clipboard.writeText(TIKTOK_GROUP_LINK);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyTag = () => {
    sounds.playClick();
    navigator.clipboard.writeText(member.tagname);
    setCopiedTag(true);
    setTimeout(() => setCopiedTag(false), 2000);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-slate-900/90 border border-purple-900/40 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
        {/* Verification Emblem with Clan Logo */}
        <div className="relative inline-block mx-auto mb-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-purple-400/60 shadow-[0_0_24px_rgba(168,85,247,0.35)] bg-purple-950/80 mx-auto">
            <img
              src={CLAN_LOGO_URL}
              alt="Z.V.R Official Clan Logo"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-white shadow-md">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white font-heading">
          {lang === 'tl' ? 'Matagumpay na Naberipika!' : 'Successfully Verified!'}
        </h2>
        <p className="text-xs font-semibold text-purple-400 mt-1 uppercase tracking-wider">
          {CLAN_MOTTO}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 mb-6">
          {lang === 'tl'
            ? 'Maligayang pagdating sa Z.V.R Clan Gateway.'
            : 'Welcome to the Z.V.R Clan Gateway.'}
        </p>

        {/* Member Profile Snapshot Card */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-left mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
              {member.roleTitle} · {member.category === 'leadership' ? 'Clan Leadership' : 'Active Member'}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              VERIFIED
            </span>
          </div>

          <div className="font-mono text-sm sm:text-base text-white break-all bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-2">
            <span className="select-all font-semibold">{member.tagname}</span>
            <button
              onClick={handleCopyTag}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors shrink-0"
              title="Kopyahin ang tagname"
            >
              {copiedTag ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          {copiedTag && (
            <p className="text-[10px] text-emerald-400 mt-1 text-right">
              {lang === 'tl' ? 'Nakopya ang tagname!' : 'Tagname copied!'}
            </p>
          )}
        </div>

        {/* Helpful Opening Prompt */}
        <div className="mb-4 p-3 bg-purple-950/30 border border-purple-900/40 rounded-xl text-xs text-purple-200">
          <p className="font-semibold text-purple-300">
            {lang === 'tl'
              ? 'Pindutin ang button sa ibaba para direktang magtungo sa TikTok Group:'
              : 'Tap the button below to directly open the TikTok Group:'}
          </p>
        </div>

        {/* Direct Action Buttons */}
        <div className="space-y-3">
          <a
            href={TIKTOK_GROUP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sounds.playClick()}
            className="w-full py-4 px-4 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:from-purple-700 active:to-indigo-700 text-white font-black rounded-xl text-base tracking-wide transition-all shadow-xl shadow-purple-600/35 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
          >
            <Music2 className="w-5 h-5 text-pink-300" />
            <span>{lang === 'tl' ? 'BUKSAN ANG TIKTOK GROUP' : 'OPEN TIKTOK GROUP'}</span>
            <ExternalLink className="w-4 h-4 ml-0.5 opacity-90" />
          </a>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleCopyLink}
              className="py-2.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="truncate">{copiedLink ? (lang === 'tl' ? 'Kopya!' : 'Copied!') : (lang === 'tl' ? 'Kopyahin' : 'Copy Link')}</span>
            </button>

            <a
              href={CLAN_FB_PROFILE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sounds.playClick()}
              className="py-2.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-purple-900/40"
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>FB Profile</span>
            </a>

            <button
              onClick={() => {
                sounds.playClick();
                onExploreClan();
              }}
              className="py-2.5 px-2 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors border border-slate-700/60"
            >
              <span>Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Helpful Tip */}
        <p className="text-[11px] text-slate-500 mt-5 pt-4 border-t border-slate-800/80">
          {lang === 'tl'
            ? 'Paalala: Huwag kalimutang sumali sa TikTok group at gamitin ang iyong opisyal na tagname.'
            : 'Reminder: Remember to join the TikTok group and use your verified clan tagname.'}
        </p>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { CheckCircle2, MessageCircle, Copy, Check, ExternalLink, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { ClanMember, MESSENGER_GC_LINK } from '../data/clanData';
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
  const [countdown, setCountdown] = useState<number>(4);
  const [autoRedirectPaused, setAutoRedirectPaused] = useState<boolean>(false);

  useEffect(() => {
    // Attempt open or countdown
    if (autoRedirectPaused) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(c => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Trigger redirect/open
      try {
        window.open(MESSENGER_GC_LINK, '_blank', 'noopener,noreferrer');
      } catch {
        // Safe fail
      }
    }
  }, [countdown, autoRedirectPaused]);

  const handleCopyLink = () => {
    sounds.playClick();
    navigator.clipboard.writeText(MESSENGER_GC_LINK);
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
        {/* Verification Badge */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-4 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
          <ShieldCheck className="w-9 h-9" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white font-heading">
          {lang === 'tl' ? 'Matagumpay na Naberipika!' : 'Successfully Verified!'}
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          {lang === 'tl'
            ? 'Maligayang pagdating sa Z.V.R Clan Portal.'
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

        {/* Countdown Indicator */}
        {!autoRedirectPaused && countdown > 0 ? (
          <div className="mb-4 text-xs text-slate-400 flex items-center justify-center gap-2">
            <span>
              {lang === 'tl' ? 'Awtomatikong magbubukas ang Messenger sa' : 'Redirecting to Messenger in'}{' '}
              <strong className="text-sky-400 font-mono text-sm">{countdown}s</strong>...
            </span>
            <button
              onClick={() => {
                sounds.playClick();
                setAutoRedirectPaused(true);
              }}
              className="text-[11px] text-slate-400 hover:text-slate-200 underline"
            >
              {lang === 'tl' ? 'I-pause' : 'Pause'}
            </button>
          </div>
        ) : null}

        {/* Direct Action Buttons */}
        <div className="space-y-3">
          <a
            href={MESSENGER_GC_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sounds.playClick()}
            className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold rounded-xl text-sm sm:text-base tracking-wide transition-all shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{lang === 'tl' ? 'Pumunta sa Messenger GC' : 'Open Messenger GC Now'}</span>
            <ExternalLink className="w-4 h-4 ml-0.5 opacity-80" />
          </a>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleCopyLink}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? (lang === 'tl' ? 'Nakopya!' : 'Copied!') : (lang === 'tl' ? 'Kopyahin Link' : 'Copy GC Link')}</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onExploreClan();
              }}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
            >
              <span>{lang === 'tl' ? 'Clan Hub' : 'Clan Hub'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Helpful Tip */}
        <p className="text-[11px] text-slate-500 mt-5 pt-4 border-t border-slate-800/80">
          {lang === 'tl'
            ? 'Paalala: Huwag kalimutang i-set ang iyong Messenger nickname gamit ang iyong opisyal na tagname.'
            : 'Reminder: Remember to set your Messenger nickname using your verified tagname.'}
        </p>
      </div>
    </div>
  );
};

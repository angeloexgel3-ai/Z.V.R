import React from 'react';
import { ShieldCheck, HeartHandshake, Bell, Lock, MessageCircle, ExternalLink } from 'lucide-react';
import { CLAN_RULES, MESSENGER_GC_LINK } from '../data/clanData';
import { sounds } from '../utils/soundEffects';

interface ClanRulesProps {
  lang: 'tl' | 'en';
}

export const ClanRules: React.FC<ClanRulesProps> = ({ lang }) => {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white font-heading flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-sky-400" />
          <span>{lang === 'tl' ? 'Alituntunin at Regulasyon ng Clan' : 'Clan Rules & Guidelines'}</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {lang === 'tl'
            ? 'Mahalagang gabay para sa lahat ng opisyal na miyembro ng Z.V.R'
            : 'Essential code of conduct for all verified Z.V.R Clan members'}
        </p>
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        {CLAN_RULES.map((rule, idx) => (
          <div
            key={idx}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 transition-all hover:border-slate-700"
          >
            <div className="flex items-start gap-3.5">
              <span className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                0{idx + 1}
              </span>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  {rule.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {rule.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Messenger GC Invitation Banner */}
      <div className="bg-gradient-to-r from-sky-950/60 to-slate-900 border border-sky-800/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-bold text-white mb-1">
            {lang === 'tl' ? 'Sumali sa Opisyal na Messenger GC' : 'Join the Official Messenger GC'}
          </h4>
          <p className="text-xs text-slate-400">
            {lang === 'tl'
              ? 'Tambayan, update sa games, at clan announcements araw-araw.'
              : 'Community chats, scrim schedules, and daily announcements.'}
          </p>
        </div>

        <a
          href={MESSENGER_GC_LINK}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => sounds.playClick()}
          className="w-full sm:w-auto px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shrink-0 shadow-lg shadow-sky-600/20"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{lang === 'tl' ? 'Pumunta sa GC' : 'Open GC'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};

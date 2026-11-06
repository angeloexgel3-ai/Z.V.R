import React from 'react';
import { ShieldCheck, HeartHandshake, Bell, Lock, MessageCircle, ExternalLink, Sparkles, Award, Music2 } from 'lucide-react';
import { CLAN_RULES, TIKTOK_GROUP_LINK, CLAN_FB_PROFILE_LINK, CLAN_LOGO_URL, CLAN_MOTTO, CLAN_FOUNDED_DATE } from '../data/clanData';
import { sounds } from '../utils/soundEffects';

interface ClanRulesProps {
  lang: 'tl' | 'en';
}

export const ClanRules: React.FC<ClanRulesProps> = ({ lang }) => {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Clan Crest Spotlight Card */}
      <div className="bg-gradient-to-br from-purple-950/70 via-slate-900 to-slate-950 border border-purple-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
        <div className="relative shrink-0 group">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-3xl blur-md opacity-60 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-purple-400 shadow-2xl bg-purple-950">
            <img
              src={CLAN_LOGO_URL}
              alt="Z.V.R Official Clan Crest"
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="space-y-2 flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] font-mono">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>OPISYAL NA SAGISAG · EST. {CLAN_FOUNDED_DATE}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-heading">
            Z.V.R — {CLAN_MOTTO}
          </h2>
          <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed">
            {lang === 'tl'
              ? 'Ang korona, mga pakpak, at lilang rosas ay sumisimbolo sa dangal, kadakilaan, at walang kapantay na pagkakaisa ng pamilyang Z.V.R.'
              : 'The crown, silver wings, and purple roses symbolize honor, ambition, and the unbreakable bond of the Z.V.R brotherhood.'}
          </p>

          <div className="grid grid-cols-3 gap-2 pt-2 text-xs font-semibold">
            <div className="bg-slate-950/60 border border-purple-900/40 rounded-xl p-2 text-center">
              <span className="text-purple-400 block font-bold">Z</span>
              <span className="text-slate-300 text-[11px]">Zeal</span>
            </div>
            <div className="bg-slate-950/60 border border-purple-900/40 rounded-xl p-2 text-center">
              <span className="text-purple-400 block font-bold">V</span>
              <span className="text-slate-300 text-[11px]">Victory</span>
            </div>
            <div className="bg-slate-950/60 border border-purple-900/40 rounded-xl p-2 text-center">
              <span className="text-purple-400 block font-bold">R</span>
              <span className="text-slate-300 text-[11px]">Respect</span>
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div>
        <h3 className="text-xl sm:text-2xl font-black text-white font-heading flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-400" />
          <span>{lang === 'tl' ? 'Alituntunin at Regulasyon ng Clan' : 'Clan Rules & Guidelines'}</span>
        </h3>
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

      {/* Messenger GC & Facebook Invitation Banner */}
      <div className="bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-950 border border-purple-800/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-bold text-white mb-1">
            {lang === 'tl' ? 'Sumali sa Opisyal na Komunidad' : 'Join the Official Community'}
          </h4>
          <p className="text-xs text-slate-400">
            {lang === 'tl'
              ? 'Tambayan, update sa games, clan announcements, at Facebook profile ng pamunuan.'
              : 'Community chats, scrim schedules, and official Facebook clan leadership page.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          <a
            href={CLAN_FB_PROFILE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sounds.playClick()}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-purple-900/50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0"
          >
            <span>FB Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <a
            href={TIKTOK_GROUP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sounds.playClick()}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 shadow-lg shadow-purple-600/25"
          >
            <Music2 className="w-4 h-4 text-pink-200" />
            <span>{lang === 'tl' ? 'Pumunta sa TikTok Group' : 'Open TikTok Group'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

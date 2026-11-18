import React from 'react';
import { ShieldCheck, HeartHandshake, Bell, Lock, MessageCircle, ExternalLink, Sparkles, Award } from 'lucide-react';
import { CLAN_RULES, CLAN_FB_PROFILE_LINK, CLAN_LOGO_URL, CLAN_MOTTO, CLAN_FOUNDED_DATE } from '../data/clanData';
import { sounds } from '../utils/soundEffects';

interface ClanRulesProps {
  lang: 'tl' | 'en';
}

export const ClanRules: React.FC<ClanRulesProps> = ({ lang }) => {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Clan Crest Spotlight Card */}
      <div className="liquid-glass-panel rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left relative overflow-hidden">
        {/* Specular top sheen */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-12 bg-white/20 rounded-full blur-xl pointer-events-none"></div>

        <div className="relative shrink-0 group relative z-10">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 rounded-3xl blur-md opacity-70 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border border-white/30 shadow-2xl bg-purple-950">
            <img
              src={CLAN_LOGO_URL}
              alt="Z.V.R Official Crest"
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="space-y-2 flex-1 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-purple-200 text-[11px] font-mono">
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>{lang === 'tl' ? `OPISYAL NA SAGISAG · EST. ${CLAN_FOUNDED_DATE}` : `OFFICIAL CREST · EST. ${CLAN_FOUNDED_DATE}`}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-200 to-indigo-200 font-heading">
            Z.V.R — {CLAN_MOTTO}
          </h2>
          <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed">
            {lang === 'tl'
              ? 'Ang korona, mga pakpak, at lilang rosas ay sumisimbolo sa dangal, kadakilaan, at walang kapantay na pagkakaisa ng pamilyang Z.V.R.'
              : 'The crown, silver wings, and purple roses symbolize honor, ambition, and the unbreakable bond of the Z.V.R brotherhood.'}
          </p>

          <div className="grid grid-cols-3 gap-2 pt-2 text-xs font-semibold">
            <div className="liquid-glass-card-subtle rounded-xl p-2.5 text-center">
              <span className="text-purple-300 block font-bold text-sm">Z</span>
              <span className="text-purple-200/80 text-[11px]">Zeal</span>
            </div>
            <div className="liquid-glass-card-subtle rounded-xl p-2.5 text-center">
              <span className="text-purple-300 block font-bold text-sm">V</span>
              <span className="text-purple-200/80 text-[11px]">Victory</span>
            </div>
            <div className="liquid-glass-card-subtle rounded-xl p-2.5 text-center">
              <span className="text-purple-300 block font-bold text-sm">R</span>
              <span className="text-purple-200/80 text-[11px]">Respect</span>
            </div>
          </div>
        </div>
      </div>

      {/* Z.V.R VISION & MISSION SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* VISION CARD */}
        <div className="liquid-glass-panel rounded-3xl p-5 sm:p-6 border border-purple-400/40 relative overflow-hidden shadow-xl">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-sm">
              <Sparkles className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-purple-300 uppercase tracking-widest font-bold">
                {lang === 'tl' ? 'OPISYAL NA PANANAW' : 'OFFICIAL VISION'}
              </span>
              <h3 className="text-lg font-black text-white font-heading">
                {lang === 'tl' ? 'Ang Aming VISION' : 'Our VISION'}
              </h3>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-purple-100/90 leading-relaxed">
            {lang === 'tl'
              ? 'Isang marangal, matatag, at nagkakaisang pamilya na nagtutulungan, nagsasagawa ng mga kawanggawa (charities), at nag-aabot ng tulong, pag-asa, at malasakit sa kapwa at komunidad.'
              : 'An honorable, united family dedicated to mutual support, charity outreach, and helping those in need in the community.'}
          </p>
        </div>

        {/* MISSION CARD */}
        <div className="liquid-glass-panel rounded-3xl p-5 sm:p-6 border border-pink-400/40 relative overflow-hidden shadow-xl">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-pink-300 shadow-sm">
              <Award className="w-5 h-5 text-pink-300" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-pink-300 uppercase tracking-widest font-bold">
                {lang === 'tl' ? 'OPISYAL NA MISYON' : 'OFFICIAL MISSION'}
              </span>
              <h3 className="text-lg font-black text-white font-heading">
                {lang === 'tl' ? 'Ang Aming MISSION' : 'Our MISSION'}
              </h3>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-purple-100/90 leading-relaxed">
            {lang === 'tl'
              ? 'Isulong ang tunay na respeto, pagkakaisa, at pagdamay sa kapwa sa pamamagitan ng mga charity outreach, donation drives, at paggabay sa bawat miyembro upang maging inspirasyon sa loob at labas ng samahan.'
              : 'Champion true respect, unity, and compassion through charitable drives, community outreach, and mentoring every member to be a role model of kindness and solidarity.'}
          </p>
        </div>
      </div>

      {/* CHARITIES & ADVOCACY SPOTLIGHT */}
      <div className="liquid-glass-card-subtle rounded-3xl p-5 sm:p-6 border border-emerald-400/30 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-md">
            <HeartHandshake className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-400/30">
              🤝 Z.V.R CHARITIES & COMMUNITY OUTREACH
            </div>
            <h4 className="text-sm sm:text-base font-bold text-white">
              {lang === 'tl' ? 'May Puso Para sa Kapwa at Bayanihan' : 'A Heart for Charity & Community'}
            </h4>
            <p className="text-xs text-purple-200/80 leading-relaxed">
              {lang === 'tl'
                ? 'Ang pundasyon ng ating samahan ay ang pagkakawanggawa, bayanihan, at pagtulong sa mga kapos-palad. Dito sa Z.V.R, pantay-pantay tayo at may tunay na malasakit at pagmamahal sa isa\'t isa.'
                : 'Our core foundation is philanthropy, community care, and uplifting the underprivileged. In Z.V.R, everyone is equal and bound by true compassion.'}
            </p>
          </div>
        </div>
      </div>

      {/* Title */}
      <div>
        <h3 className="text-xl sm:text-2xl font-black text-white font-heading flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-400" />
          <span>{lang === 'tl' ? 'Mga Alituntunin at Regulasyon ng Z.V.R' : 'Z.V.R Rules & Guidelines'}</span>
        </h3>
        <p className="text-xs text-purple-200/60 mt-0.5">
          {lang === 'tl'
            ? 'Mahalagang gabay para sa lahat ng opisyal na miyembro ng Z.V.R'
            : 'Essential code of conduct for all verified Z.V.R members'}
        </p>
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        {CLAN_RULES.map((rule, idx) => (
          <div
            key={idx}
            className="liquid-glass-card-subtle hover:border-white/30 rounded-2xl p-5 transition-all"
          >
            <div className="flex items-start gap-3.5">
              <span className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-200 flex items-center justify-center font-bold text-xs shrink-0 font-mono shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                0{idx + 1}
              </span>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  {lang === 'tl' ? rule.titleTl : rule.titleEn}
                </h3>
                <p className="text-xs text-purple-200/70 leading-relaxed">
                  {lang === 'tl' ? rule.descTl : rule.descEn}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Community Banner */}
      <div className="liquid-glass-card-subtle rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div>
          <h4 className="text-base font-bold text-white mb-1">
            {lang === 'tl' ? 'Sumali sa Opisyal na Komunidad' : 'Join the Official Community'}
          </h4>
          <p className="text-xs text-purple-200/70">
            {lang === 'tl'
              ? 'Tambayan, update sa games, mga anunsyo, at Facebook profile ng pamunuan.'
              : 'Community chats, scrim schedules, and official Z.V.R leadership Facebook page.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          <a
            href={CLAN_FB_PROFILE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sounds.playClick()}
            className="w-full sm:w-auto px-4 py-2.5 bg-white/10 hover:bg-white/15 text-purple-200 hover:text-white border border-white/15 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0"
          >
            <span>FB Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Shield, MessageCircle, Volume2, VolumeX, Globe, Music2 } from 'lucide-react';
import { ClanMember, TIKTOK_GROUP_LINK, CLAN_FB_PROFILE_LINK, CLAN_LOGO_URL } from '../data/clanData';
import { sounds } from '../utils/soundEffects';

interface TopNavProps {
  currentTab: 'login' | 'roster' | 'generator' | 'rules' | 'card';
  setCurrentTab: (tab: 'login' | 'roster' | 'generator' | 'rules' | 'card') => void;
  loggedInMember: ClanMember | null;
  onLogout: () => void;
  lang: 'tl' | 'en';
  setLang: (lang: 'tl' | 'en') => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  setCurrentTab,
  loggedInMember,
  onLogout,
  lang,
  setLang,
  isMuted,
  setIsMuted
}) => {
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.setMuted(next);
    if (!next) sounds.playClick();
  };

  const navLinks = [
    { id: 'login' as const, labelTl: loggedInMember ? 'Gateway' : 'Log In', labelEn: loggedInMember ? 'Gateway' : 'Log In' },
    { id: 'roster' as const, labelTl: 'Miyembro', labelEn: 'Roster' },
    { id: 'generator' as const, labelTl: 'Tag Maker', labelEn: 'Tag Maker' },
    { id: 'rules' as const, labelTl: 'Alituntunin', labelEn: 'Clan Rules' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-purple-900/30 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => {
            sounds.playClick();
            setCurrentTab('login');
          }}
          className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-lg shrink-0 group"
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-purple-500/40 bg-purple-950/50 flex items-center justify-center shadow-[0_0_16px_rgba(168,85,247,0.35)] shrink-0">
            <img
              src={CLAN_LOGO_URL}
              alt="Z.V.R Official Clan Logo"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-wider text-purple-300 group-hover:text-purple-200 font-heading whitespace-nowrap shrink-0 transition-colors">
              Z.V.R
            </span>
            <span className="text-[9px] tracking-widest text-purple-400/80 uppercase font-semibold hidden sm:inline">
              Zeal · Victory · Respect
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden sm:flex items-center gap-1 md:gap-4 text-sm font-medium">
          {navLinks.map((link) => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => {
                  sounds.playClick();
                  setCurrentTab(link.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs md:text-sm transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'text-purple-300 bg-purple-500/15 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/50'
                }`}
              >
                {lang === 'tl' ? link.labelTl : link.labelEn}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions (Sound, Lang, Messenger Link / Profile) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mute button */}
          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'I-unmute ang tunog' : 'I-mute ang tunog'}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
            title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-purple-400" />}
          </button>

          {/* Language selector */}
          <button
            onClick={() => {
              sounds.playClick();
              setLang(lang === 'tl' ? 'en' : 'tl');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            title="Palitan ang wika / Change language"
          >
            <Globe className="w-3.5 h-3.5 text-purple-400" />
            <span>{lang === 'tl' ? 'FIL' : 'ENG'}</span>
          </button>

          {/* Official Facebook Profile Link */}
          <a
            href={CLAN_FB_PROFILE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sounds.playClick()}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 border border-purple-900/40 hover:border-purple-500/50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            title="Official Z.V.R Facebook Profile"
          >
            <span>FB Profile</span>
          </a>

          {/* Primary Action Button */}
          {loggedInMember ? (
            <button
              onClick={() => {
                sounds.playClick();
                onLogout();
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {lang === 'tl' ? 'Mag-logout' : 'Log Out'}
            </button>
          ) : (
            <a
              href={TIKTOK_GROUP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sounds.playClick()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0"
            >
              <Music2 className="w-3.5 h-3.5 text-pink-200" />
              <span>TikTok Group</span>
            </a>
          )}
        </div>
      </div>

      {/* Mobile Tab Strip */}
      <div className="flex sm:hidden items-center justify-around border-t border-slate-800/80 bg-slate-950/95 py-2 px-2 overflow-x-auto">
        {navLinks.map((link) => {
          const isActive = currentTab === link.id;
          return (
            <button
              key={link.id}
              onClick={() => {
                sounds.playClick();
                setCurrentTab(link.id);
              }}
              className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
                isActive
                  ? 'text-sky-400 bg-sky-500/15 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'tl' ? link.labelTl : link.labelEn}
            </button>
          );
        })}
      </div>
    </header>
  );
};

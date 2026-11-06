import React from 'react';
import { Shield, MessageCircle, Volume2, VolumeX, Globe } from 'lucide-react';
import { ClanMember, MESSENGER_GC_LINK } from '../data/clanData';
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => {
            sounds.playClick();
            setCurrentTab('login');
          }}
          className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-lg shrink-0"
        >
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-black text-lg shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            <Shield className="w-5 h-5 text-sky-400" />
          </div>
          <span className="text-xl font-black tracking-wider text-sky-400 font-heading whitespace-nowrap shrink-0">
            Z.V.R
          </span>
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
                    ? 'text-sky-400 bg-sky-500/10 font-semibold'
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
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
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
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>{lang === 'tl' ? 'FIL' : 'ENG'}</span>
          </button>

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
              href={MESSENGER_GC_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sounds.playClick()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Messenger GC</span>
              <span className="md:hidden">GC</span>
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

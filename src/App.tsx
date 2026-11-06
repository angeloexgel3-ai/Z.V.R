/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TopNav } from './components/TopNav';
import { LoginCard } from './components/LoginCard';
import { VerifiedScreen } from './components/VerifiedScreen';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { MemberRoster } from './components/MemberRoster';
import { TagGenerator } from './components/TagGenerator';
import { ClanRules } from './components/ClanRules';
import { MemberIdCard } from './components/MemberIdCard';
import { INITIAL_MEMBERS, ClanMember, MESSENGER_GC_LINK } from './data/clanData';
import { Shield, Sparkles, MessageCircle, Heart } from 'lucide-react';
import { sounds } from './utils/soundEffects';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'login' | 'roster' | 'generator' | 'rules' | 'card'>('login');
  const [loggedInMember, setLoggedInMember] = useState<ClanMember | null>(null);
  const [members, setMembers] = useState<ClanMember[]>(() => {
    try {
      const saved = localStorage.getItem('zvr_clan_members');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return INITIAL_MEMBERS;
  });

  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [lang, setLang] = useState<'tl' | 'en'>('tl');
  const [isMuted, setIsMuted] = useState(false);

  // Persist members if added
  const handleAddMember = (newMember: ClanMember) => {
    const updated = [newMember, ...members];
    setMembers(updated);
    try {
      localStorage.setItem('zvr_clan_members', JSON.stringify(updated));
    } catch {
      // fallback
    }
  };

  const handleLoginSuccess = (member: ClanMember) => {
    setLoggedInMember(member);
    // Stay on login tab which now displays the verified gateway state
    setCurrentTab('login');
  };

  const handleLogout = () => {
    setLoggedInMember(null);
    setCurrentTab('login');
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-sky-500 selection:text-white">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[650px] h-[650px] bg-sky-500/10 rounded-full blur-[140px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-indigo-500/5 rounded-full blur-[130px]"></div>
      </div>

      {/* Top Bar */}
      <TopNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        loggedInMember={loggedInMember}
        onLogout={handleLogout}
        lang={lang}
        setLang={setLang}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center px-4 py-8 sm:py-12 max-w-6xl mx-auto w-full">
        {/* Render Tab Contents */}
        {currentTab === 'login' && (
          <div className="w-full flex justify-center items-center py-4">
            {loggedInMember ? (
              <VerifiedScreen
                member={loggedInMember}
                onExploreClan={() => setCurrentTab('roster')}
                lang={lang}
              />
            ) : (
              <LoginCard
                members={members}
                onLoginSuccess={handleLoginSuccess}
                onOpenForgotModal={() => setIsForgotModalOpen(true)}
                lang={lang}
              />
            )}
          </div>
        )}

        {currentTab === 'roster' && (
          <MemberRoster
            members={members}
            onAddMember={handleAddMember}
            lang={lang}
          />
        )}

        {currentTab === 'generator' && (
          <TagGenerator lang={lang} />
        )}

        {currentTab === 'rules' && (
          <ClanRules lang={lang} />
        )}

        {currentTab === 'card' && (
          <MemberIdCard
            member={loggedInMember || members[0]}
            lang={lang}
          />
        )}
      </main>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        lang={lang}
      />

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950/60 py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sky-400 font-heading">Z.V.R CLAN</span>
            <span>·</span>
            <span>Est. September 15, 2025</span>
            <span>·</span>
            <span className="hidden md:inline">Lakas ng Pagkakaisa</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                sounds.playClick();
                setIsForgotModalOpen(true);
              }}
              className="hover:text-sky-400 transition-colors"
            >
              {lang === 'tl' ? 'Tulong sa Password' : 'Password Help'}
            </button>
            <a
              href={MESSENGER_GC_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300 hover:underline transition-colors flex items-center gap-1"
            >
              <MessageCircle className="w-3 h-3" />
              <span>Messenger GC</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

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
import { INITIAL_MEMBERS, ClanMember, TIKTOK_GROUP_LINK, CLAN_FB_PROFILE_LINK } from './data/clanData';
import { Shield, Sparkles, MessageCircle, Heart, UserCheck, Music2 } from 'lucide-react';
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
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-purple-500 selection:text-white">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-purple-600/15 rounded-full blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[140px]"></div>
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[130px]"></div>
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
      <footer className="relative z-10 border-t border-purple-900/30 bg-slate-950/70 py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-purple-300 font-heading">Z.V.R</span>
            <span>·</span>
            <span className="text-purple-400/80 font-medium">Zeal · Victory · Respect</span>
            <span>·</span>
            <span>EST. 9-15-25</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                sounds.playClick();
                setIsForgotModalOpen(true);
              }}
              className="hover:text-purple-300 transition-colors"
            >
              {lang === 'tl' ? 'Tulong sa Password' : 'Password Help'}
            </button>
            <a
              href={CLAN_FB_PROFILE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-purple-300 transition-colors flex items-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>FB Profile</span>
            </a>
            <a
              href={TIKTOK_GROUP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 hover:underline transition-colors flex items-center gap-1 font-semibold"
            >
              <Music2 className="w-3.5 h-3.5 text-pink-400" />
              <span>TikTok Group</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

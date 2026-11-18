import React, { useState } from 'react';
import { X, KeyRound, MessageCircle, ShieldAlert, ExternalLink, HelpCircle, Eye, UserCheck } from 'lucide-react';
import { CLAN_FB_PROFILE_LINK, CLAN_PASSCODE } from '../data/clanData';
import { sounds } from '../utils/soundEffects';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'tl' | 'en';
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [showHint, setShowHint] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-md liquid-glass-panel rounded-3xl p-6 sm:p-7 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Specular highlight */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-10 bg-white/20 rounded-full blur-xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 text-purple-200/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer border border-white/10"
          title="Isara / Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-200 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-heading">
              {lang === 'tl' ? 'Nakalimutan ang Password?' : 'Forgot Password?'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'tl' ? 'Paano ma-recover o makahingi ng tulong sa password' : 'How to recover or get password assistance'}
            </p>
          </div>
        </div>

        {/* Content body */}
        <div className="space-y-4 text-xs sm:text-sm text-slate-300 relative z-10">
          <div className="liquid-glass-card-subtle rounded-2xl p-4 space-y-2">
            <p className="font-semibold text-purple-200">
              {lang === 'tl'
                ? 'Ang opisyal na passcode ay pribado at ibinibigay lamang sa mga lehitimong miyembro.'
                : 'The official passcode is private and strictly provided to verified members.'}
            </p>
            <p className="text-purple-200/70 leading-relaxed text-xs">
              {lang === 'tl'
                ? 'Kung ikaw ay lehitimong miyembro, bagong recruit, o nakalimutan ang sariling password, mag-message sa opisyal na Facebook account ng pamunuan ng Z.V.R upang humingi ng tulong.'
                : 'If you are a verified member, new recruit, or forgot your password, message the official Z.V.R leadership on Facebook for assistance.'}
            </p>
          </div>

          {/* Officers to contact */}
          <div className="liquid-glass-card-subtle rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-purple-300/80 uppercase tracking-wider block mb-2">
              {lang === 'tl' ? 'Maaaring lapitan:' : 'Key Officers to Contact:'}
            </span>
            <ul className="space-y-1.5 text-xs text-purple-100/90">
              <li className="flex items-center justify-between">
                <span className="font-medium text-white">ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑶𝒘𝒏𝒆𝒓•MOMMY MERA</span>
                <span className="text-[10px] text-purple-300 font-semibold">Owner</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="font-medium text-white">ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑪𝒐-𝒐𝒘𝒏𝒆𝒓•HANZ</span>
                <span className="text-[10px] text-purple-300 font-semibold">Co-Owner</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="font-medium text-white">ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑯-𝒇𝒅𝒓•ERICH</span>
                <span className="text-[10px] text-purple-300 font-semibold">Head Founder</span>
              </li>
            </ul>
          </div>

          {/* Private Passcode Notice (Hidden Passcode) */}
          <div className="liquid-glass-card-subtle rounded-2xl p-3.5 border border-pink-500/20">
            <p className="text-xs text-purple-200 leading-relaxed">
              🔒{' '}
              {lang === 'tl'
                ? 'Naka-hide ang passcode para sa seguridad ng Z.V.R Portal. Mag-PM sa Owner o Co-Owner sa Facebook kung kailangan ng tulong sa verification o password reset.'
                : 'The passcode is hidden for Z.V.R Portal security. Please PM the Owner or Co-Owner on Facebook if you need help with verification or a password reset.'}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 space-y-2 relative z-10">
          {/* Primary Action: Official Facebook Profile */}
          <a
            href={CLAN_FB_PROFILE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sounds.playClick()}
            className="liquid-glass-btn-primary w-full py-2.5 px-4 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>{lang === 'tl' ? 'I-message ang Admin sa Facebook' : 'Message Admin on Facebook'}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 text-purple-200 hover:text-white rounded-xl text-xs font-semibold transition-colors border border-white/15 cursor-pointer text-center"
          >
            {lang === 'tl' ? 'Isara' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

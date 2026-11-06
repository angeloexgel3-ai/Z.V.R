import React, { useState } from 'react';
import { X, KeyRound, MessageCircle, ShieldAlert, ExternalLink, HelpCircle, Eye } from 'lucide-react';
import { MESSENGER_GC_LINK, CLAN_PASSCODE } from '../data/clanData';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg transition-colors"
          title="Isara / Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-heading">
              {lang === 'tl' ? 'Nakalimutan ang Password?' : 'Forgot Password?'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'tl' ? 'Paano ma-recover ang Z.V.R clan passcode' : 'How to retrieve the Z.V.R clan passcode'}
            </p>
          </div>
        </div>

        {/* Content body */}
        <div className="space-y-4 text-xs sm:text-sm text-slate-300">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
            <p className="font-semibold text-sky-300">
              {lang === 'tl'
                ? 'Ang passcode ay ibinibigay lamang sa mga opisyal na miyembro.'
                : 'The clan passcode is strictly provided to official verified members.'}
            </p>
            <p className="text-slate-400 leading-relaxed text-xs">
              {lang === 'tl'
                ? 'Kung ikaw ay bagong recruit o nawala ang kopya ng password, mag-chat sa mga Admins o buksan ang Messenger link upang makipag-ugnayan sa clan management.'
                : 'If you are a new member or misplaced your clan key, contact an Admin or open the Messenger link below to message clan leadership.'}
            </p>
          </div>

          {/* Officers to contact */}
          <div className="border border-slate-800 rounded-xl p-3 bg-slate-900/50">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              {lang === 'tl' ? 'Maaaring lapitan:' : 'Key Officers to Contact:'}
            </span>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center justify-between">
                <span className="font-medium text-white">ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑶𝒘𝒏𝒆𝒓•ᴍᴏᴍᴍʏ ᴍᴇʀᴀ</span>
                <span className="text-[10px] text-sky-400">Owner</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="font-medium text-white">ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑪𝒐-𝒐𝒘𝒏𝒆𝒓•ʜᴀɴᴢ</span>
                <span className="text-[10px] text-sky-400">Co-Owner</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="font-medium text-white">ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑭𝒐𝒖𝒏𝒅𝒆𝒓•ᴊᴀʏ</span>
                <span className="text-[10px] text-sky-400">Founder</span>
              </li>
            </ul>
          </div>

          {/* Password Hint Toggle */}
          <div className="bg-sky-950/20 border border-sky-900/40 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-xs font-semibold text-sky-200">
                  {lang === 'tl' ? 'Tulong / Hint' : 'Password Clue / Hint'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setShowHint(!showHint);
                }}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold underline flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />
                <span>{showHint ? (lang === 'tl' ? 'Itago' : 'Hide') : (lang === 'tl' ? 'Ipakita Hint' : 'Show Hint')}</span>
              </button>
            </div>

            {showHint && (
              <div className="mt-2.5 pt-2 border-t border-sky-900/30 text-xs text-sky-300/90 leading-relaxed font-mono">
                {lang === 'tl' ? (
                  <span>
                    Format: <strong>ZVR</strong> + petsa (MMDDYYYY) ng foundation (09-15-2025). <br />
                    Halimbawa: <span className="text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">ZVR09152025</span>
                  </span>
                ) : (
                  <span>
                    Format: <strong>ZVR</strong> + foundation date (MMDDYYYY) (09-15-2025). <br />
                    Example: <span className="text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">ZVR09152025</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <a
            href={MESSENGER_GC_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sounds.playClick()}
            className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-sky-600/20"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{lang === 'tl' ? 'Buksan ang Messenger Link' : 'Open Messenger Link'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors border border-slate-700"
          >
            {lang === 'tl' ? 'Bumalik sa Log In' : 'Back to Log In'}
          </button>
        </div>
      </div>
    </div>
  );
};

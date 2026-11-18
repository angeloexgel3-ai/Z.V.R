import React, { useState } from 'react';
import { Download, Smartphone, X, Share, PlusSquare, Sparkles, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { sounds } from '../utils/soundEffects';

interface PWAInstallButtonProps {
  lang?: 'tl' | 'en';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ lang = 'tl' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running as an installed PWA, hide install trigger
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    sounds.playClick();
    if (isInstallable) {
      const success = await install();
      if (success) {
        sounds.playSuccess();
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="liquid-glass-btn-primary px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-lg hover:scale-105 transition-all cursor-pointer border border-pink-400/30"
        title={lang === 'tl' ? 'Gawing App Icon sa Phone (100% Libre)' : 'Install App Icon (100% Free)'}
      >
        <Smartphone className="w-4 h-4 text-pink-300 animate-pulse" />
        <span>{lang === 'tl' ? ' App Icon (Libre)' : ' App Icon (Free)'}</span>
      </button>

      {/* Guide Modal for iOS Safari, Chrome, and Manual Add to Home Screen */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-md liquid-glass-panel rounded-3xl p-6 relative overflow-hidden border border-white/20 shadow-2xl text-left">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-12 bg-white/20 rounded-full blur-xl pointer-events-none"></div>

            <button
              onClick={() => {
                sounds.playClick();
                setShowGuideModal(false);
              }}
              className="absolute top-4 right-4 p-2 text-purple-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-indigo-600 flex items-center justify-center text-white shadow-lg border border-white/30 shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white font-heading">
                  {lang === 'tl' ? 'Gawing App Icon sa Phone (100% Libre!)' : 'Install App Icon (100% Free)'}
                </h3>
                <p className="text-[11px] text-purple-300 font-mono">
                  {lang === 'tl' ? 'Walang babayaran · Parang Totoong App' : 'No Payment Required · Native Feel'}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-purple-100 leading-relaxed">
              {isIOS ? (
                /* iOS iPhone/iPad Instructions */
                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 space-y-2.5">
                  <p className="font-bold text-white flex items-center gap-2">
                    <AppleLogo className="w-4 h-4 text-purple-300" />
                    <span>{lang === 'tl' ? 'Para sa iPhone / iPad (Safari Browser):' : 'For iPhone / iPad (Safari Browser):'}</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-purple-200/90 pl-1 font-medium">
                    <li>
                      {lang === 'tl' ? 'I-tap ang ' : 'Tap the '}
                      <strong className="text-white">Share Button <Share className="w-3.5 h-3.5 inline text-purple-300" /></strong>
                      {lang === 'tl' ? ' sa ibaba o itaas ng Safari.' : ' at the bottom or top of Safari.'}
                    </li>
                    <li>
                      {lang === 'tl' ? 'I-scroll pababa at piliin ang ' : 'Scroll down and select '}
                      <strong className="text-white">"Add to Home Screen" <PlusSquare className="w-3.5 h-3.5 inline text-pink-300" /></strong>.
                    </li>
                    <li>
                      {lang === 'tl' ? 'I-tap ang ' : 'Tap '}
                      <strong className="text-white font-bold">"Add"</strong>
                      {lang === 'tl' ? ' sa kanang itaas. Magkakaroon ka na ng Z.V.R App Icon!' : ' in the top right to get your Z.V.R App Icon!'}
                    </li>
                  </ol>
                </div>
              ) : (
                /* Android / Chrome / General Instructions */
                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 space-y-2.5">
                  <p className="font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'tl' ? 'Para sa Android / Google Chrome:' : 'For Android / Google Chrome:'}</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-purple-200/90 pl-1 font-medium">
                    <li>
                      {lang === 'tl' ? 'I-tap ang ' : 'Tap the '}
                      <strong className="text-white">3 dots (⋮)</strong>
                      {lang === 'tl' ? ' sa kanang itaas ng browser.' : ' in the top right corner of your browser.'}
                    </li>
                    <li>
                      {lang === 'tl' ? 'Piliin ang ' : 'Select '}
                      <strong className="text-white">"Install app"</strong>
                      {lang === 'tl' ? ' o ' : ' or '}
                      <strong className="text-white">"Add to Home screen"</strong>.
                    </li>
                    <li>
                      {lang === 'tl' ? 'I-tap ang ' : 'Tap '}
                      <strong className="text-white">"Install"</strong>
                      {lang === 'tl' ? ' para mailagay ang Z.V.R Icon sa iyong phone screen nang libre!' : ' to add the Z.V.R Icon to your phone screen for free!'}
                    </li>
                  </ol>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-[11px] text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {lang === 'tl'
                    ? 'Libre ito 100%! Kapag nakalagay na sa Home Screen, isang tap lang sa icon at deretso ka na sa Room GC.'
                    : '100% Free! Once added, tap the home screen icon anytime for instant access to Room GC.'}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={() => {
                  sounds.playClick();
                  setShowGuideModal(false);
                }}
                className="liquid-glass-btn-primary w-full py-3 text-white font-black rounded-xl text-xs sm:text-sm tracking-wide shadow-xl cursor-pointer"
              >
                {lang === 'tl' ? 'NAGET KO NA, SALAMAT!' : 'GOT IT, THANKS!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function AppleLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.1c.64-.78 1.08-1.85.96-2.92-.93.04-2.06.62-2.73 1.4-.59.68-1.1 1.77-.96 2.83 1.04.08 2.09-.53 2.73-1.31z"/>
    </svg>
  );
}

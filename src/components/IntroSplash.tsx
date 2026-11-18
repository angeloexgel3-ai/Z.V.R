import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, SkipForward } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export const INTRO_VIDEO_URL = '/assets/aistudio/ZVR_intro_vertical_6920cbaa.mp4';

interface IntroSplashProps {
  lang: 'tl' | 'en';
  onComplete: () => void;
}

export const IntroSplash: React.FC<IntroSplashProps> = ({ lang, onComplete }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);

  const finishIntro = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 450);
  }, [onComplete]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const startPlayback = async () => {
      try {
        video.muted = false;
        setIsMuted(false);
        await video.play();
      } catch {
        if (cancelled) return;
        // Browser blocked unmuted autoplay; fall back to muted autoplay so intro starts immediately
        try {
          video.muted = true;
          setIsMuted(true);
          await video.play();
        } catch {
          if (!cancelled) {
            setNeedsTapToPlay(true);
          }
        }
      }
    };

    startPlayback();

    // Safety fallback so user is never stuck if video fails to buffer
    const safetyTimer = setTimeout(() => {
      finishIntro();
    }, 9000);

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [finishIntro]);

  const handleToggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (video.paused) {
      video.play().catch(() => {});
      setNeedsTapToPlay(false);
    }
  };

  const handleSurfaceTap = () => {
    const video = videoRef.current;
    if (!video) return;
    if (needsTapToPlay || video.paused) {
      video.muted = false;
      setIsMuted(false);
      setNeedsTapToPlay(false);
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => finishIntro());
      });
      return;
    }
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playClick();
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
    }
    finishIntro();
  };

  return (
    <div
      onClick={handleSurfaceTap}
      className={`fixed inset-0 z-[100] bg-[#05040a] flex items-center justify-center overflow-hidden transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Matching ambient purple-magenta glow behind vertical video on wide screens */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-fuchsia-600/25 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-indigo-600/25 rounded-full blur-[140px]" />
      </div>

      {/* Vertical Intro Video Frame */}
      <div className="relative w-full h-full sm:h-[92vh] sm:w-auto sm:aspect-[9/16] sm:max-w-[440px] sm:rounded-[32px] sm:border sm:border-purple-400/30 sm:shadow-[0_0_80px_rgba(168,85,247,0.45)] overflow-hidden bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          src={INTRO_VIDEO_URL}
          playsInline
          autoPlay
          preload="auto"
          onEnded={finishIntro}
          onError={finishIntro}
          className="w-full h-full object-cover"
        />

        {/* Tap to start fallback (only if browser blocks even muted autoplay) */}
        {needsTapToPlay && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
            <button
              type="button"
              onClick={handleSurfaceTap}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white font-black text-sm tracking-wide shadow-[0_0_30px_rgba(217,70,239,0.6)] border border-white/30 cursor-pointer active:scale-95 transition-transform"
            >
              {lang === 'tl' ? '▶ I-PLAY ANG Z.V.R INTRO' : '▶ PLAY Z.V.R INTRO'}
            </button>
          </div>
        )}

        {/* Top Controls: Sound Toggle + Skip Intro */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between gap-2 z-20">
          <button
            type="button"
            onClick={handleToggleSound}
            className="px-3 py-2 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 min-h-[38px]"
            title={isMuted ? (lang === 'tl' ? 'I-on ang tunog' : 'Unmute') : (lang === 'tl' ? 'I-mute' : 'Mute')}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-pink-300" />
                <span>{lang === 'tl' ? 'I-on ang Tunog' : 'Tap for Sound'}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-300" />
                <span>{lang === 'tl' ? 'Tunog: ON' : 'Sound: ON'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="px-3.5 py-2 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md border border-white/20 text-purple-100 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 min-h-[38px]"
          >
            <span>{lang === 'tl' ? 'Laktawan' : 'Skip'}</span>
            <SkipForward className="w-3.5 h-3.5 text-pink-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

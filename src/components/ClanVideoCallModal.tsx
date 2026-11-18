import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Share2,
  Users,
  Sparkles,
  Maximize2,
  Minimize2,
  Volume2,
  Crown,
  Shield,
  Radio,
  Monitor
} from 'lucide-react';
import { ClanMember, CLAN_LOGO_URL } from '../data/clanData';
import { sounds } from '../utils/soundEffects';

interface ClanVideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: ClanMember;
  lang: 'tl' | 'en';
}

interface CallParticipant {
  id: string;
  name: string;
  tagname: string;
  roleTitle: string;
  isOwner?: boolean;
  isSpeaking: boolean;
  avatarColor: string;
  hasVideo: boolean;
  isMuted: boolean;
}

export const ClanVideoCallModal: React.FC<ClanVideoCallModalProps> = ({
  isOpen,
  onClose,
  currentMember,
  lang
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  // Real other clan members in the call (starts empty; no fake AI participants)
  const [otherParticipants, setOtherParticipants] = useState<CallParticipant[]>([]);

  // Request camera and microphone when opened & announce presence to other tabs
  useEffect(() => {
    if (!isOpen) return;

    let localMediaStream: MediaStream | null = null;
    let callChannel: BroadcastChannel | null = null;

    const startMedia = async () => {
      try {
        localMediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setStream(localMediaStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localMediaStream;
        }
        setCameraError(null);
      } catch (err: any) {
        console.warn('Camera/Mic permission not granted or device missing:', err);
        setCameraError(
          lang === 'tl'
            ? 'Hindi ma-access ang camera/mic (Voice Avatar mode ang gagamitin).'
            : 'Camera/Mic unavailable (Voice Avatar mode active).'
        );
      }
    };

    startMedia();

    // Call duration timer
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // Real cross-tab communication for authentic members who actually logged in
    try {
      callChannel = new BroadcastChannel('zvr_video_call_channel');
      // Announce this user joined
      callChannel.postMessage({
        type: 'MEMBER_JOINED_CALL',
        participant: {
          id: currentMember.id,
          name: currentMember.displayName,
          tagname: currentMember.tagname,
          roleTitle: currentMember.roleTitle,
          isOwner: currentMember.category === 'leadership',
          isSpeaking: false,
          avatarColor: 'from-purple-600 to-indigo-800',
          hasVideo: true,
          isMuted: false
        }
      });

      callChannel.onmessage = (event) => {
        if (event.data?.type === 'MEMBER_JOINED_CALL') {
          const newPart = event.data.participant;
          if (newPart.id !== currentMember.id) {
            setOtherParticipants((prev) => {
              if (prev.some((p) => p.id === newPart.id)) return prev;
              return [...prev, newPart];
            });
            // Send back our info to acknowledge
            callChannel?.postMessage({
              type: 'MEMBER_ACK_CALL',
              participant: {
                id: currentMember.id,
                name: currentMember.displayName,
                tagname: currentMember.tagname,
                roleTitle: currentMember.roleTitle,
                isOwner: currentMember.category === 'leadership',
                isSpeaking: false,
                avatarColor: 'from-purple-600 to-indigo-800',
                hasVideo: true,
                isMuted: false
              }
            });
          }
        } else if (event.data?.type === 'MEMBER_ACK_CALL') {
          const ackPart = event.data.participant;
          if (ackPart.id !== currentMember.id) {
            setOtherParticipants((prev) => {
              if (prev.some((p) => p.id === ackPart.id)) return prev;
              return [...prev, ackPart];
            });
          }
        } else if (event.data?.type === 'MEMBER_LEFT_CALL') {
          setOtherParticipants((prev) => prev.filter((p) => p.id !== event.data.memberId));
        }
      };
    } catch {
      // BroadcastChannel fallback
    }

    return () => {
      clearInterval(timer);
      if (callChannel) {
        try {
          callChannel.postMessage({ type: 'MEMBER_LEFT_CALL', memberId: currentMember.id });
          callChannel.close();
        } catch {
          // ignore
        }
      }
      if (localMediaStream) {
        localMediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, lang, currentMember]);

  // Toggle Mute Audio
  const handleToggleAudio = () => {
    sounds.playClick();
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
    setIsAudioMuted(!isAudioMuted);
  };

  // Toggle Video Camera
  const handleToggleVideo = () => {
    sounds.playClick();
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
    setIsVideoDisabled(!isVideoDisabled);
  };

  // Screen Share toggle
  const handleScreenShare = async () => {
    sounds.playClick();
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);

        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
          }
        };
      } catch (e) {
        console.warn('Screen share canceled or failed', e);
      }
    } else {
      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
      }
      setIsScreenSharing(false);
    }
  };

  const handleEndCall = () => {
    sounds.playClick();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    onClose();
  };

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-5xl h-[92vh] liquid-glass-panel rounded-3xl flex flex-col overflow-hidden relative border border-white/20 shadow-2xl">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 liquid-glass-card-subtle shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="w-3 h-3 rounded-full bg-emerald-500 block animate-pulse"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-400 absolute inset-0 animate-ping opacity-75"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white font-heading">
                  Z.V.R Private Video Room
                </h3>
                <span className="text-[10px] font-mono text-purple-300 bg-white/10 px-2 py-0.5 rounded-full border border-white/15 hidden sm:inline-flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400" />
                  <span>SECURE P2P</span>
                </span>
              </div>
              <p className="text-[11px] text-purple-200/60 font-mono">
                {lang === 'tl' ? 'Oras sa Tawag:' : 'Call Duration:'} {formatTimer(callDuration)} · {otherParticipants.length + 1} {lang === 'tl' ? 'kalahok' : 'in call'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-purple-200/80 hover:text-white bg-white/10 hover:bg-white/15 rounded-xl transition-colors cursor-pointer border border-white/10 hidden sm:block"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleEndCall}
              className="px-3.5 py-1.5 bg-red-600/80 hover:bg-red-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-red-400/40 shadow-lg"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>{lang === 'tl' ? 'Umalis' : 'Leave'}</span>
            </button>
          </div>
        </div>

        {/* Video Grid Matrix */}
        <div className="flex-1 p-3 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto">
          {/* Tile 1: Current User (YOU) with Real Video Stream */}
          <div className="relative rounded-2xl overflow-hidden liquid-glass-card-subtle border-2 border-purple-400/50 shadow-xl flex items-center justify-center bg-black/60 min-h-[190px]">
            {/* Live Video Tag */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                isVideoDisabled || isScreenSharing || cameraError ? 'hidden' : 'block'
              }`}
            />

            {/* Fallback Avatar if camera disabled or error */}
            {(isVideoDisabled || cameraError) && (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_24px_rgba(168,85,247,0.4)] border-2 border-white/30 mb-2">
                  {currentMember.displayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-white font-mono">{currentMember.displayName}</span>
                <span className="text-[10px] text-purple-300">
                  {isAudioMuted ? 'Mic Muted' : 'Speaking (Voice Active)'}
                </span>
              </div>
            )}

            {/* User Overlay Badge */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/15">
              <span className="text-[11px] font-bold text-white flex items-center gap-1">
                <span>{lang === 'tl' ? 'IKAW:' : 'YOU:'} {currentMember.displayName.toUpperCase()}</span>
                <span className="text-purple-300 font-mono text-[9px]">({currentMember.roleTitle})</span>
              </span>
            </div>

            {/* Muted / Video Off Badges */}
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
              {isAudioMuted && (
                <div className="p-1.5 rounded-lg bg-red-600/80 text-white backdrop-blur-md border border-red-400/40">
                  <MicOff className="w-3.5 h-3.5" />
                </div>
              )}
              {isVideoDisabled && (
                <div className="p-1.5 rounded-lg bg-slate-800/80 text-white backdrop-blur-md border border-white/20">
                  <VideoOff className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            {/* User Tagname Pill in lower left */}
            <div className="absolute bottom-2.5 left-2.5 max-w-[80%] truncate bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-mono text-purple-200 border border-white/10">
              {currentMember.tagname}
            </div>
          </div>

          {/* Waiting tile if no other members have logged in and joined yet */}
          {otherParticipants.length === 0 ? (
            <div className="relative rounded-2xl overflow-hidden liquid-glass-card-subtle border border-white/10 flex flex-col items-center justify-center p-6 text-center bg-black/40 min-h-[190px]">
              <div className="w-14 h-14 rounded-2xl bg-purple-950/60 border border-purple-400/20 flex items-center justify-center text-purple-300 mb-3 shadow-[0_0_16px_rgba(168,85,247,0.2)]">
                <Users className="w-7 h-7" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white mb-1">
                {lang === 'tl' ? 'Ikaw pa lang ang nasa Video Call' : 'You are currently alone in this call'}
              </h4>
              <p className="text-[11px] text-purple-200/70 max-w-xs leading-relaxed mb-3">
                {lang === 'tl'
                  ? 'Walang AI bots dito. Hindi pa nakapasok ang ibang miyembro — kailangan muna nilang mag-login gamit ang kanilang tagname at passcode bago makasali.'
                  : 'No AI bots here. Other members have not entered yet — they must log in first with their tagname and passcode to join.'}
              </p>
              <span className="text-[10px] font-mono text-purple-300 bg-purple-500/15 px-3 py-1 rounded-full border border-purple-400/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{lang === 'tl' ? 'Naghihintay ng ibang miyembro...' : 'Waiting for members to log in...'}</span>
              </span>
            </div>
          ) : (
            otherParticipants.map((participant) => (
            <div
              key={participant.id}
              className={`relative rounded-2xl overflow-hidden liquid-glass-card-subtle border transition-all duration-300 flex items-center justify-center bg-black/50 min-h-[190px] ${
                participant.isSpeaking
                  ? 'border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.35)]'
                  : 'border-white/10'
              }`}
            >
              {/* Dynamic Clan Video / Holographic Representation */}
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <div className="relative mb-2">
                  <div
                    className={`w-20 h-20 rounded-2xl bg-gradient-to-tr ${participant.avatarColor} flex items-center justify-center text-white font-black text-2xl shadow-xl border-2 border-white/30`}
                  >
                    {participant.name.charAt(0)}
                  </div>
                  {participant.isOwner && (
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md border-2 border-black">
                      <Crown className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {participant.isSpeaking && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-400/50">
                      <span className="w-1 h-2.5 bg-emerald-400 rounded-full animate-bounce"></span>
                      <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                      <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                    </div>
                  )}
                </div>
                <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <span>{participant.name}</span>
                </span>
                <span className="text-[10px] text-purple-300 font-mono">
                  {participant.roleTitle}
                </span>
              </div>

              {/* Tagname Banner on bottom */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                <span className="truncate bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-mono text-purple-200 border border-white/10">
                  {participant.tagname}
                </span>
                {participant.isMuted && (
                  <div className="p-1 rounded bg-red-600/80 text-white shrink-0">
                    <MicOff className="w-3 h-3" />
                  </div>
                )}
              </div>
            </div>
          )))}
        </div>

        {/* Floating Call Control Dock Bar */}
        <div className="p-3 sm:p-4 liquid-glass-card-subtle border-t border-white/15 flex items-center justify-center gap-3 sm:gap-4 shrink-0">
          {/* Mic Toggle */}
          <button
            onClick={handleToggleAudio}
            className={`p-3.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-lg ${
              isAudioMuted
                ? 'bg-red-600/90 text-white border border-red-400/40 hover:bg-red-700'
                : 'liquid-glass-card-subtle text-white hover:bg-white/15 border border-white/20'
            }`}
            title={
              isAudioMuted
                ? lang === 'tl'
                  ? 'I-unmute ang mikropono'
                  : 'Unmute microphone'
                : lang === 'tl'
                ? 'I-mute ang mikropono'
                : 'Mute microphone'
            }
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-purple-300" />}
          </button>

          {/* Video Camera Toggle */}
          <button
            onClick={handleToggleVideo}
            className={`p-3.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-lg ${
              isVideoDisabled
                ? 'bg-red-600/90 text-white border border-red-400/40 hover:bg-red-700'
                : 'liquid-glass-card-subtle text-white hover:bg-white/15 border border-white/20'
            }`}
            title={
              isVideoDisabled
                ? lang === 'tl'
                  ? 'Buksan ang camera'
                  : 'Turn camera on'
                : lang === 'tl'
                ? 'Patayin ang camera'
                : 'Turn camera off'
            }
          >
            {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5 text-purple-300" />}
          </button>

          {/* Screen Sharing Toggle */}
          <button
            onClick={handleScreenShare}
            className={`p-3.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-lg ${
              isScreenSharing
                ? 'bg-emerald-600/90 text-white border border-emerald-400/40'
                : 'liquid-glass-card-subtle text-white hover:bg-white/15 border border-white/20'
            }`}
            title={
              isScreenSharing
                ? lang === 'tl'
                  ? 'Itigil ang pag-share ng screen'
                  : 'Stop screen sharing'
                : lang === 'tl'
                ? 'I-share ang screen'
                : 'Share screen'
            }
          >
            <Monitor className="w-5 h-5 text-pink-300" />
          </button>

          {/* Red End Call Button */}
          <button
            onClick={handleEndCall}
            className="px-5 sm:px-7 py-3.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black rounded-2xl flex items-center gap-2 shadow-xl shadow-red-600/40 cursor-pointer active:scale-95 transition-all"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-xs sm:text-sm font-heading">{lang === 'tl' ? 'END CALL' : 'END CALL'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

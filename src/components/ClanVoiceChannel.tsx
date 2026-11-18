import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Radio,
  Users,
  ChevronDown,
  ChevronUp,
  Settings,
  Sparkles,
  Crown,
  Shield,
  Activity,
  Headphones
} from 'lucide-react';
import { ClanMember } from '../data/clanData';
import { realtimeClient, VoiceParticipant } from '../utils/realtimeClient';
import { sounds } from '../utils/soundEffects';

interface ClanVoiceChannelProps {
  currentMember: ClanMember;
  lang: 'tl' | 'en';
}

export const ClanVoiceChannel: React.FC<ClanVoiceChannelProps> = ({
  currentMember,
  lang
}) => {
  // Voice Channel State
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isPushToTalk, setIsPushToTalk] = useState(false);
  const [isPttPressed, setIsPttPressed] = useState(false);
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);
  const [micVolume, setMicVolume] = useState(0); // 0-100 visual meter
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [isDeckExpanded, setIsDeckExpanded] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);

  // Participants in Voice Channel
  const [voiceParticipants, setVoiceParticipants] = useState<VoiceParticipant[]>([]);
  // Map of active speakers (tagname -> expires timestamp)
  const [remoteSpeakers, setRemoteSpeakers] = useState<Record<string, number>>({});

  // Audio Context & Stream Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const meterIntervalRef = useRef<any>(null);
  const voiceTimerRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const silenceTimeoutRef = useRef<any>(null);
  const incomingAudioQueueRef = useRef<{ url: string; audio: HTMLAudioElement }[]>([]);

  // Format Call Duration
  const formatVoiceDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Helper: Play incoming voice audio chunk
  const playIncomingAudioChunk = useCallback((base64Chunk: string, senderTagname: string) => {
    if (isDeafened) return;
    try {
      const audio = new Audio(base64Chunk);
      audio.volume = 1.0;
      audio.play().catch(() => {});

      // Mark sender as speaking for next 800ms
      setRemoteSpeakers((prev) => ({
        ...prev,
        [senderTagname]: Date.now() + 800
      }));
    } catch {
      // Audio decode fallback
    }
  }, [isDeafened]);

  // Subscribe to WebSocket Voice Channel Events
  useEffect(() => {
    // 1. Participant list updates
    const unsubVoiceUpdate = realtimeClient.onVoiceUpdate((participants, joined, left) => {
      setVoiceParticipants(participants);
      if (joined && joined.tagname !== currentMember.tagname) {
        sounds.playClick();
      }
    });

    // 2. Incoming voice audio stream from other connected members
    const unsubVoiceAudio = realtimeClient.onVoiceAudio((data) => {
      if (data.senderTagname === currentMember.tagname) return;
      playIncomingAudioChunk(data.audioChunk, data.senderTagname);
    });

    // 3. Remote speaking status indicator updates
    const unsubVoiceSpeaking = realtimeClient.onVoiceSpeaking((data) => {
      if (data.isSpeaking) {
        setRemoteSpeakers((prev) => ({
          ...prev,
          [data.tagname]: Date.now() + 800
        }));
      } else {
        setRemoteSpeakers((prev) => {
          const next = { ...prev };
          delete next[data.tagname];
          return next;
        });
      }
    });

    // Ticker to clean up expired speaking halos
    const speechCleanupTimer = setInterval(() => {
      const now = Date.now();
      setRemoteSpeakers((prev) => {
        let changed = false;
        const next: typeof prev = {};
        for (const [tag, exp] of Object.entries(prev)) {
          if (exp > now) {
            next[tag] = exp;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 400);

    return () => {
      unsubVoiceUpdate();
      unsubVoiceAudio();
      unsubVoiceSpeaking();
      clearInterval(speechCleanupTimer);
    };
  }, [currentMember.tagname, playIncomingAudioChunk]);

  // Voice Call Duration Timer
  useEffect(() => {
    if (isJoined) {
      voiceTimerRef.current = setInterval(() => {
        setVoiceDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setVoiceDuration(0);
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    }
    return () => {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    };
  }, [isJoined]);

  // Stop local audio tracks and recorders
  const stopLocalAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (meterIntervalRef.current) {
      clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    setMicVolume(0);
    setIsSpeakingLocal(false);
    isSpeakingRef.current = false;
  };

  // Join Voice Channel
  const handleJoinVoice = async () => {
    sounds.playClick();
    setMicError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      localStreamRef.current = stream;

      // Initialize Web Audio Context for volume analysis
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start volume meter and speech activity detection
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      meterIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || isMuted) {
          setMicVolume(0);
          if (isSpeakingRef.current) {
            isSpeakingRef.current = false;
            setIsSpeakingLocal(false);
            realtimeClient.sendVoiceSpeaking(false);
          }
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const volumePct = Math.min(100, Math.round((avg / 128) * 100));
        setMicVolume(volumePct);

        // Threshold logic for Open Mic vs Push to Talk
        const speakingThreshold = 18; // 18% sensitivity
        const shouldBeSpeaking = isPushToTalk
          ? isPttPressed
          : volumePct >= speakingThreshold;

        if (shouldBeSpeaking) {
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            setIsSpeakingLocal(true);
            realtimeClient.sendVoiceSpeaking(true);
          }
          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        } else if (isSpeakingRef.current) {
          // Graceful hysteresis
          if (!silenceTimeoutRef.current) {
            silenceTimeoutRef.current = setTimeout(() => {
              isSpeakingRef.current = false;
              setIsSpeakingLocal(false);
              realtimeClient.sendVoiceSpeaking(false);
              silenceTimeoutRef.current = null;
            }, 350);
          }
        }
      }, 100);

      // Start continuous low-latency chunk transmission via MediaRecorder
      try {
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = '';
        }

        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = async (e) => {
          if (e.data.size > 0 && !isMuted && isSpeakingRef.current) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Audio = reader.result as string;
              if (base64Audio) {
                realtimeClient.sendVoiceAudioChunk(base64Audio);
              }
            };
            reader.readAsDataURL(e.data);
          }
        };

        // Emit slice every 250ms for low-latency voice transfer
        recorder.start(250);
      } catch (err) {
        console.warn('MediaRecorder audio slicing not supported:', err);
      }

      setIsJoined(true);
      sounds.playSuccess();
      sounds.stopCallRingtone();
      realtimeClient.joinVoice(currentMember, isMuted, isDeafened);
      if (voiceParticipants.length === 0) {
        realtimeClient.startCallRing(currentMember, 'voice', `voice_${Date.now()}`);
      }
    } catch (err: any) {
      console.warn('Microphone access denied:', err);
      setMicError(
        lang === 'tl'
          ? 'Kailangan ng pahintulot sa mikropono para makipag-usap sa Voice Channel.'
          : 'Microphone permission is required to speak in the Voice Channel.'
      );
      sounds.playError();
    }
  };

  // Leave Voice Channel
  const handleLeaveVoice = () => {
    sounds.playClick();
    stopLocalAudio();
    setIsJoined(false);
    realtimeClient.leaveVoice();
    if (voiceParticipants.length <= 1) {
      realtimeClient.endCallRing(undefined, currentMember.tagname);
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    sounds.playClick();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }

    if (nextMuted) {
      setIsSpeakingLocal(false);
      isSpeakingRef.current = false;
      realtimeClient.sendVoiceSpeaking(false);
    }
    realtimeClient.updateVoiceState(nextMuted, isDeafened);
  };

  // Toggle Deafen
  const handleToggleDeafen = () => {
    sounds.playClick();
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);
    realtimeClient.updateVoiceState(isMuted, nextDeafened);
  };

  // Handle Spacebar Push-to-Talk
  useEffect(() => {
    if (!isJoined || !isPushToTalk) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        setIsPttPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        setIsPttPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isJoined, isPushToTalk]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopLocalAudio();
      realtimeClient.leaveVoice();
    };
  }, []);

  const totalConnected = voiceParticipants.length;

  return (
    <div className="border-b border-white/10 bg-gradient-to-r from-purple-950/80 via-slate-950/80 to-purple-950/80 backdrop-blur-xl relative z-20 shrink-0 shadow-lg">
      {/* Voice Bar Header Strip */}
      <div className="px-3.5 sm:px-5 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                isJoined
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.35)]'
                  : 'bg-white/10 border-white/15 text-purple-300'
              }`}
            >
              <Radio className={`w-4 h-4 ${isJoined ? 'animate-pulse text-emerald-400' : ''}`} />
            </div>
            {isJoined && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-subtle-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-90"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white font-heading tracking-wide uppercase flex items-center gap-1.5">
                <span>{lang === 'tl' ? 'Kwarto ng Boses' : 'Voice Channel'}</span>
                <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded border border-purple-400/30">
                  LIVE
                </span>
              </span>
            </div>

            <p className="text-[10px] font-mono text-purple-200/80 truncate">
              {isJoined ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{lang === 'tl' ? 'Naka-konekta' : 'Connected'}</span> ·{' '}
                  <span className="text-white font-bold">{formatVoiceDuration(voiceDuration)}</span> ·{' '}
                  <span>{totalConnected} {lang === 'tl' ? 'nasa linya' : 'in channel'}</span>
                </span>
              ) : (
                <span>
                  {totalConnected > 0
                    ? lang === 'tl'
                      ? `${totalConnected} miyembro ang kasalukuyang nag-uusap dito`
                      : `${totalConnected} member(s) currently talking here`
                    : lang === 'tl'
                    ? 'Mag-usap nang live habang nasa portal'
                    : 'Talk live with Z.V.R members in real-time'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Actions Right Side */}
        <div className="flex items-center gap-2 shrink-0">
          {!isJoined ? (
            <button
              onClick={handleJoinVoice}
              className="liquid-glass-btn-primary px-3 sm:px-4 py-1.5 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md hover:scale-[1.02]"
              title={lang === 'tl' ? 'Sumali sa Voice Channel' : 'Join Voice Channel'}
            >
              <Mic className="w-3.5 h-3.5 text-pink-200" />
              <span>{lang === 'tl' ? 'SUMALI SA BOSES' : 'JOIN VOICE'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              {/* Mic Mute Button */}
              <button
                onClick={handleToggleMute}
                className={`p-2 rounded-xl transition-all cursor-pointer border ${
                  isMuted
                    ? 'bg-red-500/25 border-red-400/40 text-red-300 hover:bg-red-500/35'
                    : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30'
                }`}
                title={
                  isMuted
                    ? lang === 'tl'
                      ? 'I-unmute ang Mic'
                      : 'Unmute Mic'
                    : lang === 'tl'
                    ? 'I-mute ang Mic'
                    : 'Mute Mic'
                }
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Deafen Button */}
              <button
                onClick={handleToggleDeafen}
                className={`p-2 rounded-xl transition-all cursor-pointer border ${
                  isDeafened
                    ? 'bg-red-500/25 border-red-400/40 text-red-300 hover:bg-red-500/35'
                    : 'bg-white/10 border-white/15 text-purple-200 hover:bg-white/20'
                }`}
                title={
                  isDeafened
                    ? lang === 'tl'
                      ? 'I-unmute ang Audio Output'
                      : 'Unmute Audio Output'
                    : lang === 'tl'
                    ? 'I-deafen (Mute lahat ng tunog)'
                    : 'Deafen (Mute all audio)'
                }
              >
                {isDeafened ? <VolumeX className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
              </button>

              {/* Leave Voice Button */}
              <button
                onClick={handleLeaveVoice}
                className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-all cursor-pointer border border-red-500/50 shadow-md"
                title={lang === 'tl' ? 'Umalis sa Voice Channel' : 'Leave Voice Channel'}
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Expand/Collapse Toggle */}
          <button
            onClick={() => {
              sounds.playClick();
              setIsDeckExpanded(!isDeckExpanded);
            }}
            className="p-1.5 text-purple-300 hover:text-white bg-white/5 hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
            title={
              isDeckExpanded
                ? lang === 'tl'
                  ? 'Itiklop ang Deck'
                  : 'Collapse Deck'
                : lang === 'tl'
                ? 'Palawakin ang Deck'
                : 'Expand Deck'
            }
          >
            {isDeckExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Voice Channel Deck */}
      {isDeckExpanded && (
        <div className="px-3.5 sm:px-5 pb-3 pt-1 border-t border-white/5 space-y-3 animate-fade-in">
          {/* Permission Error Banner */}
          {micError && (
            <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-500/40 text-xs text-red-200 flex items-center justify-between gap-2">
              <span>{micError}</span>
              <button
                onClick={() => setMicError(null)}
                className="text-[10px] text-red-300 underline font-mono shrink-0"
              >
                {lang === 'tl' ? 'Isara' : 'Close'}
              </button>
            </div>
          )}

          {/* Active Voice Participants Grid */}
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {voiceParticipants.length === 0 ? (
              <div className="text-xs text-purple-300/60 font-mono py-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>
                  {lang === 'tl'
                    ? 'Walang ibang miyembro sa voice lounge ngayon. Maging una sa pagsasalita!'
                    : 'No members in voice lounge right now. Be the first to talk!'}
                </span>
              </div>
            ) : (
              voiceParticipants.map((p) => {
                const isMe = p.tagname === currentMember.tagname;
                const isSpeaking = isMe ? isSpeakingLocal : !!remoteSpeakers[p.tagname];
                const isLeader = p.category === 'leadership';

                return (
                  <div
                    key={p.socketId || p.tagname}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all shrink-0 ${
                      isSpeaking
                        ? 'bg-emerald-950/80 border-emerald-400/80 shadow-[0_0_16px_rgba(52,211,153,0.4)] ring-2 ring-emerald-400/60'
                        : isMe
                        ? 'bg-purple-950/60 border-purple-400/40'
                        : 'bg-black/40 border-white/10'
                    }`}
                  >
                    {/* Avatar with speaking wave & status */}
                    <div className="relative shrink-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white border transition-all ${
                          isSpeaking
                            ? 'bg-emerald-600 border-emerald-300 animate-pulse'
                            : 'bg-purple-900/80 border-white/20'
                        }`}
                      >
                        {p.displayName.charAt(0).toUpperCase()}
                      </div>

                      {/* Speaking Pulse Ring */}
                      {isSpeaking && (
                        <span className="animate-subtle-ping absolute inset-0 rounded-xl bg-emerald-400 opacity-75 pointer-events-none"></span>
                      )}

                      {/* Mute badge overlay */}
                      {p.isMuted && (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-600 border border-slate-900 flex items-center justify-center text-white">
                          <MicOff className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-white truncate max-w-[110px]">
                          {p.displayName.toUpperCase()}
                        </span>
                        {isMe && (
                          <span className="text-[9px] font-mono text-purple-200 bg-purple-500/30 px-1 rounded font-bold">
                            {lang === 'tl' ? 'Ikaw' : 'You'}
                          </span>
                        )}
                        {isLeader && (
                          <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        {isSpeaking ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            {/* Animated Equalizer Waveform */}
                            <span className="flex items-end gap-0.5 h-2.5">
                              <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse"></span>
                              <span className="w-0.5 h-2.5 bg-emerald-300 animate-pulse" style={{ animationDelay: '100ms' }}></span>
                              <span className="w-0.5 h-2 bg-emerald-400 animate-pulse" style={{ animationDelay: '200ms' }}></span>
                            </span>
                            <span>{lang === 'tl' ? 'Nagsasalita' : 'Speaking'}</span>
                          </span>
                        ) : p.isMuted ? (
                          <span className="text-red-400">{lang === 'tl' ? 'Naka-mute' : 'Muted'}</span>
                        ) : (
                          <span className="text-purple-300/70">{p.roleTitle}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Live Mic Sensitivity & Mode Bar (Visible when user is joined) */}
          {isJoined && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-black/40 border border-white/10 text-xs">
              {/* Mic Input Meter */}
              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[10px] font-mono text-purple-200/80 shrink-0">
                  Mic Level:
                </span>
                <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10 relative">
                  <div
                    className={`h-full transition-all duration-100 ${
                      isSpeakingLocal
                        ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_8px_#34d399]'
                        : 'bg-emerald-600/50'
                    }`}
                    style={{ width: `${isMuted ? 0 : micVolume}%` }}
                  ></div>
                </div>
                <span className="text-[10px] font-mono text-emerald-300 shrink-0 w-8 text-right font-bold">
                  {isMuted ? '0%' : `${micVolume}%`}
                </span>
              </div>

              {/* Mode Settings: Open Mic vs Push To Talk */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    sounds.playClick();
                    setIsPushToTalk(!isPushToTalk);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                    isPushToTalk
                      ? 'bg-pink-600/30 border-pink-400/50 text-pink-200'
                      : 'bg-purple-600/30 border-purple-400/40 text-purple-200'
                  }`}
                  title="Lumipat sa pagitan ng Voice Activity (Open Mic) at Push-to-Talk"
                >
                  {isPushToTalk ? '🎙️ PUSH-TO-TALK (PTT)' : '🟢 OPEN MIC (VOICE ACTIVITY)'}
                </button>

                {isPushToTalk && (
                  <button
                    onMouseDown={() => setIsPttPressed(true)}
                    onMouseUp={() => setIsPttPressed(false)}
                    onTouchStart={() => setIsPttPressed(true)}
                    onTouchEnd={() => setIsPttPressed(false)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none ${
                      isPttPressed
                        ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-[0_0_12px_#34d399]'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/15'
                    }`}
                  >
                    {isPttPressed ? 'TRANSMITTING...' : 'HOLD TO TALK'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

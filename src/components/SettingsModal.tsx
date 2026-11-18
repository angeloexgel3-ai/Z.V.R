import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  X,
  MessageCircle,
  Volume2,
  VolumeX,
  Bell,
  Eye,
  Globe,
  Zap,
  Check,
  PhoneCall,
  Upload,
  RotateCcw,
  Square,
  Music2,
} from 'lucide-react';
import { ClanMember } from '../data/clanData';
import { PortalSettings } from '../utils/portalSettings';
import {
  sounds,
  MESSAGE_SOUND_OPTIONS,
  CALL_RINGTONE_OPTIONS,
  MessageSoundPreset,
  CallRingtonePreset,
} from '../utils/soundEffects';
import { saveCustomAudio, deleteCustomAudio } from '../utils/customAudioStore';
import { clearAppCacheAndOptimize } from '../utils/cacheManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PortalSettings;
  onUpdateSettings: (next: PortalSettings) => void;
  isMuted: boolean;
  onToggleMute: (muted: boolean) => void;
  lang: 'tl' | 'en';
  onChangeLang: (lang: 'tl' | 'en') => void;
  loggedInMember: ClanMember | null;
}

interface ToggleSwitchProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onToggle, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onToggle}
    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
      checked
        ? 'bg-gradient-to-r from-purple-600 to-pink-500 border-pink-300/60 shadow-[0_0_16px_rgba(236,72,153,0.45)]'
        : 'bg-white/10 border-white/20'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
        checked ? 'translate-x-7' : 'translate-x-1'
      }`}
    />
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  isMuted,
  onToggleMute,
  lang,
  onChangeLang,
  loggedInMember,
}) => {
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [browserAlertNote, setBrowserAlertNote] = useState<string | null>(null);
  const [audioUploadNote, setAudioUploadNote] = useState<string | null>(null);
  const [isRingtonePreviewPlaying, setIsRingtonePreviewPlaying] = useState<boolean>(() =>
    sounds.isRingtonePlaying()
  );

  const callFileInputRef = useRef<HTMLInputElement>(null);
  const messageFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = sounds.onRingtoneStateChange((playing) => {
      setIsRingtonePreviewPlaying(playing);
    });
    return () => {
      unsub();
    };
  }, []);

  if (!isOpen) return null;

  const updateField = <K extends keyof PortalSettings>(key: K, value: PortalSettings[K]) => {
    sounds.playClick();
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  const handleSelectCallPreset = (preset: CallRingtonePreset) => {
    sounds.playClick();
    sounds.stopCallRingtone();
    sounds.setCallRingtoneConfig(preset);
    onUpdateSettings({
      ...settings,
      callRingtonePreset: preset,
    });
  };

  const handleSelectMessagePreset = (preset: MessageSoundPreset) => {
    sounds.playClick();
    sounds.setMessageSoundConfig(preset);
    onUpdateSettings({
      ...settings,
      messageSoundPreset: preset,
    });
    if (!isMuted) {
      setTimeout(() => sounds.playRoomNotification(), 60);
    }
  };

  const handleUploadCustomCall = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name)) {
      setAudioUploadNote(
        lang === 'tl'
          ? 'Mangyaring pumili ng audio file (.mp3, .wav, .ogg, .m4a).'
          : 'Please choose a valid audio file (.mp3, .wav, .ogg, .m4a).'
      );
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setAudioUploadNote(
        lang === 'tl'
          ? 'Masyadong malaki ang file (max 12 MB).'
          : 'Audio file is too large (max 12 MB).'
      );
      return;
    }

    try {
      const saved = await saveCustomAudio('call', file);
      sounds.stopCallRingtone();
      sounds.setCallRingtoneConfig('custom', saved.objectUrl);
      onUpdateSettings({
        ...settings,
        callNotificationEnabled: true,
        callRingtonePreset: 'custom',
        callCustomFileName: saved.fileName,
      });
      setAudioUploadNote(
        lang === 'tl'
          ? `Na-save ang custom call ringtone: ${saved.fileName}`
          : `Saved custom call ringtone: ${saved.fileName}`
      );
      setTimeout(() => setAudioUploadNote(null), 4000);
    } catch {
      setAudioUploadNote(
        lang === 'tl'
          ? 'Hindi ma-save ang audio file sa browser storage.'
          : 'Could not save audio file to browser storage.'
      );
    }
  };

  const handleUploadCustomMessage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name)) {
      setAudioUploadNote(
        lang === 'tl'
          ? 'Mangyaring pumili ng audio file (.mp3, .wav, .ogg, .m4a).'
          : 'Please choose a valid audio file (.mp3, .wav, .ogg, .m4a).'
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAudioUploadNote(
        lang === 'tl'
          ? 'Masyadong malaki ang file (max 10 MB).'
          : 'Audio file is too large (max 10 MB).'
      );
      return;
    }

    try {
      const saved = await saveCustomAudio('message', file);
      sounds.setMessageSoundConfig('custom', saved.objectUrl);
      onUpdateSettings({
        ...settings,
        messageSoundPreset: 'custom',
        messageCustomFileName: saved.fileName,
      });
      setAudioUploadNote(
        lang === 'tl'
          ? `Na-save ang custom message sound: ${saved.fileName}`
          : `Saved custom message sound: ${saved.fileName}`
      );
      setTimeout(() => setAudioUploadNote(null), 4000);
      if (!isMuted) {
        setTimeout(() => sounds.playRoomNotification(), 80);
      }
    } catch {
      setAudioUploadNote(
        lang === 'tl'
          ? 'Hindi ma-save ang audio file sa browser storage.'
          : 'Could not save audio file to browser storage.'
      );
    }
  };

  const handleResetCallRingtone = async () => {
    sounds.playClick();
    sounds.stopCallRingtone();
    await deleteCustomAudio('call');
    sounds.setCallRingtoneConfig('default', null);
    onUpdateSettings({
      ...settings,
      callRingtonePreset: 'default',
      callCustomFileName: '',
    });
  };

  const handleResetMessageSound = async () => {
    sounds.playClick();
    await deleteCustomAudio('message');
    sounds.setMessageSoundConfig('default', null);
    onUpdateSettings({
      ...settings,
      messageSoundPreset: 'default',
      messageCustomFileName: '',
    });
    if (!isMuted) {
      setTimeout(() => sounds.playRoomNotification(), 60);
    }
  };

  const handleToggleBrowserAlerts = async () => {
    sounds.playClick();
    setBrowserAlertNote(null);

    if (settings.browserAlertsEnabled) {
      onUpdateSettings({ ...settings, browserAlertsEnabled: false });
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserAlertNote(
        lang === 'tl'
          ? 'Hindi sinusuportahan ng browser na ito ang background pop-up alerts.'
          : 'Background browser alerts are not supported on this browser.'
      );
      return;
    }

    if (Notification.permission === 'granted') {
      onUpdateSettings({ ...settings, browserAlertsEnabled: true });
      return;
    }

    if (Notification.permission === 'denied') {
      setBrowserAlertNote(
        lang === 'tl'
          ? 'Naka-block ang notifications sa browser settings. I-allow muna ito sa site permissions.'
          : 'Notifications are blocked in browser settings. Please allow them in site permissions.'
      );
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        onUpdateSettings({ ...settings, browserAlertsEnabled: true });
      } else {
        setBrowserAlertNote(
          lang === 'tl'
            ? 'Hindi pinayagan ang browser pop-up notification.'
            : 'Browser notification permission was not granted.'
        );
      }
    } catch {
      setBrowserAlertNote(
        lang === 'tl'
          ? 'Hindi mabuksan ang browser notification prompt.'
          : 'Unable to request browser notification permission.'
      );
    }
  };

  const handleClearCache = () => {
    sounds.playSuccess();
    const res = clearAppCacheAndOptimize();
    setCacheNotice(
      lang === 'tl'
        ? `Nalinis ang temporary cache (${res.freedMB} MB). Mas smooth na uli ang site!`
        : `Cleared temporary cache (${res.freedMB} MB). Smooth performance restored!`
    );
    setTimeout(() => setCacheNotice(null), 4000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={() => {
        sounds.stopCallRingtone();
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="zvr-settings-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg dark-neon-glass-panel rounded-3xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto text-left text-slate-100 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg border border-white/25 shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="zvr-settings-title"
                className="text-lg sm:text-xl font-black text-white font-heading truncate"
              >
                {lang === 'tl' ? 'Mga Setting ng Site' : 'Site Settings'}
              </h2>
              <p className="text-xs text-purple-200/75 truncate">
                {lang === 'tl'
                  ? 'Notification Call, Custom Sounds at mga opsyon'
                  : 'Notification Call, Custom Sounds and preferences'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              sounds.stopCallRingtone();
              onClose();
            }}
            aria-label={lang === 'tl' ? 'Isara ang settings' : 'Close settings'}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-purple-200 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Online vs Logged Out Reminder */}
        {!loggedInMember && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200 leading-relaxed">
            {lang === 'tl'
              ? 'Paalala: Hindi ka pa naka-log in ngayon. Ang Room GC call at message pop-up notifications ay lalabas lamang kapag ikaw ay naka-online sa site.'
              : 'Note: You are currently logged out. Room GC call and message pop-up notifications only activate while you are online.'}
          </div>
        )}

        {audioUploadNote && (
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 rounded-2xl px-3.5 py-2.5">
            <Check className="w-4 h-4 shrink-0" />
            <span>{audioUploadNote}</span>
          </div>
        )}

        {/* Section 1: NOTIFICATION CALL (Ringtone pang-Call sa Room GC) */}
        <div className="mt-5 space-y-3">
          <h3 className="text-xs font-bold tracking-wider uppercase text-pink-300">
            NOTIFICATION CALL
          </h3>

          <div className="p-4 rounded-2xl bg-white/[0.06] border border-pink-400/35 space-y-3.5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600/40 to-purple-600/40 border border-pink-400/40 flex items-center justify-center text-pink-200 shrink-0">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-black text-white block">
                    {lang === 'tl' ? 'Ringtone pang-Call sa Room GC' : 'Room GC Call Ringtone'}
                  </span>
                  <p className="text-xs text-purple-200/75 mt-0.5 leading-relaxed">
                    {lang === 'tl'
                      ? 'Tutunog kapag may tumatawag sa Room GC (Video o Voice Call). Puwede mong i-customize ang ringtone.'
                      : 'Plays when someone starts a Room GC Video or Voice Call. You can customize your ringtone.'}
                  </p>
                </div>
              </div>

              <ToggleSwitch
                checked={settings.callNotificationEnabled}
                onToggle={() =>
                  updateField('callNotificationEnabled', !settings.callNotificationEnabled)
                }
                label={lang === 'tl' ? 'I-on o off ang Notification Call' : 'Toggle Notification Call'}
              />
            </div>

            {/* Ringtone Selector */}
            <div className="pt-2 border-t border-white/10 space-y-2.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-purple-200/80 block">
                {lang === 'tl' ? 'Piliin o I-customize ang Ringtone:' : 'Choose or Customize Ringtone:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CALL_RINGTONE_OPTIONS.map((opt) => {
                  const isCustom = opt.id === 'custom';
                  const hasCustomFile = Boolean(settings.callCustomFileName);
                  if (isCustom && !hasCustomFile) return null;
                  const active = settings.callRingtonePreset === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectCallPreset(opt.id)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer flex items-center justify-between gap-2 min-h-[42px] ${
                        active
                          ? 'bg-pink-500/25 border-pink-400/70 text-white shadow-[0_0_14px_rgba(236,72,153,0.3)]'
                          : 'bg-black/35 border-white/10 text-purple-200/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="truncate">
                        {isCustom && hasCustomFile
                          ? settings.callCustomFileName
                          : lang === 'tl'
                          ? opt.labelTl
                          : opt.labelEn}
                      </span>
                      {active && <Check className="w-3.5 h-3.5 text-pink-300 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Upload Custom Ringtone + Test / Stop + Reset */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  ref={callFileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.m4a"
                  onChange={handleUploadCustomCall}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    callFileInputRef.current?.click();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/45 border border-purple-400/45 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{lang === 'tl' ? 'Mag-upload ng Ringtone' : 'Upload Custom Ringtone'}</span>
                </button>

                {!isMuted && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isRingtonePreviewPlaying) {
                        sounds.stopCallRingtone();
                      } else {
                        sounds.startCallRingtone(12000);
                      }
                    }}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-[40px] ${
                      isRingtonePreviewPlaying
                        ? 'bg-red-600/30 border-red-400/50 text-red-200'
                        : 'bg-white/10 hover:bg-white/15 border-white/15 text-purple-100'
                    }`}
                  >
                    {isRingtonePreviewPlaying ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>{lang === 'tl' ? 'Ihinto ang Ringtone' : 'Stop Ringtone'}</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{lang === 'tl' ? 'Subukan ang Ringtone' : 'Test Ringtone'}</span>
                      </>
                    )}
                  </button>
                )}

                {(settings.callRingtonePreset !== 'default' || settings.callCustomFileName) && (
                  <button
                    type="button"
                    onClick={handleResetCallRingtone}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-purple-200/80 hover:text-white flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{lang === 'tl' ? 'Ibalik sa Default' : 'Reset'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: NOTIFICATION MESSAGE SOUND (Customizable) */}
        <div className="mt-6 space-y-3">
          <h3 className="text-xs font-bold tracking-wider uppercase text-purple-300">
            {lang === 'tl' ? 'Tunog ng Notification Message' : 'Message Notification Sound'}
          </h3>

          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3.5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-200 shrink-0">
                  {isMuted ? <VolumeX className="w-5 h-5 text-slate-400" /> : <Music2 className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-white block">
                    {lang === 'tl' ? 'Tunog sa Bagong Mensahe (Room GC)' : 'Room GC Message Sound'}
                  </span>
                  <p className="text-xs text-purple-200/70 mt-0.5 leading-relaxed">
                    {lang === 'tl'
                      ? 'Puwede ring i-customize ang tunog para sa mga bagong mensahe sa Room GC.'
                      : 'Customize the sound played whenever a new message arrives in Room GC.'}
                  </p>
                </div>
              </div>

              <ToggleSwitch
                checked={!isMuted}
                onToggle={() => {
                  const nextMuted = !isMuted;
                  onToggleMute(nextMuted);
                  sounds.setMuted(nextMuted);
                  if (!nextMuted) sounds.playClick();
                }}
                label={lang === 'tl' ? 'I-on o off ang tunog ng notification' : 'Toggle notification sound'}
              />
            </div>

            {/* Message Sound Presets */}
            <div className="pt-2 border-t border-white/10 space-y-2.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-purple-200/80 block">
                {lang === 'tl' ? 'Piliin o I-customize ang Sound:' : 'Choose or Customize Sound:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MESSAGE_SOUND_OPTIONS.map((opt) => {
                  const isCustom = opt.id === 'custom';
                  const hasCustomFile = Boolean(settings.messageCustomFileName);
                  if (isCustom && !hasCustomFile) return null;
                  const active = settings.messageSoundPreset === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectMessagePreset(opt.id)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer flex items-center justify-between gap-2 min-h-[42px] ${
                        active
                          ? 'bg-purple-500/25 border-purple-400/70 text-white shadow-[0_0_14px_rgba(168,85,247,0.3)]'
                          : 'bg-black/35 border-white/10 text-purple-200/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="truncate">
                        {isCustom && hasCustomFile
                          ? settings.messageCustomFileName
                          : lang === 'tl'
                          ? opt.labelTl
                          : opt.labelEn}
                      </span>
                      {active && <Check className="w-3.5 h-3.5 text-purple-300 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Upload Custom Message Sound + Test + Reset */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  ref={messageFileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.m4a"
                  onChange={handleUploadCustomMessage}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    messageFileInputRef.current?.click();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/45 border border-purple-400/45 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{lang === 'tl' ? 'Mag-upload ng Sound' : 'Upload Custom Sound'}</span>
                </button>

                {!isMuted && (
                  <button
                    type="button"
                    onClick={() => sounds.playRoomNotification()}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-purple-100 flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{lang === 'tl' ? 'Subukan ang Tunog' : 'Test Sound'}</span>
                  </button>
                )}

                {(settings.messageSoundPreset !== 'default' || settings.messageCustomFileName) && (
                  <button
                    type="button"
                    onClick={handleResetMessageSound}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-purple-200/80 hover:text-white flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{lang === 'tl' ? 'Ibalik sa Default' : 'Reset'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Optional Preferences */}
        <div className="mt-6 space-y-3">
          <h3 className="text-xs font-bold tracking-wider uppercase text-purple-300">
            {lang === 'tl' ? 'Mga Optional na Opsyon' : 'Optional Preferences'}
          </h3>

          {/* Auto Pop-Up Messages on Side */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-200 shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-white block">
                  {lang === 'tl' ? 'Kusang Pop-Up sa Gilid' : 'Auto Pop-Up Banner'}
                </span>
                <p className="text-xs text-purple-200/70 mt-0.5 leading-relaxed">
                  {lang === 'tl'
                    ? 'Kusang mag-pop up ang bagong mensahe sa Room GC kapag online ka.'
                    : 'Automatically pop up new Room GC messages while you are online.'}
                </p>
              </div>
            </div>

            <ToggleSwitch
              checked={settings.autoPopupMessages}
              onToggle={() => updateField('autoPopupMessages', !settings.autoPopupMessages)}
              label={lang === 'tl' ? 'I-turn on o off ang kusang pop-up' : 'Toggle auto side pop-up'}
            />
          </div>

          {/* Message Preview Toggle */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-200 shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-white block">
                  {lang === 'tl' ? 'Ipakita ang Preview ng Mensahe' : 'Show Message Preview'}
                </span>
                <p className="text-xs text-purple-200/70 mt-0.5 leading-relaxed">
                  {lang === 'tl'
                    ? 'Kapag naka-OFF, pangalan lang ng nag-send ang ipapakita sa pop-up.'
                    : 'When OFF, pop-ups only display who sent the message without the message text.'}
                </p>
              </div>
            </div>

            <ToggleSwitch
              checked={settings.showMessagePreview}
              onToggle={() => updateField('showMessagePreview', !settings.showMessagePreview)}
              label={lang === 'tl' ? 'Ipakita ang preview ng mensahe' : 'Toggle message preview'}
            />
          </div>

          {/* Background Browser Alert Toggle */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-200 shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-white block">
                    {lang === 'tl' ? 'Background Browser Alert' : 'Background Browser Alert'}
                  </span>
                  <p className="text-xs text-purple-200/70 mt-0.5 leading-relaxed">
                    {lang === 'tl'
                      ? 'Optional: Mag-alert kahit nasa ibang tab ka habang naka-online sa site.'
                      : 'Optional: Show a browser alert while online even when viewing another browser tab.'}
                  </p>
                </div>
              </div>

              <ToggleSwitch
                checked={settings.browserAlertsEnabled}
                onToggle={handleToggleBrowserAlerts}
                label={lang === 'tl' ? 'I-on o off ang background browser alert' : 'Toggle background browser alert'}
              />
            </div>

            {browserAlertNote && (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-400/25 rounded-xl px-3 py-2">
                {browserAlertNote}
              </p>
            )}
          </div>

          {/* Language Selector */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-200 shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">
                  {lang === 'tl' ? 'Wika / Language' : 'Language'}
                </span>
                <span className="text-xs text-purple-200/70">
                  {lang === 'tl' ? 'Piliin ang wika ng portal' : 'Choose portal display language'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/15 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onChangeLang('en');
                }}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer min-h-[38px] ${
                  lang === 'en' ? 'bg-purple-600 text-white shadow' : 'text-purple-200/75 hover:text-white'
                }`}
              >
                ENGLISH
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onChangeLang('tl');
                }}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer min-h-[38px] ${
                  lang === 'tl' ? 'bg-purple-600 text-white shadow' : 'text-purple-200/75 hover:text-white'
                }`}
              >
                FILIPINO
              </button>
            </div>
          </div>

          {/* Cache & Lag Optimization */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-white block">
                    {lang === 'tl' ? 'Pag-optimize at Cache' : 'Cache & Performance'}
                  </span>
                  <span className="text-xs text-purple-200/70 block">
                    {lang === 'tl' ? 'Linisin ang temporary data para iwas lag' : 'Clear temporary data to keep portal fast'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearCache}
                className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 text-xs font-bold text-amber-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap min-h-[40px]"
              >
                {lang === 'tl' ? 'Linisin Ngayon' : 'Clear Cache'}
              </button>
            </div>

            {cacheNotice && (
              <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 rounded-xl px-3 py-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{cacheNotice}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Done Button */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              sounds.stopCallRingtone();
              onClose();
            }}
            className="liquid-glass-btn-primary px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white cursor-pointer min-h-[44px]"
          >
            {lang === 'tl' ? 'I-SAVE AT ISARA' : 'SAVE & CLOSE'}
          </button>
        </div>
      </div>
    </div>
  );
};

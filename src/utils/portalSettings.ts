import { CallRingtonePreset, MessageSoundPreset } from './soundEffects';

export interface PortalSettings {
  autoPopupMessages: boolean;
  showMessagePreview: boolean;
  browserAlertsEnabled: boolean;
  callNotificationEnabled: boolean;
  messageSoundPreset: MessageSoundPreset;
  messageCustomFileName: string;
  callRingtonePreset: CallRingtonePreset;
  callCustomFileName: string;
}

export const DEFAULT_PORTAL_SETTINGS: PortalSettings = {
  autoPopupMessages: true,
  showMessagePreview: true,
  browserAlertsEnabled: false,
  callNotificationEnabled: true,
  messageSoundPreset: 'default',
  messageCustomFileName: '',
  callRingtonePreset: 'default',
  callCustomFileName: '',
};

const SETTINGS_STORAGE_KEY = 'zvr_portal_settings_v1';

export function loadPortalSettings(): PortalSettings {
  if (typeof window === 'undefined') return DEFAULT_PORTAL_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_PORTAL_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      autoPopupMessages:
        typeof parsed.autoPopupMessages === 'boolean'
          ? parsed.autoPopupMessages
          : DEFAULT_PORTAL_SETTINGS.autoPopupMessages,
      showMessagePreview:
        typeof parsed.showMessagePreview === 'boolean'
          ? parsed.showMessagePreview
          : DEFAULT_PORTAL_SETTINGS.showMessagePreview,
      browserAlertsEnabled:
        typeof parsed.browserAlertsEnabled === 'boolean'
          ? parsed.browserAlertsEnabled
          : DEFAULT_PORTAL_SETTINGS.browserAlertsEnabled,
      callNotificationEnabled:
        typeof parsed.callNotificationEnabled === 'boolean'
          ? parsed.callNotificationEnabled
          : DEFAULT_PORTAL_SETTINGS.callNotificationEnabled,
      messageSoundPreset: parsed.messageSoundPreset || DEFAULT_PORTAL_SETTINGS.messageSoundPreset,
      messageCustomFileName:
        typeof parsed.messageCustomFileName === 'string'
          ? parsed.messageCustomFileName
          : DEFAULT_PORTAL_SETTINGS.messageCustomFileName,
      callRingtonePreset: parsed.callRingtonePreset || DEFAULT_PORTAL_SETTINGS.callRingtonePreset,
      callCustomFileName:
        typeof parsed.callCustomFileName === 'string'
          ? parsed.callCustomFileName
          : DEFAULT_PORTAL_SETTINGS.callCustomFileName,
    };
  } catch {
    return DEFAULT_PORTAL_SETTINGS;
  }
}

export function savePortalSettings(settings: PortalSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage quota failures
  }
}

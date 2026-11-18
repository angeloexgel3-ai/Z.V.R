/**
 * Z.V.R Clan Gateway - Automatic Cache Manager & Performance Optimizer
 * Prevents site lag, trims heavy media buffers, and runs daily automated cleanup.
 */

import { getAttendanceDateKey } from '../data/clanData';

const STORAGE_KEYS = {
  LAST_CLEAN_DATE: 'zvr_last_daily_clean',
  MESSAGES: 'zvr_clan_messages_v1',
  MEMBERS: 'zvr_clan_members',
  SUSPENDED: 'zvr_suspended_members',
  PENDING: 'zvr_pending_registrations',
  LIVE_PIN: 'zvr_clan_live_pin'
};

export interface CleanReport {
  messagesTrimmed: number;
  oldAttendancePurged: number;
  freedBytesEstimate: number;
  lastCleanDate: string;
}

export function pruneMessagesOlderThan1Day<T extends { createdTimestamp?: number; timestamp?: string }>(messages: T[]): T[] {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return messages.filter((m) => {
    if (m.createdTimestamp) {
      return m.createdTimestamp > oneDayAgo;
    }
    return true; // keep if timestamp format unknown
  });
}

/**
 * Automatically runs daily cleanup once per day on app load.
 * Prunes messages older than 1 day to ensure zero-lag performance.
 */
export function runDailyAutoCleanup(): CleanReport {
  const todayKey = getAttendanceDateKey();
  const lastClean = localStorage.getItem(STORAGE_KEYS.LAST_CLEAN_DATE);

  let messagesTrimmed = 0;
  let oldAttendancePurged = 0;
  let freedBytesEstimate = 0;

  // Run cleanup if not cleaned today, or always check message age
  try {
    const rawMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (rawMessages) {
      const initialSize = rawMessages.length;
      const parsed = JSON.parse(rawMessages);

      if (Array.isArray(parsed)) {
        // Automatically prune messages older than 1 day (24 hours)
        const pruned = pruneMessagesOlderThan1Day(parsed);
        const trimmed = pruned.slice(-150);
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(trimmed));
        messagesTrimmed = parsed.length - trimmed.length;
        freedBytesEstimate += Math.max(0, initialSize - JSON.stringify(trimmed).length);
      }
    }

    // 2. Clean up old attendance records older than 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const cutoffDateKey = getAttendanceDateKey(fourteenDaysAgo);

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('zvr_attendance_')) {
        const datePart = key.replace('zvr_attendance_', '');
        if (datePart < cutoffDateKey) {
          localStorage.removeItem(key);
          oldAttendancePurged++;
        }
      }
    }

    // 3. Mark last cleaned date
    localStorage.setItem(STORAGE_KEYS.LAST_CLEAN_DATE, todayKey);
    console.log('🧹 [Z.V.R Auto Cleaner]: Araw-araw na paglilinis ng cache ay naisagawa nang matagumpay!');
  } catch (e) {
    console.warn('Auto cleanup failed silently:', e);
  }

  return {
    messagesTrimmed,
    oldAttendancePurged,
    freedBytesEstimate,
    lastCleanDate: localStorage.getItem(STORAGE_KEYS.LAST_CLEAN_DATE) || todayKey
  };
}

/**
 * Manual trigger to clear temporary caches, release memory, and optimize speed.
 */
export function clearAppCacheAndOptimize(): { success: boolean; freedMB: string } {
  let initialBytes = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        initialBytes += (localStorage.getItem(key) || '').length;
      }
    }

    // Preserve vital database keys
    const savedMembers = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    const savedSuspended = localStorage.getItem(STORAGE_KEYS.SUSPENDED);
    const savedPending = localStorage.getItem(STORAGE_KEYS.PENDING);
    const rawMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);

    // Trim chat messages to latest 30 to clear heavy photos & voice notes
    let trimmedMessages = [];
    if (rawMessages) {
      try {
        const parsed = JSON.parse(rawMessages);
        if (Array.isArray(parsed)) {
          trimmedMessages = parsed.slice(-30);
        }
      } catch {}
    }

    // Clear temporary cache keys
    localStorage.removeItem(STORAGE_KEYS.LIVE_PIN);

    // Re-save trimmed messages
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(trimmedMessages));
    if (savedMembers) localStorage.setItem(STORAGE_KEYS.MEMBERS, savedMembers);
    if (savedSuspended) localStorage.setItem(STORAGE_KEYS.SUSPENDED, savedSuspended);
    if (savedPending) localStorage.setItem(STORAGE_KEYS.PENDING, savedPending);

    // Mark today as cleaned
    const todayKey = getAttendanceDateKey();
    localStorage.setItem(STORAGE_KEYS.LAST_CLEAN_DATE, todayKey);

    // Unregister service worker caches if available to reload pristine PWA assets
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name);
        }
      });
    }

    let finalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        finalBytes += (localStorage.getItem(key) || '').length;
      }
    }

    const freedMB = ((Math.max(0, initialBytes - finalBytes) * 2) / (1024 * 1024)).toFixed(2);
    return { success: true, freedMB };
  } catch (err) {
    console.error('Failed to clear cache:', err);
    return { success: false, freedMB: '0' };
  }
}

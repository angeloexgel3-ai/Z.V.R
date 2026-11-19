import React, { useState, useEffect } from 'react';
import { Shield, Trash2, AlertCircle, CheckCircle2, UserX, UserCheck, ExternalLink, UserPlus, Search, Lock, Flag } from 'lucide-react';
import { ClanMember, CLAN_FB_PROFILE_LINK, CLAN_LOGO_URL, RegisteredAccount, getAttendanceDateKey, formatTagnameUppercase, isOfficialRole } from '../data/clanData';
import { sounds } from '../utils/soundEffects';
import { realtimeClient, OnlineMemberRecord } from '../utils/realtimeClient';

interface RemoveTagnameProps {
  loggedInMember: ClanMember | null;
  lang: 'tl' | 'en';
  onGoToLogin: () => void;
  onGoToCreateTagname?: () => void;
  onOpenReport?: () => void;
  onlineUsers?: OnlineMemberRecord[];
}

export const RemoveTagname: React.FC<RemoveTagnameProps> = ({
  loggedInMember,
  lang,
  onGoToLogin,
  onGoToCreateTagname,
  onOpenReport,
  onlineUsers = []
}) => {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingDeleteAccount, setPendingDeleteAccount] = useState<RegisteredAccount | null>(null);

  const tagPrefix = loggedInMember?.tagname?.split('•')[0] || '';
  const isAdmin = Boolean(
    loggedInMember &&
      (loggedInMember.category === 'leadership' ||
        isOfficialRole(loggedInMember.roleTitle) ||
        isOfficialRole(tagPrefix) ||
        loggedInMember.status === 'owner' ||
        loggedInMember.status === 'founder' ||
        loggedInMember.status === 'officer')
  );

  // Load registered accounts
  const [accounts, setAccounts] = useState<RegisteredAccount[]>(() => {
    try {
      const saved = localStorage.getItem('zvr_registered_accounts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Sync accounts across tabs & WebSockets
  useEffect(() => {
    realtimeClient.fetchInitialState();
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('zvr_registered_accounts');
        if (saved) setAccounts(JSON.parse(saved));
        else setAccounts([]);
      } catch {}
    };
    window.addEventListener('storage', handleStorage);

    const unsub = realtimeClient.onAccountsUpdate((updatedList) => {
      setAccounts(updatedList);
    });

    const unsubInit = realtimeClient.onInit((state) => {
      if (Array.isArray(state.registeredAccounts)) {
        setAccounts(state.registeredAccounts);
      }
    });

    return () => {
      window.removeEventListener('storage', handleStorage);
      unsub();
      unsubInit();
    };
  }, []);

  const performAccountRemoval = (account: RegisteredAccount) => {
    if (!isAdmin || !loggedInMember) {
      sounds.playError();
      return;
    }

    sounds.playSuccess();
    const targetLower = account.tagname.trim().toLowerCase();
    const updated = accounts.filter(
      (a) => a.id !== account.id && a.tagname.trim().toLowerCase() !== targetLower
    );
    setAccounts(updated);

    try {
      localStorage.setItem('zvr_registered_accounts', JSON.stringify(updated));

      // Also clean up from clan members if present
      const savedMembers = localStorage.getItem('zvr_clan_members');
      if (savedMembers) {
        const parsedMembers: ClanMember[] = JSON.parse(savedMembers);
        const filtered = parsedMembers.filter(
          (m) => m.tagname.trim().toLowerCase() !== targetLower
        );
        localStorage.setItem('zvr_clan_members', JSON.stringify(filtered));
      }

      // Also clean up from attendance
      const todayKey = getAttendanceDateKey();
      const attRaw = localStorage.getItem(`zvr_attendance_${todayKey}`);
      if (attRaw) {
        const att = JSON.parse(attRaw);
        delete att[account.id];
        delete att[account.tagname];
        localStorage.setItem(`zvr_attendance_${todayKey}`, JSON.stringify(att));
        const attCh = new BroadcastChannel('zvr_attendance_channel');
        attCh.postMessage({ type: 'UPDATE_ATTENDANCE', dateKey: todayKey, map: att });
        attCh.close();
      }

      // If removed account was currently logged in or saved on this device, clear session & device tagname
      const savedLogin = localStorage.getItem('zvr_active_login');
      if (savedLogin) {
        const parsedLogin = JSON.parse(savedLogin);
        if (parsedLogin.tagname?.trim().toLowerCase() === targetLower) {
          localStorage.removeItem('zvr_active_login');
        }
      }
      const savedDeviceTag = localStorage.getItem('zvr_my_device_tagname');
      if (savedDeviceTag && savedDeviceTag.trim().toLowerCase() === targetLower) {
        localStorage.removeItem('zvr_my_device_tagname');
      }

      // Broadcast channel
      const channel = new BroadcastChannel('zvr_registered_accounts_channel');
      channel.postMessage({ type: 'ACCOUNT_REMOVED', accounts: updated, tagname: account.tagname });
      channel.close();
    } catch {}

    // Broadcast WebSocket & REST fallback with admin requester info
    realtimeClient.removeAccount(account.id, account.tagname, {
      tagname: loggedInMember.tagname,
      roleTitle: loggedInMember.roleTitle,
      category: loggedInMember.category,
    });

    setSuccessMsg(
      lang === 'tl'
        ? `Matagumpay na natanggal ang "${formatTagnameUppercase(account.tagname)}". Maaari na siyang pumunta sa Create Tagname upang mag-set ng bagong password!`
        : `Tagname "${formatTagnameUppercase(account.tagname)}" successfully removed.`
    );
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleRemoveAccount = (account: RegisteredAccount) => {
    if (!isAdmin) {
      sounds.playError();
      return;
    }
    sounds.playClick();
    setPendingDeleteAccount(account);
  };

  const handleConfirmDeleteAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingDeleteAccount || !isAdmin) return;

    const target = pendingDeleteAccount;
    setPendingDeleteAccount(null);
    performAccountRemoval(target);
  };

  const filteredAccounts = accounts.filter(
    (a) =>
      a.tagname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.roleTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-fade-in text-white px-2 sm:px-0">
      {/* Top Banner Header */}
      <div className="dark-neon-glass-panel rounded-3xl p-6 relative overflow-hidden border border-purple-500/30 shadow-2xl text-center">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-12 bg-pink-500/25 rounded-full blur-xl pointer-events-none"></div>

        <div className="w-16 h-16 rounded-2xl bg-purple-950/80 border border-purple-400/40 mx-auto flex items-center justify-center text-purple-300 mb-3 shadow-lg">
          <UserX className="w-8 h-8 text-pink-400" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-200 to-indigo-200 font-heading">
          {lang === 'tl' ? 'REMOVE TAGNAME PORTAL' : 'REMOVE TAGNAME PORTAL'}
        </h1>
        <p className="text-xs sm:text-sm text-purple-300 font-semibold mt-1">
          {lang === 'tl'
            ? 'Pagtanggal ng Tagname para sa mga Nakalimot ng Password o Nais Magbago'
            : 'Tagname Reset for Forgotten Passwords or Registration Cleanups'}
        </p>
      </div>

      {/* Guide & PM Instructions for Members */}
      <div className="liquid-glass-card-subtle rounded-3xl p-5 sm:p-6 border border-white/15 space-y-4 text-left">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white font-heading">
              {lang === 'tl' ? 'Nakalimutan mo ba ang iyong Personal Password?' : 'Forgot your personal password?'}
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed mt-1">
              {lang === 'tl'
                ? 'I-PM ang ating Owner o Co-Owner upang ma-remove ang inyong Tagname mula sa portal database. Kapag na-remove na, maaari ka nang mag-punta sa "Create Tagname" upang mag-register muli ng bago mong password gamit ang opisyal na Verification Passcode.'
                : 'Direct message our Owner or Co-Owner to remove your registered Tagname from the portal. Once removed, you can re-register via "Create Tagname" with a new password using the official verification passcode.'}
            </p>
          </div>
        </div>

        {/* Official Contact Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <a
            href={CLAN_FB_PROFILE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-900/30 hover:bg-purple-900/50 border border-purple-400/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-400/40 overflow-hidden flex items-center justify-center">
                <img src={CLAN_LOGO_URL} alt="ZVR" className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">
                  Owner (MOMMY MERA) & Co-Owner (HANZ)
                </p>
                <p className="text-[11px] text-purple-300/80">
                  {lang === 'tl' ? 'Opisyal na Facebook Messenger / Profile' : 'Official Facebook Messenger / Profile'}
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-purple-400 group-hover:text-pink-300 transition-colors" />
          </a>

          <button
            onClick={() => {
              sounds.playClick();
              if (onGoToCreateTagname) {
                onGoToCreateTagname();
              } else {
                onGoToLogin();
              }
            }}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-400/30 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-900/50 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Create Tagname Portal
                </p>
                <p className="text-[11px] text-emerald-300/80">
                  {lang === 'tl' ? 'Gumawa ng bagong Tagname at Password' : 'Create a new Tagname and Password'}
                </p>
              </div>
            </div>
            <UserCheck className="w-4 h-4 text-emerald-400 group-hover:text-emerald-200 transition-colors" />
          </button>
        </div>
      </div>

      {/* All Registered Tagnames Inside Portal (Shown For All, Even Offline) + Admin Unlock */}
      <div className="dark-neon-glass-panel rounded-3xl p-5 sm:p-6 border border-white/20 shadow-xl text-left space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-pink-400" />
            <h2 className="text-sm sm:text-base font-black text-white font-heading">
              {lang === 'tl' ? 'Mga Rehistradong Tagname sa Portal' : 'Registered Portal Tagnames'}
            </h2>
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
              SHOW FOR ALL
            </span>
          </div>
          {isAdmin ? (
            <div className="flex items-center gap-2 flex-wrap">
              {onOpenReport && (
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    onOpenReport();
                  }}
                  className="text-[11px] font-bold px-3 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/40 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Flag className="w-3.5 h-3.5 text-rose-300" />
                  <span>Report Room</span>
                </button>
              )}
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lang === 'tl' ? `Admin Permission (${loggedInMember?.roleTitle})` : `Admin Permission (${loggedInMember?.roleTitle})`}
              </span>
            </div>
          ) : (
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              {lang === 'tl' ? 'Admin Only' : 'Admin Only'}
            </span>
          )}
        </div>

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {!isAdmin && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-100/90 leading-relaxed">
                {loggedInMember
                  ? lang === 'tl'
                    ? 'Mga Admin (Owner / Co-Owner / Founder / Admin) lang ang may permission na mag-remove ng Tagname sa room na ito. Hindi na kailangan ng passcode.'
                    : 'Only Admins (Owner / Co-Owner / Founder / Admin) have permission to remove Tagnames in this room. No passcode required.'
                  : lang === 'tl'
                    ? 'Mga Admin lang ang may permission na mag-remove ng Tagname sa room na ito. Mag-log in muna gamit ang Admin account (hindi na kailangan ng passcode).'
                    : 'Only Admins have permission to remove Tagnames in this room. Please log in with an Admin account first (no passcode required).'}
              </p>
            </div>
            {!loggedInMember && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onGoToLogin();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold whitespace-nowrap cursor-pointer transition-all shrink-0"
              >
                {lang === 'tl' ? 'Mag-log in bilang Admin' : 'Log in as Admin'}
              </button>
            )}
          </div>
        )}

        {/* Search + Full List of Tagnames (Always Visible for All, Even Offline) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-purple-300/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'tl' ? 'Mag-search ng Tagname o Pangalan...' : 'Search Tagname or Name...'}
                className="liquid-glass-input w-full text-white rounded-xl py-2 pl-9 pr-3 text-xs outline-none"
              />
            </div>
            <span className="text-xs text-purple-300 font-mono shrink-0">
              {filteredAccounts.length} / {accounts.length} {lang === 'tl' ? 'Rehistrado' : 'Registered'}
            </span>
          </div>

          {filteredAccounts.length === 0 ? (
            <div className="p-6 text-center text-xs text-purple-300/70 border border-dashed border-white/10 rounded-2xl">
              {lang === 'tl' ? 'Walang nakitang rehistradong tagname.' : 'No registered tagname found.'}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredAccounts.map((account) => {
                const isOnline = onlineUsers.some(
                  (u) => u.tagname.trim().toLowerCase() === account.tagname.trim().toLowerCase()
                );

                return (
                  <div
                    key={account.id}
                    className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3 hover:bg-white/[0.08] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate font-mono">
                        {formatTagnameUppercase(account.tagname)}
                      </p>
                      <p className="text-[11px] text-purple-300 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span>{lang === 'tl' ? 'Pangalan:' : 'Name:'} {account.name.toUpperCase()}</span>
                        <span>•</span>
                        <span className="text-purple-400">{account.roleTitle}</span>
                        <span>•</span>
                        <span className={isOnline ? 'text-emerald-300 font-mono text-[10px]' : 'text-zinc-400 font-mono text-[10px]'}>
                          {isOnline ? '🟢 Online' : '⚫ Offline'}
                        </span>
                        <span>•</span>
                        <span className="text-zinc-500 font-mono text-[10px]">{account.registeredAt}</span>
                      </p>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => handleRemoveAccount(account)}
                        className="px-3 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/40 text-pink-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm active:scale-95"
                        title={lang === 'tl' ? 'Tanggalin ang tagname na ito sa portal' : 'Remove this tagname from the portal'}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-pink-400" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Inline Remove Confirmation Modal (Admin Permission Only, No Passcode Needed) */}
      {isAdmin && pendingDeleteAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm liquid-glass-panel rounded-3xl p-5 border border-pink-400/40 shadow-2xl space-y-4 text-left">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-pink-500/20 border border-pink-400/30 text-pink-300">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white font-heading">
                  {lang === 'tl' ? 'Tanggalin ang Tagname?' : 'Remove Tagname?'}
                </h4>
                <p className="text-[11px] text-pink-200 font-mono truncate max-w-[240px]">
                  {formatTagnameUppercase(pendingDeleteAccount.tagname)}
                </p>
              </div>
            </div>

            <p className="text-xs text-purple-200/80 leading-relaxed">
              {lang === 'tl'
                ? 'Kapag tinanggal ang tagname na ito, agad itong mabubura sa Login portal at Attendance Room.'
                : 'Removing this tagname will immediately delete it from the Login portal and Attendance Room.'}
            </p>

            <form onSubmit={handleConfirmDeleteAccount} className="space-y-3">
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setPendingDeleteAccount(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-purple-200 cursor-pointer"
                >
                  {lang === 'tl' ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white cursor-pointer"
                >
                  {lang === 'tl' ? 'Kumpirmahin ang Remove' : 'Confirm Remove'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Flag, X, UserX, CheckCircle2 } from 'lucide-react';
import {
  ClanMember,
  RegisteredAccount,
  formatTagnameUppercase,
  getAttendanceDateKey,
  isOfficialMember,
} from '../data/clanData';
import { sounds } from '../utils/soundEffects';
import { realtimeClient } from '../utils/realtimeClient';

interface ReportMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  loggedInMember: ClanMember | null;
  lang: 'tl' | 'en';
  onReported?: (message: string) => void;
}

const VIOLATION_OPTIONS = [
  'Bringing drama into the GC',
  'Disrespecting or insulting fellow members',
  "Disobeying officers' reminders or warnings",
  'Using profanity or posting inappropriate content',
  'Spamming, harassment, or bullying',
  'Violating official Z.V.R rules and guidelines',
];

export const ReportMemberModal: React.FC<ReportMemberModalProps> = ({
  isOpen,
  onClose,
  loggedInMember,
  lang,
  onReported,
}) => {
  const [registeredAccounts, setRegisteredAccounts] = useState<RegisteredAccount[]>(() => {
    try {
      const saved = localStorage.getItem('zvr_registered_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [suspendedList, setSuspendedList] = useState<
    Array<{ id: string; tagname: string; name: string; reason: string; date: string; action?: string }>
  >(() => {
    try {
      const saved = localStorage.getItem('zvr_suspended_members');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [reportTargetTag, setReportTargetTag] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reportAction, setReportAction] = useState('SUSPENSION 1DAY');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    realtimeClient.fetchInitialState();

    try {
      const savedAcc = localStorage.getItem('zvr_registered_accounts');
      if (savedAcc) setRegisteredAccounts(JSON.parse(savedAcc));
      const savedSusp = localStorage.getItem('zvr_suspended_members');
      if (savedSusp) setSuspendedList(JSON.parse(savedSusp));
    } catch {}

    const unsubAcc = realtimeClient.onAccountsUpdate((accounts) => {
      setRegisteredAccounts(accounts);
    });
    const unsubSusp = realtimeClient.onSuspensionsUpdate((list) => {
      setSuspendedList(list);
    });
    const unsubInit = realtimeClient.onInit((state) => {
      if (Array.isArray(state.registeredAccounts)) setRegisteredAccounts(state.registeredAccounts);
      if (Array.isArray(state.suspendedMembers)) setSuspendedList(state.suspendedMembers);
    });

    return () => {
      unsubAcc();
      unsubSusp();
      unsubInit();
    };
  }, [isOpen]);

  // Officials only
  if (!isOpen || !isOfficialMember(loggedInMember)) {
    return null;
  }

  const suspendedTagnames = suspendedList.map((s) => s.tagname.toLowerCase());
  const selectableAccounts = registeredAccounts.filter(
    (acc) =>
      !suspendedTagnames.includes(acc.tagname.toLowerCase()) &&
      acc.tagname.trim().toLowerCase() !== (loggedInMember?.tagname || '').trim().toLowerCase()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTargetTag || !reportReason) return;

    sounds.playError();
    const targetAccount = registeredAccounts.find((a) => a.tagname === reportTargetTag);
    const targetDisplayName = (targetAccount?.name || reportTargetTag).toUpperCase();

    const newSuspendedRecord = {
      id: 'susp-' + Date.now(),
      tagname: reportTargetTag,
      name: targetDisplayName,
      reason: reportReason.trim(),
      action: reportAction,
      date: new Date().toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' }),
    };

    const newSuspended = [...suspendedList, newSuspendedRecord];
    setSuspendedList(newSuspended);
    try {
      localStorage.setItem('zvr_suspended_members', JSON.stringify(newSuspended));
    } catch {}

    // Automatically remove from registered accounts & portal
    const updatedAccounts = registeredAccounts.filter((a) => a.tagname !== reportTargetTag);
    setRegisteredAccounts(updatedAccounts);
    try {
      localStorage.setItem('zvr_registered_accounts', JSON.stringify(updatedAccounts));
      const channel = new BroadcastChannel('zvr_registered_accounts_channel');
      channel.postMessage({ type: 'ACCOUNT_REMOVED', accounts: updatedAccounts, tagname: reportTargetTag });
      channel.close();
    } catch {}

    // Remove from members
    try {
      const savedMembers = localStorage.getItem('zvr_clan_members');
      if (savedMembers) {
        const parsedMembers: any[] = JSON.parse(savedMembers);
        localStorage.setItem(
          'zvr_clan_members',
          JSON.stringify(parsedMembers.filter((m) => m.tagname !== reportTargetTag))
        );
      }
    } catch {}

    // Remove from today's attendance (using 3:00 AM reset date key)
    try {
      const todayKey = getAttendanceDateKey();
      const rawAtt = localStorage.getItem(`zvr_attendance_${todayKey}`);
      if (rawAtt) {
        const att = JSON.parse(rawAtt);
        if (targetAccount) delete att[targetAccount.id];
        delete att[reportTargetTag];
        localStorage.setItem(`zvr_attendance_${todayKey}`, JSON.stringify(att));
        const attCh = new BroadcastChannel('zvr_attendance_channel');
        attCh.postMessage({ type: 'UPDATE_ATTENDANCE', dateKey: todayKey, map: att });
        attCh.close();
      }
    } catch {}

    realtimeClient.suspendAccount(reportTargetTag, newSuspendedRecord);

    const confirmation =
      lang === 'tl'
        ? `Na-suspend/ban si ${targetDisplayName} (${reportAction} · ${reportReason}) at tinanggal sa Portal.`
        : `${targetDisplayName} has been suspended/banned (${reportAction} · ${reportReason}) and removed from the Portal.`;

    setReportTargetTag('');
    setReportReason('');
    setSuccessNotice(confirmation);
    if (onReported) {
      onReported(confirmation);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in text-left"
      onClick={() => {
        sounds.playClick();
        setSuccessNotice(null);
        onClose();
      }}
    >
      <div
        className="w-full max-w-md liquid-glass-panel rounded-3xl p-6 relative overflow-hidden border border-pink-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-12 bg-pink-500/20 rounded-full blur-xl pointer-events-none"></div>

        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            setSuccessNotice(null);
            onClose();
          }}
          className="absolute top-4 right-4 p-2 text-purple-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-pink-950/80 border border-pink-500/40 flex items-center justify-center text-pink-400 shadow-lg">
            <Flag className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-white font-heading">
              {lang === 'tl' ? 'Report Room (Officials Only)' : 'Report Room (Officials Only)'}
            </h3>
            <p className="text-[11px] text-pink-300 font-mono">
              {lang === 'tl' ? 'I-suspend at tanggalin sa Login Portal' : 'Suspend and remove from Login Portal'}
            </p>
          </div>
        </div>

        <p className="text-xs text-purple-200/90 leading-relaxed mb-4 p-3 rounded-2xl bg-pink-500/10 border border-pink-500/20">
          {lang === 'tl' ? (
            <>
              Para lamang sa mga Officials. Ang mai-rereport na tagname ay{' '}
              <strong className="text-white">awtomatikong matatanggal sa Login Portal</strong> bilang suspension o eviction.
            </>
          ) : (
            <>
              Strictly for Z.V.R Officials. Any reported tagname will be{' '}
              <strong className="text-white">automatically removed from the Login Portal</strong> as suspension or eviction.
            </>
          )}
        </p>

        {successNotice && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 text-xs text-emerald-200 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
            <span>{successNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* REPORT */}
          <div>
            <label className="block text-xs font-black text-purple-200 uppercase tracking-wider mb-1.5 font-heading">
              REPORT
            </label>
            <select
              required
              value={reportTargetTag}
              onChange={(e) => {
                setReportTargetTag(e.target.value);
                setSuccessNotice(null);
              }}
              className={`liquid-glass-input w-full rounded-xl py-3 px-3.5 text-xs sm:text-sm outline-none appearance-none cursor-pointer font-mono uppercase ${
                reportTargetTag ? 'text-white' : 'text-gray-400'
              }`}
            >
              <option value="" disabled className="bg-slate-950 text-gray-400">
                CHOOSE A TAGNAME
              </option>
              {selectableAccounts.map((acc) => (
                <option key={acc.id} value={acc.tagname} className="bg-slate-950 text-white font-mono">
                  {formatTagnameUppercase(acc.tagname)}
                </option>
              ))}
            </select>
            {selectableAccounts.length === 0 && (
              <p className="text-[10px] text-pink-300 mt-1">
                {lang === 'tl'
                  ? 'Walang rehistradong tagname na maaaring i-report sa kasalukuyan.'
                  : 'No registered tagnames available to report right now.'}
              </p>
            )}
          </div>

          {/* REASON */}
          <div>
            <label className="block text-xs font-black text-purple-200 uppercase tracking-wider mb-1.5 font-heading">
              REASON
            </label>
            <select
              required
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className={`liquid-glass-input w-full rounded-xl py-3 px-3.5 text-xs sm:text-sm outline-none cursor-pointer ${
                reportReason ? 'text-white' : 'text-gray-400'
              }`}
            >
              <option value="" disabled className="bg-slate-950 text-gray-400">
                SELECT VIOLATION
              </option>
              {VIOLATION_OPTIONS.map((violation) => (
                <option key={violation} value={violation} className="bg-slate-950 text-white">
                  {violation}
                </option>
              ))}
            </select>
          </div>

          {/* ACTION */}
          <div>
            <label className="block text-xs font-black text-purple-200 uppercase tracking-wider mb-1.5 font-heading">
              ACTION
            </label>
            <select
              value={reportAction}
              onChange={(e) => setReportAction(e.target.value)}
              className="liquid-glass-input w-full text-pink-300 rounded-xl py-3 px-3.5 text-xs sm:text-sm outline-none cursor-pointer font-bold"
            >
              <option value="SUSPENSION 1DAY" className="bg-slate-950 text-white">
                SUSPENSION 1DAY
              </option>
              <option value="SUSPENSION 3DAYS" className="bg-slate-950 text-white">
                SUSPENSION 3DAYS
              </option>
              <option value="SUSPENSION 7DAYS" className="bg-slate-950 text-white">
                SUSPENSION 7DAYS
              </option>
              <option value="EVICT /BAN PERMANENT" className="bg-slate-950 text-red-400 font-bold">
                EVICT /BAN PERMANENT
              </option>
            </select>
          </div>

          {/* SUBMIT */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!reportTargetTag || !reportReason}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 text-white font-black rounded-xl text-xs sm:text-sm tracking-wider shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
            >
              <UserX className="w-4 h-4" />
              <span>SUSPEND / BAN</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

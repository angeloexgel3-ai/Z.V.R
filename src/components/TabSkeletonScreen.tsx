import React from 'react';

export type SkeletonTabType =
  | 'login'
  | 'room'
  | 'generator'
  | 'roster'
  | 'rules'
  | 'remove_tagname'
  | 'weekly_attendance';

interface TabSkeletonScreenProps {
  tab: SkeletonTabType;
}

export const TabSkeletonScreen: React.FC<TabSkeletonScreenProps> = ({ tab }) => {
  if (tab === 'login') {
    return (
      <div
        aria-busy="true"
        aria-label="Loading Portal"
        className="w-full max-w-lg mx-auto py-4 animate-pulse"
      >
        <div className="liquid-glass-panel rounded-3xl p-6 sm:p-8 border border-white/20 space-y-5 flex flex-col items-center text-center">
          {/* Crest / Emblem Skeleton */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-purple-500/20 border border-white/20" />
          <div className="space-y-2 w-full flex flex-col items-center">
            <div className="w-56 h-7 rounded-lg bg-white/15" />
            <div className="w-40 h-3 rounded bg-purple-300/20" />
            <div className="w-44 h-3 rounded bg-white/10" />
          </div>

          {/* Profile / Input Card Skeleton */}
          <div className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-36 h-3 rounded bg-purple-300/20" />
              <div className="w-16 h-3 rounded bg-emerald-400/25" />
            </div>
            <div className="w-full h-11 rounded-xl bg-white/10 border border-white/15" />
          </div>

          {/* Prompt Banner Skeleton */}
          <div className="w-full h-11 rounded-xl bg-purple-500/10 border border-purple-400/20" />

          {/* Action Buttons Skeleton */}
          <div className="w-full space-y-3">
            <div className="w-full h-13 rounded-xl bg-purple-500/25 border border-purple-400/30" />
            <div className="grid grid-cols-2 gap-2.5">
              <div className="h-10 rounded-xl bg-white/10 border border-white/15" />
              <div className="h-10 rounded-xl bg-white/10 border border-white/15" />
            </div>
            <div className="w-full h-10 rounded-xl bg-purple-500/15 border border-purple-400/25" />
          </div>
        </div>
      </div>
    );
  }

  if (tab === 'room') {
    return (
      <div
        aria-busy="true"
        aria-label="Loading Room GC"
        className="w-full max-w-[430px] sm:max-w-[450px] mx-auto flex flex-col h-[86vh] sm:h-[84vh] liquid-glass-panel rounded-[36px] overflow-hidden border border-white/20 shadow-[0_25px_65px_rgba(0,0,0,0.95),0_0_35px_rgba(168,85,247,0.2)] relative animate-pulse"
      >
        {/* Room GC Header Skeleton */}
        <div className="bg-black/60 px-3.5 py-3 border-b border-purple-500/20 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-white/10 shrink-0" />
            <div className="w-10 h-10 rounded-full bg-purple-500/25 border border-purple-300/25 shrink-0" />
            <div className="space-y-1.5">
              <div className="w-28 h-3.5 rounded-md bg-white/15" />
              <div className="w-36 h-2.5 rounded-md bg-emerald-400/20" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-14 h-6 rounded-full bg-emerald-500/20" />
            <div className="w-7 h-7 rounded-full bg-white/10" />
            <div className="w-7 h-7 rounded-full bg-white/10" />
            <div className="w-7 h-7 rounded-full bg-white/10" />
          </div>
        </div>

        {/* Pinned Banner Skeleton */}
        <div className="mx-3 mt-3 h-11 rounded-2xl bg-purple-500/10 border border-purple-400/20 shrink-0" />

        {/* Chat Messages Skeleton */}
        <div className="flex-1 px-3.5 py-4 space-y-4 overflow-hidden flex flex-col justify-end">
          {/* Incoming message */}
          <div className="flex items-end gap-2 max-w-[80%]">
            <div className="w-7 h-7 rounded-full bg-white/10 shrink-0" />
            <div className="space-y-1.5">
              <div className="w-20 h-2.5 rounded bg-purple-300/20" />
              <div className="w-44 h-11 rounded-2xl rounded-bl-sm bg-white/10 border border-white/10" />
            </div>
          </div>

          {/* Outgoing message */}
          <div className="flex flex-col items-end gap-1 ml-auto max-w-[78%]">
            <div className="w-48 h-10 rounded-2xl rounded-br-sm bg-purple-500/25 border border-purple-400/25" />
          </div>

          {/* Incoming message with image/card shape */}
          <div className="flex items-end gap-2 max-w-[82%]">
            <div className="w-7 h-7 rounded-full bg-white/10 shrink-0" />
            <div className="space-y-1.5">
              <div className="w-24 h-2.5 rounded bg-pink-300/20" />
              <div className="w-52 h-16 rounded-2xl rounded-bl-sm bg-white/10 border border-white/10" />
            </div>
          </div>

          {/* Outgoing message */}
          <div className="flex flex-col items-end gap-1 ml-auto max-w-[75%]">
            <div className="w-36 h-9 rounded-2xl rounded-br-sm bg-purple-500/25 border border-purple-400/25" />
          </div>

          {/* Incoming short message */}
          <div className="flex items-end gap-2 max-w-[75%]">
            <div className="w-7 h-7 rounded-full bg-white/10 shrink-0" />
            <div className="space-y-1.5">
              <div className="w-16 h-2.5 rounded bg-purple-300/20" />
              <div className="w-36 h-9 rounded-2xl rounded-bl-sm bg-white/10 border border-white/10" />
            </div>
          </div>
        </div>

        {/* Bottom Message Input Bar Skeleton */}
        <div className="bg-black/60 px-3 py-3 border-t border-white/10 flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-white/10" />
            <div className="w-7 h-7 rounded-full bg-white/10" />
            <div className="w-7 h-7 rounded-full bg-white/10" />
            <div className="w-7 h-7 rounded-full bg-white/10" />
          </div>
          <div className="flex-1 h-10 rounded-2xl bg-white/10 border border-white/15" />
          <div className="w-8 h-8 rounded-full bg-fuchsia-500/25 shrink-0" />
        </div>
      </div>
    );
  }

  if (tab === 'generator') {
    return (
      <div
        aria-busy="true"
        aria-label="Loading Attendance"
        className="w-full max-w-4xl mx-auto space-y-6 animate-pulse"
      >
        {/* Header Card Skeleton */}
        <div className="liquid-glass-panel rounded-3xl p-5 sm:p-6 border border-white/20 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-purple-500/20 border border-white/20 shrink-0" />
              <div className="space-y-2">
                <div className="w-52 h-6 rounded-lg bg-white/15" />
                <div className="w-40 h-3.5 rounded-md bg-purple-300/15" />
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-22 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/25" />
              <div className="w-22 h-14 rounded-2xl bg-red-500/15 border border-red-400/25" />
              <div className="w-24 h-14 rounded-2xl bg-purple-500/15 border border-purple-400/25" />
            </div>
          </div>
          <div className="pt-3 border-t border-white/10 flex flex-wrap gap-2">
            <div className="w-52 h-4 rounded bg-white/10" />
            <div className="w-28 h-4 rounded-full bg-amber-500/15" />
            <div className="w-24 h-4 rounded-full bg-emerald-500/15" />
          </div>
        </div>

        {/* Single-Tap Attendance Circle Card Skeleton */}
        <div className="liquid-glass-panel rounded-3xl p-6 border border-white/20 flex flex-col items-center space-y-4">
          <div className="w-48 h-3 rounded bg-purple-300/20" />
          <div className="w-56 h-5 rounded bg-white/15" />
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-purple-500/20 border-4 border-white/15" />
          <div className="w-52 h-7 rounded-full bg-white/10" />
        </div>

        {/* Filter & Records Card Skeleton */}
        <div className="liquid-glass-panel rounded-3xl p-5 border border-white/20 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <div className="w-24 h-8 rounded-xl bg-purple-500/25" />
              <div className="w-28 h-8 rounded-xl bg-white/10" />
              <div className="w-28 h-8 rounded-xl bg-white/10" />
            </div>
            <div className="w-48 h-8 rounded-xl bg-white/10" />
          </div>
          <div className="w-full h-9 rounded-xl bg-white/10" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="p-3.5 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/15 shrink-0" />
                  <div className="space-y-1.5">
                    <div className="w-28 h-3.5 rounded bg-white/15" />
                    <div className="w-36 h-2.5 rounded bg-purple-300/15" />
                  </div>
                </div>
                <div className="w-16 h-6 rounded-full bg-white/10 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tab === 'roster') {
    return (
      <div
        aria-busy="true"
        aria-label="Loading Roster"
        className="w-full max-w-6xl mx-auto space-y-6 animate-pulse"
      >
        {/* Roster Header Card Skeleton */}
        <div className="liquid-glass-panel rounded-3xl p-5 sm:p-6 border border-white/20 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-white/20 shrink-0" />
              <div className="space-y-2">
                <div className="w-48 h-6 rounded-lg bg-white/15" />
                <div className="w-60 h-3.5 rounded bg-purple-300/15" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-24 h-9 rounded-xl bg-emerald-500/15" />
              <div className="w-24 h-9 rounded-xl bg-purple-500/20" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="flex-1 h-10 rounded-xl bg-white/10" />
            <div className="flex gap-2">
              <div className="w-20 h-10 rounded-xl bg-purple-500/25" />
              <div className="w-24 h-10 rounded-xl bg-white/10" />
              <div className="w-24 h-10 rounded-xl bg-white/10" />
            </div>
          </div>
        </div>

        {/* Roster Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="liquid-glass-panel rounded-2xl p-4 border border-white/15 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-white/15 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-4 rounded bg-white/15" />
                  <div className="w-20 h-3 rounded-full bg-amber-400/20" />
                </div>
              </div>
              <div className="w-full h-7 rounded-xl bg-white/10" />
              <div className="flex items-center justify-between pt-1">
                <div className="w-16 h-3 rounded bg-emerald-400/20" />
                <div className="w-20 h-3 rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === 'rules') {
    return (
      <div
        aria-busy="true"
        aria-label="Loading Rules"
        className="w-full max-w-4xl mx-auto space-y-6 animate-pulse"
      >
        {/* Rules Header Skeleton */}
        <div className="liquid-glass-panel rounded-3xl p-6 border border-white/20 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/25 border border-white/20 shrink-0" />
          <div className="space-y-2 flex-1 text-center sm:text-left">
            <div className="w-56 h-6 rounded-lg bg-white/15 mx-auto sm:mx-0" />
            <div className="w-72 h-3.5 rounded bg-purple-300/15 mx-auto sm:mx-0" />
          </div>
        </div>

        {/* Rules Cards Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="liquid-glass-panel rounded-2xl p-5 border border-white/15 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/25 border border-purple-400/25 shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="w-48 h-4 rounded bg-white/15" />
                <div className="w-full h-3 rounded bg-white/10" />
                <div className="w-5/6 h-3 rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === 'weekly_attendance') {
    return (
      <div
        aria-busy="true"
        aria-label="Loading Weekly Attendance Total"
        className="w-full max-w-4xl mx-auto space-y-6 animate-pulse"
      >
        <div className="liquid-glass-panel rounded-3xl p-5 sm:p-6 border border-white/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-purple-500/20 border border-white/20 shrink-0" />
            <div className="space-y-2">
              <div className="w-60 h-6 rounded-lg bg-white/15" />
              <div className="w-44 h-3.5 rounded bg-purple-300/15" />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-22 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/25" />
            <div className="w-22 h-14 rounded-2xl bg-red-500/15 border border-red-400/25" />
            <div className="w-24 h-14 rounded-2xl bg-purple-500/15 border border-purple-400/25" />
          </div>
        </div>

        <div className="liquid-glass-panel rounded-3xl p-5 sm:p-6 border border-pink-400/30 space-y-4">
          <div className="w-64 h-5 rounded bg-white/15" />
          <div className="w-full h-44 rounded-2xl bg-black/40 border border-white/10" />
          <div className="w-full h-11 rounded-xl bg-purple-500/25 border border-purple-400/30" />
        </div>

        <div className="liquid-glass-panel rounded-3xl p-5 sm:p-6 border border-white/15 space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1.5">
                  <div className="w-40 h-4 rounded bg-white/15" />
                  <div className="w-52 h-3 rounded bg-purple-300/20" />
                </div>
                <div className="w-28 h-8 rounded-xl bg-purple-500/20" />
              </div>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <div key={d} className="h-11 rounded-xl bg-white/10" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // remove_tagname skeleton
  return (
    <div
      aria-busy="true"
      aria-label="Loading Remove Tagname"
      className="w-full max-w-2xl mx-auto space-y-6 animate-pulse"
    >
      <div className="liquid-glass-panel rounded-3xl p-6 border border-white/20 space-y-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-400/25 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="w-52 h-5 rounded-lg bg-white/15" />
            <div className="w-64 h-3 rounded bg-purple-300/15" />
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="w-32 h-3 rounded bg-white/15" />
          <div className="w-full h-11 rounded-xl bg-white/10 border border-white/15" />
          <div className="w-28 h-3 rounded bg-white/15 mt-2" />
          <div className="w-full h-11 rounded-xl bg-white/10 border border-white/15" />
          <div className="w-full h-11 rounded-xl bg-red-500/25 border border-red-400/30 mt-2" />
        </div>
      </div>

      <div className="liquid-glass-panel rounded-3xl p-5 border border-white/15 space-y-3">
        <div className="w-44 h-4 rounded bg-white/15" />
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3"
          >
            <div className="space-y-1.5">
              <div className="w-32 h-3.5 rounded bg-white/15" />
              <div className="w-40 h-2.5 rounded bg-purple-300/15" />
            </div>
            <div className="w-20 h-8 rounded-xl bg-red-500/20" />
          </div>
        ))}
      </div>
    </div>
  );
};

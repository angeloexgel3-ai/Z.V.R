import React, { useState } from 'react';
import { Wand2, Copy, Check, Sparkles, Hash, Shield } from 'lucide-react';
import { toSmallCaps, TAG_STYLES } from '../utils/tagGenerator';
import { sounds } from '../utils/soundEffects';

interface TagGeneratorProps {
  lang: 'tl' | 'en';
}

export const TagGenerator: React.FC<TagGeneratorProps> = ({ lang }) => {
  const [nickname, setNickname] = useState('CYBER');
  const [role, setRole] = useState('𝑴𝒃𝒓');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const roleOptions = [
    { label: '𝑴𝒃𝒓 (Member)', value: '𝑴𝒃𝒓' },
    { label: '𝑨𝒅𝒎𝒊𝒏 (Admin)', value: '𝑨𝒅𝒎𝒊𝒏' },
    { label: '𝑺-𝑨𝒅𝒎𝒏 (Sub-Admin)', value: '𝑺-𝑨𝒅𝒎𝒏' },
    { label: '𝑯-𝒂𝒅𝒎𝒏 (Head Admin)', value: '𝑯-𝒂𝒅𝒎𝒏' },
    { label: '𝑭𝒐𝒖𝒏𝒅𝒆𝒓 (Founder)', value: '𝑭𝒐𝒖𝒏𝒅𝒆𝒓' },
    { label: '𝑪-𝒇𝒅𝒓 (Co-Founder)', value: '𝑪-𝒇𝒅𝒓' },
    { label: '𝑯-𝒇𝒅𝒓 (Head Founder)', value: '𝑯-𝒇𝒅𝒓' },
    { label: '𝑪𝒐-𝒐𝒘𝒏𝒆𝒓 (Co-Owner)', value: '𝑪𝒐-𝒐𝒘𝒏𝒆𝒓' },
    { label: '𝑶𝒘𝒏𝒆𝒓 (Owner)', value: '𝑶𝒘𝒏𝒆𝒓' },
  ];

  const handleCopyTag = (text: string, index: number) => {
    sounds.playClick();
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white font-heading flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-sky-400" />
          <span>{lang === 'tl' ? 'Z.V.R Tagname Generator' : 'Z.V.R Tagname Generator'}</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {lang === 'tl'
            ? 'Gumawa ng opisyal na clan tag para sa MLBB, CODM, Facebook, o Discord.'
            : 'Generate your official clan tag for MLBB, CODM, Facebook, or Discord.'}
        </p>
      </div>

      {/* Generator Tool Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Input Nickname */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
              {lang === 'tl' ? 'Iyong Nickname / IGN' : 'Your Nickname / IGN'}
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. ANGEL, VALKYRIE, SHADOW"
              maxLength={18}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium text-sm focus:border-sky-400 outline-none transition-colors"
            />
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
              {lang === 'tl' ? 'Pumili ng Tungkulin / Role' : 'Clan Rank / Role'}
            </label>
            <select
              value={role}
              onChange={(e) => {
                sounds.playClick();
                setRole(e.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium text-sm focus:border-sky-400 outline-none transition-colors"
            >
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Real-time Small Caps Preview */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            {lang === 'tl' ? 'Small Caps Conversion:' : 'Small Caps Conversion:'}
          </span>
          <span className="font-mono text-sky-300 font-bold tracking-wider">
            {toSmallCaps(nickname || 'name')}
          </span>
        </div>
      </div>

      {/* Generated Formats */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span>{lang === 'tl' ? 'Mga Pagpipiliang Estilo' : 'Generated Tag Styles'}</span>
        </h3>

        <div className="grid grid-cols-1 gap-3">
          {TAG_STYLES.map((style, idx) => {
            const formatted = style.format(nickname || 'NAME', role);
            const isCopied = copiedIndex === idx;

            return (
              <div
                key={style.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all"
              >
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    {style.label}
                  </span>
                  <div className="font-mono text-sm sm:text-base text-white select-all">
                    {formatted}
                  </div>
                </div>

                <button
                  onClick={() => handleCopyTag(formatted, idx)}
                  className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{lang === 'tl' ? 'Nakopya!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{lang === 'tl' ? 'Kopyahin' : 'Copy Tag'}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { ScheduledMatch, Team } from '../types/baseball';
import { X, Trophy, Award } from 'lucide-react';

interface MatchDetailModalProps {
  match: ScheduledMatch | null;
  teams: Team[];
  onClose: () => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ match, teams, onClose }) => {
  if (!match || match.status !== 'finished') return null;

  const topTeam = teams.find(t => t.id === match.topTeamId);
  const bottomTeam = teams.find(t => t.id === match.bottomTeamId);

  const inningsTop = match.inningsTop || [];
  const inningsBottom = match.inningsBottom || [];
  const totalInnings = Math.max(9, inningsTop.length);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-slate-800/80 px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold">{match.dateStr} 公式戦</div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span style={{ color: topTeam?.color }}>{topTeam?.name}</span>
              <span className="text-slate-400 text-sm">vs</span>
              <span style={{ color: bottomTeam?.color }}>{bottomTeam?.name}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Linescore Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 overflow-x-auto">
            <table className="w-full text-center text-xs sm:text-sm font-mono">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 text-xs">
                  <th className="text-left py-2 px-2 font-sans">球団</th>
                  {Array.from({ length: totalInnings }).map((_, i) => (
                    <th key={i} className="py-2 px-2 w-7 sm:w-8 font-mono">{i + 1}</th>
                  ))}
                  <th className="py-2 px-2 w-8 font-bold text-white bg-slate-900/60 font-sans">R</th>
                  <th className="py-2 px-2 w-8 text-slate-400 font-sans">H</th>
                  <th className="py-2 px-2 w-8 text-slate-400 font-sans">E</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-semibold">
                {/* Away (Top) */}
                <tr className="hover:bg-slate-900/40">
                  <td className="text-left py-2.5 px-2 font-sans font-bold flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: topTeam?.color }} />
                    <span className="text-white">{topTeam?.shortName}</span>
                  </td>
                  {Array.from({ length: totalInnings }).map((_, i) => (
                    <td key={i} className="py-2.5 px-2 text-slate-300">
                      {inningsTop[i] !== undefined && inningsTop[i] !== null ? inningsTop[i] : (i < 9 ? 0 : '-')}
                    </td>
                  ))}
                  <td className="py-2.5 px-2 font-black text-amber-300 bg-slate-900/80 text-base">{match.topScore}</td>
                  <td className="py-2.5 px-2 text-slate-300">{match.topHits ?? 0}</td>
                  <td className="py-2.5 px-2 text-slate-400">{match.topErrors ?? 0}</td>
                </tr>

                {/* Home (Bottom) */}
                <tr className="hover:bg-slate-900/40">
                  <td className="text-left py-2.5 px-2 font-sans font-bold flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bottomTeam?.color }} />
                    <span className="text-white">{bottomTeam?.shortName}</span>
                  </td>
                  {Array.from({ length: totalInnings }).map((_, i) => (
                    <td key={i} className="py-2.5 px-2 text-slate-300">
                      {inningsBottom[i] !== undefined && inningsBottom[i] !== null ? inningsBottom[i] : (i < 9 ? (match.topScore! < match.bottomScore! && i === 8 ? 'X' : 0) : '-')}
                    </td>
                  ))}
                  <td className="py-2.5 px-2 font-black text-amber-300 bg-slate-900/80 text-base">{match.bottomScore}</td>
                  <td className="py-2.5 px-2 text-slate-300">{match.bottomHits ?? 0}</td>
                  <td className="py-2.5 px-2 text-slate-400">{match.bottomErrors ?? 0}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Decisions & Home Runs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 space-y-1.5">
              <div className="font-bold text-slate-300 mb-1 border-b border-slate-700/50 pb-1 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                責任投手
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-emerald-400 font-bold">［勝］</span>
                <span className="font-semibold text-white">{match.winningPitcherName || '－'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-rose-400 font-bold">［敗］</span>
                <span className="font-semibold text-white">{match.losingPitcherName || '－'}</span>
              </div>
              {match.savePitcherName && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-sky-400 font-bold">［Ｓ］</span>
                  <span className="font-semibold text-white">{match.savePitcherName}</span>
                </div>
              )}
            </div>

            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
              <div className="font-bold text-slate-300 mb-1 border-b border-slate-700/50 pb-1 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-rose-400" />
                本塁打
              </div>
              {match.homeRuns && match.homeRuns.length > 0 ? (
                <ul className="space-y-1 text-slate-300">
                  {match.homeRuns.map((hr, i) => (
                    <li key={i} className="text-[11px] flex items-center gap-1 text-amber-200">
                      <span>⚾</span> {hr}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-slate-500 text-xs py-2 text-center">本塁打なし</div>
              )}
            </div>
          </div>

          {/* Box Scores */}
          <div className="space-y-4">
            {/* Top Team Batting */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
              <div className="text-xs font-bold text-slate-200 mb-2 border-b border-slate-700/50 pb-1">
                {topTeam?.name} 打撃成績
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700/50 text-[11px]">
                      <th className="py-1">選手名</th>
                      <th className="py-1">位置</th>
                      <th className="py-1 text-right">打数</th>
                      <th className="py-1 text-right">安打</th>
                      <th className="py-1 text-right">本塁打</th>
                      <th className="py-1 text-right">打点</th>
                      <th className="py-1 text-right">四球</th>
                      <th className="py-1 text-right">三振</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {match.boxScoreTop?.map((b, i) => (
                      <tr key={i} className="hover:bg-slate-800/40 text-slate-300">
                        <td className="py-1 font-semibold text-white">{b.name}</td>
                        <td className="py-1 text-slate-400 text-[10px]">{b.pos}</td>
                        <td className="py-1 text-right font-mono">{b.ab}</td>
                        <td className="py-1 text-right font-mono font-bold text-amber-300">{b.h}</td>
                        <td className="py-1 text-right font-mono text-rose-300">{b.hr}</td>
                        <td className="py-1 text-right font-mono">{b.rbi}</td>
                        <td className="py-1 text-right font-mono">{b.bb}</td>
                        <td className="py-1 text-right font-mono text-slate-400">{b.so}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Team Batting */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
              <div className="text-xs font-bold text-slate-200 mb-2 border-b border-slate-700/50 pb-1">
                {bottomTeam?.name} 打撃成績
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700/50 text-[11px]">
                      <th className="py-1">選手名</th>
                      <th className="py-1">位置</th>
                      <th className="py-1 text-right">打数</th>
                      <th className="py-1 text-right">安打</th>
                      <th className="py-1 text-right">本塁打</th>
                      <th className="py-1 text-right">打点</th>
                      <th className="py-1 text-right">四球</th>
                      <th className="py-1 text-right">三振</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {match.boxScoreBottom?.map((b, i) => (
                      <tr key={i} className="hover:bg-slate-800/40 text-slate-300">
                        <td className="py-1 font-semibold text-white">{b.name}</td>
                        <td className="py-1 text-slate-400 text-[10px]">{b.pos}</td>
                        <td className="py-1 text-right font-mono">{b.ab}</td>
                        <td className="py-1 text-right font-mono font-bold text-amber-300">{b.h}</td>
                        <td className="py-1 text-right font-mono text-rose-300">{b.hr}</td>
                        <td className="py-1 text-right font-mono">{b.rbi}</td>
                        <td className="py-1 text-right font-mono">{b.bb}</td>
                        <td className="py-1 text-right font-mono text-slate-400">{b.so}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

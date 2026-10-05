import React, { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, Award, Crown, Sparkles, RefreshCw, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

export const SeasonAwardsModal: React.FC = () => {
  const { teams, seasonState, resetGame } = useGame();

  useEffect(() => {
    if (seasonState === 'finished') {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore if not loaded
      }
    }
  }, [seasonState]);

  if (seasonState !== 'finished') return null;

  // Champion team
  const champion = [...teams].sort((a, b) => b.stats.winRate - a.stats.winRate)[0];

  // All players across league
  const allPlayers = teams.flatMap(t => t.players.map(p => ({ ...p, teamName: t.shortName, teamColor: t.color })));
  const allBatters = allPlayers.filter(p => !p.isPitcher);
  const allPitchers = allPlayers.filter(p => p.isPitcher);

  // Qualifying rules: PA >= 143 * 3.1 = 443; IP >= 143
  const qualifiedBatters = allBatters.filter(p => p.batterStats.pa >= 443);
  const batterPool = qualifiedBatters.length > 0 ? qualifiedBatters : allBatters.filter(p => p.batterStats.ab >= 100);

  const seasonGames = Math.max(...teams.map(t => t.stats.games), 1);
  const qualifiedPitchers = allPitchers.filter(p => p.pitcherStats.ipOuts >= seasonGames * 3);
  const eraLeader = qualifiedPitchers.length > 0
    ? [...qualifiedPitchers].sort((a, b) => {
        if (a.pitcherStats.era !== b.pitcherStats.era) return a.pitcherStats.era - b.pitcherStats.era;
        return b.pitcherStats.ipOuts - a.pitcherStats.ipOuts;
      })[0]
    : null;
  const avgLeader = [...batterPool].sort((a, b) => b.batterStats.avg - a.batterStats.avg)[0];
  const hrLeader = [...allBatters].sort((a, b) => b.batterStats.hr - a.batterStats.hr)[0];
  const rbiLeader = [...allBatters].sort((a, b) => b.batterStats.rbi - a.batterStats.rbi)[0];
  const hitsLeader = [...allBatters].sort((a, b) => b.batterStats.hits - a.batterStats.hits)[0];
  const sbLeader = [...allBatters].sort((a, b) => b.batterStats.sb - a.batterStats.sb)[0];
  const obpLeader = [...batterPool].sort((a, b) => b.batterStats.obp - a.batterStats.obp)[0];

  const winLeader = [...allPitchers].sort((a, b) => b.pitcherStats.wins - a.pitcherStats.wins)[0];
  const saveLeader = [...allPitchers].sort((a, b) => b.pitcherStats.saves - a.pitcherStats.saves)[0];
  const soLeader = [...allPitchers].sort((a, b) => b.pitcherStats.so - a.pitcherStats.so)[0];
  const holdLeader = [...allPitchers].sort((a, b) => b.pitcherStats.holds - a.pitcherStats.holds)[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-300">
        {/* Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 p-6 sm:p-8 text-center text-slate-950 relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/20 text-slate-950 text-xs font-black mb-2">
              <Sparkles className="w-3.5 h-3.5" /> 143試合 ペナントレース全日程終了
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-1 flex items-center justify-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-950" />
              2026年シーズン 優勝球団
            </h2>
            <div className="text-3xl sm:text-5xl font-black my-2 drop-shadow-sm flex items-center justify-center gap-3">
              <span style={{ color: champion.color }} className="bg-slate-950 px-4 py-1 rounded-2xl shadow-xl">
                {champion.name}
              </span>
            </div>
            <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-2">
              {champion.stats.wins}勝 {champion.stats.losses}敗 {champion.stats.draws}分 (勝率 {champion.stats.winRate.toFixed(3)})
            </p>
          </div>
        </div>

        {/* Awards Content */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          {/* Individual Titles Batting */}
          <div>
            <h3 className="text-sm sm:text-base font-bold text-amber-300 flex items-center gap-2 mb-3 pb-1 border-b border-slate-800">
              <Award className="w-4 h-4" /> 打撃部門 個人タイトル表彰
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {/* 首位打者 */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                <div className="text-slate-400 font-semibold mb-1 flex items-center justify-between">
                  <span>首位打者</span>
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-sm font-bold text-white truncate">{avgLeader?.name || '－'}</div>
                <div className="text-[11px] text-slate-400">{avgLeader?.teamName}</div>
                <div className="text-base font-black text-amber-300 font-mono mt-1">
                  .{avgLeader ? (avgLeader.batterStats.avg * 1000).toFixed(0).padStart(3, '0') : '000'}
                </div>
              </div>

              {/* 本塁打王 */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                <div className="text-slate-400 font-semibold mb-1 flex items-center justify-between">
                  <span>本塁打王</span>
                  <Crown className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-sm font-bold text-white truncate">{hrLeader?.name || '－'}</div>
                <div className="text-[11px] text-slate-400">{hrLeader?.teamName}</div>
                <div className="text-base font-black text-rose-300 font-mono mt-1">
                  {hrLeader?.batterStats.hr || 0} 本
                </div>
              </div>

              {/* 打点王 */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                <div className="text-slate-400 font-semibold mb-1 flex items-center justify-between">
                  <span>打点王</span>
                  <Crown className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="text-sm font-bold text-white truncate">{rbiLeader?.name || '－'}</div>
                <div className="text-[11px] text-slate-400">{rbiLeader?.teamName}</div>
                <div className="text-base font-black text-sky-300 font-mono mt-1">
                  {rbiLeader?.batterStats.rbi || 0} 点
                </div>
              </div>

              {/* 最多安打 */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                <div className="text-slate-400 font-semibold mb-1">最多安打</div>
                <div className="text-sm font-bold text-white truncate">{hitsLeader?.name || '－'}</div>
                <div className="text-[11px] text-slate-400">{hitsLeader?.teamName}</div>
                <div className="text-base font-black text-slate-200 font-mono mt-1">
                  {hitsLeader?.batterStats.hits || 0} 安打
                </div>
              </div>

              {/* 盗塁王 */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                <div className="text-slate-400 font-semibold mb-1">盗塁王</div>
                <div className="text-sm font-bold text-white truncate">{sbLeader?.name || '－'}</div>
                <div className="text-[11px] text-slate-400">{sbLeader?.teamName}</div>
                <div className="text-base font-black text-emerald-300 font-mono mt-1">
                  {sbLeader?.batterStats.sb || 0} 盗塁
                </div>
              </div>

              {/* 最高出塁率 */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                <div className="text-slate-400 font-semibold mb-1">最高出塁率</div>
                <div className="text-sm font-bold text-white truncate">{obpLeader?.name || '－'}</div>
                <div className="text-[11px] text-slate-400">{obpLeader?.teamName}</div>
                <div className="text-base font-black text-purple-300 font-mono mt-1">
                  .{obpLeader ? (obpLeader.batterStats.obp * 1000).toFixed(0).padStart(3, '0') : '000'}
                </div>
              </div>
            </div>
          </div>

          {/* Individual Titles Pitching */}
          <div>
            <h3 className="text-sm sm:text-base font-bold text-sky-300 flex items-center gap-2 mb-3 pb-1 border-b border-slate-800">
              <Award className="w-4 h-4" /> 投手部門 個人タイトル表彰
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {/* 最優秀防御率 */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                <div className="text-slate-400 font-semibold mb-1 flex items-center justify-between">
                  <span>最優秀防御率</span>
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-sm font-bold text-white truncate">{eraLeader?.name || '－'}</div>
                <div className="text-[11px] text-slate-400">{eraLeader ? eraLeader.teamName : '規定到達者なし'}</div>
                <div className="text-base font-black text-amber-300 font-mono mt-1">
                  {eraLeader ? eraLeader.pitcherStats.era.toFixed(2) : '－'}
                </div>
              </div>

              {/* 最多勝利 */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                <div className="text-slate-400 font-semibold mb-1 flex items-center justify-between">
                  <span>最多勝</span>
                  <Crown className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-sm font-bold text-white truncate">{winLeader?.name || '－'}</div>
                <div className="text-[11px] text-slate-400">{winLeader?.teamName}</div>
                <div className="text-base font-black text-emerald-300 font-mono mt-1">
                  {winLeader?.pitcherStats.wins || 0} 勝
                </div>
              </div>

              {/* 最多セーブ */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                <div className="text-slate-400 font-semibold mb-1 flex items-center justify-between">
                  <span>最多セーブ</span>
                  <Crown className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="text-sm font-bold text-white truncate">{saveLeader?.name || '－'}</div>
                <div className="text-[11px] text-slate-400">{saveLeader?.teamName}</div>
                <div className="text-base font-black text-sky-300 font-mono mt-1">
                  {saveLeader?.pitcherStats.saves || 0} Ｓ
                </div>
              </div>

              {/* 最多奪三振 */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                <div className="text-slate-400 font-semibold mb-1">最多奪三振</div>
                <div className="text-sm font-bold text-white truncate">{soLeader?.name || '－'}</div>
                <div className="text-[11px] text-slate-400">{soLeader?.teamName}</div>
                <div className="text-base font-black text-slate-200 font-mono mt-1">
                  {soLeader?.pitcherStats.so || 0} 奪三振
                </div>
              </div>

              {/* 最優秀中継ぎ */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                <div className="text-slate-400 font-semibold mb-1">最優秀中継ぎ</div>
                <div className="text-sm font-bold text-white truncate">{holdLeader?.name || '－'}</div>
                <div className="text-[11px] text-slate-400">{holdLeader?.teamName}</div>
                <div className="text-base font-black text-indigo-300 font-mono mt-1">
                  {holdLeader?.pitcherStats.holds || 0} ホールド
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <p className="text-slate-400">
            ※ 盗塁王・本塁打王・打点王・最優秀中継ぎ・最多セーブは規定打席／投球回に関係なく単純に最多の選手が獲得します。首位打者・最高出塁率・最優秀防御率は規定到達者が対象です。
          </p>
          <button
            onClick={() => resetGame()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold transition flex items-center gap-2 shadow-md"
          >
            <RefreshCw className="w-4 h-4" />
            新シーズンを開始する
          </button>
        </div>
      </div>
    </div>
  );
};

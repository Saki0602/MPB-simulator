import React from 'react';
import { useGame } from '../context/GameContext';
import {
  Play,
  Calendar,
  Trophy,
  BarChart3,
  Sliders,
  FastForward,
  Award,
  Flame,
  Crown,
  ChevronRight,
  Globe,
  ExternalLink,
  Laptop,
  FolderDown,
  Sparkles
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const {
    teams,
    schedule,
    calendarDays,
    currentDayIndex,
    currentDateStr,
    seasonState,
    userTeamId,
    skipDay,
    skipMultipleDays,
    skipToEndOfSeason,
    startFeaturedMatch,
    skipSingleMatch,
    setActiveScreen,
    setSelectedMatchForDetail,
  } = useGame();

  const userTeam = teams.find(t => t.id === userTeamId) || teams[0];
  const sortedTeams = [...teams].sort((a, b) => a.stats.rank - b.stats.rank);

  // Today's matches
  const currentDay = calendarDays[currentDayIndex];
  const todayMatches = currentDay
    ? schedule.filter(m => currentDay.matchIds.includes(m.id))
    : [];

  const userMatchToday = todayMatches.find(
    m => m.topTeamId === userTeam.id || m.bottomTeamId === userTeam.id
  );

  // Quick leaders calculation
  const maxGames = Math.max(...teams.map(t => t.stats.games), 1);
  const allPlayers = teams.flatMap(t => t.players.map(p => ({
    ...p,
    teamName: t.shortName,
    teamGames: t.stats.games,
  })));
  const batters = allPlayers.filter(p => !p.isPitcher);
  const pitchers = allPlayers.filter(p => p.isPitcher);

  // Batter qualification: PA >= maxGames * 3.1
  const qualifiedBatters = batters.filter(p => p.batterStats.pa >= Math.floor(maxGames * 3.1));
  const batterPool = qualifiedBatters.length > 0 ? qualifiedBatters : batters;

  // Pitcher regulation innings: IP >= teamGames * 1.0 (ipOuts >= teamGames * 3)
  const qualifiedPitchers = pitchers.filter(p => p.pitcherStats.ipOuts >= p.teamGames * 3);

  const avgLeader = [...batterPool].sort((a, b) => b.batterStats.avg - a.batterStats.avg)[0];
  const hrLeader = [...batters].sort((a, b) => b.batterStats.hr - a.batterStats.hr)[0];
  // ERA leader strictly requires regulation innings!
  const eraLeader = qualifiedPitchers.length > 0
    ? [...qualifiedPitchers].sort((a, b) => {
        if (a.pitcherStats.era !== b.pitcherStats.era) return a.pitcherStats.era - b.pitcherStats.era;
        return b.pitcherStats.ipOuts - a.pitcherStats.ipOuts;
      })[0]
    : null;
  const winLeader = [...pitchers].sort((a, b) => b.pitcherStats.wins - a.pitcherStats.wins)[0];

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-5 space-y-6">
      {/* Hero: User Team Status & Quick Action */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-xl border-2 border-white/20 shrink-0"
              style={{ backgroundColor: userTeam.color }}
            >
              {userTeam.shortName[0]}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {userTeam.leagueName ? `${userTeam.leagueName} ` : ''}現在 第 {userTeam.stats.rank} 位
                </span>
                {userTeam.stats.isChampion && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-slate-950 flex items-center gap-1 shadow-sm">
                    <Trophy className="w-3 h-3 text-slate-950" /> 優勝決定！
                  </span>
                )}
                {!userTeam.stats.isChampion && userTeam.stats.magicNumber && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-600 text-white animate-pulse shadow-sm">
                    優勝マジック M{userTeam.stats.magicNumber} 点灯中！
                  </span>
                )}
                <span className="text-xs text-slate-400">{userTeam.city} • 本拠地: {userTeam.stadium}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {userTeam.name}
              </h2>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300 mt-1 font-semibold">
                <span>{userTeam.stats.wins}勝 {userTeam.stats.losses}敗 {userTeam.stats.draws}分</span>
                <span>•</span>
                <span className="font-mono text-amber-300">勝率 .{userTeam.stats.winRate > 0 ? (userTeam.stats.winRate * 1000).toFixed(0).padStart(3, '0') : '000'}</span>
                <span>•</span>
                <span>差: {userTeam.stats.rank === 1 ? (userTeam.stats.isChampion ? '優勝' : userTeam.stats.magicNumber ? `M${userTeam.stats.magicNumber}` : '－') : userTeam.stats.gamesBehind.toFixed(1)}</span>
                <span>•</span>
                <span className={`px-2 py-0.2 rounded-full font-mono text-xs ${
                  userTeam.stats.streak.startsWith('W') ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {userTeam.stats.streak}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Sim Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {seasonState !== 'finished' ? (
              <>
                <button
                  onClick={() => skipDay()}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-extrabold text-xs sm:text-sm transition shadow-lg flex items-center gap-2"
                >
                  <FastForward className="w-4 h-4" />
                  本日をスキップ
                </button>
                <button
                  onClick={() => skipMultipleDays(7)}
                  className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm transition shadow flex items-center gap-2"
                >
                  1週間進める
                </button>
                <button
                  onClick={() => setActiveScreen('lineup')}
                  className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm transition shadow flex items-center gap-2"
                >
                  <Sliders className="w-4 h-4" />
                  オーダー調整
                </button>
              </>
            ) : (
              <div className="text-right">
                <span className="text-sm font-bold text-amber-400 block mb-1">
                  143試合 全日程終了！
                </span>
                <button
                  onClick={() => setActiveScreen('standings')}
                  className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs transition shadow"
                >
                  最終順位・表彰を見る
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's Match Preview Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <span>本日 {currentDateStr} の試合予定</span>
          </h3>
          <button
            onClick={() => setActiveScreen('pennant')}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
          >
            ペナント日程表 &rarr;
          </button>
        </div>

        {currentDay?.isOffDay ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            本日は移動日・休養日（月曜休み）です。火〜日の6連戦に向けて、全選手の疲労が回復します。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {todayMatches.map(match => {
              const topTeam = teams.find(t => t.id === match.topTeamId)!;
              const bottomTeam = teams.find(t => t.id === match.bottomTeamId)!;
              const isFinished = match.status === 'finished';

              return (
                <div
                  key={match.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-md hover:border-slate-700 transition"
                >
                  <div className="text-[10px] text-slate-400 mb-2 flex items-center justify-between">
                    <span>{bottomTeam.stadium}</span>
                    {isFinished ? (
                      <span className="text-emerald-400 font-bold">試合終了</span>
                    ) : (
                      <span className="text-sky-400 font-bold">試合前</span>
                    )}
                  </div>

                  {/* Teams / Score */}
                  <div className="space-y-2 my-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: topTeam.color }} />
                        <span className="font-bold text-white">{topTeam.name}</span>
                      </div>
                      <span className="font-mono font-black text-sm text-slate-200">
                        {isFinished ? match.topScore : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bottomTeam.color }} />
                        <span className="font-bold text-white">{bottomTeam.name}</span>
                      </div>
                      <span className="font-mono font-black text-sm text-slate-200">
                        {isFinished ? match.bottomScore : ''}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 pt-2 border-t border-slate-800">
                    {isFinished ? (
                      <button
                        onClick={() => setSelectedMatchForDetail(match)}
                        className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                      >
                        スコア詳細
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => startFeaturedMatch(match.id)}
                          className="py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs transition shadow"
                        >
                          注目試合
                        </button>
                        <button
                          onClick={() => skipSingleMatch(match.id)}
                          className="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                        >
                          スキップ
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Standings Quick Snapshot & Leaders Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Standings Snapshot (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>ペナントレース 順位速報</span>
            </h3>
            <button
              onClick={() => setActiveScreen('standings')}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
            >
              全順位表を見る &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 text-[11px]">
                  <th className="py-2 text-center w-8">順</th>
                  <th className="py-2">球団名</th>
                  <th className="py-2 text-right">勝</th>
                  <th className="py-2 text-right">敗</th>
                  <th className="py-2 text-right">分</th>
                  <th className="py-2 text-right text-amber-300 font-bold">勝率</th>
                  <th className="py-2 text-right" title="差 / 首位はマジックまたは優勝決定">差 / M</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {sortedTeams.map(t => (
                  <tr key={t.id} className={`hover:bg-slate-800/40 ${t.id === userTeamId ? 'bg-sky-950/30' : ''}`}>
                    <td className="py-2 text-center font-bold text-slate-300">{t.stats.rank}</td>
                    <td className="py-2 font-bold text-white flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      <span className="truncate">{t.name}</span>
                      {t.stats.isChampion && (
                        <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full shrink-0">
                          優勝
                        </span>
                      )}
                      {!t.stats.isChampion && t.stats.magicNumber && (
                        <span className="text-[9px] bg-rose-600 text-white font-black px-1.5 py-0.2 rounded-full shrink-0 animate-pulse">
                          M{t.stats.magicNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right font-mono text-emerald-400 font-bold">{t.stats.wins}</td>
                    <td className="py-2 text-right font-mono text-rose-400">{t.stats.losses}</td>
                    <td className="py-2 text-right font-mono text-slate-400">{t.stats.draws}</td>
                    <td className="py-2 text-right font-mono font-bold text-amber-300">
                      .{t.stats.winRate > 0 ? (t.stats.winRate * 1000).toFixed(0).padStart(3, '0') : '000'}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-300">
                      {t.stats.rank === 1 ? (
                        t.stats.isChampion ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px]">
                            優勝決定
                          </span>
                        ) : t.stats.magicNumber ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-black text-[10px] tracking-wider">
                            M{t.stats.magicNumber}
                          </span>
                        ) : (
                          '－'
                        )
                      ) : (
                        t.stats.gamesBehind.toFixed(1)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leaders Snapshot (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-rose-400" />
              <span>タイトル争い トップ</span>
            </h3>
            <button
              onClick={() => setActiveScreen('stats')}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
            >
              個人成績ランキング &rarr;
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {/* Batting Avg */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">首位打者</span>
                <span className="font-bold text-white">{avgLeader?.name || '－'}</span>
                <span className="text-[10px] text-slate-500 ml-1">({avgLeader?.teamName})</span>
              </div>
              <span className="font-mono font-black text-amber-300 text-sm">
                .{avgLeader?.batterStats.avg > 0 ? (avgLeader.batterStats.avg * 1000).toFixed(0).padStart(3, '0') : '000'}
              </span>
            </div>

            {/* HR */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">本塁打王</span>
                <span className="font-bold text-white">{hrLeader?.name || '－'}</span>
                <span className="text-[10px] text-slate-500 ml-1">({hrLeader?.teamName})</span>
              </div>
              <span className="font-mono font-black text-rose-300 text-sm">
                {hrLeader?.batterStats.hr || 0} 本
              </span>
            </div>

            {/* ERA */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">最優秀防御率</span>
                  <span className="text-[9px] text-sky-400 font-semibold">（規定{maxGames.toFixed(1)}回）</span>
                </div>
                <span className="font-bold text-white">{eraLeader?.name || '－'}</span>
                <span className="text-[10px] text-slate-500 ml-1">({eraLeader?.teamName || '規定到達者なし'})</span>
              </div>
              <span className="font-mono font-black text-sky-300 text-sm">
                {eraLeader ? eraLeader.pitcherStats.era.toFixed(2) : '－'}
              </span>
            </div>

            {/* Wins */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">最多勝</span>
                <span className="font-bold text-white">{winLeader?.name || '－'}</span>
                <span className="text-[10px] text-slate-500 ml-1">({winLeader?.teamName})</span>
              </div>
              <span className="font-mono font-black text-emerald-300 text-sm">
                {winLeader?.pitcherStats.wins || 0} 勝
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Standalone Browser Play & HTML Export Card */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              ブラウザ機能・最新版
            </span>
            <span className="text-xs text-slate-400">
              全画面プレイ ＆ オフライン対応
            </span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-sky-400" />
            <span>ブラウザで直接遊ぶ / 単一HTMLファイルの保存</span>
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            大正義狂人軍・横浜・名鉄・阪急・社会人選抜・広島RCC（ロイヤルリーグ）とキングダムリーグ、各球団30名編成、月曜休みの6連戦・1日3試合のペナント日程をすべて含んだ最新ブラウザ版です。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href="/mpb_baseball_game.html"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span>別タブで直接開く</span>
          </a>

          <button
            onClick={() => setActiveScreen('saveLoad')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <FolderDown className="w-4 h-4 text-sky-400 shrink-0" />
            <span>HTML保存 / セーブ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

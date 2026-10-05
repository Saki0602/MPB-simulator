import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, TrendingUp, Sparkles, Award, Layers } from 'lucide-react';
import { Team } from '../types/baseball';

export const StandingsView: React.FC = () => {
  const { teams, userTeamId, leagueType, leagueStructure, setActiveScreen } = useGame();

  const isMpb = leagueType === 'mpb';
  const isTwoLeague = leagueStructure === 'two_league';

  // League division IDs
  const league1Id = isMpb ? 'royal' : 'league_a';
  const league2Id = isMpb ? 'kingdom' : 'league_b';
  const league1Name = isMpb ? 'ロイヤルリーグ' : 'アルファ・リーグ';
  const league2Name = isMpb ? 'キングダムリーグ' : 'ベータ・リーグ';

  const [activeTab, setActiveTab] = useState<'both' | 'league1' | 'league2' | 'overall'>('both');

  // Filter groups
  const league1Teams = teams.filter(t => t.leagueId === league1Id || (isMpb && t.leagueId === 'central')).sort((a, b) => a.stats.rank - b.stats.rank);
  const league2Teams = teams.filter(t => t.leagueId === league2Id || (isMpb && t.leagueId === 'pacific')).sort((a, b) => a.stats.rank - b.stats.rank);

  // Overall sort
  const overallTeams = [...teams].sort((a, b) => {
    if (b.stats.winRate !== a.stats.winRate) return b.stats.winRate - a.stats.winRate;
    if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
    return (b.stats.runsScored - b.stats.runsAllowed) - (a.stats.runsScored - a.stats.runsAllowed);
  });

  const renderTable = (tableTeams: Team[], title?: string, leaderName?: string) => {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {title && (
          <div className="bg-slate-950/90 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <h3 className="font-black text-white text-sm sm:text-base">{title}</h3>
              <span className="text-xs text-slate-400">({tableTeams.length}球団)</span>
            </div>
            {tableTeams[0] && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">
                  首位: <span className="font-bold text-amber-300">{tableTeams[0].name}</span>
                  <span className="ml-1 font-mono text-slate-300">({tableTeams[0].stats.wins}勝{tableTeams[0].stats.losses}敗)</span>
                </span>
                {tableTeams[0].stats.isChampion ? (
                  <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black text-xs shadow-sm flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-slate-950" />
                    優勝決定
                  </span>
                ) : tableTeams[0].stats.magicNumber ? (
                  <span className="bg-rose-600 text-white px-2.5 py-0.5 rounded-full font-black text-xs shadow-sm animate-pulse">
                    優勝マジック: {tableTeams[0].stats.magicNumber} (M{tableTeams[0].stats.magicNumber})
                  </span>
                ) : null}
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-xs">
                <th className="py-3 px-3 sm:px-4 text-center w-12 font-bold">順位</th>
                <th className="py-3 px-3 sm:px-4 font-bold">球団名</th>
                <th className="py-3 px-2 text-right font-bold">試合</th>
                <th className="py-3 px-2 text-right font-bold text-emerald-400">勝</th>
                <th className="py-3 px-2 text-right font-bold text-rose-400">敗</th>
                <th className="py-3 px-2 text-right font-bold text-slate-400">分</th>
                <th className="py-3 px-3 text-right font-bold text-amber-300">勝率</th>
                <th className="py-3 px-3 text-right font-bold" title="ゲーム差 / 首位チームは優勝マジック(M)または優勝決定">差 / M</th>
                <th className="py-3 px-2 text-right font-bold text-slate-300">得点</th>
                <th className="py-3 px-2 text-right font-bold text-slate-300">失点</th>
                <th className="py-3 px-2 text-right font-bold text-slate-400">得失</th>
                <th className="py-3 px-3 text-center font-bold">連勝/敗</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {tableTeams.map((team, idx) => {
                const isUser = team.id === userTeamId;
                const runDiff = team.stats.runsScored - team.stats.runsAllowed;
                const rankToDisplay = isTwoLeague && title !== '全球団総合' ? team.stats.rank : idx + 1;

                return (
                  <tr
                    key={team.id}
                    className={`hover:bg-slate-800/40 transition ${
                      isUser ? 'bg-sky-950/30 font-bold' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-3 sm:px-4 text-center font-black">
                      {rankToDisplay === 1 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-md">
                          1
                        </span>
                      ) : rankToDisplay === 2 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-xs">
                          2
                        </span>
                      ) : rankToDisplay === 3 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs">
                          3
                        </span>
                      ) : (
                        <span className="text-slate-400">{rankToDisplay}</span>
                      )}
                    </td>

                    {/* Team Name */}
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
                          style={{ backgroundColor: team.color }}
                        />
                        <span className="text-white font-bold text-sm sm:text-base">
                          {team.name}
                        </span>
                        {isUser && (
                          <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded border border-sky-400/30 shrink-0">
                            自球団
                          </span>
                        )}
                        {/* Magic or Clinched badge */}
                        {team.stats.isChampion && (
                          <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5 shrink-0">
                            <Trophy className="w-2.5 h-2.5 text-slate-950" /> 優勝決定
                          </span>
                        )}
                        {!team.stats.isChampion && team.stats.magicNumber && (
                          <span className="text-[10px] bg-rose-600 text-white font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse shrink-0">
                            M{team.stats.magicNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Games */}
                    <td className="py-3 px-2 text-right font-mono text-slate-300">
                      {team.stats.games}
                    </td>

                    {/* Wins */}
                    <td className="py-3 px-2 text-right font-mono font-bold text-emerald-400">
                      {team.stats.wins}
                    </td>

                    {/* Losses */}
                    <td className="py-3 px-2 text-right font-mono text-rose-400">
                      {team.stats.losses}
                    </td>

                    {/* Draws */}
                    <td className="py-3 px-2 text-right font-mono text-slate-400">
                      {team.stats.draws}
                    </td>

                    {/* Win Rate */}
                    <td className="py-3 px-3 text-right font-mono font-black text-amber-300 text-sm">
                      .{team.stats.winRate > 0 ? (team.stats.winRate * 1000).toFixed(0).padStart(3, '0') : '000'}
                    </td>

                    {/* Games Behind / Magic */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">
                      {rankToDisplay === 1 ? (
                        team.stats.isChampion ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-xs">
                            優勝決定
                          </span>
                        ) : team.stats.magicNumber ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-rose-600 text-white font-black text-xs tracking-wider">
                            M{team.stats.magicNumber}
                          </span>
                        ) : (
                          '－'
                        )
                      ) : (
                        team.stats.gamesBehind.toFixed(1)
                      )}
                    </td>

                    {/* Runs Scored */}
                    <td className="py-3 px-2 text-right font-mono text-slate-300">
                      {team.stats.runsScored}
                    </td>

                    {/* Runs Allowed */}
                    <td className="py-3 px-2 text-right font-mono text-slate-400">
                      {team.stats.runsAllowed}
                    </td>

                    {/* Run Diff */}
                    <td className={`py-3 px-2 text-right font-mono font-semibold ${runDiff > 0 ? 'text-emerald-400' : runDiff < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {runDiff > 0 ? `+${runDiff}` : runDiff}
                    </td>

                    {/* Streak */}
                    <td className="py-3 px-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                        team.stats.streak.startsWith('W')
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : team.stats.streak.startsWith('L')
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {team.stats.streak}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              公式順位表
            </span>
            <span className="text-xs text-slate-400">
              {isTwoLeague ? `${isMpb ? 'ロイヤル / キングダム 2リーグ制' : 'A・B 2リーグ制'} • 全${teams.length}球団` : `1リーグ制 • 全${teams.length}球団`}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            ペナントレース 順位表
          </h2>
        </div>

        {/* Tab Controls for 2-League Mode */}
        {isTwoLeague && (
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('both')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'both' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              両リーグ並列
            </button>
            <button
              onClick={() => setActiveTab('league1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'league1' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {league1Name}
            </button>
            <button
              onClick={() => setActiveTab('league2')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'league2' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {league2Name}
            </button>
            <button
              onClick={() => setActiveTab('overall')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'overall' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              全球団総合
            </button>
          </div>
        )}
      </div>

      {/* Standings Content */}
      <div className="space-y-6">
        {!isTwoLeague ? (
          renderTable(overallTeams)
        ) : activeTab === 'both' ? (
          <>
            {renderTable(league1Teams, league1Name)}
            {renderTable(league2Teams, league2Name)}
          </>
        ) : activeTab === 'league1' ? (
          renderTable(league1Teams, league1Name)
        ) : activeTab === 'league2' ? (
          renderTable(league2Teams, league2Name)
        ) : (
          renderTable(overallTeams, '全球団 総合順位表')
        )}
      </div>

      {/* Info Notice */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="space-y-1">
          <div>
            ※ 順位決定ルール: 勝率の高い順。同率の場合は勝利数、得失点差の順で決定します。
            {isTwoLeague && ' 2リーグ制では所属リーグごとにゲーム差・順位が集計されます。'}
          </div>
          <div className="text-slate-500 text-[11px]">
            ※ 優勝マジック（M○）: 首位球団があと何勝すれば他球団が全勝しても追い越せなくなるか（自力優勝）を基準に計算。他球団の敗戦でも減少し、0以下またはシーズン全日程終了で「優勝決定」となります。
          </div>
        </div>
        <button
          onClick={() => setActiveScreen('stats')}
          className="text-sky-400 hover:text-sky-300 font-bold shrink-0"
        >
          個人成績ランキングを見る &rarr;
        </button>
      </div>
    </div>
  );
};

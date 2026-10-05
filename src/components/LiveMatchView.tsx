import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Condition, Player, Position } from '../types/baseball';
import { getAbilityGrade } from '../utils/gradeUtils';
import {
  Play,
  FastForward,
  SkipForward,
  UserCheck,
  Flame,
  Battery,
  Shield,
  Award,
  Circle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Bot,
  Target
} from 'lucide-react';

export const LiveMatchView: React.FC = () => {
  const {
    teams,
    userTeamId,
    activeLiveGame,
    stepLivePitch,
    stepLiveAtBat,
    stepLiveInning,
    finishLiveGame,
    exitLiveGame,
    tacticalPinchHitter,
    tacticalPinchRunner,
    tacticalPitchingChange,
    setActiveScreen,
    setSelectedMatchForDetail,
  } = useGame();

  const [modalMode, setModalMode] = useState<'none' | 'pinch_hitter' | 'pinch_runner' | 'pitching_change'>('none');
  const [selectedBaseForRunner, setSelectedBaseForRunner] = useState<'first' | 'second' | 'third'>('first');

  if (!activeLiveGame) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center space-y-4">
        <div className="text-slate-400">現在進行中の注目試合はありません。</div>
        <button
          onClick={() => setActiveScreen('pennant')}
          className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md transition"
        >
          ペナント日程表から試合を選択する &rarr;
        </button>
      </div>
    );
  }

  const {
    topTeam,
    bottomTeam,
    inning,
    topHalf,
    outs,
    balls,
    strikes,
    runners,
    currentBatter,
    currentPitcher,
    topScores,
    bottomScores,
    topTotalRuns,
    bottomTotalRuns,
    topTotalHits,
    bottomTotalHits,
    topTotalErrors,
    bottomTotalErrors,
    isGameOver,
    playLogs,
    pitchLogs,
    lastPlayDescription,
    topBenchBatters,
    bottomBenchBatters,
    topBullpenPitchers,
    bottomBullpenPitchers,
    topBatterRecords,
    bottomBatterRecords,
  } = activeLiveGame;

  const currentBatterRec = (topHalf ? topBatterRecords : bottomBatterRecords).get(currentBatter.id);

  const getConditionColor = (cond: Condition) => {
    switch (cond) {
      case '絶好調': return 'bg-rose-500 text-white';
      case '好調': return 'bg-amber-500 text-slate-950';
      case '普通': return 'bg-emerald-500 text-white';
      case '不調': return 'bg-sky-600 text-white';
      case '絶不調': return 'bg-purple-600 text-white';
    }
  };

  const getFatigueColor = (fatigue: number) => {
    if (fatigue < 40) return 'bg-emerald-500';
    if (fatigue < 70) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  // User team identity & tactical authority
  const isTopUser = topTeam.id === userTeamId;
  const isBottomUser = bottomTeam.id === userTeamId;
  const isUserTeamInMatch = isTopUser || isBottomUser;
  const userTeam = isTopUser ? topTeam : (isBottomUser ? bottomTeam : null);
  const opponentTeam = isTopUser ? bottomTeam : (isBottomUser ? topTeam : null);

  // Is user currently batting (offense) or pitching/fielding (defense)?
  const isUserOffense = isUserTeamInMatch && (topHalf ? isTopUser : isBottomUser);
  const isUserDefense = isUserTeamInMatch && (topHalf ? isBottomUser : isTopUser);

  // Bench and bullpen for user team only
  const userBenchBatters = isTopUser ? topBenchBatters : bottomBenchBatters;
  const userBullpenPitchers = isTopUser ? topBullpenPitchers : bottomBullpenPitchers;

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-5 space-y-4">
      {/* Top Banner: Scoreboard */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Teams & Inning Header */}
        <div className="bg-slate-950/80 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={exitLiveGame}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition flex items-center gap-1 font-semibold"
              title="ペナント日程表へ戻る"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>日程表へ</span>
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span>{activeLiveGame.match.dateStr}</span>
              <span>•</span>
              <span>{bottomTeam.stadium}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">
              {isGameOver ? '試合終了' : `${inning}回${topHalf ? '表' : '裏'}`}
            </span>
            {isGameOver && (
              <button
                onClick={() => {
                  setSelectedMatchForDetail(activeLiveGame.match);
                }}
                className="text-xs text-sky-400 hover:underline font-semibold"
              >
                ボックススコア詳細
              </button>
            )}
          </div>
        </div>

        {/* Linescore Table */}
        <div className="p-3 sm:p-4 overflow-x-auto">
          <table className="w-full text-center text-xs sm:text-sm font-mono">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 text-xs">
                <th className="text-left py-1.5 px-2 font-sans">チーム</th>
                {Array.from({ length: Math.max(9, topScores.length) }).map((_, i) => (
                  <th key={i} className="py-1.5 px-1.5 w-6 sm:w-7 font-mono text-slate-400">
                    {i + 1}
                  </th>
                ))}
                <th className="py-1.5 px-2 w-8 font-bold text-white bg-slate-800/60 font-sans">R</th>
                <th className="py-1.5 px-2 w-7 text-slate-400 font-sans">H</th>
                <th className="py-1.5 px-2 w-7 text-slate-400 font-sans">E</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-semibold">
              {/* Away / Top */}
              <tr className={topHalf && !isGameOver ? 'bg-sky-950/30' : ''}>
                <td className="text-left py-2 px-2 font-sans font-bold flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: topTeam.color }} />
                  <span className="text-white text-xs sm:text-sm">{topTeam.name}</span>
                  {isTopUser ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold whitespace-nowrap">
                      自チーム
                    </span>
                  ) : (
                    <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono whitespace-nowrap flex items-center gap-0.5">
                      <Bot className="w-2.5 h-2.5 text-slate-400" />
                      AI
                    </span>
                  )}
                  {topHalf && !isGameOver && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500 text-white font-semibold whitespace-nowrap">攻撃中</span>
                  )}
                </td>
                {Array.from({ length: Math.max(9, topScores.length) }).map((_, i) => (
                  <td key={i} className="py-2 px-1.5 text-slate-300">
                    {topScores[i] !== undefined && topScores[i] !== null ? topScores[i] : (i < inning - 1 ? 0 : '-')}
                  </td>
                ))}
                <td className="py-2 px-2 font-black text-amber-300 bg-slate-800/80 text-base">{topTotalRuns}</td>
                <td className="py-2 px-2 text-slate-300">{topTotalHits}</td>
                <td className="py-2 px-2 text-slate-400">{topTotalErrors}</td>
              </tr>

              {/* Home / Bottom */}
              <tr className={!topHalf && !isGameOver ? 'bg-sky-950/30' : ''}>
                <td className="text-left py-2 px-2 font-sans font-bold flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: bottomTeam.color }} />
                  <span className="text-white text-xs sm:text-sm">{bottomTeam.name}</span>
                  {isBottomUser ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold whitespace-nowrap">
                      自チーム
                    </span>
                  ) : (
                    <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono whitespace-nowrap flex items-center gap-0.5">
                      <Bot className="w-2.5 h-2.5 text-slate-400" />
                      AI
                    </span>
                  )}
                  {!topHalf && !isGameOver && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500 text-white font-semibold whitespace-nowrap">攻撃中</span>
                  )}
                </td>
                {Array.from({ length: Math.max(9, topScores.length) }).map((_, i) => (
                  <td key={i} className="py-2 px-1.5 text-slate-300">
                    {bottomScores[i] !== undefined && bottomScores[i] !== null ? bottomScores[i] : (i < inning - 1 ? (topTotalRuns < bottomTotalRuns && i === 8 ? 'X' : 0) : '-')}
                  </td>
                ))}
                <td className="py-2 px-2 font-black text-amber-300 bg-slate-800/80 text-base">{bottomTotalRuns}</td>
                <td className="py-2 px-2 text-slate-300">{bottomTotalHits}</td>
                <td className="py-2 px-2 text-slate-400">{bottomTotalErrors}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Stadium & Field Action Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Diamond Field & Count Visual (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
          {/* Subtle baseball field background grass pattern */}
          <div className="absolute inset-0 bg-emerald-950/20 pointer-events-none" />

          {/* Top Bar inside Field: Count (B-S-O) & Outs */}
          <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            {/* B-S-O Indicators */}
            <div className="space-y-1 font-mono text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="text-sky-400 w-3">B</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded-full ${balls >= 1 ? 'bg-sky-400 shadow-sm shadow-sky-400' : 'bg-slate-800'}`} />
                  <span className={`w-3 h-3 rounded-full ${balls >= 2 ? 'bg-sky-400 shadow-sm shadow-sky-400' : 'bg-slate-800'}`} />
                  <span className={`w-3 h-3 rounded-full ${balls >= 3 ? 'bg-sky-400 shadow-sm shadow-sky-400' : 'bg-slate-800'}`} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 w-3">S</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded-full ${strikes >= 1 ? 'bg-amber-400 shadow-sm shadow-amber-400' : 'bg-slate-800'}`} />
                  <span className={`w-3 h-3 rounded-full ${strikes >= 2 ? 'bg-amber-400 shadow-sm shadow-amber-400' : 'bg-slate-800'}`} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-rose-500 w-3">O</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded-full ${outs >= 1 ? 'bg-rose-500 shadow-sm shadow-rose-500' : 'bg-slate-800'}`} />
                  <span className={`w-3 h-3 rounded-full ${outs >= 2 ? 'bg-rose-500 shadow-sm shadow-rose-500' : 'bg-slate-800'}`} />
                </div>
              </div>
            </div>

            {/* Current Inning Badge */}
            <div className="text-right">
              <div className="text-lg font-black text-white">
                {inning}回 {topHalf ? '▲ 表' : '▼ 裏'}
              </div>
              <div className="text-xs text-slate-400">
                {outs} アウト {runners.first && runners.second && runners.third ? '満塁' : runners.first && runners.second ? '一・二塁' : runners.first ? '一塁' : runners.second ? '二塁' : runners.third ? '三塁' : '走者なし'}
              </div>
            </div>
          </div>

          {/* Diamond Graphic */}
          <div className="relative z-10 py-6 sm:py-8 flex items-center justify-center">
            <div className="relative w-48 h-48 sm:w-56 sm:h-56">
              {/* Diamond Outline */}
              <div className="absolute inset-0 m-auto w-32 h-32 sm:w-36 sm:h-36 border-2 border-emerald-600/40 rotate-45 rounded-sm bg-emerald-950/40" />

              {/* Second Base (Top) */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div
                  className={`w-7 h-7 rotate-45 rounded-sm border-2 transition shadow-md ${
                    runners.second
                      ? 'bg-amber-400 border-amber-300 ring-2 ring-amber-400/50'
                      : 'bg-slate-800 border-slate-600'
                  }`}
                />
                {runners.second && (
                  <span className="mt-2 text-[11px] font-bold text-amber-300 bg-slate-950/90 px-2 py-0.5 rounded-full border border-amber-400/30 whitespace-nowrap shadow">
                    {runners.second.name}
                  </span>
                )}
              </div>

              {/* Third Base (Left) */}
              <div className="absolute top-1/2 left-2 -translate-y-1/2 flex flex-col items-center">
                <div
                  className={`w-7 h-7 rotate-45 rounded-sm border-2 transition shadow-md ${
                    runners.third
                      ? 'bg-amber-400 border-amber-300 ring-2 ring-amber-400/50'
                      : 'bg-slate-800 border-slate-600'
                  }`}
                />
                {runners.third && (
                  <span className="mt-2 text-[11px] font-bold text-amber-300 bg-slate-950/90 px-2 py-0.5 rounded-full border border-amber-400/30 whitespace-nowrap shadow">
                    {runners.third.name}
                  </span>
                )}
              </div>

              {/* First Base (Right) */}
              <div className="absolute top-1/2 right-2 -translate-y-1/2 flex flex-col items-center">
                <div
                  className={`w-7 h-7 rotate-45 rounded-sm border-2 transition shadow-md ${
                    runners.first
                      ? 'bg-amber-400 border-amber-300 ring-2 ring-amber-400/50'
                      : 'bg-slate-800 border-slate-600'
                  }`}
                />
                {runners.first && (
                  <span className="mt-2 text-[11px] font-bold text-amber-300 bg-slate-950/90 px-2 py-0.5 rounded-full border border-amber-400/30 whitespace-nowrap shadow">
                    {runners.first.name}
                  </span>
                )}
              </div>

              {/* Home Plate (Bottom) */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="w-6 h-6 bg-slate-200 border border-white rotate-45 rounded-sm" />
                <span className="text-[10px] text-slate-400 mt-1">本塁</span>
              </div>

              {/* Pitcher Mound (Center) */}
              <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-amber-900/60 border border-amber-700/60 flex items-center justify-center text-[10px] text-amber-200 font-bold">
                マウンド
              </div>
            </div>
          </div>

          {/* Last Play Announcement Banner */}
          <div className="relative z-10 bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-xs text-sky-400 font-bold mr-2">［実況］</span>
            <span className="text-sm font-bold text-white">{lastPlayDescription}</span>
          </div>

          {/* Tactical Action Commands */}
          {!isGameOver && (
            <div className="relative z-10 mt-3 pt-3 border-t border-slate-800/80">
              {!isUserTeamInMatch ? (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">AI同士の対戦（他球団観戦モード）</div>
                      <div className="text-[11px] text-slate-400">監督指示は両球団ともAIが戦況に応じて自動采配します</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                    全自動AI采配
                  </span>
                </div>
              ) : isUserOffense ? (
                <div>
                  <div className="text-[11px] font-bold mb-2 flex items-center justify-between">
                    <span className="text-amber-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      自軍監督指示（{userTeam?.name} 攻撃中）
                    </span>
                    <span className="text-slate-400 text-[10px] flex items-center gap-1">
                      <Bot className="w-3 h-3 text-slate-500" />
                      相手守備（{opponentTeam?.name}）: AI監督が継投対応
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => setModalMode('pinch_hitter')}
                      className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <UserCheck className="w-4 h-4" />
                      代打起用
                    </button>

                    <button
                      onClick={() => setModalMode('pinch_runner')}
                      disabled={!runners.first && !runners.second && !runners.third}
                      className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-emerald-300 border border-emerald-400/30 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <FastForward className="w-4 h-4" />
                      代走起用
                    </button>

                    <button
                      onClick={() => stepLivePitch('steal')}
                      disabled={!runners.first && !runners.second}
                      className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-rose-300 border border-rose-400/30 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Target className="w-4 h-4" />
                      盗塁指示
                    </button>

                    <button
                      onClick={() => stepLivePitch('bunt')}
                      className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-200 border border-sky-400/30 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      犠打（バント）指示
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-[11px] font-bold mb-2 flex items-center justify-between">
                    <span className="text-sky-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      自軍監督指示（{userTeam?.name} 守備中）
                    </span>
                    <span className="text-slate-400 text-[10px] flex items-center gap-1">
                      <Bot className="w-3 h-3 text-slate-500" />
                      相手攻撃（{opponentTeam?.name}）: AI監督が代打・作戦対応
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setModalMode('pitching_change')}
                      className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-400/30 text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Shield className="w-4 h-4" />
                      投手交代（継投策）
                    </button>

                    <button
                      onClick={() => stepLivePitch('walk')}
                      className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      申告敬遠
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Batter & Pitcher Cards + Step Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Progression Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 mb-3 flex items-center justify-between">
              <span>ゲーム進行コントロール</span>
              {isGameOver && <span className="text-amber-400 font-extrabold">ゲームセット</span>}
            </h3>

            {!isGameOver ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => stepLivePitch()}
                  className="py-3 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-extrabold text-sm transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-current" />
                  1球進める
                </button>

                <button
                  onClick={() => stepLiveAtBat()}
                  className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  <FastForward className="w-4 h-4" />
                  1打席進める
                </button>

                <button
                  onClick={() => stepLiveInning()}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  <SkipForward className="w-4 h-4" />
                  1イニング進める
                </button>

                <button
                  onClick={() => finishLiveGame()}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition border border-amber-400/30 flex items-center justify-center gap-1.5"
                >
                  試合終了まで一括
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-center py-2 font-bold text-amber-300 text-sm">
                  試合が終了しました
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedMatchForDetail(activeLiveGame.match);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow"
                  >
                    ボックススコア詳細
                  </button>
                  <button
                    onClick={exitLiveGame}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700"
                  >
                    日程表へ戻る
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Current Batter Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <span>打者</span>
                <span className="text-slate-400">({topHalf ? topTeam.shortName : bottomTeam.shortName})</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getConditionColor(currentBatter.condition)}`}>
                  {currentBatter.condition}
                </span>
                <span className="text-[10px] text-slate-400">
                  疲労 {currentBatter.fatigue}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-black text-white">
                  #{currentBatter.number} {currentBatter.name}
                </h4>
                <div className="text-xs text-slate-400 mt-0.5">
                  {currentBatter.bats === 'L' ? '左打' : currentBatter.bats === 'S' ? '両打' : '右打'} • {currentBatter.mainPosition}
                </div>
                {/* 8-Tier Ability Grade Badges */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[10px] font-mono">
                  <span className={`px-1 py-0.2 rounded border font-bold ${getAbilityGrade(currentBatter.contact).badgeClass}`}>
                    巧{getAbilityGrade(currentBatter.contact).grade} {currentBatter.contact}
                  </span>
                  <span className={`px-1 py-0.2 rounded border font-bold ${getAbilityGrade(currentBatter.power).badgeClass}`}>
                    長{getAbilityGrade(currentBatter.power).grade} {currentBatter.power}
                  </span>
                  <span className={`px-1 py-0.2 rounded border font-bold ${getAbilityGrade(currentBatter.speed).badgeClass}`}>
                    走{getAbilityGrade(currentBatter.speed).grade} {currentBatter.speed}
                  </span>
                  <span className={`px-1 py-0.2 rounded border font-bold ${getAbilityGrade(currentBatter.fielding).badgeClass}`}>
                    守{getAbilityGrade(currentBatter.fielding).grade} {currentBatter.fielding}
                  </span>
                </div>
              </div>

              {/* Season stats preview */}
              <div className="text-right">
                <div className="text-sm font-black text-white font-mono">
                  .{currentBatter.batterStats.avg > 0 ? (currentBatter.batterStats.avg * 1000).toFixed(0).padStart(3, '0') : '000'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {currentBatter.batterStats.hr}本 {currentBatter.batterStats.rbi}点
                </div>
              </div>
            </div>

            {/* Today's match record */}
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <span>本日: {currentBatterRec?.ab ?? 0}打数 {currentBatterRec?.h ?? 0}安打 {currentBatterRec?.hr ? `(${currentBatterRec.hr}本)` : ''}</span>
              <span className="text-slate-400">三振{currentBatterRec?.so ?? 0} 四球{currentBatterRec?.bb ?? 0}</span>
            </div>
          </div>

          {/* Current Pitcher Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                <span>投手</span>
                <span className="text-slate-400">({topHalf ? bottomTeam.shortName : topTeam.shortName})</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getConditionColor(currentPitcher.condition)}`}>
                  {currentPitcher.condition}
                </span>
                <span className="text-[10px] text-slate-400">
                  疲労 {currentPitcher.fatigue}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-black text-white">
                  #{currentPitcher.number} {currentPitcher.name}
                </h4>
                <div className="text-xs text-slate-400 mt-0.5">
                  {currentPitcher.throws === 'L' ? '左投' : '右投'} • 最速 {currentPitcher.pitchVelocity}km
                </div>
                {/* 8-Tier Ability Grade Badges */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[10px] font-mono">
                  <span className={`px-1 py-0.2 rounded border font-bold ${getAbilityGrade(currentPitcher.pitchVelocity, true).badgeClass}`}>
                    球速{getAbilityGrade(currentPitcher.pitchVelocity, true).grade} {currentPitcher.pitchVelocity}km
                  </span>
                  <span className={`px-1 py-0.2 rounded border font-bold ${getAbilityGrade(currentPitcher.control).badgeClass}`}>
                    制球{getAbilityGrade(currentPitcher.control).grade} {currentPitcher.control}
                  </span>
                  <span className={`px-1 py-0.2 rounded border font-bold ${getAbilityGrade(currentPitcher.stamina).badgeClass}`}>
                    スタミナ{getAbilityGrade(currentPitcher.stamina).grade} {currentPitcher.stamina}
                  </span>
                </div>
              </div>

              {/* Season stats preview */}
              <div className="text-right">
                <div className="text-sm font-black text-white font-mono">
                  防 {currentPitcher.pitcherStats.era.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400">
                  {currentPitcher.pitcherStats.wins}勝{currentPitcher.pitcherStats.losses}敗 {currentPitcher.pitcherStats.saves}S
                </div>
              </div>
            </div>

            {/* In-game pitch count & stats */}
            {(() => {
              const pRec = topHalf ? activeLiveGame.currentBottomPitcherRecord : activeLiveGame.currentTopPitcherRecord;
              return (
                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <span>球数: <strong className="text-sky-300 font-mono">{pRec.pitchCount}球</strong></span>
                  <span className="text-slate-400">
                    {Math.floor(pRec.ipOuts / 3)}.{pRec.ipOuts % 3}回 被安打{pRec.h} 失点{pRec.r} 奪三振{pRec.so}
                  </span>
                </div>
              );
            })()}

            {/* Pitches arsenal */}
            <div className="mt-2 pt-2 border-t border-slate-800/60 flex flex-wrap gap-1">
              {currentPitcher.pitches.map(pitch => (
                <span key={pitch.id} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <span>{pitch.name} ({pitch.velocity}km)</span>
                  <span className={`px-1 rounded border font-bold font-mono text-[9px] ${getAbilityGrade(pitch.breakAmount).badgeClass}`}>
                    変{getAbilityGrade(pitch.breakAmount).grade}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Play by Play Commentary Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <h3 className="text-xs sm:text-sm font-bold text-slate-300 mb-3 flex items-center justify-between">
          <span>一球速報・試合経過ログ</span>
          <span className="text-xs text-slate-500">{playLogs.length} プレイ記録</span>
        </h3>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {playLogs.length === 0 ? (
            <div className="text-slate-500 text-xs text-center py-4">プレイボール前</div>
          ) : (
            playLogs.map((log) => (
              <div
                key={log.id}
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                  log.result === '本塁打'
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    : log.runsScored > 0
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : log.isOut
                    ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 text-[11px] shrink-0">
                    {log.inning}回{log.topHalf ? '表' : '裏'}
                  </span>
                  <span className="font-bold px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                    {log.result}
                  </span>
                  <span className="font-medium text-slate-200">{log.description}</span>
                </div>
                {log.runsScored > 0 && (
                  <span className="shrink-0 text-xs font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                    +{log.runsScored}点
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tactical Modals */}
      {modalMode === 'pinch_hitter' && userTeam && isUserOffense && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">代打起用（{userTeam.name} 控え野手を選択）</h3>
            <p className="text-xs text-slate-400 mb-4">現在打席: {currentBatter.name}</p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {userBenchBatters.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">起用可能な控え野手がいません</div>
              ) : (
                userBenchBatters.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      tacticalPinchHitter(userTeam.id, p.id);
                      setModalMode('none');
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-left flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <span className="font-bold text-white mr-2">#{p.number} {p.name}</span>
                      <span className="text-[10px] text-slate-400">({p.mainPosition} • {p.bats === 'L' ? '左打' : '右打'})</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[10px]">
                      <span className={`px-1 rounded border font-bold ${getAbilityGrade(p.contact).badgeClass}`}>
                        巧{getAbilityGrade(p.contact).grade}{p.contact}
                      </span>
                      <span className={`px-1 rounded border font-bold ${getAbilityGrade(p.power).badgeClass}`}>
                        長{getAbilityGrade(p.power).grade}{p.power}
                      </span>
                      <span className={`px-1 rounded border font-bold ${getAbilityGrade(p.speed).badgeClass}`}>
                        走{getAbilityGrade(p.speed).grade}{p.speed}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setModalMode('none')}
              className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {modalMode === 'pinch_runner' && userTeam && isUserOffense && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">代走起用（{userTeam.name} 走者と控え選手を選択）</h3>
            
            {/* Pick Base */}
            <div className="flex gap-2 mb-3">
              {runners.first && (
                <button
                  onClick={() => setSelectedBaseForRunner('first')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                    selectedBaseForRunner === 'first' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  一塁: {runners.first.name}
                </button>
              )}
              {runners.second && (
                <button
                  onClick={() => setSelectedBaseForRunner('second')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                    selectedBaseForRunner === 'second' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  二塁: {runners.second.name}
                </button>
              )}
              {runners.third && (
                <button
                  onClick={() => setSelectedBaseForRunner('third')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                    selectedBaseForRunner === 'third' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  三塁: {runners.third.name}
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {userBenchBatters.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    tacticalPinchRunner(userTeam.id, selectedBaseForRunner, p.id);
                    setModalMode('none');
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-left flex items-center justify-between text-xs transition"
                >
                  <div>
                    <span className="font-bold text-white mr-2">#{p.number} {p.name}</span>
                    <span className="text-[10px] text-slate-400">({p.mainPosition})</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded border font-bold ${getAbilityGrade(p.speed).badgeClass}`}>
                      走力 {getAbilityGrade(p.speed).grade}{p.speed}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded border font-bold ${getAbilityGrade(p.stealing).badgeClass}`}>
                      盗塁 {getAbilityGrade(p.stealing).grade}{p.stealing}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setModalMode('none')}
              className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {modalMode === 'pitching_change' && userTeam && isUserDefense && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">投手交代（{userTeam.name} ブルペン投手を選択）</h3>
            <p className="text-xs text-slate-400 mb-4">現在登板: {currentPitcher.name}</p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {userBullpenPitchers.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">ブルペンに登板可能な投手が残っていません</div>
              ) : (
                userBullpenPitchers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      tacticalPitchingChange(userTeam.id, p.id);
                      setModalMode('none');
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-left flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <span className="font-bold text-white mr-2">#{p.number} {p.name}</span>
                      <span className="text-[10px] text-slate-400">({p.throws === 'L' ? '左' : '右'} • {p.pitcherRole})</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[10px]">
                      <span className={`px-1 rounded border font-bold ${getAbilityGrade(p.pitchVelocity, true).badgeClass}`}>
                        球速{getAbilityGrade(p.pitchVelocity, true).grade}{p.pitchVelocity}km
                      </span>
                      <span className={`px-1 rounded border font-bold ${getAbilityGrade(p.control).badgeClass}`}>
                        制{getAbilityGrade(p.control).grade}{p.control}
                      </span>
                      <span className="text-slate-400 font-sans">疲労{p.fatigue}%</span>
                    </div>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setModalMode('none')}
              className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

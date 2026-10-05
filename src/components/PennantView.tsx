import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { ScheduledMatch } from '../types/baseball';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  FastForward,
  SkipForward,
  Trophy,
  Coffee,
  CheckCircle2,
  Sliders,
  Crown,
  Bot,
  X,
  AlertTriangle,
  ArrowRight,
  ArrowRightCircle
} from 'lucide-react';

export const PennantView: React.FC = () => {
  const {
    teams,
    userTeamId,
    schedule,
    calendarDays,
    currentDayIndex,
    currentDateStr,
    seasonState,
    advanceToNextDay,
    skipSingleMatch,
    skipDay,
    skipMultipleDays,
    skipToEndOfSeason,
    startFeaturedMatch,
    setSelectedMatchForDetail,
    setActiveScreen,
    leagueType,
    leagueStructure,
  } = useGame();

  const [viewDayIndex, setViewDayIndex] = useState<number>(currentDayIndex);
  const [showFastForwardConfirm, setShowFastForwardConfirm] = useState<boolean>(false);
  const [leagueFilter, setLeagueFilter] = useState<'all' | 'royal' | 'kingdom' | 'central' | 'pacific' | 'league_a' | 'league_b'>('all');

  const isMpb = leagueType === 'mpb';
  const isTwoLeague = leagueStructure === 'two_league';

  // Keep viewDayIndex in sync when currentDayIndex moves forward if viewing current day
  React.useEffect(() => {
    setViewDayIndex(currentDayIndex);
  }, [currentDayIndex]);

  const currentDay = calendarDays[viewDayIndex] || calendarDays[0];
  const isViewingToday = viewDayIndex === currentDayIndex;

  const dayMatches = currentDay
    ? schedule.filter(m => currentDay.matchIds.includes(m.id))
    : [];

  const filteredMatches = dayMatches.filter(match => {
    if (leagueFilter === 'all') return true;
    const topTeam = teams.find(t => t.id === match.topTeamId);
    const bottomTeam = teams.find(t => t.id === match.bottomTeamId);
    if (leagueFilter === 'royal') {
      return match.leagueId === 'royal' || match.leagueId === 'central' || topTeam?.leagueId === 'royal' || bottomTeam?.leagueId === 'royal';
    }
    if (leagueFilter === 'kingdom') {
      return match.leagueId === 'kingdom' || match.leagueId === 'pacific' || topTeam?.leagueId === 'kingdom' || bottomTeam?.leagueId === 'kingdom';
    }
    return match.leagueId === leagueFilter || topTeam?.leagueId === leagueFilter || bottomTeam?.leagueId === leagueFilter;
  });

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-5 space-y-5">
      {/* Header & Batch Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-500/20 text-sky-400 border border-sky-500/30">
              第 {viewDayIndex + 1} 節
            </span>
            <span className="text-xs text-slate-400">公式戦スケジュール</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-sky-400" />
            {currentDay?.dateStr} の対戦カード
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            注目試合は1球単位・1打席単位で観戦＆采配可能。スキップで瞬時に結果を計算します。
          </p>
        </div>

        {/* Global Progress Controls */}
        {seasonState !== 'finished' ? (
          <div className="flex flex-wrap items-center gap-2">
            {/* 次の日へ移るボタン */}
            <button
              id="btn-advance-next-day"
              onClick={() => advanceToNextDay()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-md flex items-center gap-1.5"
              title="本日を完了して次の日へ日程を進めます"
            >
              <ArrowRightCircle className="w-4 h-4" />
              次の日へ移る
            </button>

            <button
              id="btn-skip-today"
              onClick={() => skipDay()}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow flex items-center gap-1.5"
              title="本日の全試合を一括シミュレーションして翌日へ進みます"
            >
              <FastForward className="w-4 h-4" />
              本日をスキップ
            </button>

            <button
              id="btn-skip-week"
              onClick={() => skipMultipleDays(7)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center gap-1.5"
            >
              <SkipForward className="w-4 h-4" />
              1週間スキップ
            </button>

            <button
              id="btn-skip-month"
              onClick={() => skipMultipleDays(30)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center gap-1.5"
            >
              <SkipForward className="w-4 h-4" />
              1か月スキップ
            </button>

            <button
              id="btn-skip-all"
              onClick={() => setShowFastForwardConfirm(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white font-extrabold text-xs transition shadow flex items-center gap-1.5"
            >
              <Trophy className="w-4 h-4" />
              すべてスキップ
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              全143試合終了
            </span>
            <button
              onClick={() => setActiveScreen('standings')}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition"
            >
              最終順位表を見る
            </button>
          </div>
        )}
      </div>

      {/* Date Navigation Carousel */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs">
        <button
          onClick={() => setViewDayIndex(prev => Math.max(0, prev - 1))}
          disabled={viewDayIndex <= 0}
          className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>前日</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">{currentDay?.dateStr}</span>
          {!isViewingToday && (
            <button
              onClick={() => setViewDayIndex(currentDayIndex)}
              className="text-[11px] px-2 py-0.5 rounded bg-sky-600 text-white font-bold"
            >
              今日へ戻る
            </button>
          )}
        </div>

        <button
          onClick={() => setViewDayIndex(prev => Math.min(calendarDays.length - 1, prev + 1))}
          disabled={viewDayIndex >= calendarDays.length - 1}
          className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition flex items-center gap-1"
        >
          <span>翌日</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Matches Cards */}
      {currentDay?.isOffDay ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
            <Coffee className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">移動日・休養日（月曜休み）</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            本日は試合が組まれていません（毎週月曜日は休養日）。火〜日曜日に行われる6連戦に向けて、登板過多や連戦による野手・投手の疲労が回復します。
          </p>
          {isViewingToday && (
            <button
              id="btn-offday-advance"
              onClick={() => advanceToNextDay()}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg transition flex items-center gap-2 mx-auto"
            >
              <ArrowRightCircle className="w-4 h-4" />
              <span>次の日へ移る &rarr;</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* If today and all matches finished */}
          {isViewingToday && dayMatches.length > 0 && dayMatches.every(m => m.status === 'finished') && (
            <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-in fade-in">
              <div className="flex items-center gap-3 text-emerald-300">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="font-black text-white text-sm">本日の全試合が終了しました！</div>
                  <div className="text-xs text-slate-300 font-normal">個人成績とチーム順位表が更新されています。</div>
                </div>
              </div>
              <button
                id="btn-day-finished-advance"
                onClick={() => advanceToNextDay()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 shrink-0"
              >
                <span>次の日へ移る (第 {currentDayIndex + 2} 節へ)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* League Filter Tabs if Two League */}
          {isTwoLeague && dayMatches.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-xl text-xs">
              <button
                onClick={() => setLeagueFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  leagueFilter === 'all' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                全試合 ({dayMatches.length})
              </button>
              <button
                onClick={() => setLeagueFilter(isMpb ? 'royal' : 'league_a')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  leagueFilter === (isMpb ? 'royal' : 'league_a') || (isMpb && leagueFilter === 'central') ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {isMpb ? 'ロイヤルリーグ' : 'Aリーグ'}
              </button>
              <button
                onClick={() => setLeagueFilter(isMpb ? 'kingdom' : 'league_b')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  leagueFilter === (isMpb ? 'kingdom' : 'league_b') || (isMpb && leagueFilter === 'pacific') ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {isMpb ? 'キングダムリーグ' : 'Bリーグ'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((match) => {
            const topTeam = teams.find(t => t.id === match.topTeamId)!;
            const bottomTeam = teams.find(t => t.id === match.bottomTeamId)!;
            const isFinished = match.status === 'finished';
            const leagueLabel = bottomTeam?.leagueName || (match.leagueId === 'royal' || match.leagueId === 'central' ? 'ロイヤルリーグ' : match.leagueId === 'kingdom' || match.leagueId === 'pacific' ? 'キングダムリーグ' : undefined);

            // Projected Starters (Rotation: ~25 games per starter across 143 games)
            const topRotLen = Math.max(1, topTeam.order.rotation.length);
            const bottomRotLen = Math.max(1, bottomTeam.order.rotation.length);
            const topStarterId = topTeam.order.rotation[topTeam.stats.games % topRotLen] || topTeam.order.rotation[match.dayIndex % topRotLen];
            const bottomStarterId = bottomTeam.order.rotation[bottomTeam.stats.games % bottomRotLen] || bottomTeam.order.rotation[match.dayIndex % bottomRotLen];
            const topStarter = topTeam.players.find(p => p.id === topStarterId) || topTeam.players.find(p => p.isPitcher);
            const bottomStarter = bottomTeam.players.find(p => p.id === bottomStarterId) || bottomTeam.players.find(p => p.isPitcher);
            const isUserMatch = topTeam.id === userTeamId || bottomTeam.id === userTeamId;

            return (
              <div
                key={match.id}
                className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group transition ${
                  isUserMatch ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Stadium & Status Header */}
                <div className="text-[11px] text-slate-400 mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {leagueLabel && isTwoLeague && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-sky-300 font-bold border border-slate-700">
                        {leagueLabel}
                      </span>
                    )}
                    <span>{bottomTeam.stadium}</span>
                    {isUserMatch && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                        <Crown className="w-2.5 h-2.5 text-amber-400" />
                        自チーム戦
                      </span>
                    )}
                  </div>
                  {isFinished ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 試合終了
                    </span>
                  ) : (
                    <span className="text-sky-400 font-bold">予告先発</span>
                  )}
                </div>

                {/* Teams & Score Box */}
                <div className="space-y-3 my-2">
                  {/* Away Team */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: topTeam.color }} />
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                          <span>{topTeam.name}</span>
                          {topTeam.id === userTeamId && (
                            <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold">自軍</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">{topTeam.stats.wins}勝{topTeam.stats.losses}敗{topTeam.stats.draws}分</div>
                      </div>
                    </div>
                    {isFinished ? (
                      <span className={`text-2xl font-black font-mono ${match.topScore! > match.bottomScore!? 'text-amber-300' : 'text-slate-400'}`}>
                        {match.topScore}
                      </span>
                    ) : (
                      <div className="text-right text-xs">
                        <div className="font-semibold text-slate-200">{topStarter?.name}</div>
                        <div className="text-[10px] text-slate-400">防 {topStarter?.pitcherStats.era.toFixed(2)}</div>
                      </div>
                    )}
                  </div>

                  {/* Home Team */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: bottomTeam.color }} />
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                          <span>{bottomTeam.name}</span>
                          {bottomTeam.id === userTeamId && (
                            <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold">自軍</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">{bottomTeam.stats.wins}勝{bottomTeam.stats.losses}敗{bottomTeam.stats.draws}分</div>
                      </div>
                    </div>
                    {isFinished ? (
                      <span className={`text-2xl font-black font-mono ${match.bottomScore! > match.topScore!? 'text-amber-300' : 'text-slate-400'}`}>
                        {match.bottomScore}
                      </span>
                    ) : (
                      <div className="text-right text-xs">
                        <div className="font-semibold text-slate-200">{bottomStarter?.name}</div>
                        <div className="text-[10px] text-slate-400">防 {bottomStarter?.pitcherStats.era.toFixed(2)}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Match Decision or Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-800">
                  {isFinished ? (
                    <div className="space-y-2">
                      <div className="text-[11px] text-slate-300 flex items-center justify-between">
                        <span>勝: {match.winningPitcherName || '－'}</span>
                        <span>敗: {match.losingPitcherName || '－'}</span>
                      </div>
                      <button
                        onClick={() => setSelectedMatchForDetail(match)}
                        className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
                      >
                        ボックススコアを見る
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => startFeaturedMatch(match.id)}
                        className={`py-2 px-2 rounded-xl text-white font-extrabold text-xs transition shadow flex items-center justify-center gap-1 ${
                          isUserMatch
                            ? 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500'
                            : 'bg-gradient-to-r from-sky-700 to-indigo-700 hover:from-sky-600 hover:to-indigo-600'
                        }`}
                      >
                        <PlayCircle className="w-4 h-4 fill-current" />
                        {isUserMatch ? '監督采配' : '観戦'}
                      </button>

                      <button
                        onClick={() => skipSingleMatch(match.id)}
                        className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center justify-center gap-1"
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
        </div>
      )}

      {/* Fast-Forward In-App Modal */}
      {showFastForwardConfirm && (
        <div
          id="fastforward-modal-overlay"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowFastForwardConfirm(false)}
        >
          <div
            className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="flex-1 pr-6">
                <h3 className="text-base font-black text-white">シーズン一括シミュレーション</h3>
                <p className="text-xs text-amber-400 font-medium mt-0.5">
                  全143試合終了まで一気に日程を進めます
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFastForwardConfirm(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-300 space-y-2">
              <p>
                残り全日程（レギュラーシーズン最終戦まで）の試合を一括高速シミュレーションします。
              </p>
              <p className="text-[11px] text-slate-400">
                ※ 途中試合の個人成績や勝敗記録もすべて正式に集計・保存されます。
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowFastForwardConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFastForwardConfirm(false);
                  skipToEndOfSeason();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-extrabold transition shadow flex items-center gap-1.5"
              >
                <FastForward className="w-4 h-4" />
                全日程をシミュレート
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { Player } from '../types/baseball';
import { getAbilityGrade } from '../utils/gradeUtils';
import {
  BarChart3,
  ArrowUpDown,
  Award,
  Crown,
  ArrowDown,
  ArrowUp,
  Zap,
  Flame,
  Shield,
  Target,
  Trophy,
  Check,
  Sparkles
} from 'lucide-react';

interface SortPreset {
  key: string;
  label: string;
  isLowerBetter?: boolean;
  icon?: string;
}

const BATTING_PRESETS: SortPreset[] = [
  { key: 'avg', label: '打率順', isLowerBetter: false, icon: '🎯' },
  { key: 'sb', label: '盗塁順', isLowerBetter: false, icon: '⚡' },
  { key: 'hr', label: '本塁打順', isLowerBetter: false, icon: '💥' },
  { key: 'rbi', label: '打点順', isLowerBetter: false, icon: '🎖️' },
  { key: 'hits', label: '安打数順', isLowerBetter: false, icon: '⚾' },
  { key: 'ops', label: 'OPS順', isLowerBetter: false, icon: '🚀' },
  { key: 'obp', label: '出塁率順', isLowerBetter: false, icon: '🛡️' },
  { key: 'doubles', label: '2塁打順', isLowerBetter: false, icon: '💨' },
  { key: 'runs', label: '得点順', isLowerBetter: false, icon: '🔥' },
];

const BATTING_ALL_OPTIONS = [
  { key: 'avg', label: '打率 (AVG)' },
  { key: 'sb', label: '盗塁 (SB)' },
  { key: 'hr', label: '本塁打 (HR)' },
  { key: 'rbi', label: '打点 (RBI)' },
  { key: 'hits', label: '安打数 (H)' },
  { key: 'ops', label: 'OPS' },
  { key: 'obp', label: '出塁率 (OBP)' },
  { key: 'slg', label: '長打率 (SLG)' },
  { key: 'doubles', label: '二塁打 (2B)' },
  { key: 'runs', label: '得点 (R)' },
  { key: 'games', label: '出場試合数 (G)' },
  { key: 'pa', label: '打席数 (PA)' },
  { key: 'ab', label: '打数 (AB)' },
  { key: 'bb', label: '四球 (BB)' },
  { key: 'so', label: '三振 (SO)' },
];

const PITCHING_PRESETS: SortPreset[] = [
  { key: 'era', label: '防御率順', isLowerBetter: true, icon: '👑' },
  { key: 'wins', label: '勝利数順', isLowerBetter: false, icon: '🏆' },
  { key: 'winLuck', label: '勝ち運順', isLowerBetter: false, icon: '🍀' },
  { key: 'so', label: '奪三振順', isLowerBetter: false, icon: '⚡' },
  { key: 'saves', label: 'セーブ順', isLowerBetter: false, icon: '🧤' },
  { key: 'holds', label: 'ホールド順', isLowerBetter: false, icon: '🛡️' },
  { key: 'ipOuts', label: '投球回順', isLowerBetter: false, icon: '📊' },
  { key: 'whip', label: 'WHIP順', isLowerBetter: true, icon: '🎯' },
  { key: 'completeGames', label: '完投数順', isLowerBetter: false, icon: '🔥' },
];

const PITCHING_ALL_OPTIONS = [
  { key: 'era', label: '防御率 (ERA)' },
  { key: 'wins', label: '勝利数 (W)' },
  { key: 'winLuck', label: '勝ち運 (LUCK)' },
  { key: 'so', label: '奪三振 (SO)' },
  { key: 'saves', label: 'セーブ (SV)' },
  { key: 'holds', label: 'ホールド (HLD)' },
  { key: 'ipOuts', label: '投球回 (IP)' },
  { key: 'whip', label: 'WHIP' },
  { key: 'games', label: '登板数 (G)' },
  { key: 'gamesStarted', label: '先発数 (GS)' },
  { key: 'completeGames', label: '完投数 (CG)' },
  { key: 'losses', label: '敗戦数 (L)' },
  { key: 'hits', label: '被安打 (H)' },
  { key: 'hr', label: '被本塁打 (HR)' },
  { key: 'bb', label: '与四球 (BB)' },
  { key: 'er', label: '自責点 (ER)' },
];

export const StatsView: React.FC = () => {
  const { teams } = useGame();
  const [activeTab, setActiveTab] = useState<'batting' | 'pitching' | 'leaders'>('batting');
  const [onlyQualified, setOnlyQualified] = useState<boolean>(true);
  const [teamFilter, setTeamFilter] = useState<string>('all');
  
  // Sorting state for Batting & Pitching
  const [battingSortField, setBattingSortField] = useState<string>('avg');
  const [battingSortAsc, setBattingSortAsc] = useState<boolean>(false);

  const [pitchingSortField, setPitchingSortField] = useState<string>('era');
  const [pitchingSortAsc, setPitchingSortAsc] = useState<boolean>(false);

  // Highest team games played for calculating qualification
  const maxGames = Math.max(...teams.map(t => t.stats.games), 1);
  const minPA = Math.floor(maxGames * 3.1);

  // Regulation innings: team games * 1.0 (exact outs: team games * 3)
  const currentRegulationTeamGames = teamFilter === 'all'
    ? maxGames
    : (teams.find(t => t.id === teamFilter)?.stats.games ?? maxGames);
  const currentRegulationIP = (currentRegulationTeamGames * 1.0).toFixed(1);

  // Gather all players
  const allPlayers: (Player & { teamName: string; teamColor: string; teamGames: number })[] = useMemo(() => {
    return teams.flatMap(t =>
      t.players.map(p => ({
        ...p,
        teamName: t.name,
        teamColor: t.color,
        teamGames: t.stats.games,
      }))
    );
  }, [teams]);

  const batters = useMemo(() => allPlayers.filter(p => !p.isPitcher), [allPlayers]);
  const pitchers = useMemo(() => allPlayers.filter(p => p.isPitcher), [allPlayers]);

  const isEraSort = pitchingSortField === 'era';

  // Handle Sort for Batting
  const handleBattingSort = (field: string) => {
    if (battingSortField === field) {
      setBattingSortAsc(!battingSortAsc);
    } else {
      setBattingSortField(field);
      setBattingSortAsc(false); // Default to highest/best first
    }
  };

  // Handle Sort for Pitching
  const handlePitchingSort = (field: string) => {
    if (pitchingSortField === field) {
      setPitchingSortAsc(!pitchingSortAsc);
    } else {
      setPitchingSortField(field);
      setPitchingSortAsc(false); // Default to best first (lowest for ERA/WHIP, highest for W/SO/SV)
    }
  };

  // Filter and sort Batters
  const filteredBatters = useMemo(() => {
    return batters
      .filter(p => (teamFilter === 'all' || p.teamId === teamFilter))
      .filter(p => (!onlyQualified || p.batterStats.pa >= minPA))
      .sort((a, b) => {
        const field = battingSortField as keyof typeof a.batterStats;
        const valA = a.batterStats[field] ?? 0;
        const valB = b.batterStats[field] ?? 0;

        if (valA !== valB) {
          return battingSortAsc ? (valA > valB ? 1 : -1) : (valB > valA ? 1 : -1);
        }

        // Tie-breaker logic for baseball realism
        if (field === 'avg') {
          if (b.batterStats.pa !== a.batterStats.pa) return b.batterStats.pa - a.batterStats.pa;
          if (b.batterStats.hits !== a.batterStats.hits) return b.batterStats.hits - a.batterStats.hits;
          return b.batterStats.hr - a.batterStats.hr;
        }
        if (field === 'sb') {
          // Fewer caught stealing (higher success rate), then more PA
          if (a.batterStats.cs !== b.batterStats.cs) return a.batterStats.cs - b.batterStats.cs;
          if (b.batterStats.avg !== a.batterStats.avg) return b.batterStats.avg - a.batterStats.avg;
          return b.batterStats.pa - a.batterStats.pa;
        }
        if (field === 'hr') {
          if (b.batterStats.rbi !== a.batterStats.rbi) return b.batterStats.rbi - a.batterStats.rbi;
          if (b.batterStats.slg !== a.batterStats.slg) return b.batterStats.slg - a.batterStats.slg;
          return b.batterStats.avg - a.batterStats.avg;
        }
        if (field === 'rbi') {
          if (b.batterStats.hr !== a.batterStats.hr) return b.batterStats.hr - a.batterStats.hr;
          return b.batterStats.avg - a.batterStats.avg;
        }
        if (field === 'hits') {
          if (b.batterStats.avg !== a.batterStats.avg) return b.batterStats.avg - a.batterStats.avg;
          return b.batterStats.pa - a.batterStats.pa;
        }
        if (field === 'ops') {
          if (b.batterStats.obp !== a.batterStats.obp) return b.batterStats.obp - a.batterStats.obp;
          return b.batterStats.slg - a.batterStats.slg;
        }
        if (field === 'obp') {
          if (b.batterStats.avg !== a.batterStats.avg) return b.batterStats.avg - a.batterStats.avg;
          return b.batterStats.bb - a.batterStats.bb;
        }

        return b.batterStats.pa - a.batterStats.pa;
      });
  }, [batters, teamFilter, onlyQualified, minPA, battingSortField, battingSortAsc]);

  // Filter and sort Pitchers
  const filteredPitchers = useMemo(() => {
    return pitchers
      .filter(p => (teamFilter === 'all' || p.teamId === teamFilter))
      .filter(p => {
        // Exact qualification check based on internal outs count:
        // team games * 1.0 IP = team games * 3 outs
        const pitcherReqOuts = p.teamGames * 3;
        const isQualified = p.pitcherStats.ipOuts >= pitcherReqOuts;

        // Requirement 2: 防御率ランキングは「規定投球回達成者のみ」！
        // 規定投球回未達の投手は、防御率がどれだけ低くても防御率ランキングに表示しない。
        // 規定投球回を達成した投手だけを防御率ランキングに表示する。
        if (isEraSort) {
          return isQualified && p.pitcherStats.ipOuts > 0;
        }

        // For other metrics (wins, so, saves, etc.):
        return !onlyQualified || isQualified;
      })
      .sort((a, b) => {
        const isWinLuck = pitchingSortField === 'winLuck';
        const valA = isWinLuck ? (a.winLuck ?? 50) : ((a.pitcherStats as any)[pitchingSortField] ?? 0);
        const valB = isWinLuck ? (b.winLuck ?? 50) : ((b.pitcherStats as any)[pitchingSortField] ?? 0);

        // For ERA and WHIP: lower is better!
        if (pitchingSortField === 'era' || pitchingSortField === 'whip') {
          const effA = a.pitcherStats.ipOuts > 0 ? valA : 999.99;
          const effB = b.pitcherStats.ipOuts > 0 ? valB : 999.99;
          if (effA !== effB) {
            // Default (pitchingSortAsc === false): lowest ERA/WHIP first
            return pitchingSortAsc ? (effB > effA ? 1 : -1) : (effA > effB ? 1 : -1);
          }
          // Tie-breaker for ERA: more ipOuts, fewer ER, more SO
          if (b.pitcherStats.ipOuts !== a.pitcherStats.ipOuts) return b.pitcherStats.ipOuts - a.pitcherStats.ipOuts;
          if (a.pitcherStats.er !== b.pitcherStats.er) return a.pitcherStats.er - b.pitcherStats.er;
          return b.pitcherStats.so - a.pitcherStats.so;
        }

        // Higher is better for wins, winLuck, so, saves, holds, ipOuts, etc.
        if (valA !== valB) {
          return pitchingSortAsc ? (valA > valB ? 1 : -1) : (valB > valA ? 1 : -1);
        }

        // Tie-breaker logic for Pitchers
        if (isWinLuck) {
          if (b.pitcherStats.wins !== a.pitcherStats.wins) return b.pitcherStats.wins - a.pitcherStats.wins;
          return a.pitcherStats.era - b.pitcherStats.era;
        }
        if (pitchingSortField === 'wins') {
          const winPctA = (a.pitcherStats.wins + a.pitcherStats.losses) > 0 ? a.pitcherStats.wins / (a.pitcherStats.wins + a.pitcherStats.losses) : 0;
          const winPctB = (b.pitcherStats.wins + b.pitcherStats.losses) > 0 ? b.pitcherStats.wins / (b.pitcherStats.wins + b.pitcherStats.losses) : 0;
          if (winPctB !== winPctA) return winPctB - winPctA;
          if (b.pitcherStats.ipOuts !== a.pitcherStats.ipOuts) return b.pitcherStats.ipOuts - a.pitcherStats.ipOuts;
          return a.pitcherStats.era - b.pitcherStats.era;
        }
        if (pitchingSortField === 'so') {
          if (b.pitcherStats.ipOuts !== a.pitcherStats.ipOuts) return b.pitcherStats.ipOuts - a.pitcherStats.ipOuts;
          return a.pitcherStats.bb - b.pitcherStats.bb;
        }
        if (pitchingSortField === 'saves') {
          if (a.pitcherStats.era !== b.pitcherStats.era) return a.pitcherStats.era - b.pitcherStats.era;
          return b.pitcherStats.so - a.pitcherStats.so;
        }
        if (pitchingSortField === 'holds') {
          if (a.pitcherStats.era !== b.pitcherStats.era) return a.pitcherStats.era - b.pitcherStats.era;
          return b.pitcherStats.ipOuts - a.pitcherStats.ipOuts;
        }

        if (b.pitcherStats.ipOuts !== a.pitcherStats.ipOuts) return b.pitcherStats.ipOuts - a.pitcherStats.ipOuts;
        return a.pitcherStats.era - b.pitcherStats.era;
      });
  }, [pitchers, teamFilter, onlyQualified, currentRegulationTeamGames, pitchingSortField, pitchingSortAsc, isEraSort]);

  // Current active sort label description
  const activeSortSummary = useMemo(() => {
    if (activeTab === 'batting') {
      const option = BATTING_ALL_OPTIONS.find(o => o.key === battingSortField);
      const topPlayer = filteredBatters[0];
      const orderText = battingSortAsc ? '少ない順 (昇順)' : '多い順・優秀順 (降順)';
      return {
        label: option?.label || battingSortField,
        orderText,
        isAsc: battingSortAsc,
        topName: topPlayer?.name,
        topTeam: topPlayer?.teamName,
      };
    } else if (activeTab === 'pitching') {
      const option = PITCHING_ALL_OPTIONS.find(o => o.key === pitchingSortField);
      const topPlayer = filteredPitchers[0];
      const isLower = pitchingSortField === 'era' || pitchingSortField === 'whip';
      const orderText = pitchingSortAsc
        ? (isLower ? '高い順 (昇順)' : '少ない順 (昇順)')
        : (isLower ? '低い順・最優秀順 (降順)' : '多い順・優秀順 (降順)');
      return {
        label: option?.label || pitchingSortField,
        orderText,
        isAsc: pitchingSortAsc,
        topName: topPlayer?.name,
        topTeam: topPlayer?.teamName,
      };
    }
    return null;
  }, [activeTab, battingSortField, battingSortAsc, pitchingSortField, pitchingSortAsc, filteredBatters, filteredPitchers]);

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-5">
      {/* Header & Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-500/20 text-sky-400 border border-sky-500/30">
              個人成績
            </span>
            <span className="text-xs text-slate-400">
              規定打席: {minPA} 打席 / 規定投球回: {maxGames} 回
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-sky-400" />
            リーグ 個人成績ランキング
          </h2>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('batting')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'batting' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>打撃成績</span>
          </button>
          <button
            onClick={() => setActiveTab('pitching')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'pitching' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>投手成績</span>
          </button>
          <button
            onClick={() => setActiveTab('leaders')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'leaders' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            <span>部門別トップ5</span>
          </button>
        </div>
      </div>

      {/* Sorting & Filter Controls (for batting & pitching tabs) */}
      {activeTab !== 'leaders' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5">
          {/* Row 1: Quick Sort Presets (打率順, 盗塁順, 防御率順, etc.) */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <ArrowUpDown className="w-4 h-4 text-sky-400 shrink-0" />
                <span>並び替え項目（ワンクリック切替）:</span>
              </div>

              {/* Order direction toggle & current sort badge */}
              <div className="flex items-center gap-2">
                {activeSortSummary && (
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    現在: <strong className="text-amber-300">{activeSortSummary.label}</strong> ({activeSortSummary.orderText})
                    {activeSortSummary.topName && (
                      <span className="ml-1 text-slate-300">
                        - 1位: <strong>{activeSortSummary.topName}</strong> ({activeSortSummary.topTeam})
                      </span>
                    )}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'batting') {
                      setBattingSortAsc(!battingSortAsc);
                    } else {
                      setPitchingSortAsc(!pitchingSortAsc);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="昇順・降順を切り替え"
                >
                  {(activeTab === 'batting' ? battingSortAsc : pitchingSortAsc) ? (
                    <>
                      <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                      <span>昇順</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-3.5 h-3.5 text-sky-400" />
                      <span>降順 (優秀順)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Presets Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {activeTab === 'batting' ? (
                <>
                  {BATTING_PRESETS.map(preset => {
                    const isActive = battingSortField === preset.key;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => handleBattingSort(preset.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                          isActive
                            ? 'bg-sky-600 border-sky-400 text-white shadow-md ring-1 ring-sky-300 font-black'
                            : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.label}</span>
                        {isActive && (
                          <span className="text-[10px] ml-0.5 opacity-90">
                            {battingSortAsc ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </>
              ) : (
                <>
                  {PITCHING_PRESETS.map(preset => {
                    const isActive = pitchingSortField === preset.key;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => handlePitchingSort(preset.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                          isActive
                            ? 'bg-sky-600 border-sky-400 text-white shadow-md ring-1 ring-sky-300 font-black'
                            : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.label}</span>
                        {isActive && (
                          <span className="text-[10px] ml-0.5 opacity-90">
                            {pitchingSortAsc ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}

              {/* Detailed dropdown select for all other columns */}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[11px] text-slate-400">全項目:</span>
                <select
                  value={activeTab === 'batting' ? battingSortField : pitchingSortField}
                  onChange={(e) => {
                    if (activeTab === 'batting') {
                      handleBattingSort(e.target.value);
                    } else {
                      handlePitchingSort(e.target.value);
                    }
                  }}
                  className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  {(activeTab === 'batting' ? BATTING_ALL_OPTIONS : PITCHING_ALL_OPTIONS).map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Row 2: Team Filter & Qualification Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              {/* Team Filter */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">絞り込み球団:</span>
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-semibold focus:outline-none"
                >
                  <option value="all">全6球団</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Pitching regulation indicator or Batting qualified checkbox */}
              {activeTab === 'pitching' ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-sky-500/40 text-xs">
                    <span className="text-sky-400 font-bold">規定投球回：</span>
                    <span className="font-mono font-black text-amber-300">{currentRegulationIP}回</span>
                    <span className="text-[10px] text-slate-400">（試合数 × 1.0）</span>
                  </div>
                  {isEraSort ? (
                    <span className="text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-400" />
                      防御率ランキング：規定投球回（{currentRegulationIP}回）達成者のみ表示
                    </span>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={onlyQualified}
                        onChange={(e) => setOnlyQualified(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-slate-300 font-semibold">
                        規定投球回到達者のみ ({currentRegulationIP}回)
                      </span>
                    </label>
                  )}
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyQualified}
                    onChange={(e) => setOnlyQualified(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-slate-300 font-semibold">
                    規定打席到達者のみ ({minPA}打席)
                  </span>
                </label>
              )}
            </div>

            <div className="text-slate-400 text-xs">
              該当選手: <span className="font-bold text-white text-sm">{activeTab === 'batting' ? filteredBatters.length : filteredPitchers.length}</span> 名
            </div>
          </div>
        </div>
      )}

      {/* Batting Table */}
      {activeTab === 'batting' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 text-[11px] select-none">
                  <th className="py-3 px-3 w-12 text-center font-bold">順位</th>
                  <th className="py-3 px-3 font-bold">選手名</th>
                  <th className="py-3 px-2 font-bold">チーム</th>

                  {/* Column headers with sort indicator and active styling */}
                  {[
                    { key: 'games', label: '試合' },
                    { key: 'pa', label: '打席' },
                    { key: 'ab', label: '打数' },
                    { key: 'runs', label: '得点' },
                    { key: 'hits', label: '安打' },
                    { key: 'doubles', label: '2塁打' },
                    { key: 'hr', label: '本塁打' },
                    { key: 'rbi', label: '打点' },
                    { key: 'bb', label: '四球' },
                    { key: 'so', label: '三振' },
                    { key: 'sb', label: '盗塁' },
                    { key: 'avg', label: '打率' },
                    { key: 'obp', label: '出塁率' },
                    { key: 'slg', label: '長打率' },
                    { key: 'ops', label: 'OPS' },
                  ].map(col => {
                    const isSorted = battingSortField === col.key;
                    return (
                      <th
                        key={col.key}
                        onClick={() => handleBattingSort(col.key)}
                        className={`py-3 px-2.5 cursor-pointer transition whitespace-nowrap group ${
                          isSorted
                            ? 'bg-sky-950/80 text-sky-300 font-black border-b-2 border-sky-400'
                            : 'hover:text-white hover:bg-slate-800/60'
                        }`}
                        title={`${col.label}で並び替え（クリックで昇順/降順切替）`}
                      >
                        <div className="flex items-center gap-1">
                          <span>{col.label}</span>
                          {isSorted ? (
                            <span className="text-sky-400 text-xs">
                              {battingSortAsc ? '▲' : '▼'}
                            </span>
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-20 group-hover:opacity-100 transition" />
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredBatters.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 text-center font-bold">
                      {idx === 0 ? (
                        <span className="text-amber-400 font-black flex items-center justify-center gap-0.5">
                          <Crown className="w-3 h-3 text-amber-400 inline" /> 1
                        </span>
                      ) : idx === 1 ? (
                        <span className="text-slate-200 font-black">2</span>
                      ) : idx === 2 ? (
                        <span className="text-amber-600 font-black">3</span>
                      ) : (
                        <span className="text-slate-400">{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                      {p.name}
                      {p.batterStats.pa < minPA && (
                        <span className="ml-1 text-[9px] text-slate-500 font-normal">※規定未達</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-slate-300 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: p.teamColor }}
                        />
                        <span>{p.teamName}</span>
                      </div>
                    </td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-300 ${battingSortField === 'games' ? 'bg-sky-950/40 font-bold text-white' : ''}`}>{p.batterStats.games}</td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-300 ${battingSortField === 'pa' ? 'bg-sky-950/40 font-bold text-white' : ''}`}>{p.batterStats.pa}</td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-300 ${battingSortField === 'ab' ? 'bg-sky-950/40 font-bold text-white' : ''}`}>{p.batterStats.ab}</td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-300 ${battingSortField === 'runs' ? 'bg-sky-950/40 font-bold text-white' : ''}`}>{p.batterStats.runs}</td>
                    <td className={`py-2.5 px-2.5 font-mono font-bold text-slate-100 ${battingSortField === 'hits' ? 'bg-sky-950/40 text-sky-200 ring-1 ring-sky-500/30 font-black' : ''}`}>{p.batterStats.hits}</td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-300 ${battingSortField === 'doubles' ? 'bg-sky-950/40 font-bold text-white' : ''}`}>{p.batterStats.doubles}</td>
                    <td className={`py-2.5 px-2.5 font-mono font-bold text-rose-300 ${battingSortField === 'hr' ? 'bg-sky-950/40 text-rose-200 ring-1 ring-sky-500/30 font-black' : ''}`}>{p.batterStats.hr}</td>
                    <td className={`py-2.5 px-2.5 font-mono font-bold text-sky-300 ${battingSortField === 'rbi' ? 'bg-sky-950/40 text-sky-200 ring-1 ring-sky-500/30 font-black' : ''}`}>{p.batterStats.rbi}</td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-400 ${battingSortField === 'bb' ? 'bg-sky-950/40 font-bold text-white' : ''}`}>{p.batterStats.bb}</td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-400 ${battingSortField === 'so' ? 'bg-sky-950/40 font-bold text-white' : ''}`}>{p.batterStats.so}</td>
                    {/* Stolen bases cell (Highlighted when sorted by sb) */}
                    <td className={`py-2.5 px-2.5 font-mono font-bold text-emerald-400 ${battingSortField === 'sb' ? 'bg-sky-950/50 text-emerald-300 ring-1 ring-emerald-500/40 font-black text-sm' : ''}`}>
                      {p.batterStats.sb}
                    </td>
                    {/* Batting average cell (Highlighted when sorted by avg) */}
                    <td className={`py-2.5 px-3 font-mono font-black text-amber-300 text-sm ${battingSortField === 'avg' ? 'bg-sky-950/50 ring-1 ring-amber-500/40' : ''}`}>
                      .{p.batterStats.avg > 0 ? (p.batterStats.avg * 1000).toFixed(0).padStart(3, '0') : '000'}
                    </td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-300 ${battingSortField === 'obp' ? 'bg-sky-950/40 font-bold text-white' : ''}`}>
                      .{p.batterStats.obp > 0 ? (p.batterStats.obp * 1000).toFixed(0).padStart(3, '0') : '000'}
                    </td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-300 ${battingSortField === 'slg' ? 'bg-sky-950/40 font-bold text-white' : ''}`}>
                      .{p.batterStats.slg > 0 ? (p.batterStats.slg * 1000).toFixed(0).padStart(3, '0') : '000'}
                    </td>
                    <td className={`py-2.5 px-2.5 font-mono font-bold text-purple-300 ${battingSortField === 'ops' ? 'bg-sky-950/40 text-purple-200 ring-1 ring-sky-500/30 font-black' : ''}`}>
                      {p.batterStats.ops.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pitching Table */}
      {activeTab === 'pitching' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 text-[11px] select-none">
                  <th className="py-3 px-3 w-12 text-center font-bold">順位</th>
                  <th className="py-3 px-3 font-bold">選手名</th>
                  <th className="py-3 px-2 font-bold">チーム</th>

                  {/* Pitching headers with sort indicators */}
                  {[
                    { key: 'games', label: '登板' },
                    { key: 'gamesStarted', label: '先発' },
                    { key: 'completeGames', label: '完投' },
                    { key: 'wins', label: '勝利' },
                    { key: 'winLuck', label: '勝ち運' },
                    { key: 'losses', label: '敗戦' },
                    { key: 'saves', label: 'セーブ' },
                    { key: 'holds', label: 'ホールド' },
                    { key: 'ipOuts', label: '投球回' },
                    { key: 'hits', label: '被安打' },
                    { key: 'hr', label: '被本塁打' },
                    { key: 'bb', label: '与四球' },
                    { key: 'so', label: '奪三振' },
                    { key: 'er', label: '自責点' },
                    { key: 'era', label: '防御率' },
                    { key: 'whip', label: 'WHIP' },
                  ].map(col => {
                    const isSorted = pitchingSortField === col.key;
                    return (
                      <th
                        key={col.key}
                        onClick={() => handlePitchingSort(col.key)}
                        className={`py-3 px-2.5 cursor-pointer transition whitespace-nowrap group ${
                          isSorted
                            ? 'bg-sky-950/80 text-sky-300 font-black border-b-2 border-sky-400'
                            : 'hover:text-white hover:bg-slate-800/60'
                        }`}
                        title={`${col.label}で並び替え（クリックで昇順/降順切替）`}
                      >
                        <div className="flex items-center gap-1">
                          <span>{col.label}</span>
                          {isSorted ? (
                            <span className="text-sky-400 text-xs">
                              {pitchingSortAsc ? '▲' : '▼'}
                            </span>
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-20 group-hover:opacity-100 transition" />
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredPitchers.length === 0 ? (
                  <tr>
                    <td colSpan={19} className="py-12 text-center text-slate-400">
                      <div className="max-w-md mx-auto space-y-2">
                        <p className="text-base font-bold text-slate-200">
                          現在、規定投球回（{currentRegulationIP}回）を達成している投手はいません。
                        </p>
                        <p className="text-xs text-slate-400">
                          先発投手がチーム試合数（{currentRegulationTeamGames}試合）以上の投球回を消化すると、自動的にランキングに掲載されます。
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPitchers.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 text-center font-bold">
                        {idx === 0 ? (
                          <span className="text-amber-400 font-black flex items-center justify-center gap-0.5">
                            <Crown className="w-3 h-3 text-amber-400 inline" /> 1
                          </span>
                        ) : idx === 1 ? (
                          <span className="text-slate-200 font-black">2</span>
                        ) : idx === 2 ? (
                          <span className="text-amber-600 font-black">3</span>
                        ) : (
                          <span className="text-slate-400">{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                        {p.name}
                        {!isEraSort && p.pitcherStats.ipOuts < p.teamGames * 3 && (
                          <span className="ml-1 text-[9px] text-slate-500 font-normal">※規定未達</span>
                        )}
                      </td>
                    <td className="py-2.5 px-2 text-slate-300 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: p.teamColor }}
                        />
                        <span>{p.teamName}</span>
                      </div>
                    </td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-300 ${pitchingSortField === 'games' ? 'bg-sky-950/40 font-bold text-white' : ''}`}>{p.pitcherStats.games}</td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-300 ${pitchingSortField === 'gamesStarted' ? 'bg-sky-950/40 font-bold text-white' : ''}`}>{p.pitcherStats.gamesStarted}</td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-300 ${pitchingSortField === 'completeGames' ? 'bg-sky-950/40 font-bold text-white' : ''}`}>{p.pitcherStats.completeGames}</td>
                    {/* Wins cell (Highlighted when sorted by wins) */}
                    <td className={`py-2.5 px-2.5 font-mono font-bold text-emerald-400 ${pitchingSortField === 'wins' ? 'bg-sky-950/50 text-emerald-300 ring-1 ring-emerald-500/40 font-black text-sm' : ''}`}>
                      {p.pitcherStats.wins}
                    </td>
                    {/* Win Luck cell */}
                    <td className={`py-2.5 px-2 font-mono text-center whitespace-nowrap ${pitchingSortField === 'winLuck' ? 'bg-sky-950/50 ring-1 ring-amber-500/40 font-bold' : ''}`}>
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${getAbilityGrade(p.winLuck ?? 50).badgeClass}`}>
                        {getAbilityGrade(p.winLuck ?? 50).grade}{p.winLuck ?? 50}
                      </span>
                    </td>
                    <td className={`py-2.5 px-2.5 font-mono text-rose-400 ${pitchingSortField === 'losses' ? 'bg-sky-950/40 font-bold' : ''}`}>{p.pitcherStats.losses}</td>
                    {/* Saves cell (Highlighted when sorted by saves) */}
                    <td className={`py-2.5 px-2.5 font-mono font-bold text-sky-400 ${pitchingSortField === 'saves' ? 'bg-sky-950/50 text-sky-300 ring-1 ring-sky-500/40 font-black text-sm' : ''}`}>
                      {p.pitcherStats.saves}
                    </td>
                    {/* Holds cell (Highlighted when sorted by holds) */}
                    <td className={`py-2.5 px-2.5 font-mono text-indigo-300 ${pitchingSortField === 'holds' ? 'bg-sky-950/50 text-indigo-200 ring-1 ring-indigo-500/40 font-black text-sm' : ''}`}>
                      {p.pitcherStats.holds}
                    </td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-300 ${pitchingSortField === 'ipOuts' ? 'bg-sky-950/40 font-bold text-white' : ''}`}>
                      {Math.floor(p.pitcherStats.ipOuts / 3)}.{p.pitcherStats.ipOuts % 3}
                    </td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-300 ${pitchingSortField === 'hits' ? 'bg-sky-950/40 font-bold' : ''}`}>{p.pitcherStats.hits}</td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-400 ${pitchingSortField === 'hr' ? 'bg-sky-950/40 font-bold' : ''}`}>{p.pitcherStats.hr}</td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-400 ${pitchingSortField === 'bb' ? 'bg-sky-950/40 font-bold' : ''}`}>{p.pitcherStats.bb}</td>
                    {/* Strikeouts cell (Highlighted when sorted by so) */}
                    <td className={`py-2.5 px-2.5 font-mono font-bold text-slate-100 ${pitchingSortField === 'so' ? 'bg-sky-950/50 text-sky-200 ring-1 ring-sky-500/40 font-black text-sm' : ''}`}>
                      {p.pitcherStats.so}
                    </td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-400 ${pitchingSortField === 'er' ? 'bg-sky-950/40 font-bold' : ''}`}>{p.pitcherStats.er}</td>
                    {/* ERA cell (Highlighted when sorted by era) */}
                    <td className={`py-2.5 px-3 font-mono font-black text-amber-300 text-sm ${pitchingSortField === 'era' ? 'bg-sky-950/50 ring-1 ring-amber-500/40' : ''}`}>
                      {p.pitcherStats.era.toFixed(2)}
                    </td>
                    <td className={`py-2.5 px-2.5 font-mono text-slate-300 ${pitchingSortField === 'whip' ? 'bg-sky-950/40 font-bold text-white' : ''}`}>
                      {p.pitcherStats.whip.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leaderboards Top 5 Cards */}
      {activeTab === 'leaders' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 flex items-center justify-between">
            <span>※ 盗塁王・本塁打王・打点王・最多安打・最多奪三振・最優秀中継ぎ・最多セーブは規定に関係なく、リーグ最多の選手がタイトルを獲得します。</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Batting Avg Top 5 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <h3 className="text-sm font-bold text-amber-400 flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span>首位打者 (打率)</span>
                <Crown className="w-4 h-4 text-amber-400" />
              </h3>
              <div className="space-y-2">
                {batters.filter(b => b.batterStats.pa >= minPA || b.batterStats.ab >= 100).sort((a, b) => b.batterStats.avg - a.batterStats.avg).slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 text-center font-bold ${i === 0 ? 'text-amber-400' : 'text-slate-500'}`}>{i + 1}</span>
                      <span className="font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] text-slate-400">({p.teamName})</span>
                    </div>
                    <span className="font-mono font-black text-amber-300">
                      .{p.batterStats.avg > 0 ? (p.batterStats.avg * 1000).toFixed(0).padStart(3, '0') : '000'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Home Runs Top 5 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <h3 className="text-sm font-bold text-rose-400 flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span>本塁打王</span>
                <Crown className="w-4 h-4 text-rose-400" />
              </h3>
              <div className="space-y-2">
                {[...batters].sort((a, b) => b.batterStats.hr - a.batterStats.hr).slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 text-center font-bold ${i === 0 ? 'text-rose-400' : 'text-slate-500'}`}>{i + 1}</span>
                      <span className="font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] text-slate-400">({p.teamName})</span>
                    </div>
                    <span className="font-mono font-black text-rose-300">
                      {p.batterStats.hr} 本
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* RBI Top 5 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <h3 className="text-sm font-bold text-sky-400 flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span>打点王</span>
                <Crown className="w-4 h-4 text-sky-400" />
              </h3>
              <div className="space-y-2">
                {[...batters].sort((a, b) => b.batterStats.rbi - a.batterStats.rbi).slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 text-center font-bold ${i === 0 ? 'text-sky-400' : 'text-slate-500'}`}>{i + 1}</span>
                      <span className="font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] text-slate-400">({p.teamName})</span>
                    </div>
                    <span className="font-mono font-black text-sky-300">
                      {p.batterStats.rbi} 点
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stolen Bases Top 5 (盗塁王) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span>盗塁王</span>
                <Crown className="w-4 h-4 text-emerald-400" />
              </h3>
              <div className="space-y-2">
                {[...batters].sort((a, b) => b.batterStats.sb - a.batterStats.sb).slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 text-center font-bold ${i === 0 ? 'text-emerald-400' : 'text-slate-500'}`}>{i + 1}</span>
                      <span className="font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] text-slate-400">({p.teamName})</span>
                    </div>
                    <span className="font-mono font-black text-emerald-300">
                      {p.batterStats.sb} 盗塁
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hits Top 5 (最多安打) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <h3 className="text-sm font-bold text-indigo-400 flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span>最多安打</span>
                <Crown className="w-4 h-4 text-indigo-400" />
              </h3>
              <div className="space-y-2">
                {[...batters].sort((a, b) => b.batterStats.hits - a.batterStats.hits).slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 text-center font-bold ${i === 0 ? 'text-indigo-400' : 'text-slate-500'}`}>{i + 1}</span>
                      <span className="font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] text-slate-400">({p.teamName})</span>
                    </div>
                    <span className="font-mono font-black text-indigo-300">
                      {p.batterStats.hits} 安打
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* OBP Top 5 (最高出塁率) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <h3 className="text-sm font-bold text-teal-400 flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span>最高出塁率</span>
                <Crown className="w-4 h-4 text-teal-400" />
              </h3>
              <div className="space-y-2">
                {batters.filter(b => b.batterStats.pa >= minPA).sort((a, b) => b.batterStats.obp - a.batterStats.obp).slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 text-center font-bold ${i === 0 ? 'text-teal-400' : 'text-slate-500'}`}>{i + 1}</span>
                      <span className="font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] text-slate-400">({p.teamName})</span>
                    </div>
                    <span className="font-mono font-black text-teal-300">
                      .{p.batterStats.obp > 0 ? (p.batterStats.obp * 1000).toFixed(0).padStart(3, '0') : '000'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ERA Top 5 (最優秀防御率) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <h3 className="text-sm font-bold text-amber-300 flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span>最優秀防御率</span>
                  <span className="text-[10px] text-slate-400 font-normal">（規定{maxGames.toFixed(1)}回）</span>
                </div>
                <Crown className="w-4 h-4 text-amber-300" />
              </h3>
              <div className="space-y-2">
                {pitchers.filter(p => p.pitcherStats.ipOuts >= p.teamGames * 3 && p.pitcherStats.ipOuts > 0).sort((a, b) => {
                  if (a.pitcherStats.era !== b.pitcherStats.era) return a.pitcherStats.era - b.pitcherStats.era;
                  return b.pitcherStats.ipOuts - a.pitcherStats.ipOuts;
                }).slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 text-center font-bold ${i === 0 ? 'text-amber-400' : 'text-slate-500'}`}>{i + 1}</span>
                      <span className="font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] text-slate-400">({p.teamName})</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-[10px] text-slate-400">{Math.floor(p.pitcherStats.ipOuts / 3)}.{p.pitcherStats.ipOuts % 3}回</span>
                      <span className="font-black text-amber-300">
                        {p.pitcherStats.era.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
                {pitchers.filter(p => p.pitcherStats.ipOuts >= p.teamGames * 3 && p.pitcherStats.ipOuts > 0).length === 0 && (
                  <div className="py-4 text-center text-slate-500 text-xs">
                    現在、規定投球回（{maxGames.toFixed(1)}回）達成者はいません
                  </div>
                )}
              </div>
            </div>

            {/* Wins Top 5 (最多勝) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span>最多勝</span>
                <Crown className="w-4 h-4 text-emerald-400" />
              </h3>
              <div className="space-y-2">
                {[...pitchers].sort((a, b) => b.pitcherStats.wins - a.pitcherStats.wins).slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 text-center font-bold ${i === 0 ? 'text-emerald-400' : 'text-slate-500'}`}>{i + 1}</span>
                      <span className="font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] text-slate-400">({p.teamName})</span>
                    </div>
                    <span className="font-mono font-black text-emerald-300">
                      {p.pitcherStats.wins} 勝
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Strikeouts Top 5 (最多奪三振) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <h3 className="text-sm font-bold text-cyan-400 flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span>最多奪三振</span>
                <Crown className="w-4 h-4 text-cyan-400" />
              </h3>
              <div className="space-y-2">
                {[...pitchers].sort((a, b) => b.pitcherStats.so - a.pitcherStats.so).slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 text-center font-bold ${i === 0 ? 'text-cyan-400' : 'text-slate-500'}`}>{i + 1}</span>
                      <span className="font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] text-slate-400">({p.teamName})</span>
                    </div>
                    <span className="font-mono font-black text-cyan-300">
                      {p.pitcherStats.so} 個
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Saves Top 5 (最多セーブ) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <h3 className="text-sm font-bold text-sky-400 flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span>最多セーブ</span>
                <Crown className="w-4 h-4 text-sky-400" />
              </h3>
              <div className="space-y-2">
                {[...pitchers].sort((a, b) => b.pitcherStats.saves - a.pitcherStats.saves).slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 text-center font-bold ${i === 0 ? 'text-sky-400' : 'text-slate-500'}`}>{i + 1}</span>
                      <span className="font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] text-slate-400">({p.teamName})</span>
                    </div>
                    <span className="font-mono font-black text-sky-300">
                      {p.pitcherStats.saves} Ｓ
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Holds Top 5 (最優秀中継ぎ) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <h3 className="text-sm font-bold text-indigo-400 flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span>最優秀中継ぎ (ホールド)</span>
                <Crown className="w-4 h-4 text-indigo-400" />
              </h3>
              <div className="space-y-2">
                {[...pitchers].sort((a, b) => b.pitcherStats.holds - a.pitcherStats.holds).slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 text-center font-bold ${i === 0 ? 'text-indigo-400' : 'text-slate-500'}`}>{i + 1}</span>
                      <span className="font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] text-slate-400">({p.teamName})</span>
                    </div>
                    <span className="font-mono font-black text-indigo-300">
                      {p.pitcherStats.holds} Ｈ
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Win Pct Top 5 (最高勝率) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <h3 className="text-sm font-bold text-purple-400 flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span>最高勝率</span>
                <Crown className="w-4 h-4 text-purple-400" />
              </h3>
              <div className="space-y-2">
                {pitchers
                  .filter(p => (p.pitcherStats.wins + p.pitcherStats.losses) >= 5 && p.pitcherStats.wins >= 3)
                  .map(p => {
                    const totalDec = p.pitcherStats.wins + p.pitcherStats.losses;
                    const pct = totalDec > 0 ? p.pitcherStats.wins / totalDec : 0;
                    return { ...p, winPct: pct };
                  })
                  .sort((a, b) => b.winPct - a.winPct || b.pitcherStats.wins - a.pitcherStats.wins)
                  .slice(0, 5)
                  .map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                      <div className="flex items-center gap-2">
                        <span className={`w-4 text-center font-bold ${i === 0 ? 'text-purple-400' : 'text-slate-500'}`}>{i + 1}</span>
                        <span className="font-semibold text-white">{p.name}</span>
                        <span className="text-[10px] text-slate-400">({p.pitcherStats.wins}勝{p.pitcherStats.losses}敗)</span>
                      </div>
                      <span className="font-mono font-black text-purple-300">
                        .{p.winPct > 0 ? (p.winPct * 1000).toFixed(0).padStart(3, '0') : '000'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


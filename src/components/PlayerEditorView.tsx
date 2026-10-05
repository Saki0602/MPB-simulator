import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Player, Position, Pitch, Team, PitcherRole } from '../types/baseball';
import { Settings2, Plus, Trash2, Save, User, Shield, Activity, Sparkles, RotateCcw, FileJson, X, AlertTriangle } from 'lucide-react';
import { getAbilityGrade, ABILITY_RANKS } from '../utils/gradeUtils';
import { TeamRosterModal } from './TeamRosterModal';

const POSITIONS: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const FIELD_POSITIONS: { key: Position; label: string }[] = [
  { key: 'C', label: '捕手 (C)' },
  { key: '1B', label: '一塁手 (1B)' },
  { key: '2B', label: '二塁手 (2B)' },
  { key: '3B', label: '三塁手 (3B)' },
  { key: 'SS', label: '遊撃手 (SS)' },
  { key: 'LF', label: '左翼手 (LF)' },
  { key: 'CF', label: '中堅手 (CF)' },
  { key: 'RF', label: '右翼手 (RF)' },
  { key: 'DH', label: '指名打者 (DH)' },
];
const PITCH_TYPES = ['ストレート', 'スライダー', 'カットボール', 'カーブ', 'フォーク', 'チェンジアップ', 'シンカー', 'シュート', 'スプリット', 'ツーシーム'];

export const PlayerEditorView: React.FC = () => {
  const { teams, updatePlayer, addPlayer, deletePlayer, setIsResetConfirmOpen } = useGame();
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || 'tokyo');
  const currentTeam = teams.find(t => t.id === selectedTeamId) || teams[0];

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(currentTeam.players[0]?.id || '');
  const selectedPlayer = currentTeam.players.find(p => p.id === selectedPlayerId) || currentTeam.players[0];

  const [filterType, setFilterType] = useState<'all' | 'batter' | 'pitcher'>('all');
  const [saveAlert, setSaveAlert] = useState<string | null>(null);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);

  const displayedPlayers = currentTeam.players.filter(p => {
    if (filterType === 'batter') return !p.isPitcher;
    if (filterType === 'pitcher') return p.isPitcher;
    return true;
  });

  const handleCreatePlayer = () => {
    const isP = filterType === 'pitcher';
    const newP: Player = {
      id: `p_${Date.now()}`,
      teamId: currentTeam.id,
      name: `新入団選手`,
      number: Math.floor(Math.random() * 80) + 10,
      age: 22,
      isPitcher: isP,
      mainPosition: isP ? 'P' : 'SS',
      positionAptitudes: {
        P: isP ? 85 : 10,
        C: 10,
        '1B': 50,
        '2B': 50,
        '3B': 50,
        SS: 65,
        LF: 40,
        CF: 40,
        RF: 40,
        DH: 70,
      },
      bats: 'R',
      throws: 'R',
      condition: '普通',
      fatigue: 0,
      recentForm: [],
      contact: 65,
      power: 65,
      speed: 65,
      arm: 65,
      fielding: 65,
      catching: 65,
      eye: 65,
      stealing: 60,
      vsRight: 65,
      vsLeft: 65,
      pitchVelocity: 146,
      control: 65,
      stamina: 65,
      strikeout: 65,
      hrAvoidance: 65,
      winLuck: 50,
      pVsRight: 65,
      pVsLeft: 65,
      pitcherRole: isP ? 'starter' : 'reliever',
      pitches: isP ? [
        { id: `pitch_${Date.now()}_1`, name: 'ストレート', velocity: 146, breakAmount: 20, ballPower: 70, control: 70 },
        { id: `pitch_${Date.now()}_2`, name: 'スライダー', velocity: 132, breakAmount: 65, ballPower: 65, control: 65 }
      ] : [],
      batterStats: {
        games: 0, pa: 0, ab: 0, runs: 0, hits: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, so: 0, sb: 0, cs: 0, sh: 0, sf: 0, avg: 0, obp: 0, slg: 0, ops: 0
      },
      pitcherStats: {
        games: 0, gamesStarted: 0, completeGames: 0, shutouts: 0, wins: 0, losses: 0, saves: 0, holds: 0, ipOuts: 0, ip: 0, hits: 0, hr: 0, bb: 0, so: 0, runs: 0, er: 0, era: 0, whip: 0
      }
    };

    addPlayer(currentTeam.id, newP);
    setSelectedPlayerId(newP.id);
    showNotice('新しい選手を登録しました！');
  };

  const handleRequestDelete = (player: Player) => {
    if (currentTeam.players.length <= 9) {
      showNotice('球団の選手数が最少人数（9名）のため、これ以上選手を削除できません。');
      return;
    }
    setPlayerToDelete(player);
  };

  const handleConfirmDelete = () => {
    if (!playerToDelete) return;
    const targetId = playerToDelete.id;
    const targetName = playerToDelete.name;

    deletePlayer(currentTeam.id, targetId);

    const remaining = currentTeam.players.filter(p => p.id !== targetId);
    if (remaining.length > 0) {
      if (selectedPlayerId === targetId) {
        setSelectedPlayerId(remaining[0].id);
      }
    }

    setPlayerToDelete(null);
    showNotice(`${targetName} 選手を退団（削除）しました。`);
  };

  const showNotice = (text: string) => {
    setSaveAlert(text);
    setTimeout(() => setSaveAlert(null), 2500);
  };

  // Helper for dual input (number + slider)
  const renderDualInput = (
    label: string,
    value: number,
    onChange: (val: number) => void,
    min = 0,
    max = 100,
    unit = ''
  ) => {
    // 8段階能力ランク評価（高い順：S > A > B > C > D > E > F > G）
    const gradeInfo = getAbilityGrade(value, unit === 'km/h');

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-semibold">{label}</span>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className={`text-[11px] px-1.5 py-0.2 rounded border font-black ${gradeInfo.badgeClass}`}>
              {gradeInfo.grade}
            </span>
            <span className="font-bold text-white">
              {value} {unit}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
            className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white text-xs focus:ring-1 focus:ring-sky-400 focus:outline-none"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-5">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-500/20 text-sky-400 border border-sky-500/30">
              エディター
            </span>
            <span className="text-xs text-slate-400">選手能力・球種・新入団・退団設定</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-sky-400" />
            6球団 選手能力カスタマイズ
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Team Switcher */}
          <select
            value={selectedTeamId}
            onChange={(e) => {
              setSelectedTeamId(e.target.value);
              const targetTeam = teams.find(t => t.id === e.target.value);
              if (targetTeam?.players[0]) setSelectedPlayerId(targetTeam.players[0].id);
            }}
            className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
          >
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <button
            onClick={handleCreatePlayer}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            新選手を登録
          </button>

          <button
            onClick={() => setIsRosterModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-bold text-xs transition shadow flex items-center gap-1.5"
            title="チーム編成・選手能力値のJSON保存/読込"
          >
            <FileJson className="w-4 h-4" />
            編成・能力値JSON
          </button>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-600 text-slate-300 hover:text-rose-300 font-bold text-xs transition shadow flex items-center gap-1.5"
            title="ゲームデータを初期化"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
            データ初期化
          </button>
        </div>
      </div>

      {saveAlert && (
        <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>{saveAlert}</span>
        </div>
      )}

      {/* 8-Tier Ability Rank Legend (S > A > B > C > D > E > F > G) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-white">能力値ランク（高い順）：</span>
          <span className="text-slate-400 text-[11px]">S → A → B → C → D → E → F → G の8段階</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {ABILITY_RANKS.map(item => (
            <div
              key={item.rank}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-mono shrink-0 shadow-sm ${item.badgeClass}`}
              title={`能力値: ${item.rangeDesc} / 球速目安: ${item.velDesc}`}
            >
              <span className="font-black text-sm">{item.rank}</span>
              <span className="text-[10px] opacity-80">{item.rangeDesc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content: Player Roster Sidebar + Detailed Ability Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Players List (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition ${filterType === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              全員
            </button>
            <button
              onClick={() => setFilterType('batter')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition ${filterType === 'batter' ? 'bg-amber-600/80 text-white' : 'text-slate-400'}`}
            >
              野手
            </button>
            <button
              onClick={() => setFilterType('pitcher')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition ${filterType === 'pitcher' ? 'bg-sky-600/80 text-white' : 'text-slate-400'}`}
            >
              投手
            </button>
          </div>

          {/* List */}
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {displayedPlayers.map(p => {
              const isSelected = p.id === selectedPlayer?.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlayerId(p.id)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition cursor-pointer group ${
                    isSelected
                      ? 'bg-slate-800 text-white border-sky-400 ring-1 ring-sky-400'
                      : 'bg-slate-950/50 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-slate-500 w-5 text-right shrink-0">#{p.number}</span>
                    <span className="font-bold truncate">{p.name}</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 shrink-0">
                      {p.isPitcher ? '投手' : p.mainPosition}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 font-mono text-[10px]">
                      {p.isPitcher ? (
                        <>
                          <span className={`px-1 py-0.2 rounded border font-black ${getAbilityGrade(p.pitchVelocity, true).badgeClass}`}>
                            速{getAbilityGrade(p.pitchVelocity, true).grade}
                          </span>
                          <span className={`px-1 py-0.2 rounded border font-black ${getAbilityGrade(p.control).badgeClass}`}>
                            制{getAbilityGrade(p.control).grade}
                          </span>
                          <span className={`px-1 py-0.2 rounded border font-black ${getAbilityGrade(p.stamina).badgeClass}`}>
                            ス{getAbilityGrade(p.stamina).grade}
                          </span>
                          <span className={`px-1 py-0.2 rounded border font-black ${getAbilityGrade(p.winLuck ?? 50).badgeClass}`} title={`勝ち運: ${p.winLuck ?? 50}`}>
                            運{getAbilityGrade(p.winLuck ?? 50).grade}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className={`px-1 py-0.2 rounded border font-black ${getAbilityGrade(p.contact).badgeClass}`}>
                            巧{getAbilityGrade(p.contact).grade}
                          </span>
                          <span className={`px-1 py-0.2 rounded border font-black ${getAbilityGrade(p.power).badgeClass}`}>
                            長{getAbilityGrade(p.power).grade}
                          </span>
                          <span className={`px-1 py-0.2 rounded border font-black ${getAbilityGrade(p.speed).badgeClass}`}>
                            走{getAbilityGrade(p.speed).grade}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Quick delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestDelete(p);
                      }}
                      disabled={currentTeam.players.length <= 9}
                      className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 transition opacity-60 group-hover:opacity-100 disabled:opacity-20"
                      title={currentTeam.players.length <= 9 ? '最少人数のため削除不可' : `${p.name}選手を退団・削除`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Ability Editor (8 cols) */}
        {selectedPlayer ? (
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            {/* Player Basic Info */}
            <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>{selectedPlayer.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    #{selectedPlayer.number}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {currentTeam.name} 所属 • {selectedPlayer.isPitcher ? '投手' : '野手'}
                </p>

                {/* Quick ability rank strip */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] font-mono">
                  {selectedPlayer.isPitcher ? (
                    <>
                      <span className={`px-1.5 py-0.5 rounded border font-bold ${getAbilityGrade(selectedPlayer.pitchVelocity, true).badgeClass}`}>
                        最速 {selectedPlayer.pitchVelocity}km ({getAbilityGrade(selectedPlayer.pitchVelocity, true).grade})
                      </span>
                      <span className={`px-1.5 py-0.5 rounded border font-bold ${getAbilityGrade(selectedPlayer.control).badgeClass}`}>
                        制球 {selectedPlayer.control} ({getAbilityGrade(selectedPlayer.control).grade})
                      </span>
                      <span className={`px-1.5 py-0.5 rounded border font-bold ${getAbilityGrade(selectedPlayer.stamina).badgeClass}`}>
                        スタミナ {selectedPlayer.stamina} ({getAbilityGrade(selectedPlayer.stamina).grade})
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={`px-1.5 py-0.5 rounded border font-bold ${getAbilityGrade(selectedPlayer.contact).badgeClass}`}>
                        ミート {selectedPlayer.contact} ({getAbilityGrade(selectedPlayer.contact).grade})
                      </span>
                      <span className={`px-1.5 py-0.5 rounded border font-bold ${getAbilityGrade(selectedPlayer.power).badgeClass}`}>
                        パワー {selectedPlayer.power} ({getAbilityGrade(selectedPlayer.power).grade})
                      </span>
                      <span className={`px-1.5 py-0.5 rounded border font-bold ${getAbilityGrade(selectedPlayer.speed).badgeClass}`}>
                        走力 {selectedPlayer.speed} ({getAbilityGrade(selectedPlayer.speed).grade})
                      </span>
                      <span className={`px-1.5 py-0.5 rounded border font-bold ${getAbilityGrade(selectedPlayer.fielding).badgeClass}`}>
                        守備 {selectedPlayer.fielding} ({getAbilityGrade(selectedPlayer.fielding).grade})
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-delete-player-header"
                  onClick={() => handleRequestDelete(selectedPlayer)}
                  disabled={currentTeam.players.length <= 9}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-600/40 text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  title={currentTeam.players.length <= 9 ? '球団の選手数が9名以下のため削除できません' : `${selectedPlayer.name}選手を退団・削除`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>退団・削除</span>
                </button>
              </div>
            </div>

            {/* Basic Profile Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">選手名</label>
                <input
                  type="text"
                  value={selectedPlayer.name}
                  onChange={(e) => updatePlayer(currentTeam.id, { ...selectedPlayer, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">背番号</label>
                <input
                  type="number"
                  value={selectedPlayer.number}
                  onChange={(e) => updatePlayer(currentTeam.id, { ...selectedPlayer, number: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">守備位置 (メイン)</label>
                <select
                  value={selectedPlayer.mainPosition}
                  onChange={(e) => {
                    const newPos = e.target.value as Position;
                    const isP = newPos === 'P';
                    const aptitudes = { ...(selectedPlayer.positionAptitudes || {}) };
                    aptitudes[newPos] = Math.max(aptitudes[newPos] || 0, 85);
                    updatePlayer(currentTeam.id, {
                      ...selectedPlayer,
                      mainPosition: newPos,
                      isPitcher: isP ? true : selectedPlayer.isPitcher,
                      pitcherRole: isP ? (selectedPlayer.pitcherRole || 'starter') : selectedPlayer.pitcherRole,
                      positionAptitudes: aptitudes
                    });
                    showNotice(`守備位置を ${newPos} に変更しました`);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold focus:outline-none"
                >
                  <option value="P">投手 (P)</option>
                  <option value="C">捕手 (C)</option>
                  <option value="1B">一塁手 (1B)</option>
                  <option value="2B">二塁手 (2B)</option>
                  <option value="3B">三塁手 (3B)</option>
                  <option value="SS">遊撃手 (SS)</option>
                  <option value="LF">左翼手 (LF)</option>
                  <option value="CF">中堅手 (CF)</option>
                  <option value="RF">右翼手 (RF)</option>
                  <option value="DH">指名打者 (DH)</option>
                </select>
              </div>

              {selectedPlayer.isPitcher ? (
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">投手役割 (登板目安)</label>
                  <select
                    value={selectedPlayer.pitcherRole || 'starter'}
                    onChange={(e) => {
                      updatePlayer(currentTeam.id, {
                        ...selectedPlayer,
                        pitcherRole: e.target.value as PitcherRole
                      });
                      showNotice(`投手役割を変更しました`);
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold focus:outline-none"
                  >
                    <option value="starter">先発 (約25試合登板)</option>
                    <option value="reliever">中継ぎ (約50登板)</option>
                    <option value="closer">抑え (守護神)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">登録区分</label>
                  <button
                    onClick={() => updatePlayer(currentTeam.id, { ...selectedPlayer, isPitcher: !selectedPlayer.isPitcher })}
                    className={`w-full py-1.5 rounded-lg font-bold border transition ${
                      selectedPlayer.isPitcher
                        ? 'bg-sky-600/30 text-sky-300 border-sky-500'
                        : 'bg-amber-600/30 text-amber-300 border-amber-500'
                    }`}
                  >
                    {selectedPlayer.isPitcher ? '投手' : '野手'} (切替)
                  </button>
                </div>
              )}

              <div>
                <label className="text-slate-400 font-semibold block mb-1">投 / 打</label>
                <div className="flex gap-1">
                  <select
                    value={selectedPlayer.throws}
                    onChange={(e) => updatePlayer(currentTeam.id, { ...selectedPlayer, throws: e.target.value as 'R' | 'L' })}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold focus:outline-none"
                  >
                    <option value="R">右投</option>
                    <option value="L">左投</option>
                  </select>
                  <select
                    value={selectedPlayer.bats}
                    onChange={(e) => updatePlayer(currentTeam.id, { ...selectedPlayer, bats: e.target.value as 'R' | 'L' | 'S' })}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold focus:outline-none"
                  >
                    <option value="R">右打</option>
                    <option value="L">左打</option>
                    <option value="S">両打</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Pitcher Abilities & Pitches Arsenal */}
            {selectedPlayer.isPitcher && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-sky-400 flex items-center gap-1.5">
                    <Activity className="w-4 h-4" /> 投手能力パラメータ（0〜100）
                  </h4>
                  <span className="text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    ※ ランク基準: <strong className="text-white">S / A / B / C / <span className="text-emerald-400">D(平均:約50)</span> / E / G</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  {renderDualInput('球速 (km/h)', selectedPlayer.pitchVelocity, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, pitchVelocity: val }), 120, 165, 'km/h')}
                  {renderDualInput('コントロール (制球)', selectedPlayer.control, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, control: val }))}
                  {renderDualInput('スタミナ', selectedPlayer.stamina, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, stamina: val }))}
                  {renderDualInput('奪三振力', selectedPlayer.strikeout, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, strikeout: val }))}
                  {renderDualInput('被本塁打抑制', selectedPlayer.hrAvoidance, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, hrAvoidance: val }))}
                  {renderDualInput('勝ち運 (勝利のつきやすさ/援護運: 50が平均約5勝)', selectedPlayer.winLuck ?? 50, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, winLuck: val }))}
                  {renderDualInput('対右打者相性', selectedPlayer.pVsRight, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, pVsRight: val }))}
                  {renderDualInput('対左打者相性', selectedPlayer.pVsLeft, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, pVsLeft: val }))}
                </div>

                {/* Pitches Arsenal Editor */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h5 className="text-sm font-bold text-sky-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> 習得変化球・球種詳細カスタマイズ
                      </h5>
                      <p className="text-[11px] text-slate-400">
                        各球種の球威（重さ・被打球抑制）、変化量（キレ・曲がり）、球速、制球力を個別に調整できます
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const newPitch: Pitch = {
                          id: `pitch_${Date.now()}`,
                          name: 'スライダー',
                          velocity: Math.round(selectedPlayer.pitchVelocity * 0.9),
                          breakAmount: 65,
                          ballPower: 65,
                          control: 65,
                        };
                        updatePlayer(currentTeam.id, {
                          ...selectedPlayer,
                          pitches: [...selectedPlayer.pitches, newPitch]
                        });
                        showNotice('新球種を追加しました！');
                      }}
                      className="text-xs bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow transition shrink-0 self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" /> 球種を追加
                    </button>
                  </div>

                  <div className="space-y-3">
                    {selectedPlayer.pitches.map((pitch, pIdx) => (
                      <div
                        key={pitch.id}
                        className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 shadow-inner"
                      >
                        {/* Header: Name and Delete */}
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">第{pIdx + 1}球種:</span>
                            <select
                              value={pitch.name}
                              onChange={(e) => {
                                const updated = [...selectedPlayer.pitches];
                                updated[pIdx] = { ...updated[pIdx], name: e.target.value };
                                updatePlayer(currentTeam.id, { ...selectedPlayer, pitches: updated });
                              }}
                              className="bg-slate-900 border border-slate-700 text-white font-bold rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-sky-400 focus:outline-none"
                            >
                              {PITCH_TYPES.map(pt => (
                                <option key={pt} value={pt}>{pt}</option>
                              ))}
                            </select>
                          </div>

                          <button
                            onClick={() => {
                              if (selectedPlayer.pitches.length <= 1) {
                                showNotice('球種は最低1つ登録されている必要があります。');
                                return;
                              }
                              const updated = selectedPlayer.pitches.filter((_, i) => i !== pIdx);
                              updatePlayer(currentTeam.id, { ...selectedPlayer, pitches: updated });
                              showNotice('球種を削除しました。');
                            }}
                            className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-900 transition flex items-center gap-1 text-xs font-medium"
                            title="この球種を削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">削除</span>
                          </button>
                        </div>

                        {/* Dual sliders for ballPower, breakAmount, velocity, control */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          {renderDualInput('球威 (重さ・被打球抑制)', pitch.ballPower, (val) => {
                            const updated = [...selectedPlayer.pitches];
                            updated[pIdx] = { ...updated[pIdx], ballPower: val };
                            updatePlayer(currentTeam.id, { ...selectedPlayer, pitches: updated });
                          }, 0, 100)}

                          {renderDualInput('変化量 (キレ・曲がり)', pitch.breakAmount, (val) => {
                            const updated = [...selectedPlayer.pitches];
                            updated[pIdx] = { ...updated[pIdx], breakAmount: val };
                            updatePlayer(currentTeam.id, { ...selectedPlayer, pitches: updated });
                          }, 0, 100)}

                          {renderDualInput('球種球速 (km/h)', pitch.velocity, (val) => {
                            const updated = [...selectedPlayer.pitches];
                            updated[pIdx] = { ...updated[pIdx], velocity: val };
                            updatePlayer(currentTeam.id, { ...selectedPlayer, pitches: updated });
                          }, 90, 165, 'km/h')}

                          {renderDualInput('球種制球力', pitch.control ?? 65, (val) => {
                            const updated = [...selectedPlayer.pitches];
                            updated[pIdx] = { ...updated[pIdx], control: val };
                            updatePlayer(currentTeam.id, { ...selectedPlayer, pitches: updated });
                          }, 0, 100)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Batter Abilities */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                  <User className="w-4 h-4" /> 野手能力パラメータ（0〜100）
                </h4>
                <span className="text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  ※ ランク基準: <strong className="text-white">S / A / B / C / <span className="text-emerald-400">D(平均:約50)</span> / E / G</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                {renderDualInput('ミート (コンタクト)', selectedPlayer.contact, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, contact: val }))}
                {renderDualInput('パワー (長打力)', selectedPlayer.power, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, power: val }))}
                {renderDualInput('走力', selectedPlayer.speed, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, speed: val }))}
                {renderDualInput('肩力', selectedPlayer.arm, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, arm: val }))}
                {renderDualInput('守備力', selectedPlayer.fielding, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, fielding: val }))}
                {renderDualInput('捕球力', selectedPlayer.catching, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, catching: val }))}
                {renderDualInput('選球眼', selectedPlayer.eye, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, eye: val }))}
                {renderDualInput('盗塁技術', selectedPlayer.stealing, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, stealing: val }))}
                {renderDualInput('対右投手適性', selectedPlayer.vsRight, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, vsRight: val }))}
                {renderDualInput('対左投手適性', selectedPlayer.vsLeft, (val) => updatePlayer(currentTeam.id, { ...selectedPlayer, vsLeft: val }))}
              </div>
            </div>

            {/* Position Aptitudes (守備位置適性 0〜100) */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-teal-400 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" /> 守備位置適性・サブポジション（0〜100）
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    メイン守備位置に加えて複数ポジションの適性を自由に設定できます
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    onClick={() => {
                      const aptitudes = { ...(selectedPlayer.positionAptitudes || {}) };
                      aptitudes[selectedPlayer.mainPosition] = 90;
                      updatePlayer(currentTeam.id, { ...selectedPlayer, positionAptitudes: aptitudes });
                      showNotice(`${selectedPlayer.mainPosition}の適性を90に強化しました`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 transition"
                  >
                    本職極大化
                  </button>
                  <button
                    onClick={() => {
                      const aptitudes = { ...(selectedPlayer.positionAptitudes || {}) };
                      ['2B', '3B', 'SS', '1B'].forEach(p => {
                        aptitudes[p as Position] = Math.max(aptitudes[p as Position] || 0, 70);
                      });
                      updatePlayer(currentTeam.id, { ...selectedPlayer, positionAptitudes: aptitudes });
                      showNotice('内野全般の適性を付与しました');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 transition"
                  >
                    内野ユーティリティ
                  </button>
                  <button
                    onClick={() => {
                      const aptitudes = { ...(selectedPlayer.positionAptitudes || {}) };
                      ['LF', 'CF', 'RF'].forEach(p => {
                        aptitudes[p as Position] = Math.max(aptitudes[p as Position] || 0, 75);
                      });
                      updatePlayer(currentTeam.id, { ...selectedPlayer, positionAptitudes: aptitudes });
                      showNotice('外野全般の適性を付与しました');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 transition"
                  >
                    外野全適性
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                {FIELD_POSITIONS.map(({ key, label }) => {
                  const currentVal = selectedPlayer.positionAptitudes?.[key] ?? (selectedPlayer.mainPosition === key ? 85 : 10);
                  const isMain = selectedPlayer.mainPosition === key;
                  return (
                    <div
                      key={key}
                      className={`p-2.5 rounded-lg border transition ${
                        isMain ? 'bg-teal-950/40 border-teal-500/50' : 'bg-slate-900/60 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          {label}
                          {isMain && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-teal-500 text-slate-950 font-black rounded-full">
                              本職
                            </span>
                          )}
                        </span>
                        {!isMain && (
                          <button
                            onClick={() => {
                              updatePlayer(currentTeam.id, {
                                ...selectedPlayer,
                                mainPosition: key,
                                isPitcher: false,
                              });
                              showNotice(`メイン守備位置を ${key} に変更しました`);
                            }}
                            className="text-[10px] text-sky-400 hover:text-sky-300 font-bold"
                          >
                            本職にする
                          </button>
                        )}
                      </div>
                      {renderDualInput(
                        '守備適性値',
                        currentVal,
                        (val) => {
                          const updated = { ...(selectedPlayer.positionAptitudes || {}) };
                          updated[key] = val;
                          updatePlayer(currentTeam.id, { ...selectedPlayer, positionAptitudes: updated });
                        },
                        0,
                        100
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400">
            選手が選択されていません。
          </div>
        )}
      </div>

      {/* Team Roster Modal */}
      <TeamRosterModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        defaultTeamId={currentTeam.id}
      />

      {/* In-App Player Delete Confirmation Modal */}
      {playerToDelete && (
        <div
          id="player-delete-confirm-modal-overlay"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPlayerToDelete(null)}
        >
          <div
            id="player-delete-confirm-modal-content"
            className="bg-slate-900 border border-rose-600/50 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 pr-6">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  選手の退団（削除）
                </h3>
                <p className="text-xs text-rose-400 font-medium mt-0.5">
                  球団から選手を登録抹消・除名します
                </p>
              </div>
              <button
                type="button"
                id="btn-close-delete-modal"
                onClick={() => setPlayerToDelete(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Player Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-slate-400 font-bold text-base shrink-0">#{playerToDelete.number}</span>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-white truncate flex items-center gap-2">
                    <span>{playerToDelete.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-normal">
                      {playerToDelete.isPitcher ? '投手' : playerToDelete.mainPosition}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {currentTeam.name} • {playerToDelete.age}歳 • {playerToDelete.throws}投{playerToDelete.bats}打
                  </div>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1 font-mono text-[11px]">
                {playerToDelete.isPitcher ? (
                  <span className={`px-2 py-0.5 rounded border font-black ${getAbilityGrade(playerToDelete.pitchVelocity, true).badgeClass}`}>
                    最速{playerToDelete.pitchVelocity}km
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded border font-black ${getAbilityGrade(playerToDelete.power).badgeClass}`}>
                    パワー{playerToDelete.power}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 space-y-1">
              <p>
                本当に <strong className="text-white">{playerToDelete.name}</strong> 選手を削除しますか？
              </p>
              <p className="text-[11px] text-rose-400/90">
                ※ 削除するとチームオーダーおよび所属選手一覧から完全に除外されます。
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                id="btn-cancel-delete-player"
                onClick={() => setPlayerToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                キャンセル
              </button>
              <button
                type="button"
                id="btn-confirm-delete-player"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                退団・削除を実行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

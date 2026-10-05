import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Position, Condition, StarterUsagePolicy, RelieverUsagePolicy, BatterUsagePolicy, Player, PlayerUsagePolicy } from '../types/baseball';
import { Sliders, Sparkles, Shield, Zap, UserCheck, Flame, Users, Activity, Crosshair, ChevronDown, ChevronUp, FileJson } from 'lucide-react';
import { getAbilityGrade } from '../utils/gradeUtils';
import { TeamRosterModal } from './TeamRosterModal';

const POSITIONS: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

export const LineupEditorView: React.FC = () => {
  const {
    teams,
    userTeamId,
    updateTeamOrder,
    updatePlayer,
    generateAiOrderForTeam,
    applyTodayRecommendedLineup,
  } = useGame();

  const [selectedTeamId, setSelectedTeamId] = useState<string>(userTeamId);
  const currentTeam = teams.find(t => t.id === selectedTeamId) || teams[0];
  const order = currentTeam.order;

  const [msg, setMsg] = useState<string | null>(null);
  const [showBenchSection, setShowBenchSection] = useState<boolean>(true);
  const [showBullpenSection, setShowBullpenSection] = useState<boolean>(true);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);

  const handleAiBestOrder = () => {
    generateAiOrderForTeam(currentTeam.id);
    setMsg('AIが能力値を総合分析し、最適な打順・守備位置・投手陣を自動編成しました！');
    setTimeout(() => setMsg(null), 3000);
  };

  const handleTodayRecommended = () => {
    applyTodayRecommendedLineup(currentTeam.id);
    setMsg('本日の調子・疲労・相手先発相性を考慮した「推奨オーダー」を適用しました！');
    setTimeout(() => setMsg(null), 3000);
  };

  // Batting order slots 1-9
  const battingSlots = order.battingOrder;

  // Swap batter slot order
  const moveSlot = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= battingSlots.length) return;
    const newOrder = [...battingSlots];
    const temp = newOrder[idx];
    newOrder[idx] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    updateTeamOrder(currentTeam.id, { ...order, battingOrder: newOrder });
  };

  // Change player in slot
  const changeBatter = (slotIdx: number, newPlayerId: string) => {
    const newOrder = [...battingSlots];
    newOrder[slotIdx] = { ...newOrder[slotIdx], playerId: newPlayerId };
    updateTeamOrder(currentTeam.id, { ...order, battingOrder: newOrder });
  };

  // Change position in slot
  const changePosition = (slotIdx: number, newPos: Position) => {
    const newOrder = [...battingSlots];
    newOrder[slotIdx] = { ...newOrder[slotIdx], position: newPos };
    updateTeamOrder(currentTeam.id, { ...order, battingOrder: newOrder });
  };

  // Rotation change
  const changeRotationPitcher = (rotIdx: number, pitcherId: string) => {
    const newRot = [...order.rotation];
    newRot[rotIdx] = pitcherId;
    updateTeamOrder(currentTeam.id, { ...order, rotation: newRot });
  };

  // Update a player's individual tactical usage policy
  const handlePlayerPolicyChange = (player: Player, policy: PlayerUsagePolicy) => {
    updatePlayer(currentTeam.id, {
      ...player,
      usagePolicy: policy,
    });
  };

  const allPitchers = currentTeam.players.filter(p => p.isPitcher);
  const allBatters = currentTeam.players.filter(p => !p.isPitcher);

  const startingBatterIds = new Set(battingSlots.map(s => s.playerId));
  const benchBatters = allBatters.filter(b => !startingBatterIds.has(b.id));

  const rotationPitcherIds = new Set(order.rotation);
  const bullpenPitchers = allPitchers.filter(p => !rotationPitcherIds.has(p.id) && p.id !== order.setup && p.id !== order.closer);

  const getConditionColor = (cond: Condition) => {
    switch (cond) {
      case '絶好調': return 'bg-rose-500 text-white';
      case '好調': return 'bg-amber-500 text-slate-950 font-bold';
      case '普通': return 'bg-emerald-500 text-white';
      case '不調': return 'bg-sky-600 text-white';
      case '絶不調': return 'bg-purple-600 text-white';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-5 space-y-5">
      {/* Header & Team Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-500/20 text-sky-400 border border-sky-500/30">
              オーダー＆起用法設定
            </span>
            <span className="text-xs text-slate-400">スタメン・継投・各選手の起用方針（完投・スタミナ制限・代打・代走等）</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-sky-400" />
            {currentTeam.name} オーダー・起用法管理
          </h2>
        </div>

        {/* Team Selector & AI Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
          >
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name} {t.id === userTeamId ? '(自球団)' : ''}</option>
            ))}
          </select>

          <button
            onClick={handleAiBestOrder}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            AIベストオーダー再編成
          </button>

          <button
            onClick={handleTodayRecommended}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs transition shadow flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4" />
            AI本日の推奨オーダー
          </button>

          <button
            onClick={() => setIsRosterModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition shadow flex items-center gap-1.5"
            title="チーム編成（選手・能力値・起用）のJSON保存・読込"
          >
            <FileJson className="w-4 h-4" />
            編成JSON入出力
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <UserCheck className="w-4 h-4" />
          <span>{msg}</span>
        </div>
      )}

      {/* Main Grid: Batting Order & Pitching Staff */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Batting Order (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>先発スターティングメンバー（1番〜9番）</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  各野手の起用法（フル出場・代打・代走・通常）を個別指定できます
                </p>
              </div>
              <span className="text-xs text-slate-400">▲▼で打順変更</span>
            </div>

            <div className="space-y-2">
              {battingSlots.map((slot, idx) => {
                const player = currentTeam.players.find(p => p.id === slot.playerId);
                const currentPolicy = (player?.usagePolicy as BatterUsagePolicy) || 'normal';

                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:border-slate-600 transition"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Slot Number */}
                      <div className="w-7 h-7 rounded-lg bg-slate-700/80 text-white font-black flex items-center justify-center text-sm font-mono shrink-0">
                        {idx + 1}
                      </div>

                      {/* Position selector */}
                      <select
                        value={slot.position}
                        onChange={(e) => changePosition(idx, e.target.value as Position)}
                        className="bg-slate-900 border border-slate-700 text-amber-300 font-black rounded-lg px-2 py-1 text-xs focus:outline-none shrink-0"
                      >
                        {POSITIONS.map(pos => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>

                      {/* Player selector */}
                      <select
                        value={slot.playerId}
                        onChange={(e) => changeBatter(idx, e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 text-white font-bold rounded-lg px-2 py-1 text-xs focus:outline-none truncate min-w-0"
                      >
                        {allBatters.map(b => (
                          <option key={b.id} value={b.id}>
                            #{b.number} {b.name} ({b.mainPosition}) - 巧{getAbilityGrade(b.contact).grade} 長{getAbilityGrade(b.power).grade} 走{getAbilityGrade(b.speed).grade} 守{getAbilityGrade(b.fielding).grade}
                          </option>
                        ))}
                      </select>

                      {/* Player Condition & Ability Badges */}
                      {player && (
                        <div className="hidden sm:flex items-center gap-1 shrink-0 font-mono text-[10px]">
                          <span className={`px-1 py-0.2 rounded border font-bold ${getAbilityGrade(player.contact).badgeClass}`}>
                            巧{getAbilityGrade(player.contact).grade}
                          </span>
                          <span className={`px-1 py-0.2 rounded border font-bold ${getAbilityGrade(player.power).badgeClass}`}>
                            長{getAbilityGrade(player.power).grade}
                          </span>
                          <span className={`px-1 py-0.2 rounded border font-bold ${getAbilityGrade(player.speed).badgeClass}`}>
                            走{getAbilityGrade(player.speed).grade}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans ${getConditionColor(player.condition)}`}>
                            {player.condition}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Usage Policy & Reorder Controls */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-700/50">
                      {/* Batter Usage Policy Dropdown */}
                      {player && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">起用:</span>
                          <select
                            value={currentPolicy}
                            onChange={(e) => handlePlayerPolicyChange(player, e.target.value as BatterUsagePolicy)}
                            className={`rounded-lg px-2 py-1 text-[11px] font-bold border focus:outline-none ${
                              currentPolicy === 'full_game'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : currentPolicy === 'pinch_hitter'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : currentPolicy === 'pinch_runner'
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                : currentPolicy === 'defensive_sub'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-900 text-slate-300 border-slate-700'
                            }`}
                          >
                            <option value="normal">通常</option>
                            <option value="full_game">フル出場（交代なし）</option>
                            <option value="pinch_hitter">代打要員</option>
                            <option value="pinch_runner">代走要員</option>
                            <option value="defensive_sub">守備固め</option>
                          </select>
                        </div>
                      )}

                      {/* Move Up/Down Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => moveSlot(idx, 'up')}
                          disabled={idx === 0}
                          className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white font-bold flex items-center justify-center transition"
                          title="打順を上げる"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveSlot(idx, 'down')}
                          disabled={idx === battingSlots.length - 1}
                          className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white font-bold flex items-center justify-center transition"
                          title="打順を下げる"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bench Batters Usage Policy Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
            <div
              onClick={() => setShowBenchSection(!showBenchSection)}
              className="flex items-center justify-between cursor-pointer pb-2 border-b border-slate-800 select-none"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">控え・ベンチ野手の起用法設定</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {benchBatters.length}名
                </span>
              </div>
              <button className="text-slate-400 hover:text-white transition">
                {showBenchSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showBenchSection && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400 mb-2">
                  終盤の勝負所で「代打の切り札」「代走要員（俊足走者）」「守備固め」としてAIが優先起用します。
                </p>
                {benchBatters.map(batter => {
                  const policy = (batter.usagePolicy as BatterUsagePolicy) || 'normal';
                  return (
                    <div
                      key={batter.id}
                      className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:border-slate-600 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 text-slate-400 font-mono font-bold">#{batter.number}</span>
                        <span className="font-bold text-white truncate">{batter.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                          {batter.mainPosition}
                        </span>
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <span className={`px-1 py-0.2 rounded border font-bold ${getAbilityGrade(batter.contact).badgeClass}`}>
                            巧{getAbilityGrade(batter.contact).grade}{batter.contact}
                          </span>
                          <span className={`px-1 py-0.2 rounded border font-bold ${getAbilityGrade(batter.power).badgeClass}`}>
                            長{getAbilityGrade(batter.power).grade}{batter.power}
                          </span>
                          <span className={`px-1 py-0.2 rounded border font-bold ${getAbilityGrade(batter.speed).badgeClass}`}>
                            走{getAbilityGrade(batter.speed).grade}{batter.speed}
                          </span>
                          <span className={`px-1 py-0.2 rounded border font-bold ${getAbilityGrade(batter.fielding).badgeClass}`}>
                            守{getAbilityGrade(batter.fielding).grade}{batter.fielding}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${getConditionColor(batter.condition)}`}>
                          {batter.condition}
                        </span>
                        <select
                          value={policy}
                          onChange={(e) => handlePlayerPolicyChange(batter, e.target.value as BatterUsagePolicy)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold border focus:outline-none ${
                            policy === 'pinch_hitter'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                              : policy === 'pinch_runner'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                              : policy === 'defensive_sub'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                              : policy === 'full_game'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                              : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}
                        >
                          <option value="normal">通常控え</option>
                          <option value="pinch_hitter">★ 代打要員（勝負所で優先起用）</option>
                          <option value="pinch_runner">★ 代走要員（終盤出塁時に優先起用）</option>
                          <option value="defensive_sub">★ 守備固め要員（終盤リード時）</option>
                          <option value="full_game">フル出場指定</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pitching Staff Roles (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Starting Rotation (6 spots) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="pb-2 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  <span>先発ローテーション（6枠）＆起用法</span>
                </h3>
                <span className="text-xs text-slate-400">中6日ローテ</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                先発ごとの交代基準（完投狙い・スタミナ残15%・勝利権利で即交代・通常）を指定可能
              </p>
            </div>

            <div className="space-y-2.5">
              {Array.from({ length: 6 }).map((_, rIdx) => {
                const pitcherId = order.rotation[rIdx] || allPitchers[rIdx]?.id;
                const p = currentTeam.players.find(pl => pl.id === pitcherId);
                const policy = (p?.usagePolicy as StarterUsagePolicy) || 'normal';

                return (
                  <div key={rIdx} className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-12 text-sky-300 font-mono font-bold shrink-0">
                        先発 {rIdx + 1}
                      </span>
                      <select
                        value={pitcherId}
                        onChange={(e) => changeRotationPitcher(rIdx, e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 text-white font-semibold rounded-lg px-2 py-1 text-xs focus:outline-none truncate"
                      >
                        {allPitchers.map(pitcher => (
                          <option key={pitcher.id} value={pitcher.id}>
                            #{pitcher.number} {pitcher.name} ({pitcher.throws === 'L' ? '左' : '右'} • 速{getAbilityGrade(pitcher.pitchVelocity, true).grade}{pitcher.pitchVelocity}km 制{getAbilityGrade(pitcher.control).grade} ス{getAbilityGrade(pitcher.stamina).grade})
                          </option>
                        ))}
                      </select>
                      {p && (
                        <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                          <span className={`px-1 py-0.2 rounded border font-bold ${getAbilityGrade(p.pitchVelocity, true).badgeClass}`}>
                            速{getAbilityGrade(p.pitchVelocity, true).grade}
                          </span>
                          <span className={`px-1 py-0.2 rounded border font-bold ${getAbilityGrade(p.control).badgeClass}`}>
                            制{getAbilityGrade(p.control).grade}
                          </span>
                          <span className={`px-1 py-0.2 rounded border font-bold ${getAbilityGrade(p.stamina).badgeClass}`}>
                            ス{getAbilityGrade(p.stamina).grade}
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans">
                            疲労{p.fatigue}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Starter Usage Policy Selector */}
                    {p && (
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-700/40">
                        <span className="text-slate-400">起用法:</span>
                        <select
                          value={policy}
                          onChange={(e) => handlePlayerPolicyChange(p, e.target.value as StarterUsagePolicy)}
                          className={`rounded-lg px-2 py-0.5 font-bold border focus:outline-none ${
                            policy === 'complete'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : policy === 'stamina_15'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : policy === 'win_rights'
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                              : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}
                        >
                          <option value="complete">完投狙い（大炎上・135球まで投げ切る）</option>
                          <option value="stamina_15">スタミナ残り15%まで（限界直前まで投球）</option>
                          <option value="win_rights">勝利投手の権利で交代（5回リードで即継投）</option>
                          <option value="normal">通常継投（5〜6回・95球目安）</option>
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Relievers & Closer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-amber-400 pb-2 border-b border-slate-800 flex items-center gap-2">
              <Crosshair className="w-4 h-4" />
              <span>救援陣・クローザー＆リリーフ起用法</span>
            </h3>

            {/* Setupper */}
            <div className="space-y-1 text-xs">
              <label className="text-slate-400 font-semibold block">セットアッパー（8回 リード時）</label>
              <select
                value={order.setup}
                onChange={(e) => updateTeamOrder(currentTeam.id, { ...order, setup: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white font-semibold rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              >
                {allPitchers.map(p => (
                  <option key={p.id} value={p.id}>
                    #{p.number} {p.name} ({p.throws === 'L' ? '左' : '右'} • 最速{p.pitchVelocity}km • ホールド{p.pitcherStats.holds})
                  </option>
                ))}
              </select>
            </div>

            {/* Closer */}
            <div className="space-y-1 text-xs pt-1">
              <label className="text-rose-400 font-semibold block">守護神・クローザー（9回 セーブシチュエーション）</label>
              <select
                value={order.closer}
                onChange={(e) => updateTeamOrder(currentTeam.id, { ...order, closer: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white font-semibold rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              >
                {allPitchers.map(p => (
                  <option key={p.id} value={p.id}>
                    #{p.number} {p.name} ({p.throws === 'L' ? '左' : '右'} • 最速{p.pitchVelocity}km • セーブ{p.pitcherStats.saves})
                  </option>
                ))}
              </select>
            </div>

            {/* Bullpen Relievers Policy Section */}
            <div className="pt-2 border-t border-slate-800">
              <div
                onClick={() => setShowBullpenSection(!showBullpenSection)}
                className="flex items-center justify-between cursor-pointer py-1 select-none"
              >
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-300">中継ぎ陣 起用法設定</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    {bullpenPitchers.length}名
                  </span>
                </div>
                <button className="text-slate-400 hover:text-white transition">
                  {showBullpenSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showBullpenSection && (
                <div className="space-y-1.5 mt-2">
                  {bullpenPitchers.map(p => {
                    const policy = (p.usagePolicy as RelieverUsagePolicy) || 'normal';
                    return (
                      <div
                        key={p.id}
                        className="p-1.5 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center justify-between gap-1 text-[11px]"
                      >
                        <div className="truncate min-w-0 flex items-center gap-1.5">
                          <span className="font-bold text-white truncate">#{p.number} {p.name}</span>
                          <span className={`px-1 py-0.2 rounded border font-mono font-bold text-[9px] ${getAbilityGrade(p.pitchVelocity, true).badgeClass}`}>
                            速{getAbilityGrade(p.pitchVelocity, true).grade}
                          </span>
                          <span className={`px-1 py-0.2 rounded border font-mono font-bold text-[9px] ${getAbilityGrade(p.control).badgeClass}`}>
                            制{getAbilityGrade(p.control).grade}
                          </span>
                        </div>
                        <select
                          value={policy}
                          onChange={(e) => handlePlayerPolicyChange(p, e.target.value as RelieverUsagePolicy)}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold border focus:outline-none shrink-0 ${
                            policy === 'winning_formula'
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                              : policy === 'behind'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : policy === 'long_relief'
                              ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                              : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}
                        >
                          <option value="normal">通常継投</option>
                          <option value="winning_formula">勝利の方程式（リード時）</option>
                          <option value="behind">ビハインド要員（劣勢時）</option>
                          <option value="long_relief">ロングリリーフ（序盤降板時）</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Team Roster JSON Modal */}
      <TeamRosterModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        defaultTeamId={currentTeam.id}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Team, LeagueStructure } from '../types/baseball';
import {
  Play,
  Settings2,
  Users,
  Sliders,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Dices,
  Shuffle,
  RotateCw,
  PlusCircle,
  Layers,
  Trash2,
  ArrowRightLeft
} from 'lucide-react';
import { AddTeamModal } from './AddTeamModal';

export const InitialSetupModal: React.FC = () => {
  const {
    teams,
    seasonState,
    startSeason,
    setActiveScreen,
    setUserTeamId,
    userTeamId,
    updateTeam,
    leagueType,
    switchLeagueType,
    leagueStructure,
    switchLeagueStructure,
    setLeagueTeamPreset,
    deleteTeam,
    setTeamLeague,
    regenerateFictionalLeague,
  } = useGame();

  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || 'tokyo');
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState<boolean>(false);

  if (seasonState !== 'setup') return null;

  const currentTeam = teams.find(t => t.id === selectedTeamId) || teams[0];
  const isMpb = leagueType === 'mpb';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 sm:p-6 border-b border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> シーズン開幕前
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-400/20 text-sky-300 border border-sky-400/30">
                  {teams.length}球団登録中（各球団30名: 投14名/野16名）
                </span>
                <span className="text-xs text-slate-400">
                  {leagueStructure === 'two_league'
                    ? (isMpb ? '2リーグ制 (ロイヤル / キングダム)' : '2リーグ制 (A・B)')
                    : '1リーグ制'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                リーグ構成 ＆ 球団・選手 初期設定
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                公式戦日程は月曜休みの火〜日6連戦（1日3試合）。複数リーグ制（ロイヤル / キングダム）や1リーグ制、球団数変更・新規球団追加（30名自動生成）が可能です。
              </p>
            </div>

            <button
              onClick={() => startSeason()}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-sm sm:text-base shadow-lg hover:shadow-red-600/30 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 shrink-0"
            >
              <Play className="w-5 h-5 fill-current" />
              AIベストオーダー編成 ＆ 開幕！
            </button>
          </div>
        </div>

        {/* League Mode & Structure Config Panel */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 space-y-4">
          {/* Section 1: Mode Switch (MPB vs Fictional) */}
          <div>
            <div className="text-xs font-bold text-slate-400 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Dices className="w-4 h-4 text-amber-400" />
                ① リーグモードの選択
              </span>
              <span className="text-[11px] text-slate-500">
                ※ 開幕前はいつでも切替・球団再構成可能
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Mode 1: MPB公認球団 (現実モチーフ) */}
              <button
                type="button"
                onClick={() => {
                  switchLeagueType('mpb');
                  setSelectedTeamId('tokyo');
                }}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  leagueType === 'mpb'
                    ? 'bg-sky-950/60 border-sky-500 shadow-lg ring-1 ring-sky-500 text-white'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className={`p-2 rounded-lg mt-0.5 ${leagueType === 'mpb' ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-500'}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-white">MPB公認球団</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-900/60 text-sky-300 font-bold border border-sky-500/30">
                      現実モチーフ
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    東京・横浜・神戸・広島・名古屋・大阪・福岡・仙台・千葉・埼玉など現実に即した球団と選手30名編成。
                  </p>
                </div>
              </button>

              {/* Mode 2: 完全架空リーグ */}
              <button
                type="button"
                onClick={() => {
                  switchLeagueType('fictional');
                  setSelectedTeamId('sapporo');
                }}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  leagueType === 'fictional'
                    ? 'bg-amber-950/50 border-amber-500 shadow-lg ring-1 ring-amber-500 text-white'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className={`p-2 rounded-lg mt-0.5 ${leagueType === 'fictional' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-white">完全架空リーグ</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-900/60 text-amber-300 font-bold border border-amber-500/30">
                      オリジナル生成
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    札幌・仙台・大阪・広島・福岡など12球団。各30名の選手名・能力・球種・勝ち運をランダム完全生成！
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Multiple League Structure & Team Count Expansion */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
            {/* Structure: 2-League vs 1-League */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <label className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-400" />
                ② 複数リーグ制 / 1リーグ制
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => switchLeagueStructure('two_league')}
                  className={`py-2 px-3 rounded-lg border font-bold text-left transition ${
                    leagueStructure === 'two_league'
                      ? 'bg-sky-600/30 border-sky-400 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-black text-xs">{isMpb ? '2リーグ制 (ロイヤル/キングダム)' : '2リーグ制 (A・B)'}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">2つのリーグに分割</div>
                </button>

                <button
                  type="button"
                  onClick={() => switchLeagueStructure('single')}
                  className={`py-2 px-3 rounded-lg border font-bold text-left transition ${
                    leagueStructure === 'single'
                      ? 'bg-sky-600/30 border-sky-400 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-black text-xs">1リーグ制 (単一)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">全所属球団で首位争い</div>
                </button>
              </div>
            </div>

            {/* Team Count & Add Team */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <label className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-400" />
                    ③ 球団数プリセット ＆ 球団追加
                  </span>
                  <span className="text-[11px] text-amber-300 font-mono">現在: {teams.length}球団</span>
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[6, 8, 10, 12].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setLeagueTeamPreset(cnt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                        teams.length === cnt
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow font-black'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {cnt}球団
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsAddTeamModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow transition flex items-center gap-1 ml-auto"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    ＋ 新規球団を追加
                  </button>
                </div>
              </div>

              {leagueType === 'fictional' && (
                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-amber-300">架空全選手のリロール:</span>
                  <button
                    type="button"
                    onClick={() => regenerateFictionalLeague()}
                    className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-slate-950 font-bold transition flex items-center gap-1"
                  >
                    <RotateCw className="w-3 h-3" />
                    架空球団・選手を再生成
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Teams Tabs */}
        <div className="bg-slate-950/60 p-3 sm:p-4 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          {teams.map(team => {
            const isSelected = team.id === currentTeam.id;
            const isMyTeam = team.id === userTeamId;
            const isRoyalOrA = team.leagueId === 'royal' || team.leagueId === 'central' || team.leagueId === 'league_a';

            return (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap border shrink-0 ${
                  isSelected
                    ? 'bg-slate-800 text-white border-sky-400 shadow-md ring-1 ring-sky-400'
                    : 'bg-slate-900/80 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full border border-white/30"
                  style={{ backgroundColor: team.color }}
                />
                <span>{team.name}</span>
                {leagueStructure === 'two_league' && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    isRoyalOrA ? 'bg-sky-950 text-sky-300 border border-sky-700/50' : 'bg-amber-950 text-amber-300 border border-amber-700/50'
                  }`}>
                    {isMpb ? (isRoyalOrA ? 'ロイヤル' : 'キングダム') : (isRoyalOrA ? 'A' : 'B')}
                  </span>
                )}
                {isMyTeam && (
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded font-black">
                    自球団
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Team Details & Quick Edit */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Team Basic Properties Card */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-md border border-white/20"
                  style={{ backgroundColor: currentTeam.color }}
                >
                  {currentTeam.shortName[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">{currentTeam.name}</h3>
                    {leagueStructure === 'two_league' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-sky-300 font-bold border border-slate-600">
                        {currentTeam.leagueName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">本拠地: {currentTeam.stadium} ({currentTeam.city})</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {leagueStructure === 'two_league' && (
                  <button
                    onClick={() => {
                      const newLeague = isMpb
                        ? (currentTeam.leagueId === 'royal' || currentTeam.leagueId === 'central' ? 'kingdom' : 'royal')
                        : (currentTeam.leagueId === 'league_a' ? 'league_b' : 'league_a');
                      setTeamLeague(currentTeam.id, newLeague);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition flex items-center gap-1"
                    title="所属リーグを変更"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>リーグ移動</span>
                  </button>
                )}

                <button
                  onClick={() => setUserTeamId(currentTeam.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    userTeamId === currentTeam.id
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  {userTeamId === currentTeam.id ? '自球団に設定中' : 'この球団でプレイ'}
                </button>

                <button
                  onClick={() => setActiveScreen('editor')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition flex items-center gap-1.5"
                >
                  <Settings2 className="w-4 h-4" />
                  選手能力・球種を詳細編集
                </button>

                {teams.length > 2 && (
                  <button
                    onClick={() => {
                      if (confirm(`球団「${currentTeam.name}」を削除しますか？`)) {
                        deleteTeam(currentTeam.id);
                        setSelectedTeamId(teams.find(t => t.id !== currentTeam.id)?.id || 'tokyo');
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50 transition flex items-center gap-1"
                    title="球団を削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Editable fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">球団名</label>
                <input
                  type="text"
                  value={currentTeam.name}
                  onChange={(e) => updateTeam({ ...currentTeam, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:ring-1 focus:ring-sky-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">本拠地所在地</label>
                <input
                  type="text"
                  value={currentTeam.city}
                  placeholder="例: 東京都、神奈川県横浜市"
                  onChange={(e) => updateTeam({ ...currentTeam, city: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:ring-1 focus:ring-sky-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">本拠地球場</label>
                <input
                  type="text"
                  value={currentTeam.stadium}
                  onChange={(e) => updateTeam({ ...currentTeam, stadium: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:ring-1 focus:ring-sky-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">チームカラー</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentTeam.color}
                    onChange={(e) => updateTeam({ ...currentTeam, color: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={currentTeam.color}
                    onChange={(e) => updateTeam({ ...currentTeam, color: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:ring-1 focus:ring-sky-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Roster Overview: 30 players (14 pitchers, 16 fielders) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-400" />
                登録選手一覧 ({currentTeam.players.length}名: 投手{currentTeam.players.filter(p => p.isPitcher).length}名 / 野手{currentTeam.players.filter(p => !p.isPitcher).length}名)
              </h4>
              <button
                onClick={() => setActiveScreen('editor')}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
              >
                全選手の能力値・球種・追加・削除 画面を開く &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Pitchers (14) */}
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
                <div className="text-xs font-bold text-sky-300 mb-2 border-b border-slate-700/50 pb-1 flex items-center justify-between">
                  <span>投手 ({currentTeam.players.filter(p => p.isPitcher).length}名)</span>
                  <span className="text-[11px] text-slate-400">先発・中継ぎ・抑え</span>
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 text-xs">
                  {currentTeam.players.filter(p => p.isPitcher).map(p => (
                    <div key={p.id} className="flex items-center justify-between py-1 px-2 rounded bg-slate-900/50">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 w-5 text-right">#{p.number}</span>
                        <span className="font-semibold text-white">{p.name}</span>
                        <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-300">
                          {p.throws === 'L' ? '左投' : '右投'}
                        </span>
                        {p.pitcherRole && (
                          <span className="text-[10px] px-1 rounded bg-sky-950 text-sky-300 font-bold">
                            {p.pitcherRole === 'starter' ? '先発' : p.pitcherRole === 'closer' ? '抑え' : '中継'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-300 flex items-center gap-2">
                        <span>{p.pitchVelocity}km</span>
                        <span className="text-slate-400">制{p.control}/ス{p.stamina}</span>
                        <span className="text-amber-300 font-semibold" title="勝ち運(50基準)">運{p.winLuck ?? 50}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Batters (16) */}
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
                <div className="text-xs font-bold text-amber-300 mb-2 border-b border-slate-700/50 pb-1 flex items-center justify-between">
                  <span>野手 ({currentTeam.players.filter(p => !p.isPitcher).length}名)</span>
                  <span className="text-[11px] text-slate-400">捕手・内野・外野・代走・代打</span>
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 text-xs">
                  {currentTeam.players.filter(p => !p.isPitcher).map(p => (
                    <div key={p.id} className="flex items-center justify-between py-1 px-2 rounded bg-slate-900/50">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 w-5 text-right">#{p.number}</span>
                        <span className="font-semibold text-white">{p.name}</span>
                        <span className="text-[10px] px-1 rounded bg-amber-950 text-amber-300 font-bold">
                          {p.mainPosition}
                        </span>
                        <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-300">
                          {p.bats === 'L' ? '左打' : p.bats === 'B' ? '両打' : '右打'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 flex items-center gap-2">
                        <span>ミ{p.contact} パ{p.power}</span>
                        <span className="text-slate-400">走{p.speed} 守{p.fielding}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <AlertCircle className="w-4 h-4 text-sky-400 shrink-0" />
            <span>開幕ボタンを押すと、AIが全{teams.length}球団のベストオーダー（打順・守備・ローテ・中継ぎ・抑え）を自動作成してシーズンが始まります。</span>
          </div>
          <button
            onClick={() => startSeason()}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2 shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            ペナントレース開幕
          </button>
        </div>
      </div>

      {/* Add Team Modal */}
      <AddTeamModal
        isOpen={isAddTeamModalOpen}
        onClose={() => setIsAddTeamModalOpen(false)}
        onTeamCreated={(newTeamId) => setSelectedTeamId(newTeamId)}
      />
    </div>
  );
};

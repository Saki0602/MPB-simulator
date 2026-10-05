import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Users, Sliders, Settings2, Trophy, MapPin, Award, Edit3, Check, FileJson, PlusCircle, Trash2, ArrowRightLeft } from 'lucide-react';
import { getAbilityGrade } from '../utils/gradeUtils';
import { TeamRosterModal } from './TeamRosterModal';
import { AddTeamModal } from './AddTeamModal';

export const TeamInfoView: React.FC = () => {
  const { teams, userTeamId, setActiveScreen, updateTeam, leagueType, leagueStructure, setTeamLeague, deleteTeam } = useGame();
  const [selectedTeamId, setSelectedTeamId] = useState<string>(userTeamId);
  const [isEditingTeam, setIsEditingTeam] = useState<boolean>(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState<boolean>(false);
  const currentTeam = teams.find(t => t.id === selectedTeamId) || teams[0];

  const isMpb = leagueType === 'mpb';
  const isTwoLeague = leagueStructure === 'two_league';

  const totalRuns = currentTeam.stats.runsScored;
  const totalAllowed = currentTeam.stats.runsAllowed;
  const batters = currentTeam.players.filter(p => !p.isPitcher);
  const pitchers = currentTeam.players.filter(p => p.isPitcher);

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-5 space-y-5">
      {/* Team Selection Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-500/20 text-sky-400 border border-sky-500/30">
              チーム情報
            </span>
            <span className="text-xs text-slate-400">
              {isTwoLeague ? `${isMpb ? 'セ・パ 2リーグ制' : 'A・B 2リーグ制'} • 全${teams.length}球団` : `1リーグ制 • 全${teams.length}球団`}
            </span>
            {isTwoLeague && currentTeam.leagueName && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-bold border border-slate-700">
                {currentTeam.leagueName}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md border border-white/20"
              style={{ backgroundColor: currentTeam.color }}
            >
              {currentTeam.shortName[0]}
            </div>
            {currentTeam.name}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
          >
            {teams.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} {isTwoLeague && t.leagueId ? (t.leagueId === 'royal' || t.leagueId === 'central' || t.leagueId === 'league_a' ? '(ロイヤル/A)' : '(キングダム/B)') : ''}
              </option>
            ))}
          </select>

          {isTwoLeague && (
            <button
              onClick={() => {
                const newLeague = isMpb
                  ? (currentTeam.leagueId === 'royal' || currentTeam.leagueId === 'central' ? 'kingdom' : 'royal')
                  : (currentTeam.leagueId === 'league_a' ? 'league_b' : 'league_a');
                setTeamLeague(currentTeam.id, newLeague);
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition shadow flex items-center gap-1.5"
              title="所属リーグを変更"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              リーグ移動
            </button>
          )}

          <button
            onClick={() => setIsEditingTeam(!isEditingTeam)}
            className={`px-3.5 py-2 rounded-xl text-white font-bold text-xs transition shadow flex items-center gap-1.5 ${
              isEditingTeam ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {isEditingTeam ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            {isEditingTeam ? '編集完了' : '球団・本拠地を編集'}
          </button>

          <button
            onClick={() => setIsAddTeamModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition shadow flex items-center gap-1.5"
            title="新球団を追加してロスター30名を自動生成"
          >
            <PlusCircle className="w-4 h-4" />
            球団を追加
          </button>

          <button
            onClick={() => setIsRosterModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition shadow flex items-center gap-1.5"
            title="チーム編成（選手・能力値・起用）のJSON保存・読込"
          >
            <FileJson className="w-4 h-4" />
            編成JSON
          </button>

          <button
            onClick={() => setActiveScreen('lineup')}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow flex items-center gap-1.5"
          >
            <Sliders className="w-4 h-4" />
            スタメン編集へ
          </button>

          {teams.length > 2 && (
            <button
              onClick={() => {
                if (confirm(`球団「${currentTeam.name}」を削除しますか？`)) {
                  deleteTeam(currentTeam.id);
                  setSelectedTeamId(teams.find(t => t.id !== currentTeam.id)?.id || 'tokyo');
                }
              }}
              className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/50 text-rose-300 text-xs font-bold transition"
              title="球団を削除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Editable Team & Stadium Settings Box */}
      {isEditingTeam && (
        <div className="bg-slate-900 border border-sky-500/50 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              球団情報・本拠地所在地の編集
            </h3>
            <span className="text-xs text-slate-400">リアルタイムに反映されます</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">球団名</label>
              <input
                type="text"
                value={currentTeam.name}
                onChange={(e) => updateTeam({ ...currentTeam, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:ring-1 focus:ring-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">本拠地所在地</label>
              <input
                type="text"
                value={currentTeam.city}
                placeholder="例: 東京都、神奈川県横浜市"
                onChange={(e) => updateTeam({ ...currentTeam, city: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:ring-1 focus:ring-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">本拠地球場</label>
              <input
                type="text"
                value={currentTeam.stadium}
                onChange={(e) => updateTeam({ ...currentTeam, stadium: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:ring-1 focus:ring-sky-400 focus:outline-none"
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:ring-1 focus:ring-sky-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-slate-400">現在順位 / 勝敗</span>
          <div className="text-lg font-black text-amber-400">
            {currentTeam.stats.rank} 位 ({currentTeam.stats.wins}勝{currentTeam.stats.losses}敗)
          </div>
          <div className="text-[11px] text-slate-400">勝率 .{currentTeam.stats.winRate > 0 ? (currentTeam.stats.winRate * 1000).toFixed(0).padStart(3, '0') : '000'}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-slate-400">総得点 / 総失点</span>
          <div className="text-lg font-black text-white">
            {totalRuns} 点 / {totalAllowed} 点
          </div>
          <div className="text-[11px] text-slate-400">得失点差: {totalRuns - totalAllowed > 0 ? `+${totalRuns - totalAllowed}` : totalRuns - totalAllowed}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-slate-400">本拠地・球場</span>
          <div className="text-base font-bold text-white truncate">
            {currentTeam.stadium}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {currentTeam.city}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-slate-400">所属選手数</span>
          <div className="text-lg font-black text-white">
            {currentTeam.players.length} 名
          </div>
          <div className="text-[11px] text-slate-400">投手 {pitchers.length} 名 / 野手 {batters.length} 名</div>
        </div>
      </div>

      {/* Rosters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            所属選手名簿・シーズン成績サマリー
          </h3>
          <button
            onClick={() => setActiveScreen('editor')}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
          >
            選手の能力値を編集 &rarr;
          </button>
        </div>

        <div className="space-y-4">
          {/* Pitchers Table */}
          <div>
            <h4 className="text-xs font-bold text-sky-300 mb-2">投手陣 ({pitchers.length}名)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800 text-[11px]">
                    <th className="py-2 px-2 w-8">#</th>
                    <th className="py-2 px-2">選手名</th>
                    <th className="py-2 px-2">投打</th>
                    <th className="py-2 px-2">役割</th>
                    <th className="py-2 px-2 text-right">球速</th>
                    <th className="py-2 px-2 text-right">登板</th>
                    <th className="py-2 px-2 text-right">勝</th>
                    <th className="py-2 px-2 text-right">敗</th>
                    <th className="py-2 px-2 text-right">S</th>
                    <th className="py-2 px-2 text-right">回</th>
                    <th className="py-2 px-2 text-right">奪三振</th>
                    <th className="py-2 px-2 text-right text-amber-300 font-bold">防御率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {pitchers.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/40 text-slate-300">
                      <td className="py-1.5 px-2 font-mono text-slate-500">{p.number}</td>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">{p.name}</span>
                          <span className={`px-1 py-0.2 rounded border font-mono font-bold text-[9px] ${getAbilityGrade(p.control).badgeClass}`}>制{getAbilityGrade(p.control).grade}</span>
                          <span className={`px-1 py-0.2 rounded border font-mono font-bold text-[9px] ${getAbilityGrade(p.stamina).badgeClass}`}>ス{getAbilityGrade(p.stamina).grade}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-slate-400">{p.throws === 'L' ? '左投' : '右投'}</td>
                      <td className="py-1.5 px-2 text-slate-400">{p.pitcherRole}</td>
                      <td className="py-1.5 px-2 text-right font-mono">
                        <span className="mr-1">{p.pitchVelocity}km</span>
                        <span className={`px-1 py-0.2 rounded border font-bold text-[9px] ${getAbilityGrade(p.pitchVelocity, true).badgeClass}`}>
                          {getAbilityGrade(p.pitchVelocity, true).grade}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono">{p.pitcherStats.games}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-400">{p.pitcherStats.wins}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-rose-400">{p.pitcherStats.losses}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-sky-400">{p.pitcherStats.saves}</td>
                      <td className="py-1.5 px-2 text-right font-mono">
                        {Math.floor(p.pitcherStats.ipOuts / 3)}.{p.pitcherStats.ipOuts % 3}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono">{p.pitcherStats.so}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-amber-300">
                        {p.pitcherStats.era.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Batters Table */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-amber-300 mb-2">野手陣 ({batters.length}名)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800 text-[11px]">
                    <th className="py-2 px-2 w-8">#</th>
                    <th className="py-2 px-2">選手名</th>
                    <th className="py-2 px-2">位置</th>
                    <th className="py-2 px-2">打席</th>
                    <th className="py-2 px-2 text-right">試合</th>
                    <th className="py-2 px-2 text-right">打数</th>
                    <th className="py-2 px-2 text-right">安打</th>
                    <th className="py-2 px-2 text-right">本塁打</th>
                    <th className="py-2 px-2 text-right">打点</th>
                    <th className="py-2 px-2 text-right">盗塁</th>
                    <th className="py-2 px-2 text-right text-amber-300 font-bold">打率</th>
                    <th className="py-2 px-2 text-right">OPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {batters.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/40 text-slate-300">
                      <td className="py-1.5 px-2 font-mono text-slate-500">{p.number}</td>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">{p.name}</span>
                          <span className={`px-1 py-0.2 rounded border font-mono font-bold text-[9px] ${getAbilityGrade(p.contact).badgeClass}`}>巧{getAbilityGrade(p.contact).grade}</span>
                          <span className={`px-1 py-0.2 rounded border font-mono font-bold text-[9px] ${getAbilityGrade(p.power).badgeClass}`}>長{getAbilityGrade(p.power).grade}</span>
                          <span className={`px-1 py-0.2 rounded border font-mono font-bold text-[9px] ${getAbilityGrade(p.speed).badgeClass}`}>走{getAbilityGrade(p.speed).grade}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-amber-400 font-semibold">{p.mainPosition}</td>
                      <td className="py-1.5 px-2 text-slate-400">{p.bats === 'L' ? '左打' : p.bats === 'S' ? '両打' : '右打'}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{p.batterStats.games}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{p.batterStats.ab}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-100">{p.batterStats.hits}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-rose-300">{p.batterStats.hr}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-sky-300">{p.batterStats.rbi}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-emerald-400">{p.batterStats.sb}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-amber-300">
                        .{p.batterStats.avg > 0 ? (p.batterStats.avg * 1000).toFixed(0).padStart(3, '0') : '000'}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-purple-300">
                        {p.batterStats.ops.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Team Roster Modal */}
      <TeamRosterModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        defaultTeamId={currentTeam.id}
      />

      {/* Add Team Modal */}
      <AddTeamModal
        isOpen={isAddTeamModalOpen}
        onClose={() => setIsAddTeamModalOpen(false)}
        onTeamCreated={(newTeamId) => setSelectedTeamId(newTeamId)}
      />
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import {
  Users,
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  FileUp,
  X,
  Sparkles,
  Sliders,
  ShieldCheck,
  Flame,
  UserCheck
} from 'lucide-react';
import { parseTeamRosterJson, ExportedTeamRoster } from '../utils/rosterIO';

interface TeamRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTeamId?: string;
  defaultTab?: 'export' | 'import';
}

export const TeamRosterModal: React.FC<TeamRosterModalProps> = ({
  isOpen,
  onClose,
  defaultTeamId,
  defaultTab = 'export',
}) => {
  const {
    teams,
    userTeamId,
    exportTeamFormationJson,
    exportAllTeamsFormationJson,
    importTeamFormationJson,
  } = useGame();

  const [activeTab, setActiveTab] = useState<'export' | 'import'>(defaultTab);
  const [selectedExportScope, setSelectedExportScope] = useState<string>(defaultTeamId || userTeamId || teams[0]?.id || 'tokyo');
  const [selectedImportTarget, setSelectedImportTarget] = useState<string>(defaultTeamId || userTeamId || 'auto');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [stagedJson, setStagedJson] = useState<string | null>(null);
  const [stagedInfo, setStagedInfo] = useState<{
    mode: 'single_team' | 'all_teams';
    summary: string;
    teamName?: string;
    playerCount?: number;
    pitcherCount?: number;
    batterCount?: number;
  } | null>(null);
  const [showManualPaste, setShowManualPaste] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Handle export
  const handleExport = () => {
    try {
      let jsonStr = '';
      let fileName = '';

      if (selectedExportScope === 'all') {
        jsonStr = exportAllTeamsFormationJson();
        fileName = `npb_全6球団_編成_能力_起用_${Date.now()}.json`;
      } else {
        const team = teams.find(t => t.id === selectedExportScope) || teams[0];
        jsonStr = exportTeamFormationJson(team.id);
        const safeName = team.name.replace(/[\/\s]/g, '_');
        fileName = `${safeName}_編成_能力_起用_${Date.now()}.json`;
      }

      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMsg({
        type: 'success',
        text: `「${fileName}」をダウンロードしました！選手・能力値・起用データが保存されました。`,
      });
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      setMsg({ type: 'error', text: 'エクスポートに失敗しました。' });
    }
  };

  // Process and stage JSON for import preview
  const inspectAndStageJson = (jsonText: string) => {
    const parse = parseTeamRosterJson(jsonText);
    if (!parse.valid) {
      setMsg({ type: 'error', text: parse.error || '有効なチーム編成JSONではありませんでした。' });
      setStagedJson(null);
      setStagedInfo(null);
      setTimeout(() => setMsg(null), 4500);
      return;
    }

    setStagedJson(jsonText);
    if (parse.mode === 'single_team' && parse.team) {
      const p = parse.team.players || [];
      const pitchers = p.filter((x: any) => x.isPitcher).length;
      const batters = p.filter((x: any) => !x.isPitcher).length;
      setStagedInfo({
        mode: 'single_team',
        summary: parse.summaryText || '単一球団編成',
        teamName: parse.team.name,
        playerCount: p.length,
        pitcherCount: pitchers,
        batterCount: batters,
      });
    } else if (parse.mode === 'all_teams' && parse.teams) {
      const totalP = parse.teams.reduce((acc: number, t: any) => acc + (t.players?.length || 0), 0);
      setStagedInfo({
        mode: 'all_teams',
        summary: parse.summaryText || '全球団編成',
        playerCount: totalP,
      });
    }
    setMsg({
      type: 'success',
      text: 'ファイルを正常に読み込みました。内容を確認して「この編成データを反映する」をクリックしてください。',
    });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const text = await file.text();
      inspectAndStageJson(text);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const text = await files[0].text();
      inspectAndStageJson(text);
      e.target.value = '';
    }
  };

  const handleManualTextInspect = () => {
    if (!manualText.trim()) return;
    inspectAndStageJson(manualText);
  };

  // Apply staged JSON to team(s)
  const handleApplyImport = () => {
    if (!stagedJson) return;

    const targetId = selectedImportTarget === 'auto' ? undefined : selectedImportTarget;
    const result = importTeamFormationJson(stagedJson, targetId);

    if (result.success) {
      setMsg({ type: 'success', text: result.message });
      setStagedJson(null);
      setStagedInfo(null);
      setManualText('');
      setTimeout(() => {
        onClose();
      }, 1800);
    } else {
      setMsg({ type: 'error', text: result.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                チーム編成 JSON 保存・読込
              </h2>
              <p className="text-xs text-slate-400">
                選手・能力値・起用・オーダーのみをファイル化して自由に入出力
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1 gap-1">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'export'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Download className="w-4 h-4" />
            編成をJSON保存（エクスポート）
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'import'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Upload className="w-4 h-4" />
            編成JSONを読み込み（インポート）
          </button>
        </div>

        {/* Notifications */}
        {msg && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-150 ${
              msg.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/80 text-rose-200'
            }`}
          >
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span className="flex-1">{msg.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                  <ShieldCheck className="w-4 h-4" />
                  保存されるデータ項目
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 pl-4 list-disc">
                  <li><strong className="text-white">選手一覧:</strong> 名前、背番号、年齢、利き腕、ポジション適性</li>
                  <li><strong className="text-white">能力値:</strong> ミート、パワー、走力、肩力、守備力、捕球、選球眼、球速、コントロール、スタミナ、変化球など全パラメータ</li>
                  <li><strong className="text-white">起用・オーダー:</strong> 1〜9番打順、守備位置、先発6本柱、中継ぎ、セットアッパー、抑え、各選手の個別起用法ポリシー</li>
                </ul>
                <div className="text-[11px] text-amber-400/90 pt-1 font-medium border-t border-slate-800/60 mt-2">
                  ※ 試合日程や進行状況、シーズン通算個人成績は含みません（編成のみ保存されます）。
                </div>
              </div>

              {/* Target Scope Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  保存する対象を選択
                </label>
                <select
                  value={selectedExportScope}
                  onChange={(e) => setSelectedExportScope(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:ring-1 focus:ring-sky-400 focus:outline-none"
                >
                  <optgroup label="球団別（単体保存）">
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} （選手 {t.players.length}名）
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="全球団まとめ">
                    <option value="all">★ 全6球団の編成をまとめて保存</option>
                  </optgroup>
                </select>
              </div>

              {/* Export Action Button */}
              <div className="pt-2">
                <button
                  onClick={handleExport}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>チーム編成JSONファイルをダウンロード (.json)</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 space-y-1">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                  <UserCheck className="w-4 h-4" />
                  編成データの安全な反映
                </span>
                <p>
                  ペナントレースの日程やこれまでの試合スコアを崩さずに、<strong className="text-white">選手リスト・能力値・起用オーダーのみ</strong>を安全に上書き反映します。
                </p>
              </div>

              {/* Target Team Selection (for single team imports) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>反映先球団の指定</span>
                  <span className="text-[11px] text-slate-400 font-normal">（単一球団データ読込時に適用）</span>
                </label>
                <select
                  value={selectedImportTarget}
                  onChange={(e) => setSelectedImportTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:ring-1 focus:ring-emerald-400 focus:outline-none"
                >
                  <option value="auto">自動判定（JSONファイル内の球団名/IDに合わせる）</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>
                      強制適用: {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept=".json,application/json"
                className="hidden"
              />

              {/* Drag & Drop Zone */}
              <div
                onDrop={handleFileDrop}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setIsDragging(false);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-7 transition flex flex-col items-center justify-center text-center select-none ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-950/40 scale-[1.01]'
                    : 'border-slate-700 hover:border-emerald-500/70 bg-slate-950/50 hover:bg-slate-950/80'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2.5">
                  <FileUp className="w-6 h-6" />
                </div>
                <div className="text-xs sm:text-sm font-bold text-white mb-1">
                  編成JSONファイルをここにドラッグ＆ドロップ
                </div>
                <div className="text-[11px] text-slate-400 mb-2">
                  またはクリックしてパソコン内の .json ファイルを選択
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-300 font-medium">
                  単一チームJSON / 全球団JSON の両方に対応
                </div>
              </div>

              {/* Preview Staged Info Box */}
              {stagedInfo && (
                <div className="bg-emerald-950/50 border border-emerald-500/70 rounded-xl p-4 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      読み込み成功・内容プレビュー
                    </span>
                    <span className="text-[11px] bg-emerald-900/80 text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                      {stagedInfo.mode === 'single_team' ? '単一チーム' : '全球団一括'}
                    </span>
                  </div>

                  <div className="text-xs text-white font-bold">
                    {stagedInfo.summary}
                  </div>

                  {stagedInfo.teamName && (
                    <div className="text-xs text-slate-300">
                      対象球団: <span className="text-sky-300 font-bold">{stagedInfo.teamName}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs text-slate-300 pt-1">
                    {stagedInfo.playerCount !== undefined && (
                      <div>選手数: <strong className="text-white">{stagedInfo.playerCount}名</strong></div>
                    )}
                    {stagedInfo.pitcherCount !== undefined && (
                      <div>投手: <strong className="text-amber-300">{stagedInfo.pitcherCount}名</strong></div>
                    )}
                    {stagedInfo.batterCount !== undefined && (
                      <div>野手: <strong className="text-sky-300">{stagedInfo.batterCount}名</strong></div>
                    )}
                  </div>

                  <button
                    onClick={handleApplyImport}
                    className="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    この編成データをゲームに反映する
                  </button>
                </div>
              )}

              {/* Manual Text Paste Option */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => setShowManualPaste(!showManualPaste)}
                  className="text-xs text-slate-400 hover:text-emerald-400 font-semibold flex items-center gap-1 transition"
                >
                  {showManualPaste ? '▼ テキスト直接貼り付けを閉じる' : '▶ JSONテキストの直接貼り付け入力はこちら'}
                </button>

                {showManualPaste && (
                  <div className="mt-2.5 space-y-2">
                    <textarea
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder="編成JSONテキストの内容を貼り付けてください..."
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                    <button
                      onClick={handleManualTextInspect}
                      disabled={!manualText.trim()}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-xs transition"
                    >
                      JSONテキストを解析
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

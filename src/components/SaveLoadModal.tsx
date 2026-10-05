import React, { useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import {
  Save,
  Upload,
  Download,
  RefreshCcw,
  Check,
  AlertTriangle,
  FileJson,
  FileUp,
  Sparkles,
  CheckCircle2,
  Globe,
  Laptop,
  FolderDown,
  ExternalLink,
  Copy,
  Code2,
  Users,
  ShieldCheck,
  Sliders,
  UserCheck
} from 'lucide-react';
import { parseTeamRosterJson } from '../utils/rosterIO';

export const SaveLoadModal: React.FC = () => {
  const {
    teams,
    userTeamId,
    saveGame,
    loadGame,
    resetGame,
    exportSaveJson,
    importSaveJson,
    exportTeamFormationJson,
    exportAllTeamsFormationJson,
    importTeamFormationJson,
    lastSavedAt,
    setIsResetConfirmOpen,
  } = useGame();
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [isDownloadingHtml, setIsDownloadingHtml] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dedicated Roster Section state
  const [rosterExportScope, setRosterExportScope] = useState<string>(userTeamId || teams[0]?.id || 'tokyo');
  const [rosterImportTarget, setRosterImportTarget] = useState<string>('auto');
  const [rosterMsg, setRosterMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRosterDragging, setIsRosterDragging] = useState(false);
  const [stagedRosterText, setStagedRosterText] = useState<string | null>(null);
  const [stagedRosterInfo, setStagedRosterInfo] = useState<{
    mode: 'single_team' | 'all_teams';
    summary: string;
    teamName?: string;
    playerCount?: number;
  } | null>(null);
  const [showRosterManualPaste, setShowRosterManualPaste] = useState(false);
  const [rosterManualInput, setRosterManualInput] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const rosterFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCopyUrl = () => {
    const fullUrl = window.location.origin + '/mpb_baseball_game.html';
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(fullUrl).then(() => {
        setCopiedUrl(true);
        setMsg({
          type: 'success',
          text: 'ブラウザ直接プレイ用URLをクリップボードにコピーしました！別タブでそのまま開けます。',
        });
        setTimeout(() => setCopiedUrl(false), 3000);
        setTimeout(() => setMsg(null), 5000);
      }).catch(() => {
        setMsg({
          type: 'success',
          text: `ブラウザ用URL: ${fullUrl}`,
        });
      });
    } else {
      setMsg({
        type: 'success',
        text: `ブラウザ用URL: ${fullUrl}`,
      });
    }
  };

  const handleDownloadHtml = async () => {
    setIsDownloadingHtml(true);
    try {
      const res = await fetch('/mpb_baseball_game.html');
      if (!res.ok) throw new Error('File fetch error');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mpb_baseball_game.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMsg({
        type: 'success',
        text: '「mpb_baseball_game.html」をダウンロードしました！ダブルクリックするとChromeやEdgeなどのブラウザでそのまま遊べます！'
      });
    } catch (err) {
      const a = document.createElement('a');
      a.href = '/mpb_baseball_game.html';
      a.download = 'mpb_baseball_game.html';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setMsg({
        type: 'success',
        text: 'ダウンロードを開始しました。完了後、ファイルをダブルクリックしてブラウザで開けます。'
      });
    } finally {
      setIsDownloadingHtml(false);
      setTimeout(() => setMsg(null), 6000);
    }
  };

  const handleSave = () => {
    saveGame();
    setMsg({ type: 'success', text: 'ブラウザに最新ゲームデータを保存しました！' });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleLoad = () => {
    const ok = loadGame();
    if (ok) {
      setMsg({ type: 'success', text: '保存されたデータを正常に復元しました！' });
    } else {
      setMsg({ type: 'error', text: '保存データが見つかりませんでした。' });
    }
    setTimeout(() => setMsg(null), 3000);
  };

  const handleReset = () => {
    setIsResetConfirmOpen(true);
  };

  const handleExport = () => {
    const json = exportSaveJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `npb_pennant_save_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ type: 'success', text: 'セーブデータJSONをダウンロードしました！' });
    setTimeout(() => setMsg(null), 3000);
  };

  const processJsonFile = async (file: File) => {
    try {
      if (!file.name.toLowerCase().endsWith('.json') && file.type && !file.type.includes('json')) {
        setMsg({ type: 'error', text: 'JSON形式のファイル (.json) を選択してください。' });
        setTimeout(() => setMsg(null), 4000);
        return;
      }

      const text = await file.text();
      // 1. Try Pennant Full Save
      const ok = importSaveJson(text);
      if (ok) {
        setLoadedFileName(file.name);
        setMsg({
          type: 'success',
          text: `「${file.name}」からペナント全データを正常にインポートしました！`
        });
        setTimeout(() => setMsg(null), 4000);
        return;
      }

      // 2. Try Team Formation JSON
      const rosterResult = importTeamFormationJson(text);
      if (rosterResult.success) {
        setLoadedFileName(file.name);
        setMsg({
          type: 'success',
          text: `「${file.name}」から${rosterResult.message}`,
        });
        setTimeout(() => setMsg(null), 4000);
        return;
      }

      setMsg({
        type: 'error',
        text: 'ファイルの解析に失敗しました。正しいペナントレースJSONまたはチーム編成JSONか確認してください。'
      });
    } catch (err) {
      setMsg({ type: 'error', text: 'ファイルの読み込み中にエラーが発生しました。' });
    }
    setTimeout(() => setMsg(null), 4000);
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processJsonFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the drop container itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processJsonFile(files[0]);
      e.target.value = ''; // Reset input so same file can be loaded again if needed
    }
  };

  const handleImportText = () => {
    if (!importText.trim()) return;
    const ok = importSaveJson(importText);
    if (ok) {
      setMsg({ type: 'success', text: 'JSONテキストからペナント全データを復元しました！' });
      setImportText('');
      setTimeout(() => setMsg(null), 3500);
      return;
    }

    const rosterResult = importTeamFormationJson(importText);
    if (rosterResult.success) {
      setMsg({ type: 'success', text: rosterResult.message });
      setImportText('');
      setTimeout(() => setMsg(null), 3500);
      return;
    }

    setMsg({ type: 'error', text: 'JSONの解析に失敗しました。正しいセーブデータまたはチーム編成JSON形式か確認してください。' });
    setTimeout(() => setMsg(null), 3500);
  };

  const handleRosterExport = () => {
    try {
      let jsonStr = '';
      let fileName = '';

      if (rosterExportScope === 'all') {
        jsonStr = exportAllTeamsFormationJson();
        fileName = `npb_全6球団_編成_能力_起用_${Date.now()}.json`;
      } else {
        const team = teams.find(t => t.id === rosterExportScope) || teams[0];
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

      setRosterMsg({
        type: 'success',
        text: `「${fileName}」をダウンロードしました！選手・能力値・起用データが保存されました。`,
      });
      setTimeout(() => setRosterMsg(null), 4000);
    } catch (err) {
      setRosterMsg({ type: 'error', text: '編成データのエクスポートに失敗しました。' });
    }
  };

  const inspectAndStageRosterFile = (text: string) => {
    const parse = parseTeamRosterJson(text);
    if (!parse.valid) {
      setRosterMsg({ type: 'error', text: parse.error || '有効なチーム編成JSONではありませんでした。' });
      setStagedRosterText(null);
      setStagedRosterInfo(null);
      setTimeout(() => setRosterMsg(null), 4000);
      return;
    }

    setStagedRosterText(text);
    if (parse.mode === 'single_team' && parse.team) {
      setStagedRosterInfo({
        mode: 'single_team',
        summary: parse.summaryText || '単一球団編成',
        teamName: parse.team.name,
        playerCount: parse.team.players?.length || 0,
      });
    } else if (parse.mode === 'all_teams' && parse.teams) {
      const totalP = parse.teams.reduce((acc: number, t: any) => acc + (t.players?.length || 0), 0);
      setStagedRosterInfo({
        mode: 'all_teams',
        summary: parse.summaryText || '全球団編成',
        playerCount: totalP,
      });
    }

    setRosterMsg({
      type: 'success',
      text: '編成JSONファイルを認識しました。内容を確認して「この編成をゲームに反映」をクリックしてください。',
    });
    setTimeout(() => setRosterMsg(null), 5000);
  };

  const handleRosterFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRosterDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const text = await files[0].text();
      inspectAndStageRosterFile(text);
    }
  };

  const handleRosterFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const text = await files[0].text();
      inspectAndStageRosterFile(text);
      e.target.value = '';
    }
  };

  const handleRosterApply = () => {
    if (!stagedRosterText) return;
    const target = rosterImportTarget === 'auto' ? undefined : rosterImportTarget;
    const result = importTeamFormationJson(stagedRosterText, target);
    if (result.success) {
      setRosterMsg({ type: 'success', text: result.message });
      setStagedRosterText(null);
      setStagedRosterInfo(null);
      setRosterManualInput('');
    } else {
      setRosterMsg({ type: 'error', text: result.message });
    }
    setTimeout(() => setRosterMsg(null), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Save className="w-6 h-6 text-sky-400" />
            セーブ ＆ ロード管理
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            ペナントレースの進行状況、6球団の選手成績、個人タイトル、カスタマイズした能力値をブラウザまたはJSONファイルに永続化できます。
          </p>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl border text-sm font-bold flex items-center gap-3 transition shadow-lg animate-in fade-in duration-200 ${
            msg.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
              : 'bg-rose-950/70 border-rose-500 text-rose-300'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Standalone HTML & Browser Play Download Banner */}
      <div className="bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80 border-2 border-sky-500/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-500 text-slate-950 flex items-center gap-1">
                <Laptop className="w-3.5 h-3.5" />
                PC・スマホ ブラウザ直接プレイ対応
              </span>
              <span className="text-xs text-emerald-300 font-bold flex items-center gap-1 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/40">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                最新データ更新済み
              </span>
              <span className="text-xs text-sky-300 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Node.js・サーバー不要
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-sky-400" />
              ブラウザで直接開く ＆ オフライン用単一HTML
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              最新のロイヤルリーグ（大正義狂人軍・横浜ホエールズ・名鉄ドラゴンズ・阪急ブルーウェーブ・社会人選抜・広島RCCカープ）とキングダムリーグ、各球団30名編成、月曜休みの6連戦・1日3試合の全143試合公式日程をすべて内包した<strong className="text-white font-bold">「単一HTMLブラウザ版」</strong>です。<br className="hidden sm:inline" />
              ブラウザの別タブで全画面直接プレイできるほか、ファイルをダウンロードすればネット不要の完全オフラインでも遊べます！
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
                <span className="text-sky-400 font-bold">①</span> 別タブで即座に直接開く
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
                <span className="text-sky-400 font-bold">②</span> またはHTMLを保存
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
                <span className="text-sky-400 font-bold">③</span> ブラウザで即起動・プレイ
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0 sm:min-w-[260px]">
            {/* Direct Open in New Tab */}
            <a
              href="/mpb_baseball_game.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 active:scale-95 cursor-pointer text-center"
            >
              <ExternalLink className="w-4 h-4 text-slate-950 shrink-0" />
              <span>ブラウザ別タブで全画面起動</span>
            </a>

            {/* Download File */}
            <button
              onClick={handleDownloadHtml}
              disabled={isDownloadingHtml}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <FolderDown className="w-4 h-4 text-slate-950 shrink-0" />
              <span>{isDownloadingHtml ? 'ダウンロード中...' : 'HTML保存 (完全オフライン対応)'}</span>
            </button>

            {/* Copy URL */}
            <button
              onClick={handleCopyUrl}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-sky-400" />
              <span>{copiedUrl ? 'URLをコピーしました！' : 'ブラウザ用URLをコピー'}</span>
            </button>

            <div className="text-[11px] text-slate-400 text-center">
              容量: 約1.1MB（Chrome / Edge / Safari / スマホ対応）
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Browser Save */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-3">
              <Save className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">ブラウザに保存</h3>
            <p className="text-xs text-slate-400 mb-3">
              現在のペナントレース全データをブラウザのLocalStorageに保存します。
            </p>
            {lastSavedAt && (
              <div className="text-[11px] text-slate-400 mb-3">
                最終保存: <span className="text-sky-300 font-semibold">{lastSavedAt}</span>
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow-md"
          >
            今すぐセーブ
          </button>
        </div>

        {/* Browser Load */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">保存データをロード</h3>
            <p className="text-xs text-slate-400 mb-4">
              ブラウザに保存された前回セーブ時の状態を復元します。
            </p>
          </div>
          <button
            onClick={handleLoad}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md"
          >
            データをロード
          </button>
        </div>

        {/* Reset */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <RefreshCcw className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">初期状態へリセット</h3>
            <p className="text-xs text-slate-400 mb-4">
              開幕前の状態に戻し、全成績をクリアします。
            </p>
          </div>
          <button
            onClick={handleReset}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 hover:border-rose-500 border border-slate-700 text-slate-300 font-bold text-xs transition"
          >
            ペナント初期化
          </button>
        </div>
      </div>

      {/* JSON File Drag & Drop + Export / Import */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileJson className="w-5 h-5 text-amber-400" />
              JSONファイルによるセーブ ＆ ロード
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ファイルを直接ドラッグ＆ドロップして復元したり、バックアップとして書き出し保存できます。
            </p>
          </div>

          <button
            onClick={handleExport}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-md shrink-0 self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            セーブデータをJSON書き出し
          </button>
        </div>

        {/* Drag and Drop Zone */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <FileUp className="w-4 h-4 text-sky-400" />
            JSONファイルのドラッグ＆ドロップ（またはクリックして選択）
          </label>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".json,application/json"
            className="hidden"
          />

          <div
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-10 transition-all duration-200 flex flex-col items-center justify-center text-center select-none ${
              isDragging
                ? 'border-sky-400 bg-sky-950/50 scale-[1.01] shadow-xl shadow-sky-900/30'
                : 'border-slate-700 hover:border-sky-500/70 bg-slate-950/60 hover:bg-slate-950/90'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-transform ${
                isDragging ? 'bg-sky-500 text-white scale-110 animate-bounce' : 'bg-slate-800 text-sky-400'
              }`}
            >
              <FileUp className="w-7 h-7" />
            </div>

            <h4 className="text-sm sm:text-base font-bold text-white mb-1">
              {isDragging ? 'ここにJSONファイルをドロップしてください！' : 'JSONファイルをここにドラッグ＆ドロップ'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mb-3">
              パソコン内のセーブデータファイル（.json）をそのままこの枠内に放り込むだけで、一瞬でペナントレースを復元できます
            </p>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition">
              またはここをクリックしてファイルを選択
            </div>

            {loadedFileName && (
              <div className="mt-4 px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>直近に読込済: {loadedFileName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Toggle Manual Text Paste */}
        <div className="pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setShowManualPaste(!showManualPaste)}
            className="text-xs text-slate-400 hover:text-sky-400 font-semibold flex items-center gap-1 transition"
          >
            <span>{showManualPaste ? '▼ テキスト貼り付け入力欄を閉じる' : '▶ テキスト直接貼り付けでインポートする場合はこちら'}</span>
          </button>

          {showManualPaste && (
            <div className="mt-3 space-y-2 animate-in fade-in duration-150">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="エクスポートしたJSONテキストの内容を直接ここに貼り付けてください..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:ring-1 focus:ring-sky-400 focus:outline-none"
              />
              <button
                onClick={handleImportText}
                disabled={!importText.trim()}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs transition"
              >
                JSONテキストから復元実行
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dedicated Team Formation (Players, Ratings, Usage) JSON Section */}
      <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                編成・選手・起用特化
              </span>
              <span className="text-[11px] text-slate-400">ペナント試合日程・成績は除外</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <FileJson className="w-5 h-5 text-emerald-400" />
              チーム編成（選手・能力値・起用）のJSON保存 ＆ 読込
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              ペナントレースの勝敗や試合結果には一切触れず、<strong className="text-white font-bold">選手一覧・各能力値・変化球・打順（1〜9番）・守備位置・投手ローテーション・起用法ポリシーのみ</strong>をJSONファイルとして保存・読み込みできます。
            </p>
          </div>
        </div>

        {rosterMsg && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-150 ${
              rosterMsg.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500 text-rose-200'
            }`}
          >
            {rosterMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{rosterMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Export Box */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-400">
                <Download className="w-4 h-4" />
                チーム編成をJSON保存（書き出し）
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                エディターで調整したオリジナル能力値やスタメン起用方針をファイルとしてバックアップ・配布できます。
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  書き出す対象
                </label>
                <select
                  value={rosterExportScope}
                  onChange={(e) => setRosterExportScope(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:ring-1 focus:ring-emerald-400 focus:outline-none"
                >
                  <optgroup label="球団別">
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} （選手 {t.players.length}名）
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="一括">
                    <option value="all">★ 全6球団の編成をまとめて書き出し</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <button
              onClick={handleRosterExport}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4" />
              チーム編成JSONをダウンロード (.json)
            </button>
          </div>

          {/* Import Box */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-sky-400">
                <Upload className="w-4 h-4" />
                チーム編成JSONを読み込み（反映）
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>反映先球団</span>
                  <span className="text-[10px] text-slate-400">（単一球団データ時に有効）</span>
                </label>
                <select
                  value={rosterImportTarget}
                  onChange={(e) => setRosterImportTarget(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:ring-1 focus:ring-sky-400 focus:outline-none"
                >
                  <option value="auto">自動判定（ファイル内の球団に合わせる）</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>
                      強制上書き: {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                ref={rosterFileInputRef}
                onChange={handleRosterFileInputChange}
                accept=".json,application/json"
                className="hidden"
              />

              <div
                onDrop={handleRosterFileDrop}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsRosterDragging(true); }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setIsRosterDragging(false);
                }}
                onClick={() => rosterFileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-4 transition text-center select-none ${
                  isRosterDragging
                    ? 'border-sky-400 bg-sky-950/40'
                    : 'border-slate-700 hover:border-sky-500/70 bg-slate-900/50'
                }`}
              >
                <FileUp className="w-5 h-5 text-sky-400 mx-auto mb-1" />
                <div className="text-xs font-bold text-white">
                  編成JSONをドロップまたは選択
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  単一球団・全球団の編成JSONに対応
                </div>
              </div>

              {stagedRosterInfo && (
                <div className="bg-sky-950/40 border border-sky-500/50 rounded-lg p-3 space-y-2 text-xs">
                  <div className="font-bold text-sky-300 flex items-center justify-between">
                    <span>{stagedRosterInfo.summary}</span>
                    <span className="text-[10px] bg-sky-900 text-sky-200 px-1.5 py-0.5 rounded">解析済</span>
                  </div>
                  {stagedRosterInfo.teamName && (
                    <div className="text-slate-300">対象: <strong className="text-white">{stagedRosterInfo.teamName}</strong></div>
                  )}
                  {stagedRosterInfo.playerCount !== undefined && (
                    <div className="text-slate-300">選手数: <strong className="text-white">{stagedRosterInfo.playerCount}名</strong></div>
                  )}
                  <button
                    onClick={handleRosterApply}
                    className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    この編成データをゲームに反映
                  </button>
                </div>
              )}
            </div>

            <div className="pt-1">
              <button
                onClick={() => setShowRosterManualPaste(!showRosterManualPaste)}
                className="text-[11px] text-slate-400 hover:text-sky-400 font-semibold flex items-center gap-1"
              >
                <span>{showRosterManualPaste ? '▼ テキスト貼り付けを閉じる' : '▶ テキスト貼り付けで読み込む場合はこちら'}</span>
              </button>

              {showRosterManualPaste && (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={rosterManualInput}
                    onChange={(e) => setRosterManualInput(e.target.value)}
                    placeholder="編成JSONテキストを貼り付け..."
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[11px] text-slate-200 font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => inspectAndStageRosterFile(rosterManualInput)}
                    disabled={!rosterManualInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white font-bold text-xs"
                  >
                    解析してプレビュー
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

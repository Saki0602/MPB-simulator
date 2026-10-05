import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { FileJson, FileUp, CheckCircle2, AlertTriangle, Sparkles, X, Users } from 'lucide-react';

export const GlobalDropOverlay: React.FC = () => {
  const { importSaveJson, importTeamFormationJson, setActiveScreen } = useGame();
  const [isDraggingOverWindow, setIsDraggingOverWindow] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; title?: string; text: string; fileName?: string } | null>(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      // Only react if dragging files
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        dragCounter.current += 1;
        setIsDraggingOverWindow(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDraggingOverWindow(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDraggingOverWindow(false);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const isJson = file.name.toLowerCase().endsWith('.json') || (file.type && file.type.includes('json'));
      if (!isJson) {
        setNotification({
          type: 'error',
          title: '非対応ファイル',
          text: `「${file.name}」はJSONファイルではありません。.json ファイルをドロップしてください。`,
        });
        setTimeout(() => setNotification(null), 4500);
        return;
      }

      try {
        const text = await file.text();

        // 1. Try Pennant Full Save
        const isFullSave = importSaveJson(text);
        if (isFullSave) {
          setNotification({
            type: 'success',
            title: 'ペナント全データを復元完了',
            text: 'セーブデータを正常に読み込み、ペナントレースを復元しました！',
            fileName: file.name,
          });
          setTimeout(() => {
            setNotification(null);
          }, 5000);
          return;
        }

        // 2. Try Team Formation JSON (players, ratings, usage)
        const rosterResult = importTeamFormationJson(text);
        if (rosterResult.success) {
          setNotification({
            type: 'success',
            title: 'チーム編成データを反映完了',
            text: rosterResult.message,
            fileName: file.name,
          });
          setTimeout(() => {
            setNotification(null);
          }, 5000);
          return;
        }

        setNotification({
          type: 'error',
          title: 'インポート失敗',
          text: `「${file.name}」の解析に失敗しました。有効なペナントレースJSONまたはチーム編成JSONか確認してください。`,
        });
        setTimeout(() => setNotification(null), 5000);
      } catch (err) {
        setNotification({
          type: 'error',
          title: '読み込みエラー',
          text: 'ファイルの読み込み中にエラーが発生しました。',
        });
        setTimeout(() => setNotification(null), 4000);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [importSaveJson, importTeamFormationJson, setActiveScreen]);

  return (
    <>
      {/* Drag Over Window Visual Overlay */}
      {isDraggingOverWindow && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none pointer-events-none transition-all duration-200 animate-in fade-in">
          <div className="w-full max-w-xl p-10 rounded-3xl border-4 border-dashed border-sky-400 bg-sky-950/40 shadow-2xl flex flex-col items-center text-center animate-pulse">
            <div className="w-20 h-20 rounded-3xl bg-sky-500 text-white flex items-center justify-center mb-6 shadow-xl shadow-sky-500/30">
              <FileUp className="w-10 h-10 animate-bounce" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ペナントデータ ＆ チーム編成JSON 直接ドロップ</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
              ここにJSONファイルをドロップ！
            </h3>
            <p className="text-sm text-slate-300 max-w-md leading-relaxed">
              手を離すと自動判別して即時反映！<br />
              <span className="text-sky-300 font-bold">ペナント全セーブ</span> または <span className="text-emerald-300 font-bold">チーム編成（選手・能力値・起用）JSON</span> に対応しています。
            </p>
          </div>
        </div>
      )}

      {/* Drop Result Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-md w-full animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`p-4 sm:p-5 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start gap-3.5 ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-100 shadow-emerald-950/60'
                : 'bg-rose-950/90 border-rose-500 text-rose-100 shadow-rose-950/60'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-sm text-white">
                  {notification.title || (notification.type === 'success' ? '復元完了' : 'エラー')}
                </span>
                <button
                  onClick={() => setNotification(null)}
                  className="text-slate-400 hover:text-white p-0.5 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {notification.fileName && (
                <div className="flex items-center gap-1.5 text-xs text-sky-300 font-mono mb-1 font-semibold truncate">
                  <FileJson className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{notification.fileName}</span>
                </div>
              )}

              <p className="text-xs text-slate-300 leading-relaxed">
                {notification.text}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

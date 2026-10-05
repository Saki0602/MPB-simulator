import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { AlertTriangle, RotateCcw, X, ShieldCheck, Sparkles } from 'lucide-react';
import { LeagueType } from '../types/baseball';

export const ResetConfirmModal: React.FC = () => {
  const { isResetConfirmOpen, setIsResetConfirmOpen, resetGame, leagueType } = useGame();
  const [targetType, setTargetType] = useState<LeagueType>(leagueType);

  if (!isResetConfirmOpen) return null;

  const handleConfirm = () => {
    resetGame(targetType);
    setIsResetConfirmOpen(false);
  };

  return (
    <div
      id="reset-confirm-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => setIsResetConfirmOpen(false)}
    >
      <div
        id="reset-confirm-modal-content"
        className="bg-slate-900 border border-rose-600/40 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="btn-close-reset-modal"
          onClick={() => setIsResetConfirmOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="pr-6">
            <h3 className="text-lg font-black text-white flex items-center gap-1.5">
              ゲームデータの初期化
            </h3>
            <p className="text-xs text-rose-400 font-bold mt-0.5">
              ※ すべての進行状況がリセットされます
            </p>
          </div>
        </div>

        {/* Description Box */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs text-slate-300 leading-relaxed">
          <p>
            現在のペナントレース進行データ、対戦成績、個人タイトル、および<strong className="text-amber-400">カスタマイズした能力値・オーダー設定</strong>をすべてリセットします。
          </p>
          <p className="text-slate-400 text-[11px]">
            初期化後は開幕前の初期設定画面に戻ります。この操作は取り消せません。
          </p>
        </div>

        {/* Mode Selector for Reset */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-400">初期化後のリーグ構成:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTargetType('mpb')}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                targetType === 'mpb'
                  ? 'bg-sky-950/80 border-sky-400 text-white shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              MPB公認 (現実モチーフ)
            </button>
            <button
              type="button"
              onClick={() => setTargetType('fictional')}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                targetType === 'fictional'
                  ? 'bg-amber-950/80 border-amber-400 text-white shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              完全架空 (オリジナル生成)
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            id="btn-cancel-reset"
            type="button"
            onClick={() => setIsResetConfirmOpen(false)}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition"
          >
            キャンセル
          </button>
          <button
            id="btn-confirm-reset-ok"
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-lg shadow-rose-900/40 transition"
          >
            <RotateCcw className="w-4 h-4" />
            OK（初期化する）
          </button>
        </div>
      </div>
    </div>
  );
};

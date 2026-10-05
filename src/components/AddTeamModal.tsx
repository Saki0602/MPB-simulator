import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Shield, Sparkles, X, PlusCircle, Check } from 'lucide-react';

interface AddTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeamCreated?: (teamId: string) => void;
}

export const AddTeamModal: React.FC<AddTeamModalProps> = ({ isOpen, onClose, onTeamCreated }) => {
  const { leagueType, leagueStructure, addNewTeam } = useGame();

  const isMpb = leagueType === 'mpb';
  const defaultLeagueId = isMpb ? 'royal' : 'league_a';

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [city, setCity] = useState('');
  const [stadium, setStadium] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#1e40af');
  const [targetLeagueId, setTargetLeagueId] = useState(defaultLeagueId);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || '新規エクスプレス';
    const finalShortName = shortName.trim() || finalName.slice(0, 2);
    const finalCity = city.trim() || '東京都';
    const finalStadium = stadium.trim() || `${finalShortName}球場`;

    let finalLeagueName = '';
    if (leagueStructure === 'two_league') {
      if (targetLeagueId === 'royal' || targetLeagueId === 'central') finalLeagueName = 'ロイヤルリーグ';
      else if (targetLeagueId === 'kingdom' || targetLeagueId === 'pacific') finalLeagueName = 'キングダムリーグ';
      else if (targetLeagueId === 'league_a') finalLeagueName = 'アルファ・リーグ';
      else if (targetLeagueId === 'league_b') finalLeagueName = 'ベータ・リーグ';
    } else {
      finalLeagueName = isMpb ? 'MPBロイヤルペナント' : '架空ペナントリーグ';
    }

    const created = addNewTeam({
      name: finalName,
      shortName: finalShortName,
      city: finalCity,
      stadium: finalStadium,
      color,
      secondaryColor,
      leagueId: leagueStructure === 'two_league' ? targetLeagueId : 'single',
      leagueName: finalLeagueName,
    });

    if (onTeamCreated) {
      onTeamCreated(created.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">新規球団の追加</h3>
              <p className="text-xs text-slate-400">30名の選手（投手14名・野手16名）が自動生成されます</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-bold">
                球団名 <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例: 仙台ゴールデンズ"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-bold">
                略称 (2〜4文字) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={shortName}
                onChange={e => setShortName(e.target.value)}
                placeholder="例: 仙台"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-bold">本拠地所在地</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="例: 宮城県仙台市"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-bold">本拠地球場</label>
              <input
                type="text"
                value={stadium}
                onChange={e => setStadium(e.target.value)}
                placeholder="例: 仙台グリーンスタジアム"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Color & League Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-bold">チームカラー</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>

            {leagueStructure === 'two_league' && (
              <div>
                <label className="block text-slate-300 mb-1 font-bold">所属リーグ</label>
                <select
                  value={targetLeagueId}
                  onChange={e => setTargetLeagueId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none"
                >
                  {isMpb ? (
                    <>
                      <option value="royal">ロイヤルリーグ</option>
                      <option value="kingdom">キングダムリーグ</option>
                    </>
                  ) : (
                    <>
                      <option value="league_a">アルファ・リーグ</option>
                      <option value="league_b">ベータ・リーグ</option>
                    </>
                  )}
                </select>
              </div>
            )}
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="text-amber-300 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              自動生成されるロスター内訳:
            </div>
            <div>・ 投手 14名 (エース・柱・先発6名・セットアップ・守護神・中継ぎ・敗戦処理など)</div>
            <div>・ 野手 16名 (捕手3名・内野各ポジション・外野スタメン＆控え・代走・代打専任)</div>
            <div>・ AI監督が自動的に最適な打順＆ローテーションを即時編成します。</div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-xs shadow-lg transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              球団を作成＆ロスター生成
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

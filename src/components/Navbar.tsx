import React from 'react';
import { useGame } from '../context/GameContext';
import { ActiveScreen } from '../types/baseball';
import {
  Home,
  Calendar,
  PlayCircle,
  Trophy,
  BarChart3,
  Users,
  Sliders,
  Settings2,
  Save,
  Flame,
  CheckCircle2,
  RotateCcw,
  Download,
  ExternalLink
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    teams,
    currentDateStr,
    currentDayIndex,
    seasonState,
    userTeamId,
    setUserTeamId,
    activeScreen,
    setActiveScreen,
    activeLiveGame,
    saveGame,
    lastSavedAt,
    setIsResetConfirmOpen,
  } = useGame();

  const userTeam = teams.find(t => t.id === userTeamId) || teams[0];
  const userTeamGames = userTeam?.stats.games || 0;

  const navItems: { screen: ActiveScreen; label: string; icon: React.ReactNode; badge?: string }[] = [
    { screen: 'home', label: 'ホーム', icon: <Home className="w-4 h-4" /> },
    { screen: 'pennant', label: 'ペナント進行', icon: <Calendar className="w-4 h-4" /> },
    {
      screen: 'match',
      label: '試合',
      icon: <PlayCircle className="w-4 h-4" />,
      badge: activeLiveGame && !activeLiveGame.isGameOver ? 'LIVE' : undefined
    },
    { screen: 'standings', label: '順位表', icon: <Trophy className="w-4 h-4" /> },
    { screen: 'stats', label: '個人成績', icon: <BarChart3 className="w-4 h-4" /> },
    { screen: 'team', label: 'チーム情報', icon: <Users className="w-4 h-4" /> },
    { screen: 'lineup', label: 'スタメン編集', icon: <Sliders className="w-4 h-4" /> },
    { screen: 'editor', label: '選手能力設定', icon: <Settings2 className="w-4 h-4" /> },
    { screen: 'saveLoad', label: 'セーブ/ロード', icon: <Save className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      {/* Top Bar: Date, Match Count, Team Selector, Quick Save */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black tracking-wider text-xs shadow-md border border-red-400">
              MPB
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-100 flex items-center gap-1.5">
                ペナントレース <span className="text-amber-400 font-extrabold text-xs px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">143試合制</span>
              </h1>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-slate-700 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold text-slate-200">{currentDateStr}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700">
              <span className="text-slate-400">消化:</span>
              <span className="font-bold text-amber-300">{userTeamGames}</span>
              <span className="text-slate-400">/ 143 試合</span>
            </div>
            {seasonState === 'setup' && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                開幕前設定
              </span>
            )}
            {seasonState === 'finished' && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold animate-pulse">
                🏆 シーズン全日程終了
              </span>
            )}
          </div>
        </div>

        {/* Right controls: Team selection & quick save */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User Team Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 px-2 sm:px-3 py-1 rounded-md border border-slate-700">
            <span className="text-xs text-slate-400 hidden sm:inline">自球団:</span>
            <select
              value={userTeamId}
              onChange={(e) => setUserTeamId(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-bold text-white focus:outline-none cursor-pointer"
            >
              {teams.map(t => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                  {t.name} ({t.stats.wins}勝{t.stats.losses}敗)
                </option>
              ))}
            </select>
            <div
              className="w-3 h-3 rounded-full border border-white/40 shadow-sm"
              style={{ backgroundColor: userTeam?.color || '#3b82f6' }}
            />
          </div>

          {/* Quick Save button */}
          <button
            id="btn-navbar-save"
            onClick={() => {
              saveGame();
            }}
            className="flex items-center gap-1 text-xs bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white px-2.5 py-1.5 rounded-md font-medium transition shadow-sm"
            title={lastSavedAt ? `最終保存: ${lastSavedAt}` : 'ブラウザ保存'}
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">保存</span>
          </button>

          {/* Direct Open in Browser Tab */}
          <a
            id="btn-navbar-open-browser"
            href="/mpb_baseball_game.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white px-2.5 py-1.5 rounded-md font-bold transition shadow-sm cursor-pointer"
            title="ブラウザ別タブで全画面起動（オフラインHTML版）"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ブラウザで開く</span>
          </a>

          {/* Reset button with confirmation modal */}
          <button
            id="btn-navbar-reset"
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-rose-950/60 active:bg-rose-900 border border-slate-700 hover:border-rose-600 text-slate-300 hover:text-rose-300 px-2.5 py-1.5 rounded-md font-medium transition shadow-sm"
            title="ゲームデータを初期化"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">初期化</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <nav className="max-w-7xl mx-auto px-2 sm:px-4 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 py-1.5 min-w-max">
          {navItems.map(item => {
            const isActive = activeScreen === item.screen;
            return (
              <button
                key={item.screen}
                onClick={() => setActiveScreen(item.screen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-semibold transition relative ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-black rounded-full bg-red-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};

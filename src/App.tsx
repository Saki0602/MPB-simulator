import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { PennantView } from './components/PennantView';
import { StandingsView } from './components/StandingsView';
import { StatsView } from './components/StatsView';
import { LineupEditorView } from './components/LineupEditorView';
import { TeamInfoView } from './components/TeamInfoView';
import { PlayerEditorView } from './components/PlayerEditorView';
import { LiveMatchView } from './components/LiveMatchView';
import { InitialSetupModal } from './components/InitialSetupModal';
import { MatchDetailModal } from './components/MatchDetailModal';
import { SaveLoadModal } from './components/SaveLoadModal';
import { SeasonAwardsModal } from './components/SeasonAwardsModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { GlobalDropOverlay } from './components/GlobalDropOverlay';

const GameContainer: React.FC = () => {
  const {
    seasonState,
    activeScreen,
    activeLiveGame,
    selectedMatchForDetail,
  } = useGame();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Global Drag & Drop Handler & Overlay */}
      <GlobalDropOverlay />

      {/* Top Navigation Bar */}
      <Navbar />

      {/* Main Screen Content */}
      <main className="flex-1 pb-16">
        {activeLiveGame ? (
          <LiveMatchView />
        ) : (
          <>
            {activeScreen === 'home' && <HomeView />}
            {activeScreen === 'pennant' && <PennantView />}
            {activeScreen === 'standings' && <StandingsView />}
            {activeScreen === 'stats' && <StatsView />}
            {activeScreen === 'lineup' && <LineupEditorView />}
            {activeScreen === 'team' && <TeamInfoView />}
            {activeScreen === 'editor' && <PlayerEditorView />}
            {activeScreen === 'saveLoad' && <SaveLoadModal />}
          </>
        )}
      </main>

      {/* Modals */}
      {seasonState === 'setup' && <InitialSetupModal />}
      {selectedMatchForDetail && <MatchDetailModal />}
      <SeasonAwardsModal />
      <ResetConfirmModal />
    </div>
  );
};

export default function App() {
  return (
    <GameProvider>
      <GameContainer />
    </GameProvider>
  );
}

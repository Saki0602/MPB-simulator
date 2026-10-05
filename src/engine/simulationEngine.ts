import {
  Team,
  Player,
  Position,
  Condition,
  ScheduledMatch,
  MatchBoxScorePlayer,
  MatchBoxScorePitcher,
  RunnerState,
  MatchPitchLog,
  MatchPlayLog
} from '../types/baseball';
import { AIManager } from './aiManager';

// Helper for condition multiplier
export function getConditionMultiplier(cond: Condition): number {
  switch (cond) {
    case '絶好調': return 1.15;
    case '好調': return 1.07;
    case '普通': return 1.00;
    case '不調': return 0.93;
    case '絶不調': return 0.82;
  }
}

// Helper for fatigue penalty (0 - 100)
export function getFatigueMultiplier(fatigue: number): number {
  if (fatigue <= 40) return 1.0;
  if (fatigue <= 70) return 1.0 - (fatigue - 40) * 0.005; // 0.85 at 70
  return 0.85 - (fatigue - 70) * 0.008; // 0.61 at 100
}

export interface InGamePitcherRecord {
  player: Player;
  ipOuts: number;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  pitchCount: number;
  isStarter: boolean;
  decision?: 'win' | 'loss' | 'save' | 'hold';
  enteredInning: number;
  enteredScoreDiff: number; // For hold/save
  leftScoreDiff?: number;
  hadLeadWhenLeft?: boolean;
  leadLostAfterExit?: boolean;
}

export interface InGameBatterRecord {
  player: Player;
  pos: Position;
  ab: number;
  r: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  sb: number;
  cs: number;
  sh: number;
  sf: number;
}

export interface LiveGameState {
  match: ScheduledMatch;
  topTeam: Team;
  bottomTeam: Team;
  userTeamId?: string;
  isAutoSimulation?: boolean;
  inning: number;
  topHalf: boolean; // true = top (Away bat), false = bottom (Home bat)
  outs: number;
  balls: number;
  strikes: number;
  runners: RunnerState;
  
  // Current matchup
  topBattingIndex: number; // 0-8
  bottomBattingIndex: number; // 0-8
  currentBatter: Player;
  currentPitcher: Player;

  // Rosters in game
  topLineup: { player: Player; pos: Position }[];
  bottomLineup: { player: Player; pos: Position }[];
  topBenchBatters: Player[];
  bottomBenchBatters: Player[];
  topBullpenPitchers: Player[];
  bottomBullpenPitchers: Player[];

  // Records in current match
  topBatterRecords: Map<string, InGameBatterRecord>;
  bottomBatterRecords: Map<string, InGameBatterRecord>;
  topPitcherRecords: InGamePitcherRecord[];
  bottomPitcherRecords: InGamePitcherRecord[];
  currentTopPitcherRecord: InGamePitcherRecord;
  currentBottomPitcherRecord: InGamePitcherRecord;

  // Scores
  topScores: (number | null)[];
  bottomScores: (number | null)[];
  topTotalRuns: number;
  bottomTotalRuns: number;
  topTotalHits: number;
  bottomTotalHits: number;
  topTotalErrors: number;
  bottomTotalErrors: number;

  isGameOver: boolean;
  playLogs: MatchPlayLog[];
  pitchLogs: MatchPitchLog[];
  lastPlayDescription: string;
  homeRuns: string[];
}

export class SimulationEngine {
  /**
   * Initialize a live game state from match and teams
   */
  static initLiveGame(match: ScheduledMatch, topTeam: Team, bottomTeam: Team, userTeamId?: string): LiveGameState {
    // 1. Ensure both teams have valid orders
    if (!topTeam.order || !topTeam.order.battingOrder || topTeam.order.battingOrder.length < 9 || !topTeam.order.rotation || topTeam.order.rotation.length === 0) {
      topTeam.order = AIManager.generateBestOrder(topTeam);
    }
    if (!bottomTeam.order || !bottomTeam.order.battingOrder || bottomTeam.order.battingOrder.length < 9 || !bottomTeam.order.rotation || bottomTeam.order.rotation.length === 0) {
      bottomTeam.order = AIManager.generateBestOrder(bottomTeam);
    }

    // Pick top lineup
    const getStarters = (team: Team): { player: Player; pos: Position }[] => {
      let order = team.order?.battingOrder;
      if (!order || order.length < 9) {
        team.order = AIManager.generateBestOrder(team);
        order = team.order.battingOrder;
      }

      const starters: { player: Player; pos: Position }[] = [];
      const usedIds = new Set<string>();

      for (let i = 0; i < Math.min(9, order.length); i++) {
        const slot = order[i];
        let p = team.players.find(pl => pl.id === slot.playerId);
        // Fallback if max games exceeded or missing or duplicate
        if (!p || p.batterStats.games >= 143 || usedIds.has(p.id)) {
          p = team.players.find(pl => !pl.isPitcher && pl.batterStats.games < 143 && !usedIds.has(pl.id))
            || team.players.find(pl => pl.batterStats.games < 143 && !usedIds.has(pl.id))
            || team.players.find(pl => !usedIds.has(pl.id))
            || team.players[0];
        }
        if (p) {
          usedIds.add(p.id);
          starters.push({ player: p, pos: slot.position || 'DH' });
        }
      }

      // Safety fallback: guaranteed exactly 9 players
      while (starters.length < 9 && team.players.length > 0) {
        const p = team.players.find(pl => !usedIds.has(pl.id)) || team.players[starters.length % team.players.length];
        usedIds.add(p.id);
        starters.push({ player: p, pos: 'DH' });
      }

      return starters;
    };

    const topLineup = getStarters(topTeam);
    const bottomLineup = getStarters(bottomTeam);

    const topStarterId = (topTeam.order?.rotation && topTeam.order.rotation.length > 0)
      ? topTeam.order.rotation[topTeam.stats.games % topTeam.order.rotation.length]
      : topTeam.players.find(p => p.isPitcher)?.id;
    const bottomStarterId = (bottomTeam.order?.rotation && bottomTeam.order.rotation.length > 0)
      ? bottomTeam.order.rotation[bottomTeam.stats.games % bottomTeam.order.rotation.length]
      : bottomTeam.players.find(p => p.isPitcher)?.id;

    const topStarter = topTeam.players.find(p => p.id === topStarterId) || topTeam.players.find(p => p.isPitcher) || topTeam.players[0];
    const bottomStarter = bottomTeam.players.find(p => p.id === bottomStarterId) || bottomTeam.players.find(p => p.isPitcher) || bottomTeam.players[0];

    // Ensure pitches array exists
    if (!topStarter.pitches || topStarter.pitches.length === 0) {
      topStarter.pitches = [{ id: 'p_def', name: 'ストレート', velocity: topStarter.pitchVelocity || 145, breakAmount: 30, ballPower: 70, control: topStarter.control || 70 }];
    }
    if (!bottomStarter.pitches || bottomStarter.pitches.length === 0) {
      bottomStarter.pitches = [{ id: 'p_def', name: 'ストレート', velocity: bottomStarter.pitchVelocity || 145, breakAmount: 30, ballPower: 70, control: bottomStarter.control || 70 }];
    }

    const topStarterRec: InGamePitcherRecord = {
      player: topStarter,
      ipOuts: 0,
      h: 0,
      r: 0,
      er: 0,
      bb: 0,
      so: 0,
      hr: 0,
      pitchCount: 0,
      isStarter: true,
      enteredInning: 1,
      enteredScoreDiff: 0,
    };

    const bottomStarterRec: InGamePitcherRecord = {
      player: bottomStarter,
      ipOuts: 0,
      h: 0,
      r: 0,
      er: 0,
      bb: 0,
      so: 0,
      hr: 0,
      pitchCount: 0,
      isStarter: true,
      enteredInning: 1,
      enteredScoreDiff: 0,
    };

    const topBatterRecords = new Map<string, InGameBatterRecord>();
    topLineup.forEach(slot => {
      topBatterRecords.set(slot.player.id, {
        player: slot.player,
        pos: slot.pos,
        ab: 0, r: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, so: 0, sb: 0, cs: 0, sh: 0, sf: 0
      });
    });

    const bottomBatterRecords = new Map<string, InGameBatterRecord>();
    bottomLineup.forEach(slot => {
      bottomBatterRecords.set(slot.player.id, {
        player: slot.player,
        pos: slot.pos,
        ab: 0, r: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, so: 0, sb: 0, cs: 0, sh: 0, sf: 0
      });
    });

    const topBenchBatters = topTeam.players.filter(p => !p.isPitcher && !topLineup.some(l => l.player.id === p.id) && p.batterStats.games < 143);
    const bottomBenchBatters = bottomTeam.players.filter(p => !p.isPitcher && !bottomLineup.some(l => l.player.id === p.id) && p.batterStats.games < 143);

    const topBullpenPitchers = topTeam.players.filter(p => p.isPitcher && p.id !== topStarter.id && p.pitcherStats.games < 143);
    const bottomBullpenPitchers = bottomTeam.players.filter(p => p.isPitcher && p.id !== bottomStarter.id && p.pitcherStats.games < 143);

    return {
      match,
      topTeam,
      bottomTeam,
      inning: 1,
      topHalf: true,
      outs: 0,
      balls: 0,
      strikes: 0,
      runners: { first: null, second: null, third: null },
      topBattingIndex: 0,
      bottomBattingIndex: 0,
      currentBatter: topLineup[0].player,
      currentPitcher: bottomStarter, // In top 1st, bottom team pitches
      topLineup,
      bottomLineup,
      topBenchBatters,
      bottomBenchBatters,
      topBullpenPitchers,
      bottomBullpenPitchers,
      topBatterRecords,
      bottomBatterRecords,
      topPitcherRecords: [topStarterRec],
      bottomPitcherRecords: [bottomStarterRec],
      currentTopPitcherRecord: topStarterRec,
      currentBottomPitcherRecord: bottomStarterRec,
      topScores: [0],
      bottomScores: [null],
      topTotalRuns: 0,
      bottomTotalRuns: 0,
      topTotalHits: 0,
      bottomTotalHits: 0,
      topTotalErrors: 0,
      bottomTotalErrors: 0,
      isGameOver: false,
      userTeamId,
      isAutoSimulation: false,
      playLogs: [],
      pitchLogs: [],
      lastPlayDescription: 'プレイボール！',
      homeRuns: [],
    };
  }

  /**
   * Execute 1 pitch in the live game
   */
  static stepPitch(state: LiveGameState, command?: 'bunt' | 'steal' | 'walk'): { isAtBatFinished: boolean; description: string } {
    if (state.isGameOver) return { isAtBatFinished: true, description: '試合終了' };

    const offenseTeam = state.topHalf ? state.topTeam : state.bottomTeam;
    const defenseTeam = state.topHalf ? state.bottomTeam : state.topTeam;
    const isOffenseUser = state.userTeamId ? offenseTeam.id === state.userTeamId : false;
    const isDefenseUser = state.userTeamId ? defenseTeam.id === state.userTeamId : false;

    // Validate user commands: user can only issue offense instructions for own team, defense instructions for own team
    if (command) {
      if ((command === 'bunt' || command === 'steal') && !isOffenseUser) {
        command = undefined;
      } else if (command === 'walk' && !isDefenseUser) {
        command = undefined;
      }
    }

    // AI Manager operations for CPU teams (or auto-simulation)
    if (!command) {
      // 1. AI Defense Manager: Check Intentional Walk (申告敬遠)
      if ((!isDefenseUser || state.isAutoSimulation) && state.balls === 0 && state.strikes === 0) {
        if (this.checkAiIntentionalWalk(state)) {
          command = 'walk';
        }
      }

      // 2. AI Offense Manager: Check Sacrifice Bunt (送りバント)
      if (!command && (!isOffenseUser || state.isAutoSimulation) && state.strikes < 2) {
        if (this.checkAiBunt(state)) {
          command = 'bunt';
        }
      }

      // 3. AI Offense Manager: Check Tactical Steal (作戦盗塁)
      if (!command && (!isOffenseUser || state.isAutoSimulation)) {
        if (this.checkAiSteal(state)) {
          command = 'steal';
        }
      }
    }

    // Check for Pinch Hitter at the start of an at-bat (AI teams only; user manages own team)
    if (state.balls === 0 && state.strikes === 0) {
      if (!isOffenseUser || state.isAutoSimulation) {
        this.checkAiPinchHitter(state);
      }
    }

    const batter = state.currentBatter;
    const pitcher = state.topHalf ? state.currentBottomPitcherRecord.player : state.currentTopPitcherRecord.player;
    const pitcherRec = state.topHalf ? state.currentBottomPitcherRecord : state.currentTopPitcherRecord;

    pitcherRec.pitchCount++;
    // Add small fatigue to pitcher
    pitcher.fatigue = Math.min(100, pitcher.fatigue + (pitcher.pitcherRole === 'starter' ? 0.35 : 0.8));

    // Handle Intentional Walk command
    if (command === 'walk') {
      return this.resolveWalk(state, batter, pitcher, pitcherRec, true);
    }

    // Handle Steal command (tactical order)
    if (command === 'steal' && (state.runners.first || state.runners.second)) {
      const runner = state.runners.second || state.runners.first!;
      const isSecondToThird = Boolean(state.runners.second);
      const catcher = defenseTeam.players.find(p => p.mainPosition === 'C') || defenseTeam.players[0];
      return this.executeSteal(state, runner, isSecondToThird, catcher, pitcher, false);
    }

    // Natural Steal Attempt: Runners decide to steal based on speed and stealing ratings
    if (!command) {
      const stealCheck = this.tryAttemptSteal(state);
      if (stealCheck.attempted && stealCheck.result) {
        return stealCheck.result;
      }
    }

    // Pick a pitch from pitcher arsenal
    const pitch = (pitcher.pitches && pitcher.pitches.length > 0) 
      ? pitcher.pitches[Math.floor(Math.random() * pitcher.pitches.length)]
      : { id: 'default', name: 'ストレート', velocity: pitcher.pitchVelocity || 145, breakAmount: 30, ballPower: 70, control: pitcher.control || 70 };

    // Calculate probabilities based on NPB benchmarks
    const pCond = getConditionMultiplier(pitcher.condition);
    const bCond = getConditionMultiplier(batter.condition);
    const pFatigue = getFatigueMultiplier(pitcher.fatigue);
    const bFatigue = getFatigueMultiplier(batter.fatigue);

    // Effective control & eye
    const effectiveControl = (pitcher.control * 0.7 + pitch.control * 0.3) * pCond * pFatigue;
    const effectiveEye = batter.eye * bCond * bFatigue;

    // Pitch in strike zone probability: standard ~62% in NPB
    const strikeZoneProb = 0.58 + (effectiveControl - 50) * 0.0025;
    const isPitchInZone = Math.random() < strikeZoneProb;

    // Swing probability
    let swingProb = isPitchInZone ? 0.68 + (batter.contact - 50) * 0.002 : 0.28 - (effectiveEye - 50) * 0.003;
    if (state.strikes === 2) swingProb += 0.15; // Protective 2-strike swing
    if (command === 'bunt') swingProb = 0.95;

    const doesSwing = Math.random() < Math.max(0.08, Math.min(0.96, swingProb));

    if (!doesSwing) {
      if (isPitchInZone) {
        state.strikes++;
        const log: MatchPitchLog = {
          pitchNumber: pitcherRec.pitchCount,
          pitchType: pitch.name,
          velocity: pitch.velocity,
          result: 'called_strike',
          description: `${pitch.name} (${pitch.velocity}km/h) - 見逃しストライク`,
        };
        state.pitchLogs.unshift(log);

        if (state.strikes >= 3) {
          return this.resolveStrikeout(state, batter, pitcher, pitcherRec, '見逃し三振');
        }
        return { isAtBatFinished: false, description: log.description };
      } else {
        state.balls++;
        const log: MatchPitchLog = {
          pitchNumber: pitcherRec.pitchCount,
          pitchType: pitch.name,
          velocity: pitch.velocity,
          result: 'ball',
          description: `${pitch.name} (${pitch.velocity}km/h) - ボール`,
        };
        state.pitchLogs.unshift(log);

        if (state.balls >= 4) {
          return this.resolveWalk(state, batter, pitcher, pitcherRec, false);
        }
        return { isAtBatFinished: false, description: log.description };
      }
    } else {
      // Batter swung!
      // Contact probability vs Whiff:
      const contactRating = (pitcher.throws === 'R' ? batter.vsRight : batter.vsLeft) * 0.4 + batter.contact * 0.6;
      const effectiveContact = contactRating * bCond * bFatigue;
      const pitchDifficulty = (pitcher.strikeout * 0.5 + pitch.breakAmount * 0.3 + pitch.ballPower * 0.2) * pCond * pFatigue;
      // Calibrated sensitivity for NPB pennant parity (~.590 champion, ~.390 cellar)
      const contactProb = 0.78 + (effectiveContact - pitchDifficulty) * 0.0027;
      const doesMakeContact = Math.random() < Math.max(0.40, Math.min(0.95, contactProb));

      if (!doesMakeContact) {
        state.strikes++;
        const log: MatchPitchLog = {
          pitchNumber: pitcherRec.pitchCount,
          pitchType: pitch.name,
          velocity: pitch.velocity,
          result: 'swinging_strike',
          description: `${pitch.name} (${pitch.velocity}km/h) - 空振り！`,
        };
        state.pitchLogs.unshift(log);

        if (state.strikes >= 3) {
          return this.resolveStrikeout(state, batter, pitcher, pitcherRec, '空振り三振');
        }
        return { isAtBatFinished: false, description: log.description };
      }

      // Contact made: Foul vs Ball in Play
      // At 2 strikes, high chance of foul
      const foulProb = state.strikes === 2 ? 0.52 : 0.35;
      const isFoul = Math.random() < foulProb && command !== 'bunt';

      if (isFoul) {
        if (state.strikes < 2) state.strikes++;
        const log: MatchPitchLog = {
          pitchNumber: pitcherRec.pitchCount,
          pitchType: pitch.name,
          velocity: pitch.velocity,
          result: 'foul',
          description: `${pitch.name} (${pitch.velocity}km/h) - ファウル`,
        };
        state.pitchLogs.unshift(log);
        return { isAtBatFinished: false, description: log.description };
      }

      // Ball in play!
      return this.resolveBallInPlay(state, batter, pitcher, pitcherRec, pitch, command === 'bunt');
    }
  }

  /**
   * Resolve Strikeout
   */
  private static resolveStrikeout(
    state: LiveGameState,
    batter: Player,
    pitcher: Player,
    pitcherRec: InGamePitcherRecord,
    type: '空振り三振' | '見逃し三振'
  ): { isAtBatFinished: boolean; description: string } {
    pitcherRec.so++;
    pitcherRec.ipOuts++;
    state.outs++;

    const batterRec = (state.topHalf ? state.topBatterRecords : state.bottomBatterRecords).get(batter.id);
    if (batterRec) {
      batterRec.ab++;
      batterRec.so++;
    }

    const desc = `${batter.name}、${type}に倒れる！`;
    state.lastPlayDescription = desc;
    state.playLogs.unshift({
      id: `log_${Date.now()}_${Math.random()}`,
      inning: state.inning,
      topHalf: state.topHalf,
      batterName: batter.name,
      pitcherName: pitcher.name,
      count: `${state.balls}-${state.strikes}`,
      result: type,
      description: desc,
      runsScored: 0,
      isOut: true,
    });

    this.checkInningOverOrNextBatter(state);
    return { isAtBatFinished: true, description: desc };
  }

  /**
   * Resolve Walk / Intentional Walk
   */
  private static resolveWalk(
    state: LiveGameState,
    batter: Player,
    pitcher: Player,
    pitcherRec: InGamePitcherRecord,
    isIntentional: boolean
  ): { isAtBatFinished: boolean; description: string } {
    pitcherRec.bb++;
    const batterRec = (state.topHalf ? state.topBatterRecords : state.bottomBatterRecords).get(batter.id);
    if (batterRec) {
      batterRec.bb++;
    }

    // Force advance runners
    let runsScored = 0;
    if (state.runners.first && state.runners.second && state.runners.third) {
      // Bases loaded walk -> 1 run scores!
      runsScored = 1;
      this.addRun(state, 1, state.runners.third);
      state.runners.third = state.runners.second;
      state.runners.second = state.runners.first;
      state.runners.first = batter;
    } else if (state.runners.first && state.runners.second) {
      state.runners.third = state.runners.second;
      state.runners.second = state.runners.first;
      state.runners.first = batter;
    } else if (state.runners.first) {
      state.runners.second = state.runners.first;
      state.runners.first = batter;
    } else {
      state.runners.first = batter;
    }

    const desc = isIntentional ? `${batter.name}は申告敬遠！` : `${batter.name}、よく選んで四球！`;
    state.lastPlayDescription = desc;
    state.playLogs.unshift({
      id: `log_${Date.now()}_${Math.random()}`,
      inning: state.inning,
      topHalf: state.topHalf,
      batterName: batter.name,
      pitcherName: pitcher.name,
      count: '4B',
      result: isIntentional ? '申告敬遠' : '四球',
      description: desc,
      runsScored,
      isOut: false,
    });

    this.checkInningOverOrNextBatter(state);
    return { isAtBatFinished: true, description: desc };
  }

  /**
   * Resolve Ball in Play (Hits, Outs, HR, Bunt, Errors)
   */
  private static resolveBallInPlay(
    state: LiveGameState,
    batter: Player,
    pitcher: Player,
    pitcherRec: InGamePitcherRecord,
    pitch: { name: string; ballPower: number },
    isBunt: boolean
  ): { isAtBatFinished: boolean; description: string } {
    const defenseTeam = state.topHalf ? state.bottomTeam : state.topTeam;
    const batterRec = (state.topHalf ? state.topBatterRecords : state.bottomBatterRecords).get(batter.id)!;
    batterRec.ab++;

    // Bunt handling
    if (isBunt) {
      const buntSuccess = Math.random() < 0.82;
      if (buntSuccess && (state.runners.first || state.runners.second)) {
        batterRec.sh++;
        batterRec.ab--; // Sac bunt does not count as AB in NPB/MLB
        state.outs++;
        pitcherRec.ipOuts++;

        if (state.runners.second) {
          state.runners.third = state.runners.second;
          state.runners.second = state.runners.first;
        } else {
          state.runners.second = state.runners.first;
        }
        state.runners.first = null;

        const desc = `${batter.name}、絶妙な犠打成功！ ランナーを進める！`;
        state.lastPlayDescription = desc;
        state.playLogs.unshift({
          id: `log_${Date.now()}_${Math.random()}`,
          inning: state.inning,
          topHalf: state.topHalf,
          batterName: batter.name,
          pitcherName: pitcher.name,
          count: `${state.balls}-${state.strikes}`,
          result: '犠打',
          description: desc,
          runsScored: 0,
          isOut: true,
        });

        this.checkInningOverOrNextBatter(state);
        return { isAtBatFinished: true, description: desc };
      }
    }

    // Factors:
    // NPB League averages calibrated:
    // Batting Avg ~ .250 - .265 across league
    // Leader ~ .340
    // HR leader ~ 40-45 HRs across 143 games (approx 1 HR every 12-14 games)
    // ERA leader ~ 1.35
    const bCond = getConditionMultiplier(batter.condition);
    const pCond = getConditionMultiplier(pitcher.condition);
    const bFatigue = getFatigueMultiplier(batter.fatigue);
    const pFatigue = getFatigueMultiplier(pitcher.fatigue);

    // Winning luck (勝ち運) influence on run support and clutch pitching:
    // Offense pitcher (the pitcher representing the batting team):
    const offensePitcher = state.topHalf ? state.currentTopPitcherRecord?.player : state.currentBottomPitcherRecord?.player;
    const offenseWinLuck = offensePitcher?.winLuck ?? 50;

    // Defense pitcher (pitcher currently on mound):
    const defWinLuck = pitcher.winLuck ?? 50;

    // 1. Defending pitcher clutch adjustment in scoring position (RISP: runner on 2nd or 3rd)
    const hasRISP = Boolean(state.runners.second || state.runners.third);
    const defClutchBonus = hasRISP ? (defWinLuck - 50) * 0.16 : 0;

    const batterHitQuality = ((pitcher.throws === 'R' ? batter.vsRight : batter.vsLeft) * 0.3 + batter.contact * 0.7) * bCond * bFatigue;
    const pitcherQuality = ((pitcher.control * 0.4 + pitch.ballPower * 0.3 + pitcher.hrAvoidance * 0.3) + defClutchBonus) * pCond * pFatigue;

    // Defense quality of fielders
    const teamDefenseAvg = defenseTeam.players.slice(0, 9).reduce((sum, p) => sum + p.fielding, 0) / 9;

    // 2. Offense team run support based on offense pitcher's winning luck (援護率):
    // Calibrated so champion team averages ~.590 winning rate and last place averages ~.390
    const runSupportMod = (offenseWinLuck - 50) * 0.0014;
    const rispSupportMod = hasRISP ? (offenseWinLuck - 50) * 0.0021 : 0;

    // Base BABIP / Hit probability:
    // Calibrated sensitivity for professional parity (~.590 champion, ~.390 cellar)
    const hitRate = 0.285 + (batterHitQuality - pitcherQuality) * 0.00192 - (teamDefenseAvg - 65) * 0.0009 + runSupportMod + rispSupportMod;
    const isHit = Math.random() < Math.max(0.12, Math.min(0.55, hitRate));

    if (isHit) {
      pitcherRec.h++;
      if (state.topHalf) state.topTotalHits++;
      else state.bottomTotalHits++;

      // Determine hit type: 1B, 2B, 3B, HR
      // HR chance depends strongly on batter power vs pitcher hrAvoidance
      const hrScore = (batter.power * 1.5 - pitcher.hrAvoidance * 0.9) * bCond * bFatigue;
      const hrLuckBonus = (offenseWinLuck - 50) * 0.0012;
      const hrChance = Math.max(0.015, Math.min(0.38, 0.065 + (hrScore - 45) * 0.0035 + hrLuckBonus));
      const isHR = Math.random() < hrChance;

      if (isHR) {
        batterRec.h++;
        batterRec.hr++;
        pitcherRec.hr++;

        // Count runners on base
        let runs = 1;
        if (state.runners.first) runs++;
        if (state.runners.second) runs++;
        if (state.runners.third) runs++;

        batterRec.rbi += runs;
        batterRec.r++;
        if (state.runners.first) this.addRunScoredToPlayer(state, state.runners.first);
        if (state.runners.second) this.addRunScoredToPlayer(state, state.runners.second);
        if (state.runners.third) this.addRunScoredToPlayer(state, state.runners.third);

        this.addRun(state, runs, null);
        state.runners = { first: null, second: null, third: null };

        const hrName = `${batter.name} 第${batterRec.hr}号 (${state.inning}回 ${runs === 1 ? 'ソロ' : runs === 2 ? '2ラン' : runs === 3 ? '3ラン' : '満塁'})`;
        state.homeRuns.push(hrName);
        const desc = `快音一閃！${batter.name}の打球はスタンドへ一直線！${hrName}本塁打！`;
        state.lastPlayDescription = desc;
        state.playLogs.unshift({
          id: `log_${Date.now()}_${Math.random()}`,
          inning: state.inning,
          topHalf: state.topHalf,
          batterName: batter.name,
          pitcherName: pitcher.name,
          count: `${state.balls}-${state.strikes}`,
          result: '本塁打',
          description: desc,
          runsScored: runs,
          isOut: false,
        });

        this.checkInningOverOrNextBatter(state);
        return { isAtBatFinished: true, description: desc };
      }

      // Non-HR hits: Double (2B), Triple (3B), Single (1B)
      const isTriple = Math.random() < (0.015 + (batter.speed - 50) * 0.0006);
      const isDouble = !isTriple && Math.random() < (0.19 + (batter.power - 50) * 0.002);

      let runs = 0;
      let desc = '';

      if (isTriple) {
        batterRec.h++;
        batterRec.triples++;
        // All runners score
        if (state.runners.third) { runs++; this.addRunScoredToPlayer(state, state.runners.third); }
        if (state.runners.second) { runs++; this.addRunScoredToPlayer(state, state.runners.second); }
        if (state.runners.first) { runs++; this.addRunScoredToPlayer(state, state.runners.first); }
        state.runners = { first: null, second: null, third: batter };
        desc = `${batter.name}、右中間を深々と破るタイムリー三塁打！`;
      } else if (isDouble) {
        batterRec.h++;
        batterRec.doubles++;
        if (state.runners.third) { runs++; this.addRunScoredToPlayer(state, state.runners.third); }
        if (state.runners.second) { runs++; this.addRunScoredToPlayer(state, state.runners.second); }
        // Runner from 1B has 60% chance to score if fast, else 3B
        if (state.runners.first) {
          if (state.runners.first.speed >= 75 && Math.random() < 0.65) {
            runs++;
            this.addRunScoredToPlayer(state, state.runners.first);
            state.runners = { first: null, second: batter, third: null };
          } else {
            state.runners = { first: null, second: batter, third: state.runners.first };
          }
        } else {
          state.runners = { first: null, second: batter, third: null };
        }
        desc = `${batter.name}、左中間をライナーで破る二塁打！`;
      } else {
        // Single
        batterRec.h++;
        if (state.runners.third) { runs++; this.addRunScoredToPlayer(state, state.runners.third); }
        let runnerToThird: Player | null = null;
        if (state.runners.second) {
          // Fast runner scores from 2B on single
          if (state.runners.second.speed >= 70 && Math.random() < 0.60) {
            runs++;
            this.addRunScoredToPlayer(state, state.runners.second);
          } else {
            runnerToThird = state.runners.second;
          }
        }
        let runnerToSecond: Player | null = null;
        if (state.runners.first) {
          // Fast runner might go 1B to 3B
          if (state.runners.first.speed >= 85 && !runnerToThird && Math.random() < 0.40) {
            runnerToThird = state.runners.first;
          } else {
            runnerToSecond = state.runners.first;
          }
        }
        state.runners = { first: batter, second: runnerToSecond, third: runnerToThird };
        desc = `${batter.name}、センター前へクリーンヒット！`;
      }

      if (runs > 0) {
        batterRec.rbi += runs;
        this.addRun(state, runs, null);
        desc += ` ${runs}点先制/追加点！`;
      }

      state.lastPlayDescription = desc;
      state.playLogs.unshift({
        id: `log_${Date.now()}_${Math.random()}`,
        inning: state.inning,
        topHalf: state.topHalf,
        batterName: batter.name,
        pitcherName: pitcher.name,
        count: `${state.balls}-${state.strikes}`,
        result: isTriple ? '三塁打' : isDouble ? '二塁打' : '単打',
        description: desc,
        runsScored: runs,
        isOut: false,
      });

      this.checkInningOverOrNextBatter(state);
      return { isAtBatFinished: true, description: desc };
    } else {
      // Out on ball in play (Groundout, Flyout, Double Play, or Error)
      // Fielding error chance: ~2.5%
      const errorChance = Math.max(0.008, 0.035 - (teamDefenseAvg - 50) * 0.0004);
      if (Math.random() < errorChance) {
        if (state.topHalf) state.bottomTotalErrors++;
        else state.topTotalErrors++;

        // Batter reaches on error
        state.runners.first = batter;
        const desc = `打球を処理しようとした内野手がファンブル！ エラーで出塁！`;
        state.lastPlayDescription = desc;
        state.playLogs.unshift({
          id: `log_${Date.now()}_${Math.random()}`,
          inning: state.inning,
          topHalf: state.topHalf,
          batterName: batter.name,
          pitcherName: pitcher.name,
          count: `${state.balls}-${state.strikes}`,
          result: '失策',
          description: desc,
          runsScored: 0,
          isOut: false,
        });

        this.checkInningOverOrNextBatter(state);
        return { isAtBatFinished: true, description: desc };
      }

      // Check for Double Play (併殺) if runner on 1st & < 2 outs
      if (state.runners.first && state.outs < 2 && Math.random() < 0.28) {
        state.outs += 2;
        pitcherRec.ipOuts += 2;
        state.runners.first = null;
        if (state.runners.third && state.outs < 3) {
          // Run may score on DP
          this.addRun(state, 1, state.runners.third);
          state.runners.third = null;
        }

        const desc = `痛恨！ 6-4-3のダブルプレーで2アウト！`;
        state.lastPlayDescription = desc;
        state.playLogs.unshift({
          id: `log_${Date.now()}_${Math.random()}`,
          inning: state.inning,
          topHalf: state.topHalf,
          batterName: batter.name,
          pitcherName: pitcher.name,
          count: `${state.balls}-${state.strikes}`,
          result: '併殺打',
          description: desc,
          runsScored: 0,
          isOut: true,
        });

        this.checkInningOverOrNextBatter(state);
        return { isAtBatFinished: true, description: desc };
      }

      // Check for Sacrifice Fly (犠飛) if runner on 3rd & < 2 outs
      if (state.runners.third && state.outs < 2 && Math.random() < 0.25) {
        state.outs++;
        pitcherRec.ipOuts++;
        batterRec.sf++;
        batterRec.rbi++;
        batterRec.ab--; // Sac fly does not count as AB
        this.addRun(state, 1, state.runners.third);
        state.runners.third = null;

        const desc = `${batter.name}、深めの外野フライ！ 三塁走者がタッチアップで生還！`;
        state.lastPlayDescription = desc;
        state.playLogs.unshift({
          id: `log_${Date.now()}_${Math.random()}`,
          inning: state.inning,
          topHalf: state.topHalf,
          batterName: batter.name,
          pitcherName: pitcher.name,
          count: `${state.balls}-${state.strikes}`,
          result: '犠飛',
          description: desc,
          runsScored: 1,
          isOut: true,
        });

        this.checkInningOverOrNextBatter(state);
        return { isAtBatFinished: true, description: desc };
      }

      // Standard out (Groundout or Flyout)
      state.outs++;
      pitcherRec.ipOuts++;

      const isFlyout = Math.random() < 0.45;
      const desc = isFlyout ? `${batter.name}、打ち上げて外野フライに倒れる` : `${batter.name}、内野ゴロに倒れる`;
      state.lastPlayDescription = desc;
      state.playLogs.unshift({
        id: `log_${Date.now()}_${Math.random()}`,
        inning: state.inning,
        topHalf: state.topHalf,
        batterName: batter.name,
        pitcherName: pitcher.name,
        count: `${state.balls}-${state.strikes}`,
        result: isFlyout ? '外野飛' : '内野ゴロ',
        description: desc,
        runsScored: 0,
        isOut: true,
      });

      this.checkInningOverOrNextBatter(state);
      return { isAtBatFinished: true, description: desc };
    }
  }

  private static addRun(state: LiveGameState, amount: number, runnerWhoScored: Player | null) {
    if (state.topHalf) {
      state.topTotalRuns += amount;
      const currentInningScore = state.topScores[state.inning - 1] ?? 0;
      state.topScores[state.inning - 1] = currentInningScore + amount;
      state.currentBottomPitcherRecord.r += amount;
      state.currentBottomPitcherRecord.er += amount;
    } else {
      state.bottomTotalRuns += amount;
      const currentInningScore = state.bottomScores[state.inning - 1] ?? 0;
      state.bottomScores[state.inning - 1] = currentInningScore + amount;
      state.currentTopPitcherRecord.r += amount;
      state.currentTopPitcherRecord.er += amount;
    }

    if (runnerWhoScored) {
      this.addRunScoredToPlayer(state, runnerWhoScored);
    }

    // Lead tracking for pitcher decisions
    if (state.topTotalRuns === state.bottomTotalRuns) {
      state.topPitcherRecords.forEach(p => {
        if (p.hadLeadWhenLeft) p.leadLostAfterExit = true;
      });
      state.bottomPitcherRecords.forEach(p => {
        if (p.hadLeadWhenLeft) p.leadLostAfterExit = true;
      });
    }

    // Check Walk-off condition (サヨナラ勝ち in 9th or extra bottom half)
    if (!state.topHalf && state.inning >= 9 && state.bottomTotalRuns > state.topTotalRuns) {
      state.isGameOver = true;
      state.lastPlayDescription += ' 【サヨナラゲームセット！】';
      this.finalizeMatchStats(state);
    }
  }

  private static addRunScoredToPlayer(state: LiveGameState, player: Player) {
    const recMap = state.topHalf ? state.topBatterRecords : state.bottomBatterRecords;
    const r = recMap.get(player.id);
    if (r) r.r++;
  }

  /**
   * Reset count and set up next batter, or advance inning if 3 outs
   */
  private static checkInningOverOrNextBatter(state: LiveGameState) {
    state.balls = 0;
    state.strikes = 0;

    if (state.outs >= 3) {
      this.endHalfInning(state);
    } else {
      // Advance batter index
      if (state.topHalf) {
        state.topBattingIndex = (state.topBattingIndex + 1) % 9;
        state.currentBatter = state.topLineup[state.topBattingIndex].player;
      } else {
        state.bottomBattingIndex = (state.bottomBattingIndex + 1) % 9;
        state.currentBatter = state.bottomLineup[state.bottomBattingIndex].player;
      }

      // Check AI Pinch Runner & Pinch Hitter
      this.checkAiPinchRunner(state);
      this.checkAiPinchHitter(state);
    }
  }

  /**
   * Advance half-inning
   */
  private static endHalfInning(state: LiveGameState) {
    state.outs = 0;
    state.balls = 0;
    state.strikes = 0;
    state.runners = { first: null, second: null, third: null };

    // Check 9th inning walk-off or win
    if (state.topHalf) {
      // Top finished -> move to bottom
      if (state.inning >= 9 && state.bottomTotalRuns > state.topTotalRuns) {
        // Home team already ahead after 9 top -> game over!
        state.bottomScores[state.inning - 1] = null;
        state.isGameOver = true;
        this.finalizeMatchStats(state);
        return;
      }

      state.topHalf = false;
      state.bottomScores[state.inning - 1] = 0;
      state.currentBatter = state.bottomLineup[state.bottomBattingIndex].player;
      state.currentPitcher = state.currentTopPitcherRecord.player;
    } else {
      // Bottom finished -> check if game over
      if (state.inning >= 9) {
        if (state.topTotalRuns !== state.bottomTotalRuns) {
          state.isGameOver = true;
          this.finalizeMatchStats(state);
          return;
        } else if (state.inning >= 12) {
          // NPB Rule: Draw after 12 innings!
          state.isGameOver = true;
          this.finalizeMatchStats(state);
          return;
        }
      }

      // Next inning (Top)
      state.inning++;
      state.topHalf = true;
      state.topScores.push(0);
      state.bottomScores.push(null);
      state.currentBatter = state.topLineup[state.topBattingIndex].player;
      state.currentPitcher = state.currentBottomPitcherRecord.player;
    }

    // AI Relief Pitching Check for defensive team (respecting starter & reliever policies)
    this.checkAiPitchingChange(state);
    // AI Defensive replacement check
    this.checkAiDefensiveSubstitution(state);
    // AI Pinch Hitter check for new half-inning lead-off
    this.checkAiPinchHitter(state);
  }

  /**
   * AI relief pitcher change logic
   * Respects user-configured pitcher policies:
   * - Starter: complete (完投狙い), stamina_15 (スタミナ残り15%まで), win_rights (勝利投手の権利で交代), normal (通常)
   * - Reliever: winning_formula (勝利の方程式), behind (ビハインド時), long_relief (ロングリリーフ), normal (通常)
   */
  static checkAiPitchingChange(state: LiveGameState) {
    const defenseTeam = state.topHalf ? state.bottomTeam : state.topTeam;
    // 自チームに設定したチームはユーザー自身が監督指示を行うため、AI継投は他球団のみ実行（全自動シミュレーション時を除く）
    if (state.userTeamId && defenseTeam.id === state.userTeamId && !state.isAutoSimulation) {
      return;
    }

    const currentRec = state.topHalf ? state.currentBottomPitcherRecord : state.currentTopPitcherRecord;
    const bullpen = state.topHalf ? state.bottomBullpenPitchers : state.topBullpenPitchers;
    const currentScoreDiff = state.topHalf ? (state.bottomTotalRuns - state.topTotalRuns) : (state.topTotalRuns - state.bottomTotalRuns);

    const closerId = defenseTeam.order.closer;
    const closer = bullpen.find(p => p.id === closerId);
    const setupId = defenseTeam.order.setup;
    const setup = bullpen.find(p => p.id === setupId);

    // Closer situation: 9th inning or later, lead by 1-3 runs (or tie game in bottom 9)
    const isSaveSituation = state.inning >= 9 && currentScoreDiff >= 1 && currentScoreDiff <= 3;
    if (isSaveSituation && closer && currentRec.player.id !== closer.id) {
      this.substitutePitcher(state, defenseTeam.id, closer.id, '守護神・クローザー投入');
      return;
    }

    // Setup situation: 8th inning, lead by 1-3 runs
    const isSetupSituation = state.inning === 8 && currentScoreDiff >= 1 && currentScoreDiff <= 3;
    if (isSetupSituation && setup && currentRec.player.id !== setup.id) {
      this.substitutePitcher(state, defenseTeam.id, setup.id, 'セットアッパー投入');
      return;
    }

    if (currentRec.isStarter) {
      const policy = currentRec.player.usagePolicy || 'normal';
      let shouldPullStarter = false;
      let reason = '先発降板';

      if (policy === 'complete') {
        // 完投狙い: 9回最後まで極力投げ切る。大炎上(7失点以上)、135球以上、または延長突入(10回以降)でのみ交代
        if (currentRec.r >= 7) {
          shouldPullStarter = true;
          reason = '起用法【完投狙い】大量失点により無念の降板';
        } else if (currentRec.pitchCount >= 135) {
          shouldPullStarter = true;
          reason = '起用法【完投狙い】135球限界到達';
        } else if (state.inning > 9) {
          shouldPullStarter = true;
          reason = '起用法【完投狙い】延長戦突入により継投';
        }
      } else if (policy === 'stamina_15') {
        // スタミナ残り15%まで: スタミナ値に応じた最大投球数から残量を計算
        const maxPitchCapacity = Math.max(75, Math.round(currentRec.player.stamina * 1.45));
        const staminaRemainingPct = Math.max(0, 1 - (currentRec.pitchCount / maxPitchCapacity));
        if (staminaRemainingPct <= 0.15 || currentRec.pitchCount >= maxPitchCapacity * 0.85) {
          shouldPullStarter = true;
          reason = '起用法【スタミナ残り15%まで】限界投球数に達し継投';
        } else if (currentRec.r >= 5 || currentRec.pitchCount >= 120) {
          shouldPullStarter = true;
          reason = '起用法【スタミナ残り15%まで】失点・球数増加により継投';
        }
      } else if (policy === 'win_rights') {
        // 勝利投手の権利を得れば交代: 5回完了(15アウト)以上かつ自軍リード
        const has5Innings = currentRec.ipOuts >= 15;
        const hasWinningRights = has5Innings && currentScoreDiff > 0;
        if (hasWinningRights && state.inning >= 6) {
          shouldPullStarter = true;
          reason = '起用法【勝利投手の権利で交代】5回勝利権利獲得・即継投';
        } else if (state.inning >= 6 || currentRec.pitchCount >= 95 || currentRec.r >= 4) {
          shouldPullStarter = true;
          reason = '起用法【勝利投手の権利で交代】規定回・球数到達';
        }
      } else {
        // 通常（おまかせ）: 5〜6回・約95球・4失点目安
        shouldPullStarter =
          currentRec.pitchCount >= 95 ||
          currentRec.r >= 4 ||
          state.inning >= 6 ||
          (state.inning === 5 && currentRec.r >= 3);
        reason = '通常継投';
      }

      if (shouldPullStarter) {
        // Pick best available reliever, respecting reliever policies
        const available = bullpen.filter(p => p.id !== closerId && p.id !== currentRec.player.id && p.fatigue < 65);
        if (available.length > 0) {
          available.sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;
            if (currentScoreDiff > 0 && state.inning >= 7) {
              if (a.usagePolicy === 'winning_formula') scoreA += 50;
              if (b.usagePolicy === 'winning_formula') scoreB += 50;
            } else if (currentScoreDiff < 0) {
              if (a.usagePolicy === 'behind') scoreA += 50;
              if (b.usagePolicy === 'behind') scoreB += 50;
            }
            if (state.inning <= 4) {
              if (a.usagePolicy === 'long_relief') scoreA += 60;
              if (b.usagePolicy === 'long_relief') scoreB += 60;
            }
            if (scoreA !== scoreB) return scoreB - scoreA;

            const gamesDiff = a.pitcherStats.games - b.pitcherStats.games;
            if (Math.abs(gamesDiff) >= 2) return gamesDiff;
            return (b.strikeout + b.control) - (a.strikeout + a.control);
          });
          const chosen = available[0];
          let relReason = reason;
          if (chosen.usagePolicy === 'winning_formula') relReason += ' / 勝利の方程式';
          else if (chosen.usagePolicy === 'behind') relReason += ' / ビハインド要員';
          else if (chosen.usagePolicy === 'long_relief') relReason += ' / ロングリリーフ';
          this.substitutePitcher(state, defenseTeam.id, chosen.id, relReason);
        }
      }
    } else {
      // Reliever replacement: typically 1 inning (3 outs), or high pitch count / runs
      const shouldChangeReliever =
        currentRec.ipOuts >= 3 ||
        currentRec.pitchCount >= 24 ||
        currentRec.r >= 2;

      if (shouldChangeReliever) {
        if (state.inning >= 9 && isSaveSituation && closer && currentRec.player.id !== closer.id) {
          this.substitutePitcher(state, defenseTeam.id, closer.id, '守護神・クローザー登板');
          return;
        }
        if (state.inning === 8 && isSetupSituation && setup && currentRec.player.id !== setup.id) {
          this.substitutePitcher(state, defenseTeam.id, setup.id, 'セットアッパー登板');
          return;
        }

        const available = bullpen.filter(p => p.id !== closerId && p.id !== currentRec.player.id && p.fatigue < 60);
        if (available.length > 0) {
          available.sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;
            if (currentScoreDiff > 0 && state.inning >= 7) {
              if (a.usagePolicy === 'winning_formula') scoreA += 50;
              if (b.usagePolicy === 'winning_formula') scoreB += 50;
            } else if (currentScoreDiff < 0) {
              if (a.usagePolicy === 'behind') scoreA += 50;
              if (b.usagePolicy === 'behind') scoreB += 50;
            }
            if (scoreA !== scoreB) return scoreB - scoreA;

            const gamesDiff = a.pitcherStats.games - b.pitcherStats.games;
            if (Math.abs(gamesDiff) >= 2) return gamesDiff;
            return (b.strikeout + b.control) - (a.strikeout + a.control);
          });
          this.substitutePitcher(state, defenseTeam.id, available[0].id, 'リリーフ継投');
        }
      }
    }
  }

  /**
   * Tactical & AI Command: Substitute Pitcher (継投)
   */
  static substitutePitcher(state: LiveGameState, teamId: string, newPitcherId: string, reason?: string): boolean {
    const isTopDefense = state.topHalf && teamId === state.bottomTeam.id;
    const isBottomDefense = !state.topHalf && teamId === state.topTeam.id;

    if (!isTopDefense && !isBottomDefense) return false;

    const team = isTopDefense ? state.bottomTeam : state.topTeam;
    const bullpen = isTopDefense ? state.bottomBullpenPitchers : state.topBullpenPitchers;
    const newPitcher = team.players.find(p => p.id === newPitcherId);
    if (!newPitcher || newPitcher.pitcherStats.games >= 143) return false;

    const diff = isTopDefense ? (state.bottomTotalRuns - state.topTotalRuns) : (state.topTotalRuns - state.bottomTotalRuns);

    // Record exit metrics on departing pitcher
    if (isTopDefense) {
      state.currentBottomPitcherRecord.leftScoreDiff = diff;
      state.currentBottomPitcherRecord.hadLeadWhenLeft = diff > 0;
    } else {
      state.currentTopPitcherRecord.leftScoreDiff = diff;
      state.currentTopPitcherRecord.hadLeadWhenLeft = diff > 0;
    }

    const newRec: InGamePitcherRecord = {
      player: newPitcher,
      ipOuts: 0,
      h: 0,
      r: 0,
      er: 0,
      bb: 0,
      so: 0,
      hr: 0,
      pitchCount: 0,
      isStarter: false,
      enteredInning: state.inning,
      enteredScoreDiff: diff,
    };

    if (isTopDefense) {
      state.bottomPitcherRecords.push(newRec);
      state.currentBottomPitcherRecord = newRec;
      state.currentPitcher = newPitcher;
      state.bottomBullpenPitchers = bullpen.filter(p => p.id !== newPitcherId);
    } else {
      state.topPitcherRecords.push(newRec);
      state.currentTopPitcherRecord = newRec;
      state.currentPitcher = newPitcher;
      state.topBullpenPitchers = bullpen.filter(p => p.id !== newPitcherId);
    }

    const isUser = state.userTeamId && teamId === state.userTeamId && !state.isAutoSimulation;
    const managerTag = isUser ? '【自軍監督采配】' : '【AI采配】';
    const descText = reason
      ? `${managerTag}（${reason}）ピッチャーは ${newPitcher.name} に交代！`
      : `${managerTag}ピッチャーは ${newPitcher.name} に交代！`;

    state.playLogs.unshift({
      id: `log_${Date.now()}_${Math.random()}`,
      inning: state.inning,
      topHalf: state.topHalf,
      batterName: state.currentBatter.name,
      pitcherName: newPitcher.name,
      count: '継投',
      result: 'ピッチャー交代',
      description: descText,
      runsScored: 0,
      isOut: false,
    });

    return true;
  }

  /**
   * Tactical & AI Command: Pinch Hitter (代打)
   */
  static substitutePinchHitter(state: LiveGameState, teamId: string, benchPlayerId: string): boolean {
    const isTopOffense = state.topHalf && teamId === state.topTeam.id;
    const isBottomOffense = !state.topHalf && teamId === state.bottomTeam.id;

    if (!isTopOffense && !isBottomOffense) return false;

    const team = isTopOffense ? state.topTeam : state.bottomTeam;
    const bench = isTopOffense ? state.topBenchBatters : state.bottomBenchBatters;
    const pinchHitter = team.players.find(p => p.id === benchPlayerId);
    if (!pinchHitter || pinchHitter.batterStats.games >= 143) return false;

    const lineup = isTopOffense ? state.topLineup : state.bottomLineup;
    const bIdx = isTopOffense ? state.topBattingIndex : state.bottomBattingIndex;
    const oldPlayer = lineup[bIdx].player;

    lineup[bIdx] = { player: pinchHitter, pos: lineup[bIdx].pos };
    state.currentBatter = pinchHitter;

    // Register record if not exists
    const recMap = isTopOffense ? state.topBatterRecords : state.bottomBatterRecords;
    if (!recMap.has(pinchHitter.id)) {
      recMap.set(pinchHitter.id, {
        player: pinchHitter,
        pos: lineup[bIdx].pos,
        ab: 0, r: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, so: 0, sb: 0, cs: 0, sh: 0, sf: 0
      });
    }

    if (isTopOffense) {
      state.topBenchBatters = bench.filter(p => p.id !== benchPlayerId);
    } else {
      state.bottomBenchBatters = bench.filter(p => p.id !== benchPlayerId);
    }

    const isUser = state.userTeamId && teamId === state.userTeamId && !state.isAutoSimulation;
    const managerTag = isUser ? '【自軍監督采配】' : '【AI采配】';
    const policyTag = pinchHitter.usagePolicy === 'pinch_hitter' ? '［代打要員］' : '';
    state.playLogs.unshift({
      id: `log_${Date.now()}_${Math.random()}`,
      inning: state.inning,
      topHalf: state.topHalf,
      batterName: pinchHitter.name,
      pitcherName: state.currentPitcher.name,
      count: '代打',
      result: '代打起用',
      description: `${managerTag}バッター ${oldPlayer.name} に代わり、${policyTag}切り札・${pinchHitter.name}！`,
      runsScored: 0,
      isOut: false,
    });

    return true;
  }

  /**
   * Tactical & AI Command: Pinch Runner (代走)
   */
  static substitutePinchRunner(state: LiveGameState, teamId: string, base: 'first' | 'second' | 'third', benchPlayerId: string): boolean {
    const isTopOffense = state.topHalf && teamId === state.topTeam.id;
    const isBottomOffense = !state.topHalf && teamId === state.bottomTeam.id;

    if (!isTopOffense && !isBottomOffense) return false;

    const team = isTopOffense ? state.topTeam : state.bottomTeam;
    const bench = isTopOffense ? state.topBenchBatters : state.bottomBenchBatters;
    const pinchRunner = team.players.find(p => p.id === benchPlayerId);
    if (!pinchRunner || !state.runners[base] || pinchRunner.batterStats.games >= 143) return false;

    const oldRunner = state.runners[base]!;
    state.runners[base] = pinchRunner;

    // Register record
    const recMap = isTopOffense ? state.topBatterRecords : state.bottomBatterRecords;
    if (!recMap.has(pinchRunner.id)) {
      recMap.set(pinchRunner.id, {
        player: pinchRunner,
        pos: oldRunner.mainPosition,
        ab: 0, r: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, so: 0, sb: 0, cs: 0, sh: 0, sf: 0
      });
    }

    if (isTopOffense) {
      state.topBenchBatters = bench.filter(p => p.id !== benchPlayerId);
    } else {
      state.bottomBenchBatters = bench.filter(p => p.id !== benchPlayerId);
    }

    const isUser = state.userTeamId && teamId === state.userTeamId && !state.isAutoSimulation;
    const managerTag = isUser ? '【自軍監督采配】' : '【AI采配】';
    const policyTag = pinchRunner.usagePolicy === 'pinch_runner' ? '［代走要員］' : '';
    state.playLogs.unshift({
      id: `log_${Date.now()}_${Math.random()}`,
      inning: state.inning,
      topHalf: state.topHalf,
      batterName: state.currentBatter.name,
      pitcherName: state.currentPitcher.name,
      count: '代走',
      result: '代走起用',
      description: `${managerTag}${base === 'first' ? '一塁' : base === 'second' ? '二塁' : '三塁'}走者 ${oldRunner.name} に代わり、${policyTag}俊足の ${pinchRunner.name}！`,
      runsScored: 0,
      isOut: false,
    });

    return true;
  }

  /**
   * AI Sacrifice Bunt Check (送りバント)
   */
  static checkAiBunt(state: LiveGameState): boolean {
    if (state.outs !== 0 || state.strikes >= 2) return false;
    const runners = state.runners;
    const hasBuntOpportunity = (runners.first && !runners.second) || (runners.first && runners.second && !runners.third);
    if (!hasBuntOpportunity) return false;

    const isTopOffense = state.topHalf;
    const bIdx = isTopOffense ? state.topBattingIndex : state.bottomBattingIndex;
    const batter = state.currentBatter;

    const diff = isTopOffense
      ? (state.topTotalRuns - state.bottomTotalRuns)
      : (state.bottomTotalRuns - state.topTotalRuns);

    // Only in close game
    if (diff < -3 || diff > 2) return false;

    // Pitchers always sacrifice bunt with 0 outs and runners
    if (batter.mainPosition === 'P') return true;

    // #2 batter or lower order (#8, #9)
    if (bIdx === 1) {
      if (batter.power < 70) return Math.random() < 0.65;
    } else if (bIdx >= 7) {
      if (batter.contact < 68) return Math.random() < 0.60;
    } else if (state.inning >= 7 && (diff === 0 || diff === -1)) {
      if (bIdx !== 2 && bIdx !== 3 && batter.power < 75) {
        return Math.random() < 0.55;
      }
    }

    return false;
  }

  /**
   * AI Intentional Walk Check (申告敬遠)
   */
  static checkAiIntentionalWalk(state: LiveGameState): boolean {
    if (state.inning < 7) return false;
    if (state.runners.first !== null) return false;
    if (!state.runners.second && !state.runners.third) return false;
    if (state.outs === 0) return false;

    const isTopDefense = state.topHalf;
    const defenseScore = isTopDefense ? state.bottomTotalRuns : state.topTotalRuns;
    const offenseScore = isTopDefense ? state.topTotalRuns : state.bottomTotalRuns;
    const diff = defenseScore - offenseScore; // positive means defense leads

    // Only in tight game (-1 <= diff <= 1)
    if (diff < -1 || diff > 1) return false;

    const batter = state.currentBatter;
    const isDangerousBatter = batter.power >= 78 || (batter.contact >= 74 && batter.power >= 68);
    if (!isDangerousBatter) return false;

    // Check next batter in opposing lineup
    const isTopOffense = state.topHalf;
    const offenseLineup = isTopOffense ? state.topLineup : state.bottomLineup;
    const currentIdx = isTopOffense ? state.topBattingIndex : state.bottomBattingIndex;
    const nextIdx = (currentIdx + 1) % 9;
    const nextBatter = offenseLineup[nextIdx]?.player;
    if (!nextBatter) return false;

    const currentScore = batter.contact * 0.5 + batter.power * 0.7;
    const nextScore = nextBatter.contact * 0.5 + nextBatter.power * 0.7;

    // Walk if next batter is significantly weaker or pitcher
    if (nextBatter.mainPosition === 'P' || (currentScore - nextScore >= 18)) {
      return Math.random() < 0.75;
    }

    return false;
  }

  /**
   * AI Tactical Steal Check (作戦盗塁)
   */
  static checkAiSteal(state: LiveGameState): boolean {
    if (!state.runners.first || state.runners.second) return false;
    if (state.outs >= 2 || state.strikes >= 2) return false;

    const isTopOffense = state.topHalf;
    const diff = isTopOffense
      ? (state.topTotalRuns - state.bottomTotalRuns)
      : (state.bottomTotalRuns - state.topTotalRuns);
    if (diff < -2 || diff > 3) return false;

    const runner = state.runners.first;
    const isSpeedster = runner.usagePolicy === 'pinch_runner' || (runner.speed >= 75 && runner.stealing >= 65);
    if (!isSpeedster) return false;

    // Defense catcher arm check
    const defenseTeam = isTopOffense ? state.bottomTeam : state.topTeam;
    const catcher = defenseTeam.players.find(p => p.mainPosition === 'C') || defenseTeam.players[0];
    if (catcher && catcher.arm >= 85 && runner.speed < 85) return false;

    return Math.random() < 0.25;
  }

  /**
   * AI Pinch Hitter Check
   * In 7th inning or later, in clutch / trailing situations,
   * prioritize bench players with usagePolicy === 'pinch_hitter'.
   * Batters with usagePolicy === 'full_game' will NEVER be substituted.
   */
  static checkAiPinchHitter(state: LiveGameState): boolean {
    if (state.inning < 7) return false;

    const isTopOffense = state.topHalf;
    const offenseTeam = isTopOffense ? state.topTeam : state.bottomTeam;
    // 自チームに設定したチームはユーザー自身が監督指示を行うため、AI代打は他球団のみ実行（全自動シミュレーション時を除く）
    if (state.userTeamId && offenseTeam.id === state.userTeamId && !state.isAutoSimulation) {
      return false;
    }

    const bench = isTopOffense ? state.topBenchBatters : state.bottomBenchBatters;
    if (bench.length === 0) return false;

    const batter = state.currentBatter;
    // フル出場: NEVER substitute this batter!
    if (batter.usagePolicy === 'full_game') return false;

    const scoreDiff = isTopOffense
      ? (state.topTotalRuns - state.bottomTotalRuns)
      : (state.bottomTotalRuns - state.topTotalRuns);

    const hasRISP = Boolean(state.runners.second || state.runners.third);
    const isClutchSituation = scoreDiff < 0 || (scoreDiff === 0 && hasRISP) || (state.inning >= 9 && scoreDiff <= 1);
    if (!isClutchSituation) return false;

    // Check designated pinch hitters first
    const designatedPH = bench.filter(p => p.usagePolicy === 'pinch_hitter');
    let chosenPH: Player | null = null;

    if (designatedPH.length > 0) {
      designatedPH.sort((a, b) => {
        const scoreA = a.contact * 1.3 + a.power * 1.3 + (a.condition === '絶好調' ? 15 : a.condition === '好調' ? 8 : 0);
        const scoreB = b.contact * 1.3 + b.power * 1.3 + (b.condition === '絶好調' ? 15 : b.condition === '好調' ? 8 : 0);
        return scoreB - scoreA;
      });
      chosenPH = designatedPH[0];
    } else if (scoreDiff < 0 && state.inning >= 8) {
      const isWeak = (batter.contact < 62 && batter.power < 62) || batter.mainPosition === 'P';
      if (isWeak) {
        const available = bench.slice().sort((a, b) => (b.contact + b.power) - (a.contact + a.power));
        if (available[0] && (available[0].contact + available[0].power > batter.contact + batter.power + 10)) {
          chosenPH = available[0];
        }
      }
    }

    if (chosenPH) {
      return this.substitutePinchHitter(state, offenseTeam.id, chosenPH.id);
    }
    return false;
  }

  /**
   * AI Pinch Runner Check
   * In 7th inning or later, in close games,
   * prioritize bench players with usagePolicy === 'pinch_runner' or high speed.
   * Runners with usagePolicy === 'full_game' will NEVER be substituted.
   */
  static checkAiPinchRunner(state: LiveGameState): boolean {
    if (state.inning < 7) return false;

    const isTopOffense = state.topHalf;
    const offenseTeam = isTopOffense ? state.topTeam : state.bottomTeam;
    // 自チームに設定したチームはユーザー自身が監督指示を行うため、AI代走は他球団のみ実行（全自動シミュレーション時を除く）
    if (state.userTeamId && offenseTeam.id === state.userTeamId && !state.isAutoSimulation) {
      return false;
    }

    const bench = isTopOffense ? state.topBenchBatters : state.bottomBenchBatters;
    if (bench.length === 0) return false;

    const scoreDiff = isTopOffense
      ? (state.topTotalRuns - state.bottomTotalRuns)
      : (state.bottomTotalRuns - state.topTotalRuns);

    const isCloseGame = scoreDiff >= -2 && scoreDiff <= 1;
    if (!isCloseGame) return false;

    const runners = bench.filter(p => p.usagePolicy === 'pinch_runner' || p.speed >= 78);
    if (runners.length === 0) return false;

    runners.sort((a, b) => {
      const scoreA = (a.usagePolicy === 'pinch_runner' ? 40 : 0) + a.speed * 1.5 + a.stealing;
      const scoreB = (b.usagePolicy === 'pinch_runner' ? 40 : 0) + b.speed * 1.5 + b.stealing;
      return scoreB - scoreA;
    });
    const bestRunner = runners[0];

    // Check 2B runner first
    if (state.runners.second && state.runners.second.usagePolicy !== 'full_game') {
      const currentRunner = state.runners.second;
      if (currentRunner.speed < 70 && bestRunner.speed >= currentRunner.speed + 12) {
        return this.substitutePinchRunner(state, offenseTeam.id, 'second', bestRunner.id);
      }
    }

    // Check 1B runner
    if (state.runners.first && state.runners.first.usagePolicy !== 'full_game') {
      const currentRunner = state.runners.first;
      if (currentRunner.speed < 68 && bestRunner.speed >= currentRunner.speed + 12) {
        return this.substitutePinchRunner(state, offenseTeam.id, 'first', bestRunner.id);
      }
    }

    return false;
  }

  /**
   * AI Defensive Substitution Check
   * In 8th/9th inning when leading by 1-3 runs,
   * sub in players with usagePolicy === 'defensive_sub' to tighten up defense.
   */
  static checkAiDefensiveSubstitution(state: LiveGameState) {
    if (state.inning < 8) return;

    const isTopDefense = state.topHalf;
    const defenseTeam = isTopDefense ? state.bottomTeam : state.topTeam;
    // 自チームに設定したチームはユーザー自身が監督指示を行うため、AI守備固めは他球団のみ実行（全自動シミュレーション時を除く）
    if (state.userTeamId && defenseTeam.id === state.userTeamId && !state.isAutoSimulation) {
      return;
    }
    const bench = isTopDefense ? state.bottomBenchBatters : state.topBenchBatters;
    const lineup = isTopDefense ? state.bottomLineup : state.topLineup;
    if (bench.length === 0) return;

    const scoreDiff = isTopDefense
      ? (state.bottomTotalRuns - state.topTotalRuns)
      : (state.topTotalRuns - state.bottomTotalRuns);

    if (scoreDiff < 1 || scoreDiff > 3) return;

    const defensiveSubs = bench.filter(p => p.usagePolicy === 'defensive_sub');
    if (defensiveSubs.length === 0) return;

    for (const sub of defensiveSubs) {
      const targetSlot = lineup.find(s =>
        s.pos === sub.mainPosition &&
        s.player.usagePolicy !== 'full_game' &&
        s.player.fielding < sub.fielding - 10
      );

      if (targetSlot) {
        const oldPlayer = targetSlot.player;
        targetSlot.player = sub;

        if (isTopDefense) {
          state.bottomBenchBatters = state.bottomBenchBatters.filter(p => p.id !== sub.id);
        } else {
          state.topBenchBatters = state.topBenchBatters.filter(p => p.id !== sub.id);
        }

        state.playLogs.unshift({
          id: `log_${Date.now()}_${Math.random()}`,
          inning: state.inning,
          topHalf: state.topHalf,
          batterName: state.currentBatter.name,
          pitcherName: state.currentPitcher.name,
          count: '守備',
          result: '守備固め',
          description: `【守備固め】起用法「守備要員」の ${sub.name} が ${oldPlayer.name} に代わり ${targetSlot.pos} の守備へ！`,
          runsScored: 0,
          isOut: false,
        });
        break;
      }
    }
  }

  /**
   * Finalize match decisions (Win, Loss, Save, Hold) and accumulate stats into player/team models
   */
  static finalizeMatchStats(state: LiveGameState) {
    if (state.match.status === 'finished') return;
    const isTopWin = state.topTotalRuns > state.bottomTotalRuns;
    const isBottomWin = state.bottomTotalRuns > state.topTotalRuns;
    const isDraw = state.topTotalRuns === state.bottomTotalRuns;

    // Determine Pitcher Decisions
    if (isTopWin) {
      const topStarter = state.topPitcherRecords[0];
      const isStarterQualified = topStarter && topStarter.isStarter && topStarter.ipOuts >= 15 &&
        (topStarter === state.currentTopPitcherRecord
          ? (state.topTotalRuns > state.bottomTotalRuns)
          : (topStarter.hadLeadWhenLeft && !topStarter.leadLostAfterExit));

      let winningPitcher: InGamePitcherRecord | null = null;
      if (isStarterQualified) {
        winningPitcher = topStarter;
      } else {
        const eligibleRelievers = state.topPitcherRecords.filter(p => p !== topStarter);
        if (eligibleRelievers.length > 0) {
          eligibleRelievers.sort((a, b) => {
            const scoreA = (a.player.winLuck ?? 50) * 0.4 + a.ipOuts * 2 - a.er * 5;
            const scoreB = (b.player.winLuck ?? 50) * 0.4 + b.ipOuts * 2 - b.er * 5;
            return scoreB - scoreA;
          });
          winningPitcher = eligibleRelievers[0];
        } else {
          winningPitcher = topStarter;
        }
      }

      if (winningPitcher) winningPitcher.decision = 'win';

      const losingPitcher = state.bottomPitcherRecords.reduce((max, p) => p.r > max.r ? p : max, state.bottomPitcherRecords[0]);
      if (losingPitcher) losingPitcher.decision = 'loss';

      // Save: last pitcher if entered with <=3 lead and pitched >= 3 outs, and not the winning pitcher
      const lastTop = state.topPitcherRecords[state.topPitcherRecords.length - 1];
      if (lastTop && lastTop !== winningPitcher && lastTop.enteredScoreDiff <= 3 && lastTop.ipOuts >= 3) {
        lastTop.decision = 'save';
      } else {
        // Holds for middle relievers
        state.topPitcherRecords.forEach(p => {
          if (p !== winningPitcher && p !== lastTop && p.enteredScoreDiff <= 3 && p.hadLeadWhenLeft && p.ipOuts >= 1) {
            p.decision = 'hold';
          }
        });
      }
    } else if (isBottomWin) {
      const bottomStarter = state.bottomPitcherRecords[0];
      const isStarterQualified = bottomStarter && bottomStarter.isStarter && bottomStarter.ipOuts >= 15 &&
        (bottomStarter === state.currentBottomPitcherRecord
          ? (state.bottomTotalRuns > state.topTotalRuns)
          : (bottomStarter.hadLeadWhenLeft && !bottomStarter.leadLostAfterExit));

      let winningPitcher: InGamePitcherRecord | null = null;
      if (isStarterQualified) {
        winningPitcher = bottomStarter;
      } else {
        const eligibleRelievers = state.bottomPitcherRecords.filter(p => p !== bottomStarter);
        if (eligibleRelievers.length > 0) {
          eligibleRelievers.sort((a, b) => {
            const scoreA = (a.player.winLuck ?? 50) * 0.4 + a.ipOuts * 2 - a.er * 5;
            const scoreB = (b.player.winLuck ?? 50) * 0.4 + b.ipOuts * 2 - b.er * 5;
            return scoreB - scoreA;
          });
          winningPitcher = eligibleRelievers[0];
        } else {
          winningPitcher = bottomStarter;
        }
      }

      if (winningPitcher) winningPitcher.decision = 'win';

      const losingPitcher = state.topPitcherRecords.reduce((max, p) => p.r > max.r ? p : max, state.topPitcherRecords[0]);
      if (losingPitcher) losingPitcher.decision = 'loss';

      const lastBottom = state.bottomPitcherRecords[state.bottomPitcherRecords.length - 1];
      if (lastBottom && lastBottom !== winningPitcher && lastBottom.enteredScoreDiff <= 3 && lastBottom.ipOuts >= 3) {
        lastBottom.decision = 'save';
      } else {
        state.bottomPitcherRecords.forEach(p => {
          if (p !== winningPitcher && p !== lastBottom && p.enteredScoreDiff <= 3 && p.hadLeadWhenLeft && p.ipOuts >= 1) {
            p.decision = 'hold';
          }
        });
      }
    }

    // Accumulate Batters
    const updateBatters = (records: Map<string, InGameBatterRecord>) => {
      records.forEach(rec => {
        const p = rec.player;
        if (p.batterStats.games >= 143) return; // Strict 143 limit
        const bs = p.batterStats;
        bs.games++;
        bs.ab += rec.ab;
        bs.pa += (rec.ab + rec.bb + rec.sh + rec.sf);
        bs.runs += rec.r;
        bs.hits += rec.h;
        bs.doubles += rec.doubles;
        bs.triples += rec.triples;
        bs.hr += rec.hr;
        bs.rbi += rec.rbi;
        bs.bb += rec.bb;
        bs.so += rec.so;
        bs.sb += rec.sb;
        bs.cs += rec.cs;
        bs.sh += rec.sh;
        bs.sf += rec.sf;

        // Recompute averages
        bs.avg = bs.ab > 0 ? Number((bs.hits / bs.ab).toFixed(3)) : 0;
        const obpDenom = bs.ab + bs.bb + bs.sf;
        bs.obp = obpDenom > 0 ? Number(((bs.hits + bs.bb) / obpDenom).toFixed(3)) : 0;
        const totalBases = (bs.hits - bs.doubles - bs.triples - bs.hr) + bs.doubles * 2 + bs.triples * 3 + bs.hr * 4;
        bs.slg = bs.ab > 0 ? Number((totalBases / bs.ab).toFixed(3)) : 0;
        bs.ops = Number((bs.obp + bs.slg).toFixed(3));

        // Update condition gradually based on performance
        let score = (rec.h * 1.0 + rec.hr * 2.0 + rec.bb * 0.5) - (rec.so * 0.5);
        this.updatePlayerCondition(p, score);

        // Add fatigue
        p.fatigue = Math.min(100, p.fatigue + 12);
      });
    };

    updateBatters(state.topBatterRecords);
    updateBatters(state.bottomBatterRecords);

    // Accumulate Pitchers
    const updatePitchers = (records: InGamePitcherRecord[]) => {
      records.forEach(rec => {
        const p = rec.player;
        if (p.pitcherStats.games >= 143) return; // Strict 143 limit
        const ps = p.pitcherStats;
        ps.games++;
        if (rec.isStarter) ps.gamesStarted++;
        if (rec.isStarter && rec.ipOuts >= 27) {
          ps.completeGames++;
          if (rec.r === 0) ps.shutouts++;
        }
        if (rec.decision === 'win') ps.wins++;
        if (rec.decision === 'loss') ps.losses++;
        if (rec.decision === 'save') ps.saves++;
        if (rec.decision === 'hold') ps.holds++;

        ps.ipOuts += rec.ipOuts;
        ps.ip = Math.floor(ps.ipOuts / 3) + (ps.ipOuts % 3) * 0.1;
        ps.hits += rec.h;
        ps.hr += rec.hr;
        ps.bb += rec.bb;
        ps.so += rec.so;
        ps.runs += rec.r;
        ps.er += rec.er;

        // Recompute ERA
        const fullInnings = ps.ipOuts / 3;
        ps.era = fullInnings > 0 ? Number(((ps.er * 9) / fullInnings).toFixed(2)) : 0;
        ps.whip = fullInnings > 0 ? Number(((ps.bb + ps.hits) / fullInnings).toFixed(2)) : 0;

        // Condition update
        let score = (rec.so * 0.8) - (rec.er * 1.5 + rec.bb * 0.5);
        this.updatePlayerCondition(p, score);

        // Add fatigue
        p.fatigue = Math.min(100, p.fatigue + (rec.isStarter ? 40 : 20));
      });
    };

    updatePitchers(state.topPitcherRecords);
    updatePitchers(state.bottomPitcherRecords);

    // Update Team records
    const topTeam = state.topTeam;
    const bottomTeam = state.bottomTeam;

    topTeam.stats.games++;
    bottomTeam.stats.games++;
    topTeam.stats.runsScored += state.topTotalRuns;
    topTeam.stats.runsAllowed += state.bottomTotalRuns;
    bottomTeam.stats.runsScored += state.bottomTotalRuns;
    bottomTeam.stats.runsAllowed += state.topTotalRuns;

    if (isTopWin) {
      topTeam.stats.wins++;
      bottomTeam.stats.losses++;
      topTeam.stats.streak = topTeam.stats.streak.startsWith('W') ? `W${parseInt(topTeam.stats.streak.slice(1) || '1') + 1}` : 'W1';
      bottomTeam.stats.streak = bottomTeam.stats.streak.startsWith('L') ? `L${parseInt(bottomTeam.stats.streak.slice(1) || '1') + 1}` : 'L1';
    } else if (isBottomWin) {
      bottomTeam.stats.wins++;
      topTeam.stats.losses++;
      bottomTeam.stats.streak = bottomTeam.stats.streak.startsWith('W') ? `W${parseInt(bottomTeam.stats.streak.slice(1) || '1') + 1}` : 'W1';
      topTeam.stats.streak = topTeam.stats.streak.startsWith('L') ? `L${parseInt(topTeam.stats.streak.slice(1) || '1') + 1}` : 'L1';
    } else {
      topTeam.stats.draws++;
      bottomTeam.stats.draws++;
      topTeam.stats.streak = 'D1';
      bottomTeam.stats.streak = 'D1';
    }

    const computeWinRate = (w: number, l: number) => (w + l > 0 ? Number((w / (w + l)).toFixed(3)) : 0);
    topTeam.stats.winRate = computeWinRate(topTeam.stats.wins, topTeam.stats.losses);
    bottomTeam.stats.winRate = computeWinRate(bottomTeam.stats.wins, bottomTeam.stats.losses);
    topTeam.stats.runDiff = topTeam.stats.runsScored - topTeam.stats.runsAllowed;
    bottomTeam.stats.runDiff = bottomTeam.stats.runsScored - bottomTeam.stats.runsAllowed;

    // Save box score into match object
    state.match.status = 'finished';
    state.match.topScore = state.topTotalRuns;
    state.match.bottomScore = state.bottomTotalRuns;
    state.match.topHits = state.topTotalHits;
    state.match.bottomHits = state.bottomTotalHits;
    state.match.topErrors = state.topTotalErrors;
    state.match.bottomErrors = state.bottomTotalErrors;
    state.match.homeRuns = state.homeRuns;
    state.match.inningsTop = state.topScores;
    state.match.inningsBottom = state.bottomScores;

    const winP = [...state.topPitcherRecords, ...state.bottomPitcherRecords].find(p => p.decision === 'win');
    const loseP = [...state.topPitcherRecords, ...state.bottomPitcherRecords].find(p => p.decision === 'loss');
    const saveP = [...state.topPitcherRecords, ...state.bottomPitcherRecords].find(p => p.decision === 'save');

    state.match.winningPitcherName = winP?.player.name;
    state.match.losingPitcherName = loseP?.player.name;
    state.match.savePitcherName = saveP?.player.name;

    // Box scores
    state.match.boxScoreTop = Array.from(state.topBatterRecords.values()).map(r => ({
      playerId: r.player.id,
      name: r.player.name,
      pos: r.pos,
      ab: r.ab,
      r: r.r,
      h: r.h,
      rbi: r.rbi,
      bb: r.bb,
      so: r.so,
      hr: r.hr,
    }));

    state.match.boxScoreBottom = Array.from(state.bottomBatterRecords.values()).map(r => ({
      playerId: r.player.id,
      name: r.player.name,
      pos: r.pos,
      ab: r.ab,
      r: r.r,
      h: r.h,
      rbi: r.rbi,
      bb: r.bb,
      so: r.so,
      hr: r.hr,
    }));

    state.match.boxScorePitchersTop = state.topPitcherRecords.map(r => ({
      playerId: r.player.id,
      name: r.player.name,
      ipOuts: r.ipOuts,
      h: r.h,
      r: r.r,
      er: r.er,
      bb: r.bb,
      so: r.so,
      hr: r.hr,
      decision: r.decision,
    }));

    state.match.boxScorePitchersBottom = state.bottomPitcherRecords.map(r => ({
      playerId: r.player.id,
      name: r.player.name,
      ipOuts: r.ipOuts,
      h: r.h,
      r: r.r,
      er: r.er,
      bb: r.bb,
      so: r.so,
      hr: r.hr,
      decision: r.decision,
    }));
  }

  /**
   * Gradually update condition based on recent game performances
   */
  private static updatePlayerCondition(p: Player, performanceDelta: number) {
    p.recentForm.push(performanceDelta);
    if (p.recentForm.length > 5) p.recentForm.shift();

    const sum = p.recentForm.reduce((a, b) => a + b, 0);
    const conditions: Condition[] = ['絶不調', '不調', '普通', '好調', '絶好調'];
    let idx = conditions.indexOf(p.condition);

    // Gradual drift (not wild jumps)
    if (sum >= 4 && Math.random() < 0.45) {
      idx = Math.min(4, idx + 1);
    } else if (sum <= -4 && Math.random() < 0.45) {
      idx = Math.max(0, idx - 1);
    } else if (Math.random() < 0.15) {
      // Natural regression towards '普通'
      if (idx > 2) idx--;
      else if (idx < 2) idx++;
    }

    p.condition = conditions[idx];
  }

  /**
   * Fast full simulation for skipped matches
   */
  static simulateFullMatch(match: ScheduledMatch, topTeam: Team, bottomTeam: Team, userTeamId?: string): LiveGameState {
    const state = this.initLiveGame(match, topTeam, bottomTeam, userTeamId);
    state.isAutoSimulation = true;
    
    // Step until game is over
    let loops = 0;
    while (!state.isGameOver && loops < 800) {
      this.stepPitch(state);
      loops++;
    }

    if (!state.isGameOver || state.match.status !== 'finished') {
      // Safety guarantee to finish
      state.isGameOver = true;
      this.finalizeMatchStats(state);
    }

    return state;
  }

  /**
   * Rest players on off-days or non-playing days
   */
  static restPlayers(teams: Team[]) {
    teams.forEach(team => {
      team.players.forEach(p => {
        // Fatigue recovers
        p.fatigue = Math.max(0, p.fatigue - 20);
      });
    });
  }

  /**
   * Execute a steal attempt (tactical command or organic attempt)
   */
  static executeSteal(
    state: LiveGameState,
    runner: Player,
    isSecondToThird: boolean,
    catcher: Player,
    pitcher: Player,
    isOrganic: boolean = false
  ): { isAtBatFinished: boolean; description: string } {
    const defenseTeam = state.topHalf ? state.bottomTeam : state.topTeam;
    const catcherPlayer = catcher || defenseTeam.players.find(p => p.mainPosition === 'C') || defenseTeam.players[0];

    // Steal success probability:
    // Base: 68% for 2B steal, 50% for 3B steal
    const baseSuccessRate = isSecondToThird ? 0.50 : 0.68;
    
    // Runner factors (speed & stealing attribute)
    const runnerAdvantage = ((runner.speed * 0.55 + runner.stealing * 0.45) - 70) * 0.0055;
    
    // Catcher defense factors (arm & fielding)
    const catcherDefense = ((catcherPlayer.arm * 0.70 + catcherPlayer.fielding * 0.30) - 70) * 0.0050;
    
    // Pitcher control (holds / slide step)
    const pitcherFactor = ((pitcher.control || 70) - 70) * 0.0015;

    const finalStealRate = Math.min(0.95, Math.max(0.12, baseSuccessRate + runnerAdvantage - catcherDefense - pitcherFactor));
    const isSuccess = Math.random() < finalStealRate;
    const batterRec = (state.topHalf ? state.topBatterRecords : state.bottomBatterRecords).get(runner.id);

    if (isSuccess) {
      if (isSecondToThird) {
        state.runners.third = runner;
        state.runners.second = null;
      } else {
        state.runners.second = runner;
        state.runners.first = null;
      }
      if (batterRec) batterRec.sb++;

      const targetBase = isSecondToThird ? '三盗' : '二盗';
      const desc = `${runner.name}がスタートを切った！見事なスタートで${targetBase}成功！`;
      state.lastPlayDescription = desc;
      state.playLogs.unshift({
        id: `log_${Date.now()}_${Math.random()}`,
        inning: state.inning,
        topHalf: state.topHalf,
        batterName: runner.name,
        pitcherName: pitcher.name,
        count: `${state.balls}-${state.strikes}`,
        result: `${targetBase}成功`,
        description: desc,
        runsScored: 0,
        isOut: false,
      });
      return { isAtBatFinished: false, description: desc };
    } else {
      // Caught stealing
      if (isSecondToThird) state.runners.second = null;
      else state.runners.first = null;
      if (batterRec) batterRec.cs++;
      state.outs++;

      const targetBase = isSecondToThird ? '三塁' : '二塁';
      const desc = `${runner.name}がスタート！ しかし捕手・${catcherPlayer.name}の鋭い送球で${targetBase}タッチアウト！盗塁失敗！`;
      state.lastPlayDescription = desc;
      state.playLogs.unshift({
        id: `log_${Date.now()}_${Math.random()}`,
        inning: state.inning,
        topHalf: state.topHalf,
        batterName: runner.name,
        pitcherName: pitcher.name,
        count: `${state.balls}-${state.strikes}`,
        result: '盗塁死',
        description: desc,
        runsScored: 0,
        isOut: true,
      });

      if (state.outs >= 3) {
        this.endHalfInning(state);
        return { isAtBatFinished: true, description: desc + ' 3アウトチェンジ！' };
      }
      return { isAtBatFinished: false, description: desc };
    }
  }

  /**
   * Decide if an on-base runner attempts to steal naturally during the at-bat.
   * Calibrated so the league stolen base king reaches ~47 SBs over 143 games.
   */
  static tryAttemptSteal(state: LiveGameState): { attempted: boolean; result?: { isAtBatFinished: boolean; description: string } } {
    // 3 outs or game over
    if (state.outs >= 3 || state.isGameOver) return { attempted: false };

    // Runner on 1B (with 2B open) is standard steal attempt
    const runner1 = state.runners.first;
    const runner2 = state.runners.second;
    const runner3 = state.runners.third;

    let targetRunner: Player | null = null;
    let isSecondToThird = false;

    if (runner1 && !runner2) {
      // 1B steal candidate
      targetRunner = runner1;
      isSecondToThird = false;
    } else if (runner2 && !runner3 && !runner1) {
      // Occasional 3B steal candidate (much rarer)
      targetRunner = runner2;
      isSecondToThird = true;
    }

    if (!targetRunner) return { attempted: false };

    // Steal attempt score based on speed and stealing attribute
    const speed = targetRunner.speed;
    const stealing = targetRunner.stealing;
    const runnerQuality = speed * 0.50 + stealing * 0.50;

    // Fast threshold: Minimum ability required to regularly attempt steals
    if (runnerQuality < 70) return { attempted: false };

    // Calculate attempt probability per pitch
    // Calibrated: an elite base stealer (quality ~95-99) has ~9% chance per pitch to run,
    // translating to ~55-60 attempts and ~45-50 successful steals across 143 games.
    let attemptProb = 0;
    if (runnerQuality >= 95) {
      attemptProb = 0.092;
    } else if (runnerQuality >= 90) {
      attemptProb = 0.068;
    } else if (runnerQuality >= 85) {
      attemptProb = 0.045;
    } else if (runnerQuality >= 80) {
      attemptProb = 0.025;
    } else if (runnerQuality >= 75) {
      attemptProb = 0.012;
    } else {
      attemptProb = 0.005;
    }

    // Third base steals are significantly more conservative (only elite runners try, at ~1/5 frequency)
    if (isSecondToThird) {
      if (runnerQuality < 90) return { attempted: false };
      attemptProb *= 0.18;
    }

    // Adjust for game context: score difference
    const scoreDiff = Math.abs(state.topTotalRuns - state.bottomTotalRuns);
    if (scoreDiff >= 6) {
      // Big lead or deficit reduces steal frequency
      attemptProb *= 0.3;
    }

    // Roll for attempt
    if (Math.random() < attemptProb) {
      const defenseTeam = state.topHalf ? state.bottomTeam : state.topTeam;
      const catcher = defenseTeam.players.find(p => p.mainPosition === 'C') || defenseTeam.players[0];
      const pitcher = state.topHalf ? state.currentBottomPitcherRecord.player : state.currentTopPitcherRecord.player;

      const result = this.executeSteal(state, targetRunner, isSecondToThird, catcher, pitcher, true);
      return { attempted: true, result };
    }

    return { attempted: false };
  }
}

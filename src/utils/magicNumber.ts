import { Team, ScheduledMatch } from '../types/baseball';

export interface LeagueMagicStatus {
  leaderId: string;
  leaderName: string;
  magicNumber: number | null; // e.g. 5, or null if not lit
  isChampion: boolean; // true if championship is clinched (優勝決定)
  maxOtherWins: number;
  leaderWins: number;
  leaderRemaining: number;
}

/**
 * Helper to get user-facing magic text:
 * - '優勝決定' if clinched
 * - 'M○' if magic number is lit
 * - null if no magic is active
 */
export function getTeamMagicStatus(team: Team): {
  text: string | null;
  badgeText: string | null;
  isChampion: boolean;
  magicNumber: number | null;
} {
  if (team.stats.isChampion) {
    return {
      text: '優勝決定',
      badgeText: '優勝決定',
      isChampion: true,
      magicNumber: null,
    };
  }
  if (team.stats.magicNumber !== null && team.stats.magicNumber !== undefined && team.stats.magicNumber > 0) {
    return {
      text: `M${team.stats.magicNumber}`,
      badgeText: `M${team.stats.magicNumber}`,
      isChampion: false,
      magicNumber: team.stats.magicNumber,
    };
  }
  return {
    text: null,
    badgeText: null,
    isChampion: false,
    magicNumber: null,
  };
}

/**
 * Computes the Championship Magic Number (優勝マジック) for a given league/division.
 *
 * Requirements:
 * 1. For each opponent i != leader:
 *    T_i max possible wins = T_i.wins + T_i.remainingGames
 * 2. 最大到達勝利数 = max_{i != leader}(T_i max possible wins)
 * 3. Base Magic = 最大到達勝利数 - leader.wins + 1
 * 4. Clinch:
 *    If magic <= 0 or all games are completed, leader is crowned champion (isChampion: true, magicNumber: null).
 * 5. Magic Lighting (点灯条件):
 *    - Season is active (leader.stats.games > 0)
 *    - Leader is uniquely in 1st place
 *    - Leader controls its own destiny: magic <= leader.remainingGames
 *    - All other teams have lost control of their own destiny (他球団の自力優勝が消滅):
 *      oppMaxWins < leader.wins + leader.remaining - remainingH2H(leader, opp)
 *    - Win rate safety: at (leader.wins + magic), leader's final win rate strictly exceeds
 *      every opponent's maximum possible final win rate.
 */
export function computeLeagueMagicNumber(
  leagueTeams: Team[],
  schedule?: ScheduledMatch[],
  defaultTotalGames = 143
): Map<string, { magicNumber: number | null; isChampion: boolean }> {
  const result = new Map<string, { magicNumber: number | null; isChampion: boolean }>();

  if (!leagueTeams || leagueTeams.length === 0) {
    return result;
  }

  // Initialize everyone as no magic / not champion
  leagueTeams.forEach(t => {
    result.set(t.id, { magicNumber: null, isChampion: false });
  });

  if (leagueTeams.length === 1) {
    result.set(leagueTeams[0].id, { magicNumber: null, isChampion: true });
    return result;
  }

  // Sort teams by official standings order:
  // 1. Win Rate
  // 2. Wins
  // 3. Run Differential
  // 4. Runs Scored
  const sorted = [...leagueTeams].sort((a, b) => {
    if (b.stats.winRate !== a.stats.winRate) return b.stats.winRate - a.stats.winRate;
    if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
    const diffB = b.stats.runsScored - b.stats.runsAllowed;
    const diffA = a.stats.runsScored - a.stats.runsAllowed;
    if (diffB !== diffA) return diffB - diffA;
    return b.stats.runsScored - a.stats.runsScored;
  });

  const leader = sorted[0];
  const second = sorted[1];

  const getRemainingGames = (team: Team): number => {
    if (schedule && schedule.length > 0) {
      return schedule.filter(
        m => (m.topTeamId === team.id || m.bottomTeamId === team.id) && m.status !== 'finished'
      ).length;
    }
    return Math.max(0, defaultTotalGames - team.stats.games);
  };

  const getRemainingH2H = (teamAId: string, teamBId: string): number => {
    if (schedule && schedule.length > 0) {
      return schedule.filter(
        m =>
          ((m.topTeamId === teamAId && m.bottomTeamId === teamBId) ||
            (m.topTeamId === teamBId && m.bottomTeamId === teamAId)) &&
          m.status !== 'finished'
      ).length;
    }
    const remA = getRemainingGames(leader);
    return Math.max(0, Math.floor(remA / Math.max(1, leagueTeams.length - 1)));
  };

  const leaderRemaining = getRemainingGames(leader);
  const leaderTotalGames = leader.stats.games + leaderRemaining;

  let maxOtherWins = 0;
  let anyOtherTeamHasZiriki = false;

  for (let i = 1; i < sorted.length; i++) {
    const opp = sorted[i];
    const oppRemaining = getRemainingGames(opp);
    const oppMaxWins = opp.stats.wins + oppRemaining;

    if (oppMaxWins > maxOtherWins) {
      maxOtherWins = oppMaxWins;
    }

    const h2h = getRemainingH2H(leader.id, opp.id);
    const leaderMaxWinsIfOppSweeps = leader.stats.wins + (leaderRemaining - h2h);
    if (oppMaxWins >= leaderMaxWinsIfOppSweeps) {
      anyOtherTeamHasZiriki = true;
    }
  }

  // Base Magic Number: 最大到達勝利数 - 首位チームの現在勝利数 + 1
  let magic = maxOtherWins - leader.stats.wins + 1;

  const allFinished = leagueTeams.every(t => getRemainingGames(t) === 0);

  // If magic <= 0 or all games finished with leader in 1st place
  if (magic <= 0 || (allFinished && leader.stats.games > 0)) {
    result.set(leader.id, { magicNumber: null, isChampion: true });
    return result;
  }

  // Check if leader is uniquely in 1st place
  const isSoleLeader =
    leader.stats.winRate > second.stats.winRate ||
    (leader.stats.winRate === second.stats.winRate && leader.stats.wins > second.stats.wins);

  const controlsDestiny = magic <= leaderRemaining;

  // Win rate protection: ensure leader at (leader.wins + magic) exceeds oppMaxWinRate
  const leaderDecisions = leaderTotalGames - leader.stats.draws;
  if (leaderDecisions > 0) {
    for (let i = 1; i < sorted.length; i++) {
      const opp = sorted[i];
      const oppRemaining = getRemainingGames(opp);
      const oppMaxWins = opp.stats.wins + oppRemaining;
      const oppTotalGames = opp.stats.games + oppRemaining;
      const oppDecisions = oppTotalGames - opp.stats.draws;

      if (oppDecisions > 0) {
        const oppMaxWinRate = oppMaxWins / oppDecisions;
        let leaderFinalWinRate = (leader.stats.wins + magic) / leaderDecisions;

        while (leaderFinalWinRate <= oppMaxWinRate && magic < leaderRemaining) {
          magic++;
          leaderFinalWinRate = (leader.stats.wins + magic) / leaderDecisions;
        }
      }
    }
  }

  // Magic lights up when:
  // 1. Season has active games
  // 2. Sole 1st place
  // 3. Leader controls destiny (magic <= remaining)
  // 4. All other teams have lost control of destiny (no ziriki)
  // 5. magic > 0 and within leader's remaining games
  if (
    leader.stats.games > 0 &&
    isSoleLeader &&
    controlsDestiny &&
    !anyOtherTeamHasZiriki &&
    magic > 0 &&
    magic <= leaderRemaining
  ) {
    result.set(leader.id, { magicNumber: magic, isChampion: false });
  }

  return result;
}

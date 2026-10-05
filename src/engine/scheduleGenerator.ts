import { ScheduledMatch, CalendarDay, Team, LeagueStructure } from '../types/baseball';

export interface GeneratedSchedule {
  matches: ScheduledMatch[];
  calendarDays: CalendarDay[];
}

const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

function formatDateWithWeekday(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const w = WEEKDAY_NAMES[d.getDay()];
  return `${y}/${m}/${day} (${w})`;
}

/**
 * Berger table / round-robin pairing algorithm for any number of teams.
 * If number of teams is odd, a BYE is added so every other team is paired.
 */
export function getRoundRobinRounds(teamIds: string[]): [string, string][][] {
  const ids = [...teamIds];
  if (ids.length % 2 !== 0) {
    ids.push('__BYE__');
  }
  const n = ids.length;
  if (n < 2) return [];

  const rounds: [string, string][][] = [];

  for (let r = 0; r < n - 1; r++) {
    const roundPairs: [string, string][] = [];
    const t0 = ids[0];
    const t1 = ids[(r % (n - 1)) + 1];
    if (t0 !== '__BYE__' && t1 !== '__BYE__') {
      roundPairs.push([t0, t1]);
    }
    for (let k = 1; k < n / 2; k++) {
      const idxA = (r + k) % (n - 1) + 1;
      const idxB = (r - k + (n - 1)) % (n - 1) + 1;
      const pA = ids[idxA];
      const pB = ids[idxB];
      if (pA !== '__BYE__' && pB !== '__BYE__') {
        roundPairs.push([pA, pB]);
      }
    }
    rounds.push(roundPairs);
  }
  return rounds;
}

/**
 * Generate 143-game NPB Pennant Schedule:
 * - Monday is always an off day (月曜休み)
 * - Tuesday through Sunday are 6 consecutive game days (火〜日 6連戦)
 * - In a 6-team league (e.g. Royal League / MPB), exactly 3 games are played every game day (1日3試合)
 * - Total 143 games per team (47 series x 3 games + 1 series x 2 games)
 */
export function generateSeasonSchedule(
  teams: Team[],
  leagueStructure: LeagueStructure = 'two_league'
): GeneratedSchedule {
  if (!teams || teams.length < 2) {
    return { matches: [], calendarDays: [] };
  }

  // Group teams by league if two_league (minimum 4 teams per league for 2 leagues, e.g. 8 or 12 teams)
  // If 6 teams or single league, all teams play in one round robin so all 6 teams play every day (3 matches/day)
  let leagueGroups: { leagueId: string; teamIds: string[]; rounds: [string, string][][] }[] = [];

  if (leagueStructure === 'two_league' && teams.length >= 8) {
    const league1Teams = teams.filter(t => t.leagueId === 'royal' || t.leagueId === 'central' || t.leagueId === 'league_a');
    const league2Teams = teams.filter(t => t.leagueId === 'kingdom' || t.leagueId === 'pacific' || t.leagueId === 'league_b');

    let g1Ids: string[];
    let g2Ids: string[];

    if (league1Teams.length >= 4 && league2Teams.length >= 4 && (league1Teams.length + league2Teams.length === teams.length)) {
      g1Ids = league1Teams.map(t => t.id);
      g2Ids = league2Teams.map(t => t.id);
    } else {
      const mid = Math.floor(teams.length / 2);
      g1Ids = teams.slice(0, mid).map(t => t.id);
      g2Ids = teams.slice(mid).map(t => t.id);
    }

    const id1 = league1Teams[0]?.leagueId || (teams[0]?.id?.includes('sapporo') ? 'league_a' : 'royal');
    const id2 = league2Teams[0]?.leagueId || (teams[0]?.id?.includes('sapporo') ? 'league_b' : 'kingdom');

    leagueGroups = [
      {
        leagueId: id1,
        teamIds: g1Ids,
        rounds: getRoundRobinRounds(g1Ids),
      },
      {
        leagueId: id2,
        teamIds: g2Ids,
        rounds: getRoundRobinRounds(g2Ids),
      }
    ];
  } else {
    // 6-team league or single league: all teams play in one division
    // With 6 teams, every game day has exactly 6/2 = 3 matches, no team sits out
    const allIds = teams.map(t => t.id);
    const mainLeagueId = teams[0]?.leagueId || 'royal';
    leagueGroups = [
      {
        leagueId: mainLeagueId,
        teamIds: allIds,
        rounds: getRoundRobinRounds(allIds),
      }
    ];
  }

  // Total series: 48 series (47 x 3 games + 1 x 2 games = 143 games)
  const TOTAL_SERIES = 48;
  const matches: ScheduledMatch[] = [];
  const calendarDays: CalendarDay[] = [];

  // Opening Day: Friday, March 27, 2026 (開幕金曜日)
  const currentDate = new Date(2026, 2, 27);
  let dayIndex = 0;
  let matchCounter = 1;

  let s = 0;
  while (s < TOTAL_SERIES) {
    // Monday is always a rest/travel day (月曜休み)
    if (currentDate.getDay() === 1) {
      calendarDays.push({
        dayIndex,
        dateStr: formatDateWithWeekday(currentDate),
        isOffDay: true,
        matchIds: [],
      });
      dayIndex++;
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Game day in series (Series 0: Opening weekend Fri-Sun 3 games; then Tue-Thu 3 games, Fri-Sun 3 games)
    const isLastSeries = (s === TOTAL_SERIES - 1);
    const numGamesInSeries = isLastSeries ? 2 : 3;

    for (let g = 0; g < numGamesInSeries; g++) {
      const dateStr = formatDateWithWeekday(currentDate);
      const dayMatchIds: string[] = [];

      // Gather matches from each league group
      for (const group of leagueGroups) {
        if (group.rounds.length === 0) continue;
        const roundIndex = s % group.rounds.length;
        const cycle = Math.floor(s / group.rounds.length);
        const pairings = group.rounds[roundIndex];

        pairings.forEach(([tA, tB], pairIdx) => {
          // Home / Away alternation: invert each cycle to keep balance
          const homeSwap = (cycle + pairIdx) % 2 === 1;
          const home = homeSwap ? tA : tB;
          const away = homeSwap ? tB : tA;

          const matchId = `m_${matchCounter++}`;
          dayMatchIds.push(matchId);

          matches.push({
            id: matchId,
            dayIndex,
            dateStr,
            topTeamId: away,
            bottomTeamId: home,
            leagueId: group.leagueId,
            status: 'scheduled',
          });
        });
      }

      calendarDays.push({
        dayIndex,
        dateStr,
        isOffDay: false,
        matchIds: dayMatchIds,
      });

      dayIndex++;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    s++;
  }

  return { matches, calendarDays };
}

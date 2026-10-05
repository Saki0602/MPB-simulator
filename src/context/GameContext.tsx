import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Team,
  Player,
  Position,
  TeamOrder,
  ScheduledMatch,
  CalendarDay,
  ActiveScreen,
  LeagueType,
  LeagueStructure,
} from '../types/baseball';
import { getDefaultTeams } from '../data/defaultTeams';
import { generateFictionalLeague, generateCustomTeam } from '../engine/fictionalLeagueGenerator';
import { generateSeasonSchedule } from '../engine/scheduleGenerator';
import { SimulationEngine, LiveGameState } from '../engine/simulationEngine';
import { AIManager } from '../engine/aiManager';
import {
  exportSingleTeamRosterJson,
  exportAllTeamsRosterJson,
  parseTeamRosterJson,
  applyRosterToTeam,
} from '../utils/rosterIO';
import { computeLeagueMagicNumber } from '../utils/magicNumber';

const LOCAL_STORAGE_KEY = 'npb_pennant_sim_v1';

export interface GameContextType {
  teams: Team[];
  schedule: ScheduledMatch[];
  calendarDays: CalendarDay[];
  currentDayIndex: number;
  currentDateStr: string;
  seasonState: 'setup' | 'in_season' | 'finished';
  userTeamId: string;
  setUserTeamId: (id: string) => void;
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;
  activeLiveGame: LiveGameState | null;
  selectedMatchForDetail: ScheduledMatch | null;
  setSelectedMatchForDetail: (match: ScheduledMatch | null) => void;
  lastSavedAt: string | null;

  // Actions
  startSeason: () => void;
  advanceToNextDay: () => void;
  skipSingleMatch: (matchId: string) => void;
  skipDay: () => void;
  skipMultipleDays: (daysCount: number) => void;
  skipToEndOfSeason: () => void;
  startFeaturedMatch: (matchId: string) => void;
  stepLivePitch: (command?: 'bunt' | 'steal' | 'walk') => void;
  stepLiveAtBat: () => void;
  stepLiveInning: () => void;
  finishLiveGame: () => void;
  exitLiveGame: () => void;
  tacticalPinchHitter: (teamId: string, benchPlayerId: string) => void;
  tacticalPinchRunner: (teamId: string, base: 'first' | 'second' | 'third', benchPlayerId: string) => void;
  tacticalPitchingChange: (teamId: string, newPitcherId: string) => void;
  updateTeam: (team: Team) => void;
  updateTeamOrder: (teamId: string, newOrder: TeamOrder) => void;
  updatePlayer: (teamId: string, player: Player) => void;
  addPlayer: (teamId: string, player: Player) => void;
  deletePlayer: (teamId: string, playerId: string) => void;
  generateAiOrderForTeam: (teamId: string) => void;
  applyTodayRecommendedLineup: (teamId: string) => void;
  leagueType: LeagueType;
  switchLeagueType: (type: LeagueType) => void;
  leagueStructure: LeagueStructure;
  switchLeagueStructure: (structure: LeagueStructure) => void;
  setLeagueTeamPreset: (count: number) => void;
  addNewTeam: (params: {
    name: string;
    shortName: string;
    city: string;
    stadium: string;
    color: string;
    secondaryColor?: string;
    textColor?: string;
    leagueId?: string;
    leagueName?: string;
  }) => Team;
  deleteTeam: (teamId: string) => void;
  setTeamLeague: (teamId: string, targetLeagueId: string) => void;
  regenerateFictionalLeague: () => void;
  saveGame: () => void;
  loadGame: () => boolean;
  resetGame: (preferredType?: LeagueType) => void;
  exportSaveJson: () => string;
  importSaveJson: (json: string) => boolean;
  exportTeamFormationJson: (teamId: string) => string;
  exportAllTeamsFormationJson: () => string;
  importTeamFormationJson: (jsonStr: string, targetTeamId?: string) => {
    success: boolean;
    message: string;
    mode?: 'single_team' | 'all_teams';
    teamName?: string;
  };
  isResetConfirmOpen: boolean;
  setIsResetConfirmOpen: (open: boolean) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [leagueType, setLeagueType] = useState<LeagueType>('mpb');
  const [leagueStructure, setLeagueStructure] = useState<LeagueStructure>('two_league');
  const [teams, setTeams] = useState<Team[]>(() => getDefaultTeams(12, 'two_league'));
  const [schedule, setSchedule] = useState<ScheduledMatch[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(0);
  const [seasonState, setSeasonState] = useState<'setup' | 'in_season' | 'finished'>('setup');
  const [userTeamId, setUserTeamId] = useState<string>('tokyo');
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home');
  const [activeLiveGame, setActiveLiveGame] = useState<LiveGameState | null>(null);
  const [selectedMatchForDetail, setSelectedMatchForDetail] = useState<ScheduledMatch | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);

  // Helper to recompute and sort standings (supports multi-league and single-league)
  const updateStandings = useCallback((
    currTeams: Team[],
    structure: LeagueStructure = leagueStructure,
    schedOverride?: ScheduledMatch[]
  ): Team[] => {
    const activeSchedule = schedOverride || schedule;

    if (structure === 'two_league') {
      // Group by leagueId
      const groups = new Map<string, Team[]>();
      currTeams.forEach(t => {
        const lid = t.leagueId || 'league_a';
        if (!groups.has(lid)) groups.set(lid, []);
        groups.get(lid)!.push(t);
      });

      const updatedTeamsMap = new Map<string, Team>();
      groups.forEach((groupTeams) => {
        const sorted = [...groupTeams].sort((a, b) => {
          if (b.stats.winRate !== a.stats.winRate) return b.stats.winRate - a.stats.winRate;
          if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
          return (b.stats.runsScored - b.stats.runsAllowed) - (a.stats.runsScored - a.stats.runsAllowed);
        });

        // Compute Championship Magic Numbers for this league
        const magicMap = computeLeagueMagicNumber(sorted, activeSchedule);
        const leader = sorted[0];

        sorted.forEach((t, idx) => {
          const gb = idx === 0 ? 0 : Number((((leader.stats.wins - t.stats.wins) + (t.stats.losses - leader.stats.losses)) / 2).toFixed(1));
          const magicInfo = magicMap.get(t.id);
          updatedTeamsMap.set(t.id, {
            ...t,
            stats: {
              ...t.stats,
              rank: idx + 1,
              gamesBehind: Math.max(0, gb),
              magicNumber: magicInfo?.magicNumber ?? null,
              isChampion: magicInfo?.isChampion ?? false,
            }
          });
        });
      });

      return currTeams.map(t => updatedTeamsMap.get(t.id) || t);
    } else {
      // Single league: all teams ranked together
      const sorted = [...currTeams].sort((a, b) => {
        if (b.stats.winRate !== a.stats.winRate) return b.stats.winRate - a.stats.winRate;
        if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
        return (b.stats.runsScored - b.stats.runsAllowed) - (a.stats.runsScored - a.stats.runsAllowed);
      });

      const leader = sorted[0];
      const magicMap = computeLeagueMagicNumber(sorted, activeSchedule);
      const rankMap = new Map<string, { rank: number; gamesBehind: number; magicNumber: number | null; isChampion: boolean }>();

      sorted.forEach((t, idx) => {
        const gb = idx === 0 ? 0 : Number((((leader.stats.wins - t.stats.wins) + (t.stats.losses - leader.stats.losses)) / 2).toFixed(1));
        const magicInfo = magicMap.get(t.id);
        rankMap.set(t.id, {
          rank: idx + 1,
          gamesBehind: Math.max(0, gb),
          magicNumber: magicInfo?.magicNumber ?? null,
          isChampion: magicInfo?.isChampion ?? false,
        });
      });

      return currTeams.map(t => {
        const info = rankMap.get(t.id);
        return {
          ...t,
          stats: {
            ...t.stats,
            rank: info?.rank ?? 1,
            gamesBehind: info?.gamesBehind ?? 0,
            magicNumber: info?.magicNumber ?? null,
            isChampion: info?.isChampion ?? false,
          }
        };
      });
    }
  }, [leagueStructure, schedule]);

  // Helper to migrate old saved data (Osaka -> Kobe, Fukuoka Hawks -> 社会人選抜)
  const migrateOldSavedData = (data: { teams?: Team[]; schedule?: ScheduledMatch[]; userTeamId?: string }) => {
    let teams = data.teams || [];
    let schedule = data.schedule || [];
    let userTeamId = data.userTeamId || 'tokyo';

    // 1. Migrate old Osaka Tigers to Kobe Buffaloes
    const hasOldOsaka = teams.some(t => t.id === 'osaka' || t.name === '大阪タイガース');
    if (hasOldOsaka) {
      const kobeDefault = getDefaultTeams().find(t => t.id === 'kobe');
      if (kobeDefault) {
        teams = teams.map(t => {
          if (t.id === 'osaka' || t.name === '大阪タイガース') {
            return {
              ...kobeDefault,
              stats: t.stats,
            };
          }
          return t;
        });
        schedule = schedule.map(m => ({
          ...m,
          topTeamId: m.topTeamId === 'osaka' ? 'kobe' : m.topTeamId,
          bottomTeamId: m.bottomTeamId === 'osaka' ? 'kobe' : m.bottomTeamId,
        }));
        if (userTeamId === 'osaka') {
          userTeamId = 'kobe';
        }
      }
    }

    // 2. Migrate MPB team names & leagues to Royal / Kingdom
    const mpbDefaults = getDefaultTeams(12, 'two_league');
    const isMpbMode = teams.some(t => mpbDefaults.some(d => d.id === t.id));
    if (isMpbMode) {
      teams = teams.map((t, idx) => {
        const matched = mpbDefaults.find(d => d.id === t.id);
        if (matched) {
          const isRoyal = t.leagueId === 'royal' || t.leagueId === 'central' || idx < 6;
          return {
            ...t,
            name: matched.name,
            shortName: matched.shortName,
            city: matched.city,
            stadium: matched.stadium,
            color: matched.color,
            leagueId: isRoyal ? 'royal' : 'kingdom',
            leagueName: isRoyal ? 'ロイヤルリーグ' : 'キングダムリーグ',
          };
        }
        return t;
      });

      schedule = schedule.map(m => {
        if (m.leagueId === 'central') return { ...m, leagueId: 'royal' };
        if (m.leagueId === 'pacific') return { ...m, leagueId: 'kingdom' };
        return m;
      });
    }

    return { teams, schedule, userTeamId };
  };

  // Initialize schedule on mount if empty
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.teams && data.schedule && data.calendarDays) {
          const loadedLeagueType: LeagueType = data.leagueType || (data.teams?.[0]?.id === 'sapporo' ? 'fictional' : 'mpb');
          const loadedStructure: LeagueStructure = data.leagueStructure || (data.teams.some((t: Team) => t.leagueId === 'pacific' || t.leagueId === 'league_b') ? 'two_league' : 'two_league');
          setLeagueType(loadedLeagueType);
          setLeagueStructure(loadedStructure);
          const migrated = migrateOldSavedData(data);
          const validatedTeams = migrated.teams.map(t => {
            if (!t.order || !t.order.battingOrder || t.order.battingOrder.length < 9 || !t.order.rotation || t.order.rotation.length === 0) {
              return { ...t, order: AIManager.generateBestOrder(t) };
            }
            return t;
          });
          setTeams(validatedTeams);

          const isScheduleOutdated =
            data.seasonState === 'setup' ||
            !data.calendarDays[0]?.dateStr?.includes('(') ||
            (validatedTeams.some((t: Team) => t.id === 'nagoya') && !migrated.schedule.some((m: ScheduledMatch) => (m.topTeamId === 'nagoya' || m.bottomTeamId === 'nagoya') && m.dayIndex === 0));

          let activeSchedule = migrated.schedule;
          if (isScheduleOutdated) {
            const newlyGenerated = generateSeasonSchedule(validatedTeams, loadedStructure);
            activeSchedule = newlyGenerated.matches;
            setSchedule(newlyGenerated.matches);
            setCalendarDays(newlyGenerated.calendarDays);
            setCurrentDayIndex(0);
          } else {
            setSchedule(migrated.schedule);
            setCalendarDays(data.calendarDays);
            setCurrentDayIndex(data.currentDayIndex || 0);
          }

          const calculatedTeams = updateStandings(validatedTeams, loadedStructure, activeSchedule);
          setTeams(calculatedTeams);

          setSeasonState(data.seasonState || 'setup');
          setUserTeamId(migrated.userTeamId);
          setLastSavedAt(data.lastSavedAt || null);
          return;
        }
      } catch (err) {
        console.error('Failed to parse saved game:', err);
      }
    }

    // Default init: 12 teams with 30 players each, two leagues (Royal & Kingdom)
    const initialTeams = getDefaultTeams(12, 'two_league');
    setTeams(initialTeams);
    const generated = generateSeasonSchedule(initialTeams, 'two_league');
    setSchedule(generated.matches);
    setCalendarDays(generated.calendarDays);
  }, []);

  const currentDateStr = calendarDays[currentDayIndex]?.dateStr || '2026/03/27 (金)';

  // Save game to localStorage
  const saveGame = useCallback(() => {
    const now = new Date();
    const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const payload = {
      teams,
      schedule,
      calendarDays,
      currentDayIndex,
      seasonState,
      userTeamId,
      leagueType,
      leagueStructure,
      lastSavedAt: timeStr,
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
      setLastSavedAt(timeStr);
    } catch (e) {
      console.error('Storage full or error:', e);
    }
  }, [teams, schedule, calendarDays, currentDayIndex, seasonState, userTeamId, leagueType, leagueStructure]);

  // Load game from localStorage
  const loadGame = useCallback((): boolean => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return false;
    try {
      const data = JSON.parse(saved);
      const loadedLeagueType: LeagueType = data.leagueType || (data.teams?.[0]?.id === 'sapporo' ? 'fictional' : 'mpb');
      const loadedStructure: LeagueStructure = data.leagueStructure || 'two_league';
      setLeagueType(loadedLeagueType);
      setLeagueStructure(loadedStructure);
      const migrated = migrateOldSavedData(data);
      const recalculatedTeams = updateStandings(migrated.teams, loadedStructure, migrated.schedule);
      setTeams(recalculatedTeams);
      setSchedule(migrated.schedule);
      setCalendarDays(data.calendarDays);
      setCurrentDayIndex(data.currentDayIndex);
      setSeasonState(data.seasonState);
      setUserTeamId(migrated.userTeamId);
      setLastSavedAt(data.lastSavedAt);
      setActiveLiveGame(null);
      return true;
    } catch (e) {
      return false;
    }
  }, [updateStandings]);

  // Switch league structure (single league <-> two-league)
  const switchLeagueStructure = useCallback((newStructure: LeagueStructure) => {
    setLeagueStructure(newStructure);
    const half = Math.ceil(teams.length / 2);
    const nextTeams = teams.map((team, idx) => {
      if (newStructure === 'single') {
        return {
          ...team,
          leagueId: 'single',
          leagueName: leagueType === 'mpb' ? 'MPBペナントリーグ' : '架空ペナントリーグ',
        };
      } else {
        const isFirstHalf = idx < half;
        if (leagueType === 'mpb') {
          return {
            ...team,
            leagueId: isFirstHalf ? 'royal' : 'kingdom',
            leagueName: isFirstHalf ? 'ロイヤルリーグ' : 'キングダムリーグ',
          };
        } else {
          return {
            ...team,
            leagueId: isFirstHalf ? 'league_a' : 'league_b',
            leagueName: isFirstHalf ? 'アルファ・リーグ' : 'ベータ・リーグ',
          };
        }
      }
    });

    const recalculated = updateStandings(nextTeams, newStructure);
    setTeams(recalculated);

    if (seasonState === 'setup') {
      const generated = generateSeasonSchedule(recalculated, newStructure);
      setSchedule(generated.matches);
      setCalendarDays(generated.calendarDays);
      setCurrentDayIndex(0);
    }
  }, [teams, leagueType, seasonState, updateStandings]);

  // Set preset team count (e.g. 6, 8, 10, 12 teams)
  const setLeagueTeamPreset = useCallback((count: number) => {
    let newTeams: Team[];
    if (leagueType === 'fictional') {
      newTeams = generateFictionalLeague(count, leagueStructure);
    } else {
      newTeams = getDefaultTeams(count, leagueStructure);
    }

    const calculated = updateStandings(newTeams, leagueStructure);
    const generated = generateSeasonSchedule(calculated, leagueStructure);

    setTeams(calculated);
    setUserTeamId(calculated[0].id);
    setSchedule(generated.matches);
    setCalendarDays(generated.calendarDays);
    setCurrentDayIndex(0);
    setSeasonState('setup');
  }, [leagueType, leagueStructure, updateStandings]);

  // Add a new custom team (30 players: 14 pitchers + 16 batters)
  const addNewTeam = useCallback((params: {
    name: string;
    shortName: string;
    city: string;
    stadium: string;
    color: string;
    secondaryColor?: string;
    textColor?: string;
    leagueId?: string;
    leagueName?: string;
  }): Team => {
    const newId = `custom_team_${Date.now()}`;
    const defaultLeagueId = leagueStructure === 'two_league'
      ? (params.leagueId || (leagueType === 'mpb' ? 'royal' : 'league_a'))
      : 'single';
    const defaultLeagueName = params.leagueName || (
      leagueStructure === 'single'
        ? (leagueType === 'mpb' ? 'MPBロイヤルペナント' : '架空ペナントリーグ')
        : (defaultLeagueId === 'royal' || defaultLeagueId === 'central' ? 'ロイヤルリーグ' : defaultLeagueId === 'kingdom' || defaultLeagueId === 'pacific' ? 'キングダムリーグ' : defaultLeagueId === 'league_b' ? 'ベータ・リーグ' : 'アルファ・リーグ')
    );

    const createdTeam = generateCustomTeam({
      id: newId,
      name: params.name || `新規球団 ${teams.length + 1}`,
      shortName: params.shortName || (params.name ? params.name.slice(0, 2) : `新${teams.length + 1}`),
      city: params.city || '東京都',
      stadium: params.stadium || '新球場',
      color: params.color || '#3b82f6',
      secondaryColor: params.secondaryColor || '#1d4ed8',
      textColor: params.textColor || '#ffffff',
      leagueId: defaultLeagueId,
      leagueName: defaultLeagueName,
    });

    const nextTeams = [...teams, createdTeam];
    const calculated = updateStandings(nextTeams, leagueStructure);
    setTeams(calculated);

    if (seasonState === 'setup') {
      const generated = generateSeasonSchedule(calculated, leagueStructure);
      setSchedule(generated.matches);
      setCalendarDays(generated.calendarDays);
      setCurrentDayIndex(0);
    }

    return createdTeam;
  }, [teams, leagueStructure, leagueType, seasonState, updateStandings]);

  // Delete team
  const deleteTeam = useCallback((teamId: string) => {
    if (teams.length <= 2) {
      return;
    }
    const nextTeams = teams.filter(t => t.id !== teamId);
    if (userTeamId === teamId) {
      setUserTeamId(nextTeams[0].id);
    }
    const calculated = updateStandings(nextTeams, leagueStructure);
    setTeams(calculated);

    if (seasonState === 'setup') {
      const generated = generateSeasonSchedule(calculated, leagueStructure);
      setSchedule(generated.matches);
      setCalendarDays(generated.calendarDays);
      setCurrentDayIndex(0);
    }
  }, [teams, userTeamId, leagueStructure, seasonState, updateStandings]);

  // Set team league affiliation
  const setTeamLeague = useCallback((teamId: string, targetLeagueId: string) => {
    let targetLeagueName = '';
    if (targetLeagueId === 'royal' || targetLeagueId === 'central') targetLeagueName = 'ロイヤルリーグ';
    else if (targetLeagueId === 'kingdom' || targetLeagueId === 'pacific') targetLeagueName = 'キングダムリーグ';
    else if (targetLeagueId === 'league_a') targetLeagueName = 'アルファ・リーグ';
    else if (targetLeagueId === 'league_b') targetLeagueName = 'ベータ・リーグ';
    else targetLeagueName = targetLeagueId;

    const nextTeams = teams.map(t => {
      if (t.id !== teamId) return t;
      return {
        ...t,
        leagueId: targetLeagueId,
        leagueName: targetLeagueName,
      };
    });

    const calculated = updateStandings(nextTeams, leagueStructure);
    setTeams(calculated);

    if (seasonState === 'setup') {
      const generated = generateSeasonSchedule(calculated, leagueStructure);
      setSchedule(generated.matches);
      setCalendarDays(generated.calendarDays);
      setCurrentDayIndex(0);
    }
  }, [teams, leagueStructure, seasonState, updateStandings]);

  // Switch between MPB league and Fictional league
  const switchLeagueType = useCallback((type: LeagueType) => {
    setLeagueType(type);
    let newTeams: Team[];
    let defaultUserTeam: string;

    if (type === 'fictional') {
      newTeams = generateFictionalLeague(12, leagueStructure);
      defaultUserTeam = newTeams[0].id;
    } else {
      newTeams = getDefaultTeams(12, leagueStructure);
      defaultUserTeam = 'tokyo';
    }

    const calculated = updateStandings(newTeams, leagueStructure);
    const generated = generateSeasonSchedule(calculated, leagueStructure);
    setTeams(calculated);
    setUserTeamId(defaultUserTeam);
    setSchedule(generated.matches);
    setCalendarDays(generated.calendarDays);
    setCurrentDayIndex(0);
    setSeasonState('setup');
    setActiveScreen('home');
    setActiveLiveGame(null);
    setSelectedMatchForDetail(null);

    try {
      const now = new Date();
      const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
        teams: calculated,
        schedule: generated.matches,
        calendarDays: generated.calendarDays,
        currentDayIndex: 0,
        seasonState: 'setup',
        userTeamId: defaultUserTeam,
        leagueType: type,
        leagueStructure,
        lastSavedAt: timeStr,
      }));
      setLastSavedAt(timeStr);
    } catch (e) {
      console.error('Storage error:', e);
    }
  }, [leagueStructure, updateStandings]);

  // Regenerate random fictional league
  const regenerateFictionalLeague = useCallback(() => {
    const newTeams = generateFictionalLeague(teams.length || 12, leagueStructure);
    const defaultUserTeam = newTeams[0].id;
    const calculated = updateStandings(newTeams, leagueStructure);
    const generated = generateSeasonSchedule(calculated, leagueStructure);
    setLeagueType('fictional');
    setTeams(calculated);
    setUserTeamId(defaultUserTeam);
    setSchedule(generated.matches);
    setCalendarDays(generated.calendarDays);
    setCurrentDayIndex(0);
    setSeasonState('setup');
    setActiveLiveGame(null);
    setSelectedMatchForDetail(null);

    try {
      const now = new Date();
      const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
        teams: calculated,
        schedule: generated.matches,
        calendarDays: generated.calendarDays,
        currentDayIndex: 0,
        seasonState: 'setup',
        userTeamId: defaultUserTeam,
        leagueType: 'fictional',
        leagueStructure,
        lastSavedAt: timeStr,
      }));
      setLastSavedAt(timeStr);
    } catch (e) {
      console.error('Storage error:', e);
    }
  }, [teams.length, leagueStructure, updateStandings]);

  // Reset game completely
  const resetGame = useCallback((preferredType?: LeagueType) => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    const targetType = preferredType || leagueType;
    let initialTeams: Team[];
    let defaultUserTeam: string;

    if (targetType === 'fictional') {
      initialTeams = generateFictionalLeague(12, leagueStructure);
      defaultUserTeam = initialTeams[0].id;
    } else {
      initialTeams = getDefaultTeams(12, leagueStructure);
      defaultUserTeam = 'tokyo';
    }

    const calculated = updateStandings(initialTeams, leagueStructure);
    const generated = generateSeasonSchedule(calculated, leagueStructure);
    setLeagueType(targetType);
    setTeams(calculated);
    setUserTeamId(defaultUserTeam);
    setSchedule(generated.matches);
    setCalendarDays(generated.calendarDays);
    setCurrentDayIndex(0);
    setSeasonState('setup');
    setActiveScreen('home');
    setActiveLiveGame(null);
    setSelectedMatchForDetail(null);
    setLastSavedAt(null);
  }, [leagueType, leagueStructure, updateStandings]);

  // Export / Import JSON
  const exportSaveJson = useCallback((): string => {
    return JSON.stringify({
      teams,
      schedule,
      calendarDays,
      currentDayIndex,
      seasonState,
      userTeamId,
      leagueType,
      leagueStructure,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }, [teams, schedule, calendarDays, currentDayIndex, seasonState, userTeamId, leagueType, leagueStructure]);

  const importSaveJson = useCallback((jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.teams && data.schedule && data.calendarDays) {
        const loadedLeagueType: LeagueType = data.leagueType || (data.teams?.[0]?.id === 'sapporo' ? 'fictional' : 'mpb');
        const loadedStructure: LeagueStructure = data.leagueStructure || 'two_league';
        setLeagueType(loadedLeagueType);
        setLeagueStructure(loadedStructure);
        const migrated = migrateOldSavedData(data);
        const recalculatedTeams = updateStandings(migrated.teams, loadedStructure, migrated.schedule);
        setTeams(recalculatedTeams);
        setSchedule(migrated.schedule);
        setCalendarDays(data.calendarDays);
        setCurrentDayIndex(data.currentDayIndex || 0);
        setSeasonState(data.seasonState || 'in_season');
        setUserTeamId(migrated.userTeamId);
        setActiveLiveGame(null);
        setSelectedMatchForDetail(null);
        
        const now = new Date();
        const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        setLastSavedAt(data.lastSavedAt || timeStr);
        
        // Persist to LocalStorage
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
            teams: recalculatedTeams,
            schedule: migrated.schedule,
            calendarDays: data.calendarDays,
            currentDayIndex: data.currentDayIndex || 0,
            seasonState: data.seasonState || 'in_season',
            userTeamId: migrated.userTeamId,
            leagueType: loadedLeagueType,
            leagueStructure: loadedStructure,
            lastSavedAt: data.lastSavedAt || timeStr,
          }));
        } catch (storageErr) {
          console.error('Storage error while saving imported JSON:', storageErr);
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [updateStandings]);

  // Export single team formation (players, ratings, usage, order)
  const exportTeamFormationJson = useCallback((teamId: string): string => {
    const target = teams.find(t => t.id === teamId) || teams[0];
    return exportSingleTeamRosterJson(target);
  }, [teams]);

  // Export all teams formation
  const exportAllTeamsFormationJson = useCallback((): string => {
    return exportAllTeamsRosterJson(teams);
  }, [teams]);

  // Import team formation JSON (single team or all teams)
  const importTeamFormationJson = useCallback((jsonStr: string, targetTeamId?: string): {
    success: boolean;
    message: string;
    mode?: 'single_team' | 'all_teams';
    teamName?: string;
  } => {
    const parseResult = parseTeamRosterJson(jsonStr);
    if (!parseResult.valid) {
      return {
        success: false,
        message: parseResult.error || 'チーム編成データの解析に失敗しました。',
      };
    }

    if (parseResult.mode === 'single_team' && parseResult.team) {
      const importedTeam = parseResult.team;
      // Match target team: either targetTeamId explicitly provided, or match importedTeam.id, or match importedTeam.name, or fallback to userTeamId
      let target = teams.find(t => t.id === targetTeamId);
      if (!target && importedTeam.id) {
        target = teams.find(t => t.id === importedTeam.id);
      }
      if (!target && importedTeam.name) {
        target = teams.find(t => t.name === importedTeam.name || t.shortName === importedTeam.shortName);
      }
      if (!target) {
        target = teams.find(t => t.id === userTeamId) || teams[0];
      }

      const updated = applyRosterToTeam(target, importedTeam);
      const nextTeams = teams.map(t => t.id === updated.id ? updated : t);
      setTeams(nextTeams);

      // Persist to LocalStorage
      try {
        const now = new Date();
        const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
          teams: nextTeams,
          schedule,
          calendarDays,
          currentDayIndex,
          seasonState,
          userTeamId,
          lastSavedAt: timeStr,
        }));
        setLastSavedAt(timeStr);
      } catch (err) {
        console.error('LocalStorage error on formation import:', err);
      }

      return {
        success: true,
        message: `「${updated.name}」のチーム編成（選手 ${updated.players.length}名・能力値・起用）を正常に反映しました！`,
        mode: 'single_team',
        teamName: updated.name,
      };
    }

    if (parseResult.mode === 'all_teams' && parseResult.teams && parseResult.teams.length > 0) {
      const importedTeamsList = parseResult.teams;
      const nextTeams = teams.map((currTeam, idx) => {
        let matched = importedTeamsList.find(it => it.id === currTeam.id);
        if (!matched) {
          matched = importedTeamsList.find(it => it.name === currTeam.name || it.shortName === currTeam.shortName);
        }
        if (!matched && importedTeamsList[idx]) {
          matched = importedTeamsList[idx];
        }
        if (matched) {
          return applyRosterToTeam(currTeam, matched);
        }
        return currTeam;
      });

      setTeams(nextTeams);

      // Persist to LocalStorage
      try {
        const now = new Date();
        const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
          teams: nextTeams,
          schedule,
          calendarDays,
          currentDayIndex,
          seasonState,
          userTeamId,
          lastSavedAt: timeStr,
        }));
        setLastSavedAt(timeStr);
      } catch (err) {
        console.error('LocalStorage error on all formation import:', err);
      }

      return {
        success: true,
        message: `全${importedTeamsList.length}球団のチーム編成（選手・能力値・起用）を一括反映しました！`,
        mode: 'all_teams',
      };
    }

    return {
      success: false,
      message: 'インポート可能なチームデータが見つかりませんでした。',
    };
  }, [teams, schedule, calendarDays, currentDayIndex, seasonState, userTeamId]);

  // Start Season: AI builds best order for all 6 teams and launches pennant race
  const startSeason = useCallback(() => {
    const updatedTeams = teams.map(team => {
      const bestOrder = AIManager.generateBestOrder(team);
      return {
        ...team,
        order: bestOrder,
      };
    });

    setTeams(updatedTeams);
    setSeasonState('in_season');
    setActiveScreen('pennant');
  }, [teams]);

  // Check if all 143 games are completed across all teams
  const checkSeasonFinished = (currTeams: Team[], dayIdx: number, allDays: CalendarDay[]): boolean => {
    const allPlayed143 = currTeams.every(t => t.stats.games >= 143);
    const noMoreDays = dayIdx >= allDays.length;
    return allPlayed143 || noMoreDays;
  };

  // Simulate a single scheduled match
  const skipSingleMatch = useCallback((matchId: string) => {
    const match = schedule.find(m => m.id === matchId);
    if (!match || match.status === 'finished') return;

    const topTeam = teams.find(t => t.id === match.topTeamId);
    const bottomTeam = teams.find(t => t.id === match.bottomTeamId);
    if (!topTeam || !bottomTeam) return;

    SimulationEngine.simulateFullMatch(match, topTeam, bottomTeam, userTeamId);

    const updatedTeams = updateStandings([...teams]);
    setTeams(updatedTeams);
    setSchedule([...schedule]);
  }, [schedule, teams, userTeamId]);

  // Simulate all matches for current day and advance day
  const skipDay = useCallback(() => {
    if (seasonState === 'finished') return;
    const currentDay = calendarDays[currentDayIndex];
    if (!currentDay) return;

    const dayMatches = schedule.filter(m => currentDay.matchIds.includes(m.id) && m.status !== 'finished');

    dayMatches.forEach(match => {
      const topTeam = teams.find(t => t.id === match.topTeamId);
      const bottomTeam = teams.find(t => t.id === match.bottomTeamId);
      if (topTeam && bottomTeam) {
        SimulationEngine.simulateFullMatch(match, topTeam, bottomTeam, userTeamId);
      }
    });

    // Resting & fatigue recovery
    SimulationEngine.restPlayers(teams);
    const updatedTeams = updateStandings([...teams]);
    setTeams(updatedTeams);
    setSchedule([...schedule]);

    const nextDay = currentDayIndex + 1;
    if (nextDay < calendarDays.length && !checkSeasonFinished(updatedTeams, nextDay, calendarDays)) {
      setCurrentDayIndex(nextDay);
    } else {
      setSeasonState('finished');
    }
  }, [calendarDays, currentDayIndex, schedule, teams, seasonState, userTeamId]);

  // Advance to next day (simulates any unfinished matches for today, rests players, and moves date to tomorrow)
  const advanceToNextDay = useCallback(() => {
    skipDay();
  }, [skipDay]);

  // Skip multiple days (e.g. 7 days or 30 days)
  const skipMultipleDays = useCallback((daysCount: number) => {
    if (seasonState === 'finished') return;

    let dayIdx = currentDayIndex;
    const maxDay = Math.min(calendarDays.length, dayIdx + daysCount);

    while (dayIdx < maxDay) {
      const day = calendarDays[dayIdx];
      if (day && !day.isOffDay) {
        const matches = schedule.filter(m => day.matchIds.includes(m.id) && m.status !== 'finished');
        matches.forEach(m => {
          const top = teams.find(t => t.id === m.topTeamId);
          const btm = teams.find(t => t.id === m.bottomTeamId);
          if (top && btm) {
            SimulationEngine.simulateFullMatch(m, top, btm, userTeamId);
          }
        });
      }
      SimulationEngine.restPlayers(teams);
      dayIdx++;
      if (teams.every(t => t.stats.games >= 143)) break;
    }

    const updatedTeams = updateStandings([...teams]);
    setTeams(updatedTeams);
    setSchedule([...schedule]);
    const finalDayIdx = Math.min(dayIdx, calendarDays.length - 1);
    setCurrentDayIndex(finalDayIdx);

    if (checkSeasonFinished(updatedTeams, finalDayIdx, calendarDays)) {
      setSeasonState('finished');
    }
  }, [calendarDays, currentDayIndex, schedule, teams, seasonState, userTeamId]);

  // Skip to end of 143-game season
  const skipToEndOfSeason = useCallback(() => {
    if (seasonState === 'finished') return;

    let dayIdx = currentDayIndex;
    while (dayIdx < calendarDays.length) {
      const day = calendarDays[dayIdx];
      if (day && !day.isOffDay) {
        const matches = schedule.filter(m => day.matchIds.includes(m.id) && m.status !== 'finished');
        matches.forEach(m => {
          const top = teams.find(t => t.id === m.topTeamId);
          const btm = teams.find(t => t.id === m.bottomTeamId);
          if (top && btm) {
            SimulationEngine.simulateFullMatch(m, top, btm, userTeamId);
          }
        });
      }
      SimulationEngine.restPlayers(teams);
      dayIdx++;
      if (teams.every(t => t.stats.games >= 143)) break;
    }

    const updatedTeams = updateStandings([...teams]);
    setTeams(updatedTeams);
    setSchedule([...schedule]);
    setCurrentDayIndex(Math.min(dayIdx, calendarDays.length - 1));
    setSeasonState('finished');
    setActiveScreen('standings');
  }, [calendarDays, currentDayIndex, schedule, teams, seasonState, userTeamId]);

  // Launch Featured Match (注目試合)
  const startFeaturedMatch = useCallback((matchId: string) => {
    const match = schedule.find(m => m.id === matchId);
    if (!match || match.status === 'finished') return;

    const topTeam = teams.find(t => t.id === match.topTeamId);
    const bottomTeam = teams.find(t => t.id === match.bottomTeamId);
    if (!topTeam || !bottomTeam) return;

    const liveState = SimulationEngine.initLiveGame(match, topTeam, bottomTeam, userTeamId);
    match.status = 'live';
    setActiveLiveGame(liveState);
    setActiveScreen('match');
  }, [schedule, teams, userTeamId]);

  // Step 1 Pitch in live match
  const stepLivePitch = useCallback((command?: 'bunt' | 'steal' | 'walk') => {
    if (!activeLiveGame || activeLiveGame.isGameOver) return;
    SimulationEngine.stepPitch(activeLiveGame, command);
    setActiveLiveGame({ ...activeLiveGame });

    if (activeLiveGame.isGameOver) {
      const updatedTeams = updateStandings([...teams]);
      setTeams(updatedTeams);
      setSchedule([...schedule]);
    }
  }, [activeLiveGame, teams, schedule]);

  // Step 1 At-Bat in live match
  const stepLiveAtBat = useCallback(() => {
    if (!activeLiveGame || activeLiveGame.isGameOver) return;
    let finished = false;
    let guard = 0;
    while (!finished && !activeLiveGame.isGameOver && guard < 20) {
      const res = SimulationEngine.stepPitch(activeLiveGame);
      finished = res.isAtBatFinished;
      guard++;
    }
    setActiveLiveGame({ ...activeLiveGame });

    if (activeLiveGame.isGameOver) {
      const updatedTeams = updateStandings([...teams]);
      setTeams(updatedTeams);
      setSchedule([...schedule]);
    }
  }, [activeLiveGame, teams, schedule]);

  // Step 1 Inning in live match
  const stepLiveInning = useCallback(() => {
    if (!activeLiveGame || activeLiveGame.isGameOver) return;
    const startInning = activeLiveGame.inning;
    const startHalf = activeLiveGame.topHalf;

    let guard = 0;
    while (!activeLiveGame.isGameOver && guard < 60) {
      SimulationEngine.stepPitch(activeLiveGame);
      if (activeLiveGame.inning !== startInning || activeLiveGame.topHalf !== startHalf) {
        break;
      }
      guard++;
    }
    setActiveLiveGame({ ...activeLiveGame });

    if (activeLiveGame.isGameOver) {
      const updatedTeams = updateStandings([...teams]);
      setTeams(updatedTeams);
      setSchedule([...schedule]);
    }
  }, [activeLiveGame, teams, schedule]);

  // Finish remaining of live match
  const finishLiveGame = useCallback(() => {
    if (!activeLiveGame || activeLiveGame.isGameOver) return;
    activeLiveGame.isAutoSimulation = true;
    let guard = 0;
    while (!activeLiveGame.isGameOver && guard < 400) {
      SimulationEngine.stepPitch(activeLiveGame);
      guard++;
    }
    if (!activeLiveGame.isGameOver) {
      activeLiveGame.isGameOver = true;
      SimulationEngine.finalizeMatchStats(activeLiveGame);
    }
    setActiveLiveGame({ ...activeLiveGame });
    const updatedTeams = updateStandings([...teams]);
    setTeams(updatedTeams);
    setSchedule([...schedule]);
  }, [activeLiveGame, teams, schedule]);

  // Exit live game view back to pennant / main screen
  const exitLiveGame = useCallback(() => {
    setActiveLiveGame(null);
    setActiveScreen('pennant');
  }, []);

  // Tactical commands in live match - restricted strictly to user's team
  const tacticalPinchHitter = useCallback((teamId: string, benchPlayerId: string) => {
    if (!activeLiveGame) return;
    if (userTeamId && teamId !== userTeamId) {
      console.warn('自チーム以外の球団には監督指示（代打起用）を発令できません。');
      return;
    }
    const ok = SimulationEngine.substitutePinchHitter(activeLiveGame, teamId, benchPlayerId);
    if (ok) setActiveLiveGame({ ...activeLiveGame });
  }, [activeLiveGame, userTeamId]);

  const tacticalPinchRunner = useCallback((teamId: string, base: 'first' | 'second' | 'third', benchPlayerId: string) => {
    if (!activeLiveGame) return;
    if (userTeamId && teamId !== userTeamId) {
      console.warn('自チーム以外の球団には監督指示（代走起用）を発令できません。');
      return;
    }
    const ok = SimulationEngine.substitutePinchRunner(activeLiveGame, teamId, base, benchPlayerId);
    if (ok) setActiveLiveGame({ ...activeLiveGame });
  }, [activeLiveGame, userTeamId]);

  const tacticalPitchingChange = useCallback((teamId: string, newPitcherId: string) => {
    if (!activeLiveGame) return;
    if (userTeamId && teamId !== userTeamId) {
      console.warn('自チーム以外の球団には監督指示（投手交代）を発令できません。');
      return;
    }
    const ok = SimulationEngine.substitutePitcher(activeLiveGame, teamId, newPitcherId);
    if (ok) setActiveLiveGame({ ...activeLiveGame });
  }, [activeLiveGame, userTeamId]);

  // Update whole team
  const updateTeam = useCallback((updatedTeam: Team) => {
    setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
  }, []);

  // Update Team Order
  const updateTeamOrder = useCallback((teamId: string, newOrder: TeamOrder) => {
    setTeams(prev => prev.map(t => {
      if (t.id !== teamId) return t;
      return { ...t, order: newOrder };
    }));
  }, []);

  // Update Player in Team
  const updatePlayer = useCallback((teamId: string, updatedPlayer: Player) => {
    setTeams(prev => prev.map(t => {
      if (t.id !== teamId) return t;
      const updatedPlayers = t.players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p);
      return { ...t, players: updatedPlayers };
    }));
  }, []);

  // Add Player to Team
  const addPlayer = useCallback((teamId: string, newPlayer: Player) => {
    setTeams(prev => prev.map(t => {
      if (t.id !== teamId) return t;
      return { ...t, players: [...t.players, newPlayer] };
    }));
  }, []);

  // Delete Player from Team
  const deletePlayer = useCallback((teamId: string, playerId: string) => {
    setTeams(prev => prev.map(t => {
      if (t.id !== teamId) return t;
      const updatedPlayers = t.players.filter(p => p.id !== playerId);
      if (updatedPlayers.length === 0) return t;

      const updatedTeam = {
        ...t,
        players: updatedPlayers,
      };

      // Automatically regenerate best order for the team to guarantee valid 9-man order & rotation
      const newOrder = AIManager.generateBestOrder(updatedTeam);
      return {
        ...updatedTeam,
        order: newOrder,
      };
    }));
  }, []);

  // Generate AI Best Order for Team
  const generateAiOrderForTeam = useCallback((teamId: string) => {
    setTeams(prev => prev.map(t => {
      if (t.id !== teamId) return t;
      const bestOrder = AIManager.generateBestOrder(t);
      return { ...t, order: bestOrder };
    }));
  }, []);

  // Apply Today Recommended Lineup for Team
  const applyTodayRecommendedLineup = useCallback((teamId: string) => {
    setTeams(prev => prev.map(t => {
      if (t.id !== teamId) return t;
      const rec = AIManager.getTodayRecommendedLineup(t, 'R');
      return { ...t, order: rec };
    }));
  }, []);

  return (
    <GameContext.Provider
      value={{
        teams,
        schedule,
        calendarDays,
        currentDayIndex,
        currentDateStr,
        seasonState,
        userTeamId,
        setUserTeamId,
        activeScreen,
        setActiveScreen,
        activeLiveGame,
        selectedMatchForDetail,
        setSelectedMatchForDetail,
        lastSavedAt,
        startSeason,
        advanceToNextDay,
        skipSingleMatch,
        skipDay,
        skipMultipleDays,
        skipToEndOfSeason,
        startFeaturedMatch,
        stepLivePitch,
        stepLiveAtBat,
        stepLiveInning,
        finishLiveGame,
        exitLiveGame,
        tacticalPinchHitter,
        tacticalPinchRunner,
        tacticalPitchingChange,
        updateTeam,
        updateTeamOrder,
        updatePlayer,
        addPlayer,
        deletePlayer,
        generateAiOrderForTeam,
        applyTodayRecommendedLineup,
        leagueType,
        switchLeagueType,
        leagueStructure,
        switchLeagueStructure,
        setLeagueTeamPreset,
        addNewTeam,
        deleteTeam,
        setTeamLeague,
        regenerateFictionalLeague,
        saveGame,
        loadGame,
        resetGame,
        exportSaveJson,
        importSaveJson,
        exportTeamFormationJson,
        exportAllTeamsFormationJson,
        importTeamFormationJson,
        isResetConfirmOpen,
        setIsResetConfirmOpen,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};

import { Team, Player, Position, TeamOrder, Pitch, PitcherRole, PlayerUsagePolicy, LineupSlot } from '../types/baseball';
import { AIManager } from '../engine/aiManager';

export interface ExportedPlayerRoster {
  id: string;
  name: string;
  number: number;
  age: number;
  isPitcher: boolean;
  bats: 'R' | 'L' | 'B';
  throws: 'R' | 'L';
  mainPosition: Position;
  positionAptitudes: Record<Position, number>;

  // Batter ratings (0 - 100)
  contact: number;
  power: number;
  speed: number;
  arm: number;
  fielding: number;
  catching: number;
  eye: number;
  stealing: number;
  vsRight: number;
  vsLeft: number;

  // Pitcher ratings
  pitcherRole: PitcherRole;
  pitchVelocity: number;
  control: number;
  stamina: number;
  strikeout: number;
  hrAvoidance: number;
  pVsRight: number;
  pVsLeft: number;
  winLuck?: number;
  pitches: Pitch[];

  // Tactical usage policy (起用法)
  usagePolicy?: PlayerUsagePolicy;
}

export interface ExportedTeamRoster {
  id: string;
  name: string;
  shortName: string;
  city?: string;
  stadium?: string;
  color?: string;
  secondaryColor?: string;
  textColor?: string;
  players: ExportedPlayerRoster[];
  order: TeamOrder;
}

export interface TeamRosterFileFormat {
  format: 'npb_team_roster_v1';
  version: string;
  exportedAt: string;
  type: 'single_team' | 'all_teams';
  description: string;
  team?: ExportedTeamRoster;
  teams?: ExportedTeamRoster[];
}

/**
 * Strips season match records from player, leaving only roster, attributes, and usage
 */
export function extractPlayerRosterData(player: Player): ExportedPlayerRoster {
  return {
    id: player.id,
    name: player.name,
    number: player.number,
    age: player.age,
    isPitcher: player.isPitcher,
    bats: player.bats,
    throws: player.throws,
    mainPosition: player.mainPosition,
    positionAptitudes: { ...player.positionAptitudes },
    contact: player.contact,
    power: player.power,
    speed: player.speed,
    arm: player.arm,
    fielding: player.fielding,
    catching: player.catching,
    eye: player.eye,
    stealing: player.stealing,
    vsRight: player.vsRight,
    vsLeft: player.vsLeft,
    pitcherRole: player.pitcherRole,
    pitchVelocity: player.pitchVelocity,
    control: player.control,
    stamina: player.stamina,
    strikeout: player.strikeout,
    hrAvoidance: player.hrAvoidance,
    pVsRight: player.pVsRight,
    pVsLeft: player.pVsLeft,
    winLuck: player.winLuck ?? 50,
    pitches: player.pitches ? player.pitches.map(p => ({ ...p })) : [],
    usagePolicy: player.usagePolicy || 'normal',
  };
}

/**
 * Extracts a team's formation (players, ratings, and order)
 */
export function extractTeamRosterData(team: Team): ExportedTeamRoster {
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    city: team.city,
    stadium: team.stadium,
    color: team.color,
    secondaryColor: team.secondaryColor,
    textColor: team.textColor,
    players: team.players.map(extractPlayerRosterData),
    order: {
      battingOrder: team.order.battingOrder.map(s => ({ ...s })),
      rotation: [...team.order.rotation],
      relievers: [...team.order.relievers],
      setup: team.order.setup,
      closer: team.order.closer,
      benchBatters: [...team.order.benchBatters],
      bullpenPitchers: [...team.order.bullpenPitchers],
    },
  };
}

/**
 * Export single team formation JSON
 */
export function exportSingleTeamRosterJson(team: Team): string {
  const teamData = extractTeamRosterData(team);
  const file: TeamRosterFileFormat = {
    format: 'npb_team_roster_v1',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    type: 'single_team',
    description: `${team.name} のチーム編成（選手一覧、能力値、起用法、打順・投手起用オーダー）`,
    team: teamData,
  };
  return JSON.stringify(file, null, 2);
}

/**
 * Export all teams formation JSON
 */
export function exportAllTeamsRosterJson(teams: Team[]): string {
  const file: TeamRosterFileFormat = {
    format: 'npb_team_roster_v1',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    type: 'all_teams',
    description: '全6球団のチーム編成（選手一覧、能力値、起用法、打順・投手起用オーダー）',
    teams: teams.map(extractTeamRosterData),
  };
  return JSON.stringify(file, null, 2);
}

export interface ParseRosterResult {
  valid: boolean;
  mode: 'single_team' | 'all_teams';
  team?: ExportedTeamRoster;
  teams?: ExportedTeamRoster[];
  error?: string;
  summaryText?: string;
}

/**
 * Parses and validates any JSON string that represents team formation (single or multiple)
 */
export function parseTeamRosterJson(jsonStr: string): ParseRosterResult {
  try {
    const data = JSON.parse(jsonStr);

    // 1. Dedicated format
    if (data.format === 'npb_team_roster_v1') {
      if (data.type === 'single_team' && data.team && Array.isArray(data.team.players)) {
        return {
          valid: true,
          mode: 'single_team',
          team: data.team,
          summaryText: `「${data.team.name || 'チーム'}」の編成データ（選手 ${data.team.players.length}名）`,
        };
      }
      if (data.type === 'all_teams' && Array.isArray(data.teams) && data.teams.length > 0) {
        return {
          valid: true,
          mode: 'all_teams',
          teams: data.teams,
          summaryText: `全${data.teams.length}球団の編成データ（選手合計 ${data.teams.reduce((acc: number, t: any) => acc + (t.players?.length || 0), 0)}名）`,
        };
      }
    }

    // 2. Direct single team object with players
    if (data.players && Array.isArray(data.players) && (data.name || data.id)) {
      return {
        valid: true,
        mode: 'single_team',
        team: {
          id: data.id || 'imported_team',
          name: data.name || 'インポート球団',
          shortName: data.shortName || (data.name ? data.name.substring(0, 2) : '球団'),
          city: data.city || '',
          stadium: data.stadium || '',
          color: data.color || '#1e293b',
          secondaryColor: data.secondaryColor || '#38bdf8',
          textColor: data.textColor || '#ffffff',
          players: data.players,
          order: data.order || null,
        },
        summaryText: `「${data.name || 'チーム'}」の編成データ（選手 ${data.players.length}名）`,
      };
    }

    // 3. Direct array of teams
    if (Array.isArray(data) && data.length > 0 && data[0].players && Array.isArray(data[0].players)) {
      return {
        valid: true,
        mode: 'all_teams',
        teams: data,
        summaryText: `${data.length}球団の編成データ`,
      };
    }

    // 4. Fallback: Full save data where user wants to import teams
    if (data.teams && Array.isArray(data.teams) && data.teams.length > 0 && data.teams[0].players) {
      return {
        valid: true,
        mode: 'all_teams',
        teams: data.teams.map(extractTeamRosterData),
        summaryText: `セーブデータから${data.teams.length}球団の編成を抽出（選手・能力・起用のみ反映）`,
      };
    }

    return {
      valid: false,
      mode: 'single_team',
      error: '有効なチーム編成JSONデータが見つかりませんでした。選手一覧（players）が含まれているか確認してください。',
    };
  } catch (err: any) {
    return {
      valid: false,
      mode: 'single_team',
      error: `JSONの構文解析に失敗しました: ${err?.message || 'フォーマットが無効です'}`,
    };
  }
}

const DEFAULT_APTITUDES: Record<Position, number> = {
  P: 0,
  C: 10,
  '1B': 30,
  '2B': 30,
  '3B': 30,
  SS: 30,
  LF: 30,
  CF: 30,
  RF: 30,
  DH: 70,
};

const DEFAULT_PITCH: Pitch = {
  id: 'fastball',
  name: 'ストレート',
  velocity: 145,
  breakAmount: 10,
  ballPower: 65,
  control: 65,
};

/**
 * Validates and converts an imported player into a complete runtime Player
 */
export function sanitizePlayer(
  raw: Partial<ExportedPlayerRoster> & { [key: string]: any },
  teamId: string,
  existingPlayer?: Player
): Player {
  const isP = Boolean(raw.isPitcher);
  const mainPos: Position = raw.mainPosition || (isP ? 'P' : '1B');

  const defaultPositionAptitudes: Record<Position, number> = {
    ...DEFAULT_APTITUDES,
    [mainPos]: 85,
    ...(raw.positionAptitudes || {}),
  };

  const pitches: Pitch[] = Array.isArray(raw.pitches) && raw.pitches.length > 0
    ? raw.pitches.map((p: any, idx: number) => ({
        id: p.id || `pitch_${idx}`,
        name: p.name || 'ストレート',
        velocity: typeof p.velocity === 'number' ? p.velocity : 142,
        breakAmount: typeof p.breakAmount === 'number' ? p.breakAmount : 50,
        ballPower: typeof p.ballPower === 'number' ? p.ballPower : 50,
        control: typeof p.control === 'number' ? p.control : 50,
      }))
    : isP ? [DEFAULT_PITCH] : [];

  return {
    id: raw.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    teamId,
    name: raw.name || (isP ? '新規投手' : '新規野手'),
    number: typeof raw.number === 'number' ? raw.number : Math.floor(Math.random() * 90) + 1,
    age: typeof raw.age === 'number' ? raw.age : 24,
    isPitcher: isP,
    bats: (raw.bats === 'L' || raw.bats === 'B') ? raw.bats : 'R',
    throws: raw.throws === 'L' ? 'L' : 'R',
    mainPosition: mainPos,
    positionAptitudes: defaultPositionAptitudes,

    // Batter ratings
    contact: typeof raw.contact === 'number' ? raw.contact : 60,
    power: typeof raw.power === 'number' ? raw.power : 60,
    speed: typeof raw.speed === 'number' ? raw.speed : 60,
    arm: typeof raw.arm === 'number' ? raw.arm : 60,
    fielding: typeof raw.fielding === 'number' ? raw.fielding : 60,
    catching: typeof raw.catching === 'number' ? raw.catching : 60,
    eye: typeof raw.eye === 'number' ? raw.eye : 60,
    stealing: typeof raw.stealing === 'number' ? raw.stealing : 60,
    vsRight: typeof raw.vsRight === 'number' ? raw.vsRight : 60,
    vsLeft: typeof raw.vsLeft === 'number' ? raw.vsLeft : 60,

    // Pitcher ratings
    pitcherRole: raw.pitcherRole || (isP ? 'starter' : 'starter'),
    pitchVelocity: typeof raw.pitchVelocity === 'number' ? raw.pitchVelocity : (isP ? 144 : 130),
    control: typeof raw.control === 'number' ? raw.control : 60,
    stamina: typeof raw.stamina === 'number' ? raw.stamina : 60,
    strikeout: typeof raw.strikeout === 'number' ? raw.strikeout : 60,
    hrAvoidance: typeof raw.hrAvoidance === 'number' ? raw.hrAvoidance : 60,
    pVsRight: typeof raw.pVsRight === 'number' ? raw.pVsRight : 60,
    pVsLeft: typeof raw.pVsLeft === 'number' ? raw.pVsLeft : 60,
    winLuck: typeof raw.winLuck === 'number' ? raw.winLuck : (isP ? 50 : 50),
    pitches,

    // Tactical policy
    usagePolicy: raw.usagePolicy || 'normal',

    // Runtime state (preserve if existing or initialize clean)
    condition: existingPlayer?.condition || '普通',
    fatigue: existingPlayer ? existingPlayer.fatigue : 0,
    recentForm: existingPlayer ? existingPlayer.recentForm : [],

    // Stats: if player already existed in the team, preserve cumulative pennant stats
    batterStats: existingPlayer?.batterStats || {
      games: 0,
      pa: 0,
      ab: 0,
      runs: 0,
      hits: 0,
      doubles: 0,
      triples: 0,
      hr: 0,
      rbi: 0,
      bb: 0,
      so: 0,
      sb: 0,
      cs: 0,
      sh: 0,
      sf: 0,
      avg: 0,
      obp: 0,
      slg: 0,
      ops: 0,
    },
    pitcherStats: existingPlayer?.pitcherStats || {
      games: 0,
      gamesStarted: 0,
      completeGames: 0,
      shutouts: 0,
      wins: 0,
      losses: 0,
      saves: 0,
      holds: 0,
      ip: 0,
      ipOuts: 0,
      hits: 0,
      hr: 0,
      bb: 0,
      so: 0,
      runs: 0,
      er: 0,
      era: 0,
      whip: 0,
    },
  };
}

/**
 * Sanitizes and validates a team order so that all player IDs exist and lineup is complete
 */
export function sanitizeTeamOrder(players: Player[], importedOrder?: Partial<TeamOrder> | null): TeamOrder {
  const playerIds = new Set(players.map(p => p.id));
  const pitchers = players.filter(p => p.isPitcher);
  const batters = players.filter(p => !p.isPitcher);

  // If order is missing or invalid, generate best order
  if (!importedOrder || !Array.isArray(importedOrder.battingOrder) || importedOrder.battingOrder.length < 9) {
    const dummyTeam: Team = {
      id: 'temp',
      name: '',
      shortName: '',
      city: '',
      stadium: '',
      color: '',
      secondaryColor: '',
      textColor: '',
      players,
      order: {} as any,
      stats: {} as any,
    };
    return AIManager.generateBestOrder(dummyTeam);
  }

  // Validate batting order slots
  const validBattingSlots: LineupSlot[] = [];
  const usedBatterIds = new Set<string>();

  for (let i = 0; i < 9; i++) {
    const slot = importedOrder.battingOrder[i];
    if (slot && playerIds.has(slot.playerId) && !usedBatterIds.has(slot.playerId)) {
      validBattingSlots.push({
        order: i + 1,
        playerId: slot.playerId,
        position: slot.position || 'DH',
      });
      usedBatterIds.add(slot.playerId);
    } else {
      // Find unused batter
      const availableBatter = batters.find(b => !usedBatterIds.has(b.id)) || players.find(p => !usedBatterIds.has(p.id));
      if (availableBatter) {
        validBattingSlots.push({
          order: i + 1,
          playerId: availableBatter.id,
          position: availableBatter.mainPosition === 'P' ? 'DH' : availableBatter.mainPosition,
        });
        usedBatterIds.add(availableBatter.id);
      }
    }
  }

  // Validate Rotation (6 pitchers)
  const rotation: string[] = [];
  const usedPitcherIds = new Set<string>();

  if (Array.isArray(importedOrder.rotation)) {
    for (const pid of importedOrder.rotation) {
      if (playerIds.has(pid) && !usedPitcherIds.has(pid)) {
        rotation.push(pid);
        usedPitcherIds.add(pid);
        if (rotation.length === 6) break;
      }
    }
  }
  // Fill rotation if less than 6
  for (const p of pitchers) {
    if (rotation.length >= 6) break;
    if (!usedPitcherIds.has(p.id)) {
      rotation.push(p.id);
      usedPitcherIds.add(p.id);
    }
  }

  // Closer
  let closer = importedOrder.closer && playerIds.has(importedOrder.closer)
    ? importedOrder.closer
    : pitchers.find(p => !usedPitcherIds.has(p.id))?.id || pitchers[0]?.id || '';
  usedPitcherIds.add(closer);

  // Setup
  let setup = importedOrder.setup && playerIds.has(importedOrder.setup) && importedOrder.setup !== closer
    ? importedOrder.setup
    : pitchers.find(p => !usedPitcherIds.has(p.id))?.id || pitchers[1]?.id || pitchers[0]?.id || '';
  usedPitcherIds.add(setup);

  // Relievers
  const relievers: string[] = [];
  if (Array.isArray(importedOrder.relievers)) {
    for (const pid of importedOrder.relievers) {
      if (playerIds.has(pid) && !usedPitcherIds.has(pid)) {
        relievers.push(pid);
        usedPitcherIds.add(pid);
      }
    }
  }
  for (const p of pitchers) {
    if (relievers.length >= 4) break;
    if (!usedPitcherIds.has(p.id)) {
      relievers.push(p.id);
      usedPitcherIds.add(p.id);
    }
  }

  // Bench Batters
  const startingBatterIds = new Set(validBattingSlots.map(s => s.playerId));
  const benchBatters = batters.filter(b => !startingBatterIds.has(b.id)).map(b => b.id);

  // Bullpen Pitchers
  const allActivePitcherIds = new Set([...rotation, ...relievers, setup, closer]);
  const bullpenPitchers = pitchers.filter(p => !allActivePitcherIds.has(p.id)).map(p => p.id);

  return {
    battingOrder: validBattingSlots,
    rotation,
    relievers,
    setup,
    closer,
    benchBatters,
    bullpenPitchers,
  };
}

/**
 * Applies imported formation into a target team, preserving team stats and match records
 */
export function applyRosterToTeam(targetTeam: Team, imported: ExportedTeamRoster): Team {
  const existingPlayerMap = new Map(targetTeam.players.map(p => [p.id, p]));
  const existingNameMap = new Map(targetTeam.players.map(p => [p.name, p]));

  const sanitizedPlayers = imported.players.map(raw => {
    const match = existingPlayerMap.get(raw.id) || existingNameMap.get(raw.name);
    return sanitizePlayer(raw, targetTeam.id, match);
  });

  const sanitizedOrder = sanitizeTeamOrder(sanitizedPlayers, imported.order);

  return {
    ...targetTeam,
    // Keep team details if imported has them
    name: imported.name || targetTeam.name,
    shortName: imported.shortName || targetTeam.shortName,
    city: imported.city || targetTeam.city,
    stadium: imported.stadium || targetTeam.stadium,
    color: imported.color || targetTeam.color,
    secondaryColor: imported.secondaryColor || targetTeam.secondaryColor,
    textColor: imported.textColor || targetTeam.textColor,
    players: sanitizedPlayers,
    order: sanitizedOrder,
    // Keep pennant stats strictly untouched!
    stats: targetTeam.stats,
  };
}

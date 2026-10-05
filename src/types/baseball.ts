export type Hand = 'R' | 'L';
export type BatHand = 'R' | 'L' | 'B';

export type Position = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH';

export type PitcherRole = 'starter' | 'reliever' | 'closer';

export type Condition = '絶好調' | '好調' | '普通' | '不調' | '絶不調';

// 先発投手の起用法
export type StarterUsagePolicy =
  | 'normal'        // 通常（おまかせ）: 5〜6回・約95球で状況に応じ継投
  | 'complete'      // 完投狙い: 9回最後まで極力投げ切る（大炎上時を除く）
  | 'stamina_15'    // スタミナ残り15%まで: スタミナ残量が15%になるまで限界投球
  | 'win_rights';   // 勝利投手の権利で交代: 5回を投げリードしていれば即交代

// 救援投手の起用法
export type RelieverUsagePolicy =
  | 'normal'            // 通常（おまかせ）: 標準的な継投
  | 'winning_formula'   // 勝利の方程式: 終盤リード時（7〜9回）に優先登板
  | 'behind'            // ビハインド時: 劣勢時・点差がついた場面で登板
  | 'long_relief';      // ロングリリーフ: 序盤の先発降板時などに複数イニング登板

// 野手・打者の起用法
export type BatterUsagePolicy =
  | 'normal'        // 通常: 状況に応じた標準起用
  | 'full_game'     // フル出場: 代打や代走を出さず最後までフル出場
  | 'pinch_hitter'  // 代打要員: 終盤の好機・勝負所に代打の切り札として優先起用
  | 'pinch_runner'  // 代走要員: 終盤の接戦で足のスペシャリストとして代走起用
  | 'defensive_sub';// 守備要員: 終盤リード時の守備固めとして起用

export type PlayerUsagePolicy = StarterUsagePolicy | RelieverUsagePolicy | BatterUsagePolicy;

export const STARTER_POLICY_OPTIONS: { value: StarterUsagePolicy; label: string; desc: string }[] = [
  { value: 'normal', label: '通常（おまかせ）', desc: '5〜6回・約95球を目安に標準継投' },
  { value: 'complete', label: '完投狙い', desc: '9回最後まで極力投げ切る（大炎上時除く）' },
  { value: 'stamina_15', label: 'スタミナ残り15%まで', desc: 'スタミナ残量が15%になるまで限界投球' },
  { value: 'win_rights', label: '勝利投手の権利で交代', desc: '5回を投げリードしていれば即交代' },
];

export const RELIEVER_POLICY_OPTIONS: { value: RelieverUsagePolicy; label: string; desc: string }[] = [
  { value: 'normal', label: '通常（おまかせ）', desc: '標準的な継投' },
  { value: 'winning_formula', label: '勝利の方程式', desc: '終盤リード時に優先登板' },
  { value: 'behind', label: 'ビハインド時', desc: '劣勢・敗戦処理で登板' },
  { value: 'long_relief', label: 'ロングリリーフ', desc: '先発早期降板時などに複数回登板' },
];

export const BATTER_POLICY_OPTIONS: { value: BatterUsagePolicy; label: string; desc: string }[] = [
  { value: 'normal', label: '通常', desc: '標準的な起用' },
  { value: 'full_game', label: 'フル出場', desc: '代打・代走を出さず最後までフル出場' },
  { value: 'pinch_hitter', label: '代打要員', desc: '終盤の勝負所に代打の切り札として起用' },
  { value: 'pinch_runner', label: '代走要員', desc: '終盤の接戦で足のスペシャリストとして起用' },
  { value: 'defensive_sub', label: '守備要員', desc: '終盤リード時の守備固めとして出場' },
];

export interface Pitch {
  id: string;
  name: string; // ストレート, スライダー, フォーク, カーブ, チェンジアップ, ツーシーム, カットボール, スプリット, シンカー, シュート
  velocity: number; // km/h (e.g. 120 - 162)
  breakAmount: number; // 0 - 100 (変化量)
  ballPower: number; // 0 - 100 (球威)
  control: number; // 0 - 100 (制球)
}

export interface BatterStats {
  games: number; // 試合 (max 143)
  pa: number; // 打席 (Plate Appearances)
  ab: number; // 打数 (At Bats)
  runs: number; // 得点
  hits: number; // 安打
  doubles: number; // 二塁打
  triples: number; // 三塁打
  hr: number; // 本塁打
  rbi: number; // 打点
  bb: number; // 四球
  so: number; // 三振
  sb: number; // 盗塁
  cs: number; // 盗塁死
  sh: number; // 犠打
  sf: number; // 犠飛
  avg: number; // 打率
  obp: number; // 出塁率
  slg: number; // 長打率
  ops: number; // OPS
}

export interface PitcherStats {
  games: number; // 登板 (max 143)
  gamesStarted: number; // 先発
  completeGames: number; // 完投
  shutouts: number; // 完封
  wins: number; // 勝利
  losses: number; // 敗戦
  saves: number; // セーブ
  holds: number; // ホールド
  ip: number; // 投球回 (innings pitched: integer + 0.1 for 1/3, 0.2 for 2/3)
  ipOuts: number; // アウト換算数 (1 out = 1)
  hits: number; // 被安打
  hr: number; // 被本塁打
  bb: number; // 与四球
  so: number; // 奪三振
  runs: number; // 失点
  er: number; // 自責点
  era: number; // 防御率
  whip: number; // WHIP
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: number;
  age: number;
  isPitcher: boolean;
  
  // Handedness
  bats: BatHand;
  throws: Hand;
  
  // Primary position & aptitude
  mainPosition: Position;
  positionAptitudes: Record<Position, number>; // 0 - 100

  // Batter ratings (0 - 100)
  contact: number; // ミート
  power: number; // パワー
  speed: number; // 走力
  arm: number; // 肩力
  fielding: number; // 守備力
  catching: number; // 捕球
  eye: number; // 選球眼
  stealing: number; // 盗塁能力
  vsRight: number; // 対右投手
  vsLeft: number; // 対左投手

  // Pitcher ratings (0 - 100 & km/h)
  pitcherRole: PitcherRole;
  pitchVelocity: number; // 球速 (km/h) 130 - 165
  control: number; // コントロール 0 - 100
  stamina: number; // スタミナ 0 - 100
  strikeout: number; // 奪三振能力 0 - 100
  hrAvoidance: number; // 被本塁打抑制 (高いほど打たれにくい) 0 - 100
  pVsRight: number; // 対右打者 0 - 100
  pVsLeft: number; // 対左打者 0 - 100
  winLuck?: number; // 勝ち運 0 - 100 (50で平均的・5勝水準。高いほど味方打線の援護点や勝負運に恵まれる)
  pitches: Pitch[]; // 球種リスト

  // In-season dynamic status
  condition: Condition;
  fatigue: number; // 疲労度 0 - 100 (0=元気, 100=限界)
  recentForm: number[]; // 最近数試合の評価 (-3 to +3)

  // Cumulative Season stats
  batterStats: BatterStats;
  pitcherStats: PitcherStats;

  // Individual usage policy (起用法)
  usagePolicy?: PlayerUsagePolicy;
}

export interface LineupSlot {
  order: number; // 1 - 9
  playerId: string;
  position: Position;
}

export interface TeamOrder {
  battingOrder: LineupSlot[]; // 9 slots
  rotation: string[]; // 6 starting pitcher IDs in rotation order
  relievers: string[]; // 3-4 middle reliever IDs
  setup: string; // 8th inning setup pitcher ID
  closer: string; // 9th inning closer pitcher ID
  benchBatters: string[]; // remaining batter IDs
  bullpenPitchers: string[]; // remaining pitcher IDs
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  city: string;
  stadium: string;
  color: string; // Primary hex color
  secondaryColor: string; // Accent color
  textColor: string;
  leagueId?: string; // e.g. 'royal' | 'kingdom' or 'league_a' | 'league_b'
  leagueName?: string; // e.g. 'ロイヤルリーグ' | 'キングダムリーグ'
  players: Player[];
  order: TeamOrder;
  stats: {
    games: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    gamesBehind: number;
    runsScored: number;
    runsAllowed: number;
    runDiff: number;
    streak: string; // e.g. "W3", "L1"
    rank: number;
    magicNumber?: number | null; // e.g. 5, or null if no magic
    isChampion?: boolean; // true if championship is clinched (優勝決定)
  };
}

export interface MatchScoreboard {
  topTeamId: string; // Away team
  bottomTeamId: string; // Home team
  topScores: (number | null)[]; // by inning
  bottomScores: (number | null)[];
  topTotalRuns: number;
  bottomTotalRuns: number;
  topTotalHits: number;
  bottomTotalHits: number;
  topTotalErrors: number;
  bottomTotalErrors: number;
}

export interface RunnerState {
  first: Player | null;
  second: Player | null;
  third: Player | null;
}

export interface MatchPitchLog {
  pitchNumber: number;
  pitchType: string;
  velocity: number;
  result: 'ball' | 'called_strike' | 'swinging_strike' | 'foul' | 'in_play';
  description: string;
}

export interface MatchPlayLog {
  id: string;
  inning: number;
  topHalf: boolean;
  batterName: string;
  pitcherName: string;
  count: string;
  result: string;
  description: string;
  runsScored: number;
  isOut: boolean;
}

export interface MatchBoxScorePlayer {
  playerId: string;
  name: string;
  pos: Position;
  ab: number;
  r: number;
  h: number;
  rbi: number;
  bb: number;
  so: number;
  hr: number;
}

export interface MatchBoxScorePitcher {
  playerId: string;
  name: string;
  ipOuts: number;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  decision?: 'win' | 'loss' | 'save' | 'hold';
}

export interface ScheduledMatch {
  id: string;
  dayIndex: number;
  dateStr: string; // e.g. "2026/04/03"
  topTeamId: string; // Away
  bottomTeamId: string; // Home
  leagueId?: string; // e.g. 'royal' | 'kingdom' or 'league_a' | 'league_b'
  status: 'scheduled' | 'live' | 'finished';
  topScore?: number;
  bottomScore?: number;
  topHits?: number;
  bottomHits?: number;
  topErrors?: number;
  bottomErrors?: number;
  winningPitcherName?: string;
  losingPitcherName?: string;
  savePitcherName?: string;
  homeRuns?: string[]; // e.g. "山田 1号 (3回ソロ)"
  boxScoreTop?: MatchBoxScorePlayer[];
  boxScoreBottom?: MatchBoxScorePlayer[];
  boxScorePitchersTop?: MatchBoxScorePitcher[];
  boxScorePitchersBottom?: MatchBoxScorePitcher[];
  inningsTop?: (number | null)[];
  inningsBottom?: (number | null)[];
}

export interface CalendarDay {
  dayIndex: number; // 0 - 160+
  dateStr: string;
  isOffDay: boolean;
  matchIds: string[];
}

export type ActiveScreen = 
  | 'home' 
  | 'pennant' 
  | 'match' 
  | 'standings' 
  | 'stats' 
  | 'team' 
  | 'lineup' 
  | 'editor' 
  | 'saveLoad';

export type LeagueType = 'mpb' | 'fictional';

export type LeagueStructure = 'single' | 'two_league';

export interface LeagueDivision {
  id: string;
  name: string;
  shortName: string;
}

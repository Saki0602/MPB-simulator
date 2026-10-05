import { Team, Player, Position, Pitch, PitcherRole, BatHand, Hand, BatterStats, PitcherStats, LeagueStructure } from '../types/baseball';
import { AIManager } from './aiManager';

const emptyBatterStats = (): BatterStats => ({
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
});

const emptyPitcherStats = (): PitcherStats => ({
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
});

// Authentic Japanese Surnames
const JAPANESE_LAST_NAMES = [
  '佐藤', '鈴木', '高橋', '田中', '渡辺', '伊藤', '山本', '中村', '小林', '加藤',
  '吉田', '山田', '佐々木', '山口', '斉藤', '松本', '井上', '木村', '林', '清水',
  '山崎', '池田', '橋本', '阿部', '石川', '山下', '中島', '小川', '前田', '岡田',
  '長谷川', '藤田', '後藤', '近藤', '村上', '遠藤', '青木', '坂本', '福田', '太田',
  '西村', '藤井', '岡本', '藤原', '三浦', '中川', '中野', '原田', '竹内', '小野',
  '田村', '金子', '和田', '中山', '石田', '上田', '森田', '原', '柴田', '酒井',
  '工藤', '横山', '宮崎', '宮本', '内田', '高木', '安藤', '谷口', '大野', '高田',
  '丸山', '菅原', '武田', '杉山', '増田', '小山', '大塚', '平野', '千葉', '久保',
  '松井', '岩崎', '桜井', '野口', '松田', '菊池', '飯田', '吉川', '渡部', '本田',
  '菅野', '西田', '荒木', '水野', '福島', '森', '大島', '秋山', '浅野', '神谷',
  '黒田', '桑原', '瀬戸', '立花', '堂上', '成瀬', '野村', '服部', '早川', '堀',
  '真壁', '三宅', '望月', '八木', '矢野', '吉岡', '米田', '若林', '奥村', '栗原'
];

// Authentic Japanese First Names
const JAPANESE_FIRST_NAMES = [
  '翔太', '蓮', '悠真', '大翔', '陽翔', '颯太', '陸', '樹', '翼', '陽太',
  '大和', '悠人', '拓海', '優斗', '湊', '誠', '健太', '康平', '隼人', '亮太',
  '達也', '俊介', '直樹', '翔平', '大輝', '祐介', '慎吾', '哲也', '健一', '雄大',
  '晃', '健二', '剛', '龍之介', '蒼空', '朝陽', '晴樹', '圭吾', '仁', '涼平',
  '宗介', '航平', '涼介', '翔吾', '匠', '亮', '潤', '慶太', '悠生', '智也',
  '勇気', '雄介', '健司', '賢人', '悠樹', '駿', '健太郎', '裕太', '光希', '悠貴',
  '翔也', '雅人', '宏樹', '昌平', '竜也', '俊也', '孝之', '拓也', '修平', '圭介',
  '正樹', '大樹', '和也', '秀樹', '優樹', '貴大', '広大', '大地', '裕樹', '将大',
  '修一', '勝己', '浩二', '健三', '栄治', '宗一郎', '正志', '敦史', '博之', '啓介'
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function randomStat(mean: number, deviation: number, min = 30, max = 99): number {
  const norm = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  return clamp(Math.round(mean + norm * deviation), min, max);
}

export interface FictionalTeamConfig {
  id: string;
  name: string;
  shortName: string;
  city: string;
  stadium: string;
  color: string;
  secondaryColor: string;
  textColor: string;
  theme: string;
  leagueId?: string; // 'league_a' | 'league_b' | 'central' | 'pacific'
  leagueName?: string;
}

export const FICTIONAL_TEAMS_CONFIG: FictionalTeamConfig[] = [
  // --- リーグA (6球団) ---
  {
    id: 'sapporo',
    name: '北海道ノーザンフォックス',
    shortName: '札幌',
    city: '北海道札幌市',
    stadium: '札幌ノーススノードーム',
    color: '#0284c7',
    secondaryColor: '#e0f2fe',
    textColor: '#ffffff',
    theme: '雪原を駆ける白銀の北狐。堅牢な守備力と機動力を誇る北の雄。',
    leagueId: 'league_a',
    leagueName: 'アルファ・リーグ',
  },
  {
    id: 'sendai_p',
    name: '仙台エターナルフェニックス',
    shortName: '仙台',
    city: '宮城県仙台市',
    stadium: '杜の都フェニックスパーク',
    color: '#b91c1c',
    secondaryColor: '#f59e0b',
    textColor: '#ffffff',
    theme: '杜の都で羽ばたく不死鳥。強力な中軸打線と粘り強い継投が持ち味。',
    leagueId: 'league_a',
    leagueName: 'アルファ・リーグ',
  },
  {
    id: 'tokyo_b',
    name: '東京ベイビースト',
    shortName: '東京B',
    city: '東京都江東区',
    stadium: '東京ウォーターフロントドーム',
    color: '#4338ca',
    secondaryColor: '#06b6d4',
    textColor: '#ffffff',
    theme: '大都会の湾岸に集う猛獣軍団。最先端のデータ分析と圧倒的パワーヒッティング。',
    leagueId: 'league_a',
    leagueName: 'アルファ・リーグ',
  },
  {
    id: 'nagoya_g',
    name: '名古屋ゴールドドラゴンズ',
    shortName: '名古屋G',
    city: '愛知県名古屋市',
    stadium: '尾張ゴールドドーム',
    color: '#d97706',
    secondaryColor: '#1e293b',
    textColor: '#ffffff',
    theme: '尾張の金鯱魂を受け継ぐ黄金竜。鉄壁の投手陣と勝負強いクラッチヒッター揃い。',
    leagueId: 'league_a',
    leagueName: 'アルファ・リーグ',
  },
  {
    id: 'naniwa',
    name: '浪速サンダーボルト',
    shortName: '浪速',
    city: '大阪府大阪市',
    stadium: 'なにわ電撃ボールパーク',
    color: '#eab308',
    secondaryColor: '#09090b',
    textColor: '#000000',
    theme: '電光石火の攻撃野球を標榜する浪速の雷神。打ち勝つビッグイニング野球。',
    leagueId: 'league_a',
    leagueName: 'アルファ・リーグ',
  },
  {
    id: 'hakata',
    name: '博多オーシャンパイレーツ',
    shortName: '博多',
    city: '福岡県福岡市',
    stadium: '博多シーサイドドーム',
    color: '#059669',
    secondaryColor: '#0284c7',
    textColor: '#ffffff',
    theme: '玄界灘の荒波を越える海洋海賊。剛速球投手陣と積極果敢な走塁野球。',
    leagueId: 'league_a',
    leagueName: 'アルファ・リーグ',
  },

  // --- リーグB (6球団) ---
  {
    id: 'niigata',
    name: '新潟スノークレインズ',
    shortName: '新潟',
    city: '新潟県新潟市',
    stadium: '越後スノーボールパーク',
    color: '#0284c7',
    secondaryColor: '#f8fafc',
    textColor: '#ffffff',
    theme: '白銀の日本海を舞う白鶴軍団。切れ味鋭い変化球と巧みな小技野球。',
    leagueId: 'league_b',
    leagueName: 'ベータ・リーグ',
  },
  {
    id: 'yokohama_f',
    name: '横浜ネオマリナーズ',
    shortName: '横濱M',
    city: '神奈川県横浜市',
    stadium: 'ヨコハマ・ベイサイドスタジアム',
    color: '#1e3a8a',
    secondaryColor: '#f97316',
    textColor: '#ffffff',
    theme: '国際港都の潮風を背負う水夫たち。長打力と強力リリーフ陣のハイブリッド。',
    leagueId: 'league_b',
    leagueName: 'ベータ・リーグ',
  },
  {
    id: 'shizuoka',
    name: '静岡マウントフジサンズ',
    shortName: '静岡',
    city: '静岡県静岡市',
    stadium: '富士山麓グリーンスタジアム',
    color: '#2563eb',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    theme: '日本一の霊峰・富士を仰ぐ名門。安定した先発投手王国と堅実な守備。',
    leagueId: 'league_b',
    leagueName: 'ベータ・リーグ',
  },
  {
    id: 'kyoto',
    name: '京都ミヤコフェニックス',
    shortName: '京都',
    city: '京都府京都市',
    stadium: '古都みやこボールパーク',
    color: '#7c3aed',
    secondaryColor: '#f59e0b',
    textColor: '#ffffff',
    theme: '千年の都が誇る雅なる紫の不死鳥。緻密な頭脳戦と卓越した配球術。',
    leagueId: 'league_b',
    leagueName: 'ベータ・リーグ',
  },
  {
    id: 'setouchi',
    name: '瀬戸内アイランドセーラーズ',
    shortName: '瀬戸内',
    city: '広島県福山市',
    stadium: '瀬戸内オリーブスタジアム',
    color: '#0d9488',
    secondaryColor: '#84cc16',
    textColor: '#ffffff',
    theme: '穏やかな内海を渡る水軍軍団。出塁率重視の選球眼と機動力の嵐。',
    leagueId: 'league_b',
    leagueName: 'ベータ・リーグ',
  },
  {
    id: 'okinawa',
    name: '琉球サンシャインズ',
    shortName: '琉球',
    city: '沖縄県那覇市',
    stadium: 'めんそーれ南国スタジアム',
    color: '#dc2626',
    secondaryColor: '#fbbf24',
    textColor: '#ffffff',
    theme: '常夏の太陽の下で躍動する熱風軍団。陽気なパワーヒッティングと豪腕揃い。',
    leagueId: 'league_b',
    leagueName: 'ベータ・リーグ',
  },
];

function generatePitchArsenal(pitchVelocity: number, role: PitcherRole, isStarter: boolean): Pitch[] {
  const breakingPitchPool = [
    { name: 'スライダー', velOffset: -14, breakMean: 68 },
    { name: 'フォーク', velOffset: -16, breakMean: 66 },
    { name: 'カットボール', velOffset: -7, breakMean: 55 },
    { name: 'カーブ', velOffset: -24, breakMean: 72 },
    { name: 'チェンジアップ', velOffset: -18, breakMean: 62 },
    { name: 'ツーシーム', velOffset: -5, breakMean: 50 },
    { name: 'スプリット', velOffset: -12, breakMean: 65 },
    { name: 'シンカー', velOffset: -15, breakMean: 64 },
  ];

  const shuffled = [...breakingPitchPool].sort(() => Math.random() - 0.5);
  const numPitches = isStarter ? randomBetween(3, 5) : randomBetween(2, 4);

  const pitches: Pitch[] = [];
  pitches.push({
    id: `pitch_${Date.now()}_0`,
    name: 'ストレート',
    velocity: pitchVelocity,
    breakAmount: randomStat(30, 8, 15, 45),
    ballPower: randomStat(70, 10, 50, 95),
    control: randomStat(68, 10, 45, 90),
  });

  for (let i = 0; i < numPitches - 1; i++) {
    const template = shuffled[i];
    pitches.push({
      id: `pitch_${Date.now()}_${i + 1}`,
      name: template.name,
      velocity: clamp(pitchVelocity + template.velOffset + randomBetween(-3, 3), 105, 155),
      breakAmount: randomStat(template.breakMean, 12, 40, 95),
      ballPower: randomStat(65, 10, 45, 90),
      control: randomStat(64, 10, 45, 88),
    });
  }

  return pitches;
}

/**
 * Generates an entire realistic fictional team with 30 players:
 * - 14 Pitchers (6 Starters, 1 Setup, 1 Closer, 6 Relievers/Bullpen)
 * - 16 Position Players (3 Catchers, 6 Infielders, 7 Outfielders)
 */
export function generateSingleFictionalTeam(config: FictionalTeamConfig): Team {
  const players: Player[] = [];
  const usedNames = new Set<string>();
  const usedNumbers = new Set<number>();

  const getUniqueName = () => {
    let attempts = 0;
    while (attempts < 200) {
      const name = `${pickRandom(JAPANESE_LAST_NAMES)} ${pickRandom(JAPANESE_FIRST_NAMES)}`;
      if (!usedNames.has(name)) {
        usedNames.add(name);
        return name;
      }
      attempts++;
    }
    return `架空選手 ${players.length + 1}`;
  };

  const getUniqueNumber = (preferredRange: [number, number]) => {
    for (let tries = 0; tries < 40; tries++) {
      const num = randomBetween(preferredRange[0], preferredRange[1]);
      if (!usedNumbers.has(num)) {
        usedNumbers.add(num);
        return num;
      }
    }
    for (let num = 1; num <= 99; num++) {
      if (!usedNumbers.has(num)) {
        usedNumbers.add(num);
        return num;
      }
    }
    return Math.floor(Math.random() * 90) + 10;
  };

  // --- 1. PITCHERS (14 Pitchers total: 6 starters, 1 setup, 1 closer, 6 relievers) ---
  // Starter #1: ACE
  {
    const vel = randomStat(153, 3, 148, 160);
    const winLuck = randomStat(68, 8, 55, 85);
    players.push({
      id: `${config.id}_p_ace`,
      teamId: config.id,
      name: getUniqueName(),
      number: getUniqueNumber([11, 19]),
      age: randomBetween(24, 30),
      isPitcher: true,
      bats: pickRandom(['R', 'L', 'R']),
      throws: Math.random() < 0.75 ? 'R' : 'L',
      mainPosition: 'P',
      positionAptitudes: { P: 95, C: 10, '1B': 30, '2B': 20, '3B': 20, SS: 20, LF: 30, CF: 30, RF: 30, DH: 50 },
      contact: 30, power: 25, speed: 45, arm: 80, fielding: 70, catching: 65, eye: 35, stealing: 20, vsRight: 65, vsLeft: 65,
      pitcherRole: 'starter',
      pitchVelocity: vel,
      control: randomStat(76, 6, 65, 88),
      stamina: randomStat(84, 5, 74, 94),
      strikeout: randomStat(80, 7, 68, 94),
      hrAvoidance: randomStat(74, 6, 60, 86),
      pVsRight: randomStat(72, 8, 55, 88),
      pVsLeft: randomStat(70, 8, 55, 88),
      winLuck,
      pitches: generatePitchArsenal(vel, 'starter', true),
      condition: '普通',
      fatigue: 0,
      recentForm: [0, 0, 0],
      batterStats: emptyBatterStats(),
      pitcherStats: emptyPitcherStats(),
      usagePolicy: 'normal',
    });
  }

  // Starters #2 and #3 (Solid Pillars)
  for (let i = 2; i <= 3; i++) {
    const vel = randomStat(148, 3, 144, 154);
    const winLuck = randomStat(56, 8, 45, 70);
    players.push({
      id: `${config.id}_p_st${i}`,
      teamId: config.id,
      name: getUniqueName(),
      number: getUniqueNumber([14, 28]),
      age: randomBetween(22, 32),
      isPitcher: true,
      bats: pickRandom(['R', 'L', 'R']),
      throws: Math.random() < 0.70 ? 'R' : 'L',
      mainPosition: 'P',
      positionAptitudes: { P: 90, C: 10, '1B': 30, '2B': 20, '3B': 20, SS: 20, LF: 30, CF: 30, RF: 30, DH: 50 },
      contact: 25, power: 20, speed: 40, arm: 72, fielding: 65, catching: 60, eye: 30, stealing: 20, vsRight: 60, vsLeft: 60,
      pitcherRole: 'starter',
      pitchVelocity: vel,
      control: randomStat(68, 6, 58, 80),
      stamina: randomStat(76, 5, 68, 86),
      strikeout: randomStat(70, 6, 58, 84),
      hrAvoidance: randomStat(68, 6, 55, 80),
      pVsRight: randomStat(68, 7, 52, 82),
      pVsLeft: randomStat(66, 7, 50, 82),
      winLuck,
      pitches: generatePitchArsenal(vel, 'starter', true),
      condition: '普通',
      fatigue: 0,
      recentForm: [0, 0, 0],
      batterStats: emptyBatterStats(),
      pitcherStats: emptyPitcherStats(),
      usagePolicy: 'normal',
    });
  }

  // Starters #4 to #6 (Standard Starters)
  for (let i = 4; i <= 6; i++) {
    const vel = randomStat(144, 3, 138, 150);
    const winLuck = randomStat(50, 5, 38, 58);
    players.push({
      id: `${config.id}_p_st${i}`,
      teamId: config.id,
      name: getUniqueName(),
      number: getUniqueNumber([29, 45]),
      age: randomBetween(21, 33),
      isPitcher: true,
      bats: pickRandom(['R', 'L']),
      throws: Math.random() < 0.75 ? 'R' : 'L',
      mainPosition: 'P',
      positionAptitudes: { P: 85, C: 10, '1B': 25, '2B': 20, '3B': 20, SS: 20, LF: 25, CF: 25, RF: 25, DH: 40 },
      contact: 20, power: 18, speed: 40, arm: 68, fielding: 60, catching: 55, eye: 25, stealing: 15, vsRight: 55, vsLeft: 55,
      pitcherRole: 'starter',
      pitchVelocity: vel,
      control: randomStat(60, 6, 48, 72),
      stamina: randomStat(70, 5, 60, 80),
      strikeout: randomStat(60, 6, 48, 74),
      hrAvoidance: randomStat(60, 6, 48, 72),
      pVsRight: randomStat(60, 6, 48, 74),
      pVsLeft: randomStat(58, 6, 46, 72),
      winLuck,
      pitches: generatePitchArsenal(vel, 'starter', true),
      condition: '普通',
      fatigue: 0,
      recentForm: [0, 0, 0],
      batterStats: emptyBatterStats(),
      pitcherStats: emptyPitcherStats(),
      usagePolicy: 'normal',
    });
  }

  // Setup Pitcher (8th Inning Specialist)
  {
    const vel = randomStat(152, 3, 147, 157);
    const winLuck = randomStat(58, 6, 48, 70);
    players.push({
      id: `${config.id}_p_setup`,
      teamId: config.id,
      name: getUniqueName(),
      number: getUniqueNumber([20, 48]),
      age: randomBetween(23, 31),
      isPitcher: true,
      bats: pickRandom(['R', 'L']),
      throws: Math.random() < 0.65 ? 'R' : 'L',
      mainPosition: 'P',
      positionAptitudes: { P: 92, C: 10, '1B': 20, '2B': 20, '3B': 20, SS: 20, LF: 20, CF: 20, RF: 20, DH: 40 },
      contact: 20, power: 15, speed: 40, arm: 76, fielding: 65, catching: 60, eye: 25, stealing: 15, vsRight: 60, vsLeft: 60,
      pitcherRole: 'reliever',
      pitchVelocity: vel,
      control: randomStat(72, 6, 62, 84),
      stamina: randomStat(45, 5, 35, 52),
      strikeout: randomStat(80, 6, 70, 92),
      hrAvoidance: randomStat(72, 6, 60, 84),
      pVsRight: randomStat(72, 6, 60, 85),
      pVsLeft: randomStat(70, 6, 60, 85),
      winLuck,
      pitches: generatePitchArsenal(vel, 'reliever', false),
      condition: '普通',
      fatigue: 0,
      recentForm: [0, 0, 0],
      batterStats: emptyBatterStats(),
      pitcherStats: emptyPitcherStats(),
      usagePolicy: 'winning_formula',
    });
  }

  // Closer (9th Inning Guardian)
  {
    const vel = randomStat(155, 3, 150, 161);
    const winLuck = randomStat(65, 7, 52, 78);
    players.push({
      id: `${config.id}_p_closer`,
      teamId: config.id,
      name: getUniqueName(),
      number: getUniqueNumber([12, 22]),
      age: randomBetween(24, 33),
      isPitcher: true,
      bats: pickRandom(['R', 'L']),
      throws: Math.random() < 0.70 ? 'R' : 'L',
      mainPosition: 'P',
      positionAptitudes: { P: 95, C: 10, '1B': 20, '2B': 20, '3B': 20, SS: 20, LF: 20, CF: 20, RF: 20, DH: 40 },
      contact: 20, power: 15, speed: 45, arm: 82, fielding: 68, catching: 62, eye: 25, stealing: 15, vsRight: 65, vsLeft: 65,
      pitcherRole: 'closer',
      pitchVelocity: vel,
      control: randomStat(76, 6, 66, 88),
      stamina: randomStat(40, 4, 32, 48),
      strikeout: randomStat(88, 5, 80, 96),
      hrAvoidance: randomStat(78, 5, 68, 88),
      pVsRight: randomStat(78, 6, 66, 90),
      pVsLeft: randomStat(76, 6, 65, 88),
      winLuck,
      pitches: generatePitchArsenal(vel, 'closer', false),
      condition: '普通',
      fatigue: 0,
      recentForm: [0, 0, 0],
      batterStats: emptyBatterStats(),
      pitcherStats: emptyPitcherStats(),
      usagePolicy: 'winning_formula',
    });
  }

  // Relievers #1 to #6 (Middle, Long, Behind, Bullpen arms)
  const relieverConfigs: { policy: 'normal' | 'long_relief' | 'behind'; meanVel: number }[] = [
    { policy: 'normal', meanVel: 148 },
    { policy: 'long_relief', meanVel: 145 },
    { policy: 'behind', meanVel: 144 },
    { policy: 'normal', meanVel: 147 },
    { policy: 'normal', meanVel: 146 },
    { policy: 'long_relief', meanVel: 144 },
  ];

  relieverConfigs.forEach((rc, idx) => {
    const vel = randomStat(rc.meanVel, 3, 140, 153);
    const winLuck = randomStat(50, 6, 38, 62);
    players.push({
      id: `${config.id}_p_rel${idx + 1}`,
      teamId: config.id,
      name: getUniqueName(),
      number: getUniqueNumber([34, 68]),
      age: randomBetween(21, 33),
      isPitcher: true,
      bats: pickRandom(['R', 'L']),
      throws: Math.random() < 0.65 ? 'R' : 'L',
      mainPosition: 'P',
      positionAptitudes: { P: 88, C: 10, '1B': 20, '2B': 20, '3B': 20, SS: 20, LF: 20, CF: 20, RF: 20, DH: 40 },
      contact: 20, power: 15, speed: 40, arm: 70, fielding: 60, catching: 55, eye: 25, stealing: 15, vsRight: 55, vsLeft: 55,
      pitcherRole: 'reliever',
      pitchVelocity: vel,
      control: randomStat(64, 6, 52, 78),
      stamina: randomStat(rc.policy === 'long_relief' ? 58 : 46, 5, 36, 68),
      strikeout: randomStat(68, 7, 54, 84),
      hrAvoidance: randomStat(64, 6, 52, 78),
      pVsRight: randomStat(64, 6, 52, 78),
      pVsLeft: randomStat(62, 6, 50, 78),
      winLuck,
      pitches: generatePitchArsenal(vel, 'reliever', false),
      condition: '普通',
      fatigue: 0,
      recentForm: [0, 0, 0],
      batterStats: emptyBatterStats(),
      pitcherStats: emptyPitcherStats(),
      usagePolicy: rc.policy,
    });
  });

  // --- 2. BATTERS (16 Position Players) ---
  // Catchers: 3 (Main, Backup, 3rd)
  // Main Catcher
  players.push({
    id: `${config.id}_b_c1`,
    teamId: config.id,
    name: getUniqueName(),
    number: getUniqueNumber([2, 27]),
    age: randomBetween(24, 31),
    isPitcher: false,
    bats: pickRandom(['R', 'R', 'L']),
    throws: 'R',
    mainPosition: 'C',
    positionAptitudes: { P: 0, C: 90, '1B': 45, '2B': 20, '3B': 20, SS: 15, LF: 20, CF: 15, RF: 20, DH: 60 },
    contact: randomStat(62, 7, 48, 76),
    power: randomStat(65, 8, 48, 80),
    speed: randomStat(48, 7, 35, 62),
    arm: randomStat(82, 6, 70, 92),
    fielding: randomStat(80, 6, 70, 92),
    catching: randomStat(82, 5, 72, 94),
    eye: randomStat(66, 7, 52, 80),
    stealing: randomStat(35, 8, 20, 50),
    vsRight: randomStat(64, 6, 52, 78),
    vsLeft: randomStat(64, 6, 52, 78),
    pitcherRole: 'reliever', pitchVelocity: 130, control: 40, stamina: 30, strikeout: 30, hrAvoidance: 40, pVsRight: 50, pVsLeft: 50, winLuck: 50, pitches: [],
    condition: '普通', fatigue: 0, recentForm: [0, 0, 0], batterStats: emptyBatterStats(), pitcherStats: emptyPitcherStats(), usagePolicy: 'normal',
  });

  // Backup Catcher
  players.push({
    id: `${config.id}_b_c2`,
    teamId: config.id,
    name: getUniqueName(),
    number: getUniqueNumber([37, 59]),
    age: randomBetween(25, 34),
    isPitcher: false,
    bats: 'R',
    throws: 'R',
    mainPosition: 'C',
    positionAptitudes: { P: 0, C: 84, '1B': 40, '2B': 15, '3B': 15, SS: 10, LF: 15, CF: 10, RF: 15, DH: 50 },
    contact: randomStat(52, 6, 40, 65),
    power: randomStat(54, 7, 40, 68),
    speed: randomStat(44, 6, 30, 55),
    arm: randomStat(76, 6, 64, 88),
    fielding: randomStat(75, 6, 64, 86),
    catching: randomStat(76, 6, 65, 88),
    eye: randomStat(58, 6, 44, 72),
    stealing: 25, vsRight: 55, vsLeft: 55,
    pitcherRole: 'reliever', pitchVelocity: 130, control: 40, stamina: 30, strikeout: 30, hrAvoidance: 40, pVsRight: 50, pVsLeft: 50, winLuck: 50, pitches: [],
    condition: '普通', fatigue: 0, recentForm: [0, 0, 0], batterStats: emptyBatterStats(), pitcherStats: emptyPitcherStats(), usagePolicy: 'normal',
  });

  // 3rd Catcher (Developmental / Emergency)
  players.push({
    id: `${config.id}_b_c3`,
    teamId: config.id,
    name: getUniqueName(),
    number: getUniqueNumber([60, 95]),
    age: randomBetween(19, 23),
    isPitcher: false,
    bats: pickRandom(['R', 'L']),
    throws: 'R',
    mainPosition: 'C',
    positionAptitudes: { P: 0, C: 78, '1B': 35, '2B': 15, '3B': 15, SS: 10, LF: 15, CF: 10, RF: 15, DH: 45 },
    contact: randomStat(50, 6, 38, 64),
    power: randomStat(56, 7, 42, 70),
    speed: randomStat(52, 6, 38, 64),
    arm: randomStat(78, 6, 66, 88),
    fielding: randomStat(70, 6, 58, 80),
    catching: randomStat(70, 6, 58, 80),
    eye: randomStat(52, 6, 40, 65),
    stealing: 30, vsRight: 52, vsLeft: 52,
    pitcherRole: 'reliever', pitchVelocity: 130, control: 40, stamina: 30, strikeout: 30, hrAvoidance: 40, pVsRight: 50, pVsLeft: 50, winLuck: 50, pitches: [],
    condition: '普通', fatigue: 0, recentForm: [0, 0, 0], batterStats: emptyBatterStats(), pitcherStats: emptyPitcherStats(), usagePolicy: 'normal',
  });

  // 1B (First Baseman: Power Slugger)
  players.push({
    id: `${config.id}_b_1b`,
    teamId: config.id,
    name: getUniqueName(),
    number: getUniqueNumber([3, 25]),
    age: randomBetween(24, 33),
    isPitcher: false,
    bats: pickRandom(['R', 'L', 'L']),
    throws: pickRandom(['R', 'L']),
    mainPosition: '1B',
    positionAptitudes: { P: 0, C: 10, '1B': 90, '2B': 25, '3B': 45, SS: 15, LF: 40, CF: 20, RF: 40, DH: 85 },
    contact: randomStat(70, 7, 56, 84),
    power: randomStat(86, 6, 76, 96),
    speed: randomStat(48, 7, 35, 62),
    arm: randomStat(66, 7, 52, 80),
    fielding: randomStat(68, 7, 55, 80),
    catching: randomStat(74, 6, 62, 86),
    eye: randomStat(74, 7, 60, 88),
    stealing: randomStat(30, 8, 15, 45),
    vsRight: randomStat(74, 7, 60, 88),
    vsLeft: randomStat(70, 7, 56, 86),
    pitcherRole: 'reliever', pitchVelocity: 130, control: 40, stamina: 30, strikeout: 30, hrAvoidance: 40, pVsRight: 50, pVsLeft: 50, winLuck: 50, pitches: [],
    condition: '普通', fatigue: 0, recentForm: [0, 0, 0], batterStats: emptyBatterStats(), pitcherStats: emptyPitcherStats(), usagePolicy: 'normal',
  });

  // 2B (Second Baseman: Defensive Maestro / Table Setter)
  players.push({
    id: `${config.id}_b_2b`,
    teamId: config.id,
    name: getUniqueName(),
    number: getUniqueNumber([4, 8]),
    age: randomBetween(22, 30),
    isPitcher: false,
    bats: pickRandom(['R', 'L', 'B']),
    throws: 'R',
    mainPosition: '2B',
    positionAptitudes: { P: 0, C: 10, '1B': 40, '2B': 92, '3B': 60, SS: 80, LF: 30, CF: 30, RF: 30, DH: 65 },
    contact: randomStat(74, 6, 62, 86),
    power: randomStat(56, 8, 40, 72),
    speed: randomStat(80, 6, 70, 92),
    arm: randomStat(74, 6, 64, 86),
    fielding: randomStat(84, 5, 74, 94),
    catching: randomStat(84, 5, 74, 94),
    eye: randomStat(76, 6, 64, 88),
    stealing: randomStat(74, 7, 60, 88),
    vsRight: randomStat(72, 6, 60, 84),
    vsLeft: randomStat(72, 6, 60, 84),
    pitcherRole: 'reliever', pitchVelocity: 130, control: 40, stamina: 30, strikeout: 30, hrAvoidance: 40, pVsRight: 50, pVsLeft: 50, winLuck: 50, pitches: [],
    condition: '普通', fatigue: 0, recentForm: [0, 0, 0], batterStats: emptyBatterStats(), pitcherStats: emptyPitcherStats(), usagePolicy: 'normal',
  });

  // 3B (Third Baseman: Hot Corner Clean-up)
  players.push({
    id: `${config.id}_b_3b`,
    teamId: config.id,
    name: getUniqueName(),
    number: getUniqueNumber([5, 10]),
    age: randomBetween(24, 32),
    isPitcher: false,
    bats: pickRandom(['R', 'L']),
    throws: 'R',
    mainPosition: '3B',
    positionAptitudes: { P: 0, C: 10, '1B': 70, '2B': 50, '3B': 90, SS: 60, LF: 40, CF: 30, RF: 40, DH: 75 },
    contact: randomStat(72, 7, 60, 86),
    power: randomStat(80, 6, 70, 92),
    speed: randomStat(64, 7, 50, 76),
    arm: randomStat(80, 6, 70, 92),
    fielding: randomStat(76, 6, 64, 88),
    catching: randomStat(74, 6, 62, 86),
    eye: randomStat(72, 6, 60, 84),
    stealing: randomStat(48, 8, 32, 65),
    vsRight: randomStat(72, 6, 60, 84),
    vsLeft: randomStat(74, 6, 62, 86),
    pitcherRole: 'reliever', pitchVelocity: 130, control: 40, stamina: 30, strikeout: 30, hrAvoidance: 40, pVsRight: 50, pVsLeft: 50, winLuck: 50, pitches: [],
    condition: '普通', fatigue: 0, recentForm: [0, 0, 0], batterStats: emptyBatterStats(), pitcherStats: emptyPitcherStats(), usagePolicy: 'normal',
  });

  // SS (Shortstop: Playmaker Commander)
  players.push({
    id: `${config.id}_b_ss`,
    teamId: config.id,
    name: getUniqueName(),
    number: getUniqueNumber([6, 9]),
    age: randomBetween(22, 29),
    isPitcher: false,
    bats: pickRandom(['R', 'L', 'B']),
    throws: 'R',
    mainPosition: 'SS',
    positionAptitudes: { P: 0, C: 10, '1B': 40, '2B': 85, '3B': 75, SS: 94, LF: 30, CF: 30, RF: 30, DH: 65 },
    contact: randomStat(70, 6, 58, 82),
    power: randomStat(62, 7, 48, 76),
    speed: randomStat(78, 6, 68, 90),
    arm: randomStat(84, 5, 74, 94),
    fielding: randomStat(88, 5, 78, 96),
    catching: randomStat(84, 5, 74, 94),
    eye: randomStat(70, 6, 58, 82),
    stealing: randomStat(72, 7, 58, 86),
    vsRight: randomStat(68, 6, 56, 80),
    vsLeft: randomStat(70, 6, 58, 82),
    pitcherRole: 'reliever', pitchVelocity: 130, control: 40, stamina: 30, strikeout: 30, hrAvoidance: 40, pVsRight: 50, pVsLeft: 50, winLuck: 50, pitches: [],
    condition: '普通', fatigue: 0, recentForm: [0, 0, 0], batterStats: emptyBatterStats(), pitcherStats: emptyPitcherStats(), usagePolicy: 'normal',
  });

  // Utility Infield 1 (2B/SS/3B)
  players.push({
    id: `${config.id}_b_uif`,
    teamId: config.id,
    name: getUniqueName(),
    number: getUniqueNumber([32, 54]),
    age: randomBetween(21, 33),
    isPitcher: false,
    bats: pickRandom(['R', 'L']),
    throws: 'R',
    mainPosition: 'SS',
    positionAptitudes: { P: 0, C: 10, '1B': 60, '2B': 80, '3B': 78, SS: 80, LF: 40, CF: 30, RF: 40, DH: 55 },
    contact: randomStat(62, 6, 50, 74),
    power: randomStat(54, 7, 40, 68),
    speed: randomStat(70, 6, 58, 82),
    arm: randomStat(72, 6, 60, 84),
    fielding: randomStat(76, 6, 65, 88),
    catching: randomStat(75, 6, 64, 86),
    eye: randomStat(64, 6, 52, 78),
    stealing: randomStat(58, 7, 42, 72),
    vsRight: 62, vsLeft: 62,
    pitcherRole: 'reliever', pitchVelocity: 130, control: 40, stamina: 30, strikeout: 30, hrAvoidance: 40, pVsRight: 50, pVsLeft: 50, winLuck: 50, pitches: [],
    condition: '普通', fatigue: 0, recentForm: [0, 0, 0], batterStats: emptyBatterStats(), pitcherStats: emptyPitcherStats(), usagePolicy: 'normal',
  });

  // Corner Infield Backup 2 (1B/3B)
  players.push({
    id: `${config.id}_b_cif`,
    teamId: config.id,
    name: getUniqueName(),
    number: getUniqueNumber([49, 65]),
    age: randomBetween(23, 31),
    isPitcher: false,
    bats: pickRandom(['R', 'L']),
    throws: 'R',
    mainPosition: '1B',
    positionAptitudes: { P: 0, C: 10, '1B': 82, '2B': 30, '3B': 74, SS: 20, LF: 40, CF: 15, RF: 40, DH: 75 },
    contact: randomStat(64, 6, 52, 76),
    power: randomStat(74, 6, 62, 86),
    speed: randomStat(50, 6, 36, 64),
    arm: randomStat(70, 6, 58, 82),
    fielding: randomStat(68, 6, 56, 80),
    catching: randomStat(70, 6, 58, 82),
    eye: randomStat(66, 6, 54, 80),
    stealing: 30, vsRight: 64, vsLeft: 64,
    pitcherRole: 'reliever', pitchVelocity: 130, control: 40, stamina: 30, strikeout: 30, hrAvoidance: 40, pVsRight: 50, pVsLeft: 50, winLuck: 50, pitches: [],
    condition: '普通', fatigue: 0, recentForm: [0, 0, 0], batterStats: emptyBatterStats(), pitcherStats: emptyPitcherStats(), usagePolicy: 'normal',
  });

  // LF (Left Fielder: Slugging Outfielder)
  players.push({
    id: `${config.id}_b_lf`,
    teamId: config.id,
    name: getUniqueName(),
    number: getUniqueNumber([7, 24]),
    age: randomBetween(23, 33),
    isPitcher: false,
    bats: pickRandom(['R', 'L']),
    throws: pickRandom(['R', 'L']),
    mainPosition: 'LF',
    positionAptitudes: { P: 0, C: 10, '1B': 50, '2B': 30, '3B': 40, SS: 20, LF: 92, CF: 60, RF: 78, DH: 80 },
    contact: randomStat(74, 6, 62, 86),
    power: randomStat(82, 6, 72, 94),
    speed: randomStat(66, 7, 52, 80),
    arm: randomStat(70, 7, 56, 84),
    fielding: randomStat(70, 7, 56, 84),
    catching: randomStat(70, 7, 56, 84),
    eye: randomStat(74, 6, 62, 86),
    stealing: randomStat(50, 8, 32, 68),
    vsRight: randomStat(74, 6, 62, 86),
    vsLeft: randomStat(72, 6, 60, 84),
    pitcherRole: 'reliever', pitchVelocity: 130, control: 40, stamina: 30, strikeout: 30, hrAvoidance: 40, pVsRight: 50, pVsLeft: 50, winLuck: 50, pitches: [],
    condition: '普通', fatigue: 0, recentForm: [0, 0, 0], batterStats: emptyBatterStats(), pitcherStats: emptyPitcherStats(), usagePolicy: 'normal',
  });

  // CF (Center Fielder: Speedster Lead-off & Wall Guardian)
  players.push({
    id: `${config.id}_b_cf`,
    teamId: config.id,
    name: getUniqueName(),
    number: getUniqueNumber([1, 51]),
    age: randomBetween(22, 29),
    isPitcher: false,
    bats: pickRandom(['L', 'L', 'B']),
    throws: 'R',
    mainPosition: 'CF',
    positionAptitudes: { P: 0, C: 10, '1B': 30, '2B': 50, '3B': 30, SS: 40, LF: 86, CF: 94, RF: 86, DH: 70 },
    contact: randomStat(78, 5, 68, 90),
    power: randomStat(58, 7, 44, 74),
    speed: randomStat(90, 4, 82, 98),
    arm: randomStat(80, 6, 70, 92),
    fielding: randomStat(86, 5, 76, 96),
    catching: randomStat(86, 5, 76, 96),
    eye: randomStat(78, 6, 66, 90),
    stealing: randomStat(86, 5, 74, 96),
    vsRight: randomStat(76, 6, 64, 88),
    vsLeft: randomStat(74, 6, 62, 86),
    pitcherRole: 'reliever', pitchVelocity: 130, control: 40, stamina: 30, strikeout: 30, hrAvoidance: 40, pVsRight: 50, pVsLeft: 50, winLuck: 50, pitches: [],
    condition: '普通', fatigue: 0, recentForm: [0, 0, 0], batterStats: emptyBatterStats(), pitcherStats: emptyPitcherStats(), usagePolicy: 'normal',
  });

  // RF (Right Fielder: Laser Beam Arm & Heavy Hitter)
  players.push({
    id: `${config.id}_b_rf`,
    teamId: config.id,
    name: getUniqueName(),
    number: getUniqueNumber([31, 44]),
    age: randomBetween(24, 32),
    isPitcher: false,
    bats: pickRandom(['R', 'L']),
    throws: 'R',
    mainPosition: 'RF',
    positionAptitudes: { P: 0, C: 10, '1B': 50, '2B': 30, '3B': 40, SS: 20, LF: 82, CF: 72, RF: 92, DH: 80 },
    contact: randomStat(72, 6, 60, 84),
    power: randomStat(84, 6, 74, 96),
    speed: randomStat(68, 7, 54, 80),
    arm: randomStat(88, 5, 78, 98),
    fielding: randomStat(74, 6, 62, 86),
    catching: randomStat(74, 6, 62, 86),
    eye: randomStat(70, 6, 58, 84),
    stealing: randomStat(52, 7, 36, 68),
    vsRight: randomStat(72, 6, 60, 84),
    vsLeft: randomStat(74, 6, 62, 86),
    pitcherRole: 'reliever', pitchVelocity: 130, control: 40, stamina: 30, strikeout: 30, hrAvoidance: 40, pVsRight: 50, pVsLeft: 50, winLuck: 50, pitches: [],
    condition: '普通', fatigue: 0, recentForm: [0, 0, 0], batterStats: emptyBatterStats(), pitcherStats: emptyPitcherStats(), usagePolicy: 'normal',
  });

  // 4th Outfielder (Reserve OF)
  players.push({
    id: `${config.id}_b_rof`,
    teamId: config.id,
    name: getUniqueName(),
    number: getUniqueNumber([50, 63]),
    age: randomBetween(20, 30),
    isPitcher: false,
    bats: pickRandom(['R', 'L']),
    throws: 'R',
    mainPosition: 'LF',
    positionAptitudes: { P: 0, C: 10, '1B': 40, '2B': 30, '3B': 30, SS: 20, LF: 82, CF: 72, RF: 82, DH: 60 },
    contact: randomStat(62, 6, 50, 74),
    power: randomStat(64, 7, 50, 78),
    speed: randomStat(70, 6, 58, 82),
    arm: randomStat(70, 6, 58, 82),
    fielding: randomStat(70, 6, 58, 82),
    catching: randomStat(70, 6, 58, 82),
    eye: randomStat(62, 6, 50, 74),
    stealing: randomStat(56, 7, 42, 72),
    vsRight: 62, vsLeft: 62,
    pitcherRole: 'reliever', pitchVelocity: 130, control: 40, stamina: 30, strikeout: 30, hrAvoidance: 40, pVsRight: 50, pVsLeft: 50, winLuck: 50, pitches: [],
    condition: '普通', fatigue: 0, recentForm: [0, 0, 0], batterStats: emptyBatterStats(), pitcherStats: emptyPitcherStats(), usagePolicy: 'normal',
  });

  // Utility Outfielder
  players.push({
    id: `${config.id}_b_uof`,
    teamId: config.id,
    name: getUniqueName(),
    number: getUniqueNumber([46, 67]),
    age: randomBetween(22, 30),
    isPitcher: false,
    bats: pickRandom(['R', 'L']),
    throws: 'R',
    mainPosition: 'RF',
    positionAptitudes: { P: 0, C: 10, '1B': 30, '2B': 30, '3B': 30, SS: 20, LF: 78, CF: 78, RF: 80, DH: 55 },
    contact: randomStat(60, 6, 48, 72),
    power: randomStat(60, 7, 46, 74),
    speed: randomStat(72, 6, 60, 84),
    arm: randomStat(74, 6, 62, 86),
    fielding: randomStat(72, 6, 60, 84),
    catching: randomStat(72, 6, 60, 84),
    eye: randomStat(60, 6, 48, 72),
    stealing: 50, vsRight: 60, vsLeft: 60,
    pitcherRole: 'reliever', pitchVelocity: 130, control: 40, stamina: 30, strikeout: 30, hrAvoidance: 40, pVsRight: 50, pVsLeft: 50, winLuck: 50, pitches: [],
    condition: '普通', fatigue: 0, recentForm: [0, 0, 0], batterStats: emptyBatterStats(), pitcherStats: emptyPitcherStats(), usagePolicy: 'normal',
  });

  // Bench: Speed & Defense Specialist (Pinch Runner / Defensive Sub)
  players.push({
    id: `${config.id}_b_pr`,
    teamId: config.id,
    name: getUniqueName(),
    number: getUniqueNumber([0, 56]),
    age: randomBetween(21, 28),
    isPitcher: false,
    bats: 'L',
    throws: 'R',
    mainPosition: 'CF',
    positionAptitudes: { P: 0, C: 10, '1B': 30, '2B': 72, '3B': 40, SS: 68, LF: 86, CF: 90, RF: 86, DH: 50 },
    contact: randomStat(64, 6, 52, 76),
    power: randomStat(44, 6, 32, 56),
    speed: randomStat(94, 3, 86, 99),
    arm: randomStat(76, 6, 64, 88),
    fielding: randomStat(84, 5, 74, 94),
    catching: randomStat(82, 5, 72, 92),
    eye: randomStat(66, 6, 54, 80),
    stealing: randomStat(90, 4, 82, 98),
    vsRight: 64, vsLeft: 64,
    pitcherRole: 'reliever', pitchVelocity: 130, control: 40, stamina: 30, strikeout: 30, hrAvoidance: 40, pVsRight: 50, pVsLeft: 50, winLuck: 50, pitches: [],
    condition: '普通', fatigue: 0, recentForm: [0, 0, 0], batterStats: emptyBatterStats(), pitcherStats: emptyPitcherStats(), usagePolicy: 'pinch_runner',
  });

  // Bench: Pinch Hitter Specialist
  players.push({
    id: `${config.id}_b_ph`,
    teamId: config.id,
    name: getUniqueName(),
    number: getUniqueNumber([33, 55]),
    age: randomBetween(26, 35),
    isPitcher: false,
    bats: pickRandom(['L', 'L', 'R']),
    throws: 'R',
    mainPosition: '1B',
    positionAptitudes: { P: 0, C: 10, '1B': 78, '2B': 20, '3B': 40, SS: 10, LF: 45, CF: 15, RF: 45, DH: 88 },
    contact: randomStat(78, 5, 68, 90),
    power: randomStat(85, 5, 75, 96),
    speed: randomStat(42, 6, 30, 55),
    arm: randomStat(56, 7, 42, 70),
    fielding: randomStat(54, 7, 40, 68),
    catching: randomStat(62, 7, 48, 74),
    eye: randomStat(76, 6, 64, 90),
    stealing: 20,
    vsRight: randomStat(80, 6, 68, 92),
    vsLeft: randomStat(74, 6, 60, 86),
    pitcherRole: 'reliever', pitchVelocity: 130, control: 40, stamina: 30, strikeout: 30, hrAvoidance: 40, pVsRight: 50, pVsLeft: 50, winLuck: 50, pitches: [],
    condition: '普通', fatigue: 0, recentForm: [0, 0, 0], batterStats: emptyBatterStats(), pitcherStats: emptyPitcherStats(), usagePolicy: 'pinch_hitter',
  });

  const rawTeam: Team = {
    id: config.id,
    name: config.name,
    shortName: config.shortName,
    city: config.city,
    stadium: config.stadium,
    color: config.color,
    secondaryColor: config.secondaryColor,
    textColor: config.textColor,
    leagueId: config.leagueId || 'league_a',
    leagueName: config.leagueName || 'アルファ・リーグ',
    stats: {
      games: 0, wins: 0, losses: 0, draws: 0, winRate: 0, gamesBehind: 0,
      runsScored: 0, runsAllowed: 0, runDiff: 0, streak: '-', rank: 1
    },
    order: {
      battingOrder: [],
      rotation: [],
      relievers: [],
      setup: '',
      closer: '',
      benchBatters: [],
      bullpenPitchers: [],
    },
    players,
  };

  rawTeam.order = AIManager.generateBestOrder(rawTeam);
  return rawTeam;
}

/**
 * Generates fictional league with flexible team count (6, 8, 10, 12, etc.) and structure.
 */
export function generateFictionalLeague(count = 12, structure: LeagueStructure = 'two_league'): Team[] {
  const configsToUse = FICTIONAL_TEAMS_CONFIG.slice(0, count);

  return configsToUse.map((config, idx) => {
    let assignedLeague = config.leagueId;
    let assignedLeagueName = config.leagueName;

    if (structure === 'single') {
      assignedLeague = 'single';
      assignedLeagueName = '架空ペナントリーグ';
    } else {
      const isLeagueA = idx < Math.ceil(count / 2);
      assignedLeague = isLeagueA ? 'league_a' : 'league_b';
      assignedLeagueName = isLeagueA ? 'アルファ・リーグ' : 'ベータ・リーグ';
    }

    const team = generateSingleFictionalTeam({
      ...config,
      leagueId: assignedLeague,
      leagueName: assignedLeagueName,
    });

    team.leagueId = assignedLeague;
    team.leagueName = assignedLeagueName;
    return team;
  });
}

/**
 * Helper to generate a new custom team with a complete 30-player roster
 */
export function generateCustomTeam(params: {
  id?: string;
  name: string;
  shortName: string;
  city: string;
  stadium: string;
  color: string;
  secondaryColor?: string;
  textColor?: string;
  leagueId?: string;
  leagueName?: string;
}): Team {
  const customId = params.id || `team_custom_${Date.now()}`;
  const config: FictionalTeamConfig = {
    id: customId,
    name: params.name || '新規球団',
    shortName: params.shortName || params.name.slice(0, 2) || '新球団',
    city: params.city || '日本',
    stadium: params.stadium || '新球場',
    color: params.color || '#3b82f6',
    secondaryColor: params.secondaryColor || '#ffffff',
    textColor: params.textColor || '#ffffff',
    theme: '新規参入球団。無限の可能性を秘めた新戦力。',
    leagueId: params.leagueId || 'league_a',
    leagueName: params.leagueName || 'アルファ・リーグ',
  };

  return generateSingleFictionalTeam(config);
}

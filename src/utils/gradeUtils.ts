export type AbilityRank = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface AbilityGradeInfo {
  grade: AbilityRank;
  color: string;
  badgeClass: string;
  desc: string;
}

export const ABILITY_RANKS: { rank: AbilityRank; rangeDesc: string; velDesc: string; color: string; badgeClass: string }[] = [
  { rank: 'S', rangeDesc: '90〜100', velDesc: '156km/h〜', color: 'text-rose-400 font-black', badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { rank: 'A', rangeDesc: '80〜89', velDesc: '152〜155km/h', color: 'text-amber-400 font-bold', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { rank: 'B', rangeDesc: '70〜79', velDesc: '148〜151km/h', color: 'text-sky-400 font-bold', badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  { rank: 'C', rangeDesc: '60〜69', velDesc: '144〜147km/h', color: 'text-emerald-400 font-semibold', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { rank: 'D', rangeDesc: '50〜59', velDesc: '140〜143km/h', color: 'text-teal-300 font-semibold', badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
  { rank: 'E', rangeDesc: '40〜49', velDesc: '136〜139km/h', color: 'text-slate-300 font-medium', badgeClass: 'bg-slate-700/60 text-slate-300 border-slate-600/40' },
  { rank: 'F', rangeDesc: '30〜39', velDesc: '132〜135km/h', color: 'text-purple-400 font-medium', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { rank: 'G', rangeDesc: '0〜29', velDesc: '〜131km/h', color: 'text-slate-500 font-normal', badgeClass: 'bg-slate-800/80 text-slate-500 border-slate-700/40' },
];

/**
 * 8段階能力評価（高い順：S > A > B > C > D > E > F > G）
 */
export function getAbilityGrade(val: number, isVelocity = false): AbilityGradeInfo {
  if (isVelocity) {
    if (val >= 156) return { grade: 'S', color: 'text-rose-400 font-black', badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40', desc: '球界トップクラス' };
    if (val >= 152) return { grade: 'A', color: 'text-amber-400 font-bold', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40', desc: '剛腕・一流' };
    if (val >= 148) return { grade: 'B', color: 'text-sky-400 font-bold', badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40', desc: '上位' };
    if (val >= 144) return { grade: 'C', color: 'text-emerald-400 font-semibold', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', desc: '平均以上' };
    if (val >= 140) return { grade: 'D', color: 'text-teal-300 font-semibold', badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40', desc: 'プロ平均' };
    if (val >= 136) return { grade: 'E', color: 'text-slate-300 font-medium', badgeClass: 'bg-slate-700/60 text-slate-300 border-slate-600/40', desc: 'やや遅い' };
    if (val >= 132) return { grade: 'F', color: 'text-purple-400 font-medium', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40', desc: '遅い・技巧派' };
    return { grade: 'G', color: 'text-slate-500 font-normal', badgeClass: 'bg-slate-800/80 text-slate-500 border-slate-700/40', desc: '超遅球' };
  }

  if (val >= 90) return { grade: 'S', color: 'text-rose-400 font-black', badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40', desc: '球界屈指・超一流' };
  if (val >= 80) return { grade: 'A', color: 'text-amber-400 font-bold', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40', desc: '一流・主力級' };
  if (val >= 70) return { grade: 'B', color: 'text-sky-400 font-bold', badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40', desc: '上位・好選手' };
  if (val >= 60) return { grade: 'C', color: 'text-emerald-400 font-semibold', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', desc: 'レギュラー水準' };
  if (val >= 50) return { grade: 'D', color: 'text-teal-300 font-semibold', badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40', desc: '平均・基準値' };
  if (val >= 40) return { grade: 'E', color: 'text-slate-300 font-medium', badgeClass: 'bg-slate-700/60 text-slate-300 border-slate-600/40', desc: 'やや苦手・控え水準' };
  if (val >= 30) return { grade: 'F', color: 'text-purple-400 font-medium', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40', desc: '苦手' };
  return { grade: 'G', color: 'text-slate-500 font-normal', badgeClass: 'bg-slate-800/80 text-slate-500 border-slate-700/40', desc: '極端に低い' };
}

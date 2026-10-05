import { Team, Player, Position, TeamOrder, LineupSlot } from '../types/baseball';

/**
 * AI Best Order & Lineup Optimizer
 */
export class AIManager {
  /**
   * Automatically generate the best order for a team
   */
  static generateBestOrder(team: Team): TeamOrder {
    const pitchers = team.players.filter(p => p.isPitcher);
    const batters = team.players.filter(p => !p.isPitcher);

    // 1. Organize Pitchers
    // Find closer: best combination of strikeout, control, ball velocity, low fatigue
    const sortedForCloser = [...pitchers].sort((a, b) => {
      const scoreA = a.strikeout * 1.3 + a.control * 1.1 + a.hrAvoidance * 1.0 + (a.pitcherRole === 'closer' ? 25 : 0);
      const scoreB = b.strikeout * 1.3 + b.control * 1.1 + b.hrAvoidance * 1.0 + (b.pitcherRole === 'closer' ? 25 : 0);
      return scoreB - scoreA;
    });
    const closer = sortedForCloser[0]?.id || pitchers[0]?.id || '';

    // Find setup (8th inning specialist): next best relief arm
    const remainingForSetup = sortedForCloser.filter(p => p.id !== closer);
    const sortedForSetup = [...remainingForSetup].sort((a, b) => {
      const scoreA = a.strikeout * 1.2 + a.control * 1.1 + a.pitchVelocity * 0.3 + (a.pitcherRole === 'reliever' ? 15 : 0);
      const scoreB = b.strikeout * 1.2 + b.control * 1.1 + b.pitchVelocity * 0.3 + (b.pitcherRole === 'reliever' ? 15 : 0);
      return scoreB - scoreA;
    });
    const setup = sortedForSetup[0]?.id || remainingForSetup[0]?.id || '';

    // Starting rotation (6-man NPB rotation: ~24-25 games per starter across 143 games)
    const remainingForStarters = pitchers.filter(p => p.id !== closer && p.id !== setup);
    const sortedStarters = [...remainingForStarters].sort((a, b) => {
      const scoreA = a.stamina * 1.4 + a.control * 1.1 + a.strikeout * 0.9 + a.hrAvoidance * 0.8 + (a.pitcherRole === 'starter' ? 25 : 0);
      const scoreB = b.stamina * 1.4 + b.control * 1.1 + b.strikeout * 0.9 + b.hrAvoidance * 0.8 + (b.pitcherRole === 'starter' ? 25 : 0);
      return scoreB - scoreA;
    });
    const rotation = sortedStarters.slice(0, 6).map(p => p.id);

    // Remaining pitchers are relievers and bullpen (~50 appearances per reliever)
    const starterSet = new Set(rotation);
    const remainingPitchers = pitchers.filter(p => p.id !== closer && p.id !== setup && !starterSet.has(p.id));
    const relievers = remainingPitchers.slice(0, 4).map(p => p.id);
    const bullpenPitchers = remainingPitchers.slice(4).map(p => p.id);

    // 2. Select starting 8/9 position players for defense
    // Required positions: C, 1B, 2B, 3B, SS, LF, CF, RF
    const defensePositions: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
    const assignedSlots: { playerId: string; position: Position }[] = [];
    const usedBatterIds = new Set<string>();

    for (const pos of defensePositions) {
      // Find candidate with best aptitude and defense, balanced with hitting
      const candidates = batters.filter(b => !usedBatterIds.has(b.id));
      const pool = candidates.length > 0 ? candidates : team.players.filter(p => !usedBatterIds.has(p.id));
      
      if (pool.length > 0) {
        pool.sort((a, b) => {
          const aptA = a.positionAptitudes[pos] ?? (a.mainPosition === pos ? 85 : 30);
          const aptB = b.positionAptitudes[pos] ?? (b.mainPosition === pos ? 85 : 30);
          
          let defWeight = 1.0;
          if (pos === 'C') defWeight = 1.8;
          if (pos === 'SS' || pos === '2B') defWeight = 1.5;
          if (pos === 'CF') defWeight = 1.3;

          const defA = (a.fielding * 0.4 + a.catching * 0.3 + a.arm * 0.3) * defWeight;
          const defB = (b.fielding * 0.4 + b.catching * 0.3 + b.arm * 0.3) * defWeight;

          const hitA = a.contact * 0.5 + a.power * 0.5 + a.eye * 0.3;
          const hitB = b.contact * 0.5 + b.power * 0.5 + b.eye * 0.3;

          const scoreA = aptA * 1.5 + defA + hitA;
          const scoreB = aptB * 1.5 + defB + hitB;
          return scoreB - scoreA;
        });

        assignedSlots.push({ playerId: pool[0].id, position: pos });
        usedBatterIds.add(pool[0].id);
      }
    }

    // 9th player: either DH or best remaining hitter, or pitcher for non-DH
    const remainingBatters = batters.filter(b => !usedBatterIds.has(b.id));
    const pool9 = remainingBatters.length > 0 ? remainingBatters : team.players.filter(p => !usedBatterIds.has(p.id));
    if (pool9.length > 0) {
      pool9.sort((a, b) => {
        const hitA = a.contact * 0.5 + a.power * 0.6 + a.eye * 0.4;
        const hitB = b.contact * 0.5 + b.power * 0.6 + b.eye * 0.4;
        return hitB - hitA;
      });
      assignedSlots.push({ playerId: pool9[0].id, position: 'DH' });
      usedBatterIds.add(pool9[0].id);
    }

    // Safety: ensure assignedSlots has at least 9 slots
    while (assignedSlots.length < 9 && team.players.length > 0) {
      const unused = team.players.find(p => !usedBatterIds.has(p.id)) || team.players[assignedSlots.length % team.players.length];
      usedBatterIds.add(unused.id);
      assignedSlots.push({ playerId: unused.id, position: 'DH' });
    }

    // 3. Construct Batting Order (1 - 9)
    const starterPlayers = assignedSlots.map(s => {
      const p = team.players.find(pl => pl.id === s.playerId) || team.players[0];
      return { slot: s, player: p };
    });

    const battingOrder: LineupSlot[] = [];
    const chosenOrderPlayerIds = new Set<string>();

    const pickAndAdd = (predicate: (items: typeof starterPlayers) => typeof starterPlayers[0]) => {
      const available = starterPlayers.filter(sp => !chosenOrderPlayerIds.has(sp.player.id));
      const chosen = available.length > 0 ? predicate(available) : starterPlayers[battingOrder.length % starterPlayers.length];
      chosenOrderPlayerIds.add(chosen.player.id);
      battingOrder.push({
        order: battingOrder.length + 1,
        playerId: chosen.player.id,
        position: chosen.slot.position,
      });
    };

    // 1st: Lead-off (High OBP & Speed)
    pickAndAdd(items => items.slice().sort((a, b) => (b.player.speed * 1.4 + b.player.eye * 1.0 + b.player.contact * 0.9) - (a.player.speed * 1.4 + a.player.eye * 1.0 + a.player.contact * 0.9))[0]);

    // 2nd: High Contact, Bat control, Speed
    pickAndAdd(items => items.slice().sort((a, b) => (b.player.contact * 1.3 + b.player.eye * 0.9 + b.player.speed * 0.8) - (a.player.contact * 1.3 + a.player.eye * 0.9 + a.player.speed * 0.8))[0]);

    // 3rd: Best Pure Contact & Balance
    pickAndAdd(items => items.slice().sort((a, b) => (b.player.contact * 1.4 + b.player.power * 0.9 + b.player.eye * 0.7) - (a.player.contact * 1.4 + a.player.power * 0.9 + a.player.eye * 0.7))[0]);

    // 4th: Clean-up (Max Power & Contact)
    pickAndAdd(items => items.slice().sort((a, b) => (b.player.power * 1.5 + b.player.contact * 1.0) - (a.player.power * 1.5 + a.player.contact * 1.0))[0]);

    // 5th: Strong Power
    pickAndAdd(items => items.slice().sort((a, b) => (b.player.power * 1.3 + b.player.contact * 0.8) - (a.player.power * 1.3 + a.player.contact * 0.8))[0]);

    // Slots 6 to 9
    while (battingOrder.length < 9) {
      pickAndAdd(items => items.slice().sort((a, b) => (b.player.contact * 1.0 + b.player.power * 0.8) - (a.player.contact * 1.0 + a.player.power * 0.8))[0]);
    }

    const benchBatters = batters.filter(b => !usedBatterIds.has(b.id)).map(b => b.id);

    return {
      battingOrder,
      rotation,
      relievers,
      setup,
      closer,
      benchBatters,
      bullpenPitchers,
    };
  }

  /**
   * Suggest today's recommended lineup based on current condition, fatigue, opposing starter
   */
  static getTodayRecommendedLineup(
    team: Team,
    opposingPitcherHand: 'R' | 'L' = 'R'
  ): TeamOrder {
    const baseOrder = this.generateBestOrder(team);
    
    // Adjust based on condition bonus/penalty:
    // 絶好調: +10, 好調: +5, 普通: 0, 不調: -5, 絶不調: -10
    // Fatigue penalty: fatigue > 50 gives up to -15
    const getAdjustedScore = (p: Player) => {
      let condMod = 0;
      if (p.condition === '絶好調') condMod = 10;
      else if (p.condition === '好調') condMod = 5;
      else if (p.condition === '不調') condMod = -6;
      else if (p.condition === '絶不調') condMod = -14;

      const fatiguePenalty = Math.max(0, (p.fatigue - 40) * 0.3);
      const splitBonus = opposingPitcherHand === 'R' ? (p.vsRight - 50) * 0.2 : (p.vsLeft - 50) * 0.2;

      return (p.contact * 0.6 + p.power * 0.5 + p.speed * 0.3) + condMod - fatiguePenalty + splitBonus;
    };

    // Swap underperforming/exhausted players with bench players if bench has significantly higher score
    const currentBatters = baseOrder.battingOrder.map(slot => team.players.find(p => p.id === slot.playerId)!);
    const bench = team.players.filter(p => !p.isPitcher && baseOrder.benchBatters.includes(p.id));

    const updatedOrder = [...baseOrder.battingOrder];

    for (let i = 0; i < updatedOrder.length; i++) {
      const current = currentBatters[i];
      if (!current) continue;
      const currentScore = getAdjustedScore(current);

      // Check if any bench player can play this position and has much higher score
      const pos = updatedOrder[i].position;
      const suitableBench = bench.filter(b => {
        const apt = b.positionAptitudes[pos] ?? (b.mainPosition === pos ? 85 : 30);
        return apt >= 50;
      });

      suitableBench.sort((a, b) => getAdjustedScore(b) - getAdjustedScore(a));
      const bestBench = suitableBench[0];

      if (bestBench && getAdjustedScore(bestBench) > currentScore + 12) {
        // Swap!
        updatedOrder[i] = { ...updatedOrder[i], playerId: bestBench.id };
        const benchIndex = bench.findIndex(b => b.id === bestBench.id);
        if (benchIndex >= 0) {
          bench.splice(benchIndex, 1);
          bench.push(current);
        }
      }
    }

    return {
      ...baseOrder,
      battingOrder: updatedOrder,
      benchBatters: bench.map(b => b.id),
    };
  }
}

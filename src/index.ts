/**
 * AgentTrust - Adversarial Benchmark V2
 * 
 * Tests AgentTrust against sophisticated attacks not in the original design:
 * 1. Rational Economic Attacker (Optimizes all 5 signals, $10K budget, closed ring)
 * 2. Cost to Fake Trust (Economic cost comparison: Naive vs AgentTrust)
 * 3. Partial Collusion (Cartel controlling 10-20% of network, transacts internally + with honest clients)
 */

import * as fs from 'fs';
import * as path from 'path';
import { runSimulation, getAllReceipts, AgentProfile, SimulationConfig } from './simulator';
import { calculateTrustProfile, calculateNaiveReputation } from './reputation';
import { calculateCostToFake } from './metrics/cost_to_fake';

interface V2BenchmarkResult {
  timestamp: string;
  benchmark: string;
  config: SimulationConfig;
  attacks: {
    rational_attacker: {
      total_agents: number;
      detected: number;
      detection_rate: number;
      avg_score_detected: number;
      avg_score_undetected: number;
      passed: boolean;
    };
    cost_to_fake: {
      naive_cost: number;
      agenttrust_cost: number;
      cost_ratio: number;
      naive_volume: number;
      agenttrust_volume: number;
      volume_ratio: number;
      target_trust: number;
      passed: boolean;
      summary: string;
    };
    partial_collusion: {
      total_agents: number;
      detected: number;
      detection_rate: number;
      avg_score: number;
      passed: boolean;
    };
  };
  honest_control: {
    total_agents: number;
    correct: number;
    accuracy: number;
  };
  summary: {
    total_adversarial_tested: number;
    total_adversarial_detected: number;
    adversarial_detection_rate: number;
    undetected_count: number;
    undetected_rate: number;
    verdict: 'GO' | 'INCONCLUSIF' | 'KILL';
    verdict_reason: string;
  };
}

export function runV2Benchmark(): V2BenchmarkResult {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🛡️  AGENTTRUST ADVERSARIAL BENCHMARK V2');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Testing attacks beyond the initial assumptions:\n');

  const config: SimulationConfig = {
    honest_agents: 50,
    sybil_agents: 0,
    wash_traders: 0,
    reputation_buyers: 0,
    late_fraudsters: 0,
    rational_attackers: 20,
    partial_collusion_agents: 20,
    transactions_per_agent: 50
  };

  console.log('📋 Benchmark Configuration:');
  console.log(`   Honest baseline agents: ${config.honest_agents}`);
  console.log(`   Rational economic attackers: ${config.rational_attackers}`);
  console.log(`   Partial collusion agents: ${config.partial_collusion_agents}`);
  console.log(`   Transactions per agent: ${config.transactions_per_agent}\n`);

  console.log('🔄 Running adversarial simulation...');
  const agents = runSimulation(config);
  const allReceipts = getAllReceipts(agents);
  console.log(`   Generated ${agents.length} agents with ${allReceipts.length} total receipts\n`);

  const TRUST_THRESHOLD = 70;

  // 1. Evaluate Honest Agents (Sanity control)
  const honestAgents = agents.filter(a => a.type === 'honest');
  let honestCorrect = 0;
  for (const a of honestAgents) {
    const p = calculateTrustProfile(a.agent_id, a.receipts, allReceipts);
    if (p.overall_trust > TRUST_THRESHOLD) honestCorrect++;
  }

  // 2. ATTAQUE #1 : Rational Economic Attacker
  const rationalAgents = agents.filter(a => a.type === 'rational_attacker');
  let rationalDetected = 0;
  const rationalDetectedScores: number[] = [];
  const rationalUndetectedScores: number[] = [];

  for (const a of rationalAgents) {
    const p = calculateTrustProfile(a.agent_id, a.receipts, allReceipts);
    const isDetected = p.overall_trust <= TRUST_THRESHOLD;
    if (isDetected) {
      rationalDetected++;
      rationalDetectedScores.push(p.overall_trust);
    } else {
      rationalUndetectedScores.push(p.overall_trust);
    }
  }

  const rationalDetectionRate = (rationalDetected / rationalAgents.length) * 100;
  const avgRationalDetected = rationalDetectedScores.length > 0
    ? rationalDetectedScores.reduce((sum, s) => sum + s, 0) / rationalDetectedScores.length
    : 0;
  const avgRationalUndetected = rationalUndetectedScores.length > 0
    ? rationalUndetectedScores.reduce((sum, s) => sum + s, 0) / rationalUndetectedScores.length
    : 0;
  const rationalPassed = rationalDetectionRate >= 70;

  // 3. ATTAQUE #2 : Cost to Fake Trust
  const costAnalysis = calculateCostToFake('adversary_sample', [], 80);
  const costPassed = costAnalysis.comparison.agenttrust_system.cost >= 10000;

  // 4. ATTAQUE #3 : Partial Collusion
  const collusionAgents = agents.filter(a => a.type === 'partial_collusion');
  let collusionDetected = 0;
  const collusionScores: number[] = [];

  for (const a of collusionAgents) {
    const p = calculateTrustProfile(a.agent_id, a.receipts, allReceipts);
    const isDetected = p.overall_trust <= TRUST_THRESHOLD;
    collusionScores.push(p.overall_trust);
    if (isDetected) {
      collusionDetected++;
    }
  }

  const collusionDetectionRate = (collusionDetected / collusionAgents.length) * 100;
  const avgCollusionScore = collusionScores.length > 0
    ? collusionScores.reduce((sum, s) => sum + s, 0) / collusionScores.length
    : 0;
  const collusionPassed = collusionDetectionRate >= 60;

  // 5. Summary and Verdict
  const totalAdversarial = rationalAgents.length + collusionAgents.length;
  const totalDetected = rationalDetected + collusionDetected;
  const detectionRate = (totalDetected / totalAdversarial) * 100;
  const undetectedCount = totalAdversarial - totalDetected;
  const undetectedRate = (undetectedCount / totalAdversarial) * 100;

  const passedTestsCount = (rationalPassed ? 1 : 0) + (costPassed ? 1 : 0) + (collusionPassed ? 1 : 0);

  let verdict: 'GO' | 'INCONCLUSIF' | 'KILL';
  let verdictReason: string;

  if (passedTestsCount === 3) {
    verdict = 'GO';
    verdictReason = 'Toutes les 3 attaques ont échoué face à AgentTrust (Rational >70%, Cost >$10K, Collusion >60%). Le modèle économique tient.';
  } else if (passedTestsCount === 2) {
    verdict = 'INCONCLUSIF';
    verdictReason = '1 attaque a réussi partiellement. Nécessite 1 semaine d\'investigation supplémentaire.';
  } else {
    verdict = 'KILL';
    verdictReason = '2 attaques ou plus ont cassé AgentTrust. Le concept présente une vulnérabilité fondamentale.';
  }

  // Print Results in the exact format requested
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 RÉSULTATS DU BENCHMARK ADVERSARIAL V2');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('ATTAQUE #1 : Rational Economic Attacker');
  console.log(`- Nombre d'agents : ${rationalAgents.length}`);
  console.log(`- Détectés : ${rationalDetected}/${rationalAgents.length} (${rationalDetectionRate.toFixed(1)}%) [Cible: >70%]`);
  console.log(`- Score moyen des détectés : ${avgRationalDetected.toFixed(1)}`);
  console.log(`- Score moyen des non-détectés : ${avgRationalUndetected.toFixed(1)}`);
  console.log(`- Statut : ${rationalPassed ? '✅ RÉUSSI' : '❌ ÉCHEC'}\n`);

  console.log('ATTAQUE #2 : Cost to Fake Trust');
  console.log(`- Système naïf : $${costAnalysis.comparison.naive_system.cost} pour tromper`);
  console.log(`- AgentTrust : $${costAnalysis.comparison.agenttrust_system.cost.toLocaleString()} pour tromper [Cible: >$10K]`);
  console.log(`- Ratio : ${costAnalysis.comparison.cost_ratio.toFixed(1)}x plus cher`);
  console.log(`- Volume manipulé requis : $${costAnalysis.comparison.agenttrust_system.volume.toLocaleString()} (vs $${costAnalysis.comparison.naive_system.volume})`);
  console.log(`- Statut : ${costPassed ? '✅ RÉUSSI' : '❌ ÉCHEC'}\n`);

  console.log('ATTAQUE #3 : Partial Collusion (10-20% du réseau)');
  console.log(`- Nombre d'agents : ${collusionAgents.length}`);
  console.log(`- Détectés : ${collusionDetected}/${collusionAgents.length} (${collusionDetectionRate.toFixed(1)}%) [Cible: >60%]`);
  console.log(`- Score moyen : ${avgCollusionScore.toFixed(1)}`);
  console.log(`- Statut : ${collusionPassed ? '✅ RÉUSSI' : '❌ ÉCHEC'}\n`);

  console.log('CONTRÔLE HONNÊTES (Sanity Check) :');
  console.log(`- Agents honnêtes validés : ${honestCorrect}/${honestAgents.length} (${((honestCorrect/honestAgents.length)*100).toFixed(1)}%)\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('RÉSUMÉ FINAL :');
  console.log(`- Total agents testés : ${totalAdversarial}`);
  console.log(`- Détectés : ${totalDetected}/${totalAdversarial} (${detectionRate.toFixed(1)}%)`);
  console.log(`- Non-détectés : ${undetectedCount}/${totalAdversarial} (${undetectedRate.toFixed(1)}%)`);
  console.log(`- Verdict : ${verdict === 'GO' ? '🟢 GO (Passe à Experiment #2)' : verdict === 'INCONCLUSIF' ? '🟡 INCONCLUSIF' : '🔴 KILL'}`);
  console.log(`- Justification : ${verdictReason}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const result: V2BenchmarkResult = {
    timestamp: new Date().toISOString(),
    benchmark: 'Adversarial Benchmark V2',
    config,
    attacks: {
      rational_attacker: {
        total_agents: rationalAgents.length,
        detected: rationalDetected,
        detection_rate: rationalDetectionRate,
        avg_score_detected: Math.round(avgRationalDetected * 10) / 10,
        avg_score_undetected: Math.round(avgRationalUndetected * 10) / 10,
        passed: rationalPassed
      },
      cost_to_fake: {
        naive_cost: costAnalysis.comparison.naive_system.cost,
        agenttrust_cost: costAnalysis.comparison.agenttrust_system.cost,
        cost_ratio: costAnalysis.comparison.cost_ratio,
        naive_volume: costAnalysis.comparison.naive_system.volume,
        agenttrust_volume: costAnalysis.comparison.agenttrust_system.volume,
        volume_ratio: costAnalysis.comparison.volume_ratio,
        target_trust: 80,
        passed: costPassed,
        summary: costAnalysis.comparison.economic_security_verdict
      },
      partial_collusion: {
        total_agents: collusionAgents.length,
        detected: collusionDetected,
        detection_rate: collusionDetectionRate,
        avg_score: Math.round(avgCollusionScore * 10) / 10,
        passed: collusionPassed
      }
    },
    honest_control: {
      total_agents: honestAgents.length,
      correct: honestCorrect,
      accuracy: Math.round((honestCorrect / honestAgents.length) * 1000) / 10
    },
    summary: {
      total_adversarial_tested: totalAdversarial,
      total_adversarial_detected: totalDetected,
      adversarial_detection_rate: Math.round(detectionRate * 10) / 10,
      undetected_count: undetectedCount,
      undetected_rate: Math.round(undetectedRate * 10) / 10,
      verdict,
      verdict_reason: verdictReason
    }
  };

  // Save results
  const resultsDir = path.join(__dirname, '..', 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const v2BenchmarkPath = path.join(resultsDir, 'v2_benchmark.json');
  fs.writeFileSync(v2BenchmarkPath, JSON.stringify(result, null, 2));
  console.log(`💾 Results saved to: results/v2_benchmark.json\n`);

  return result;
}

// Run the benchmark
runV2Benchmark();

/**
 * AgentTrust - Blind Benchmark Runner
 * 
 * Evaluates the FROZEN reputation algorithm against the blind scenarios
 * generated in results/blind_scenarios.json.
 */

import * as fs from 'fs';
import * as path from 'path';
import { calculateTrustProfile, calculateNaiveReputation } from '../reputation';
import { Receipt } from '../receipt';
import { BlindBenchmarkSuite, BlindAgentScenario } from './scenario_generator';

export interface EvaluatedBlindAgent {
  agent_id: string;
  archetype: string;
  ground_truth: 'honest' | 'malicious' | 'borderline';
  overall_trust: number;
  naive_score: number;
  risk_level: string;
  is_detected_as_bad: boolean;
  classification_correct: boolean;
  flags: {
    sybil_suspicious: boolean;
    sybil_risk: number;
    sybil_reasons: string[];
    late_fraud_suspicious: boolean;
    late_fraud_risk: number;
    late_fraud_reasons: string[];
    adaptive_suspicious: boolean;
    adaptive_risk: number;
    adaptive_reasons: string[];
  };
}

export interface BlindResultsReport {
  timestamp: string;
  benchmark: string;
  algorithm_status: string;
  total_agents: number;
  breakdown: {
    honest: {
      total: number;
      accepted: number;
      rejected: number;
      rejection_rate: number;
      avg_score: number;
    };
    malicious: {
      total: number;
      detected: number;
      missed: number;
      detection_rate: number;
      avg_score: number;
    };
    borderline: {
      total: number;
      flagged_high_risk: number;
      cleared: number;
      avg_score: number;
    };
  };
  verdict: 'GO' | 'BESOIN_D_ITERER';
  verdict_message: string;
  evaluations: EvaluatedBlindAgent[];
}

export function runBlindTest(): BlindResultsReport {
  const resultsDir = path.join(__dirname, '..', '..', 'results');
  const scenariosPath = path.join(resultsDir, 'blind_scenarios.json');

  if (!fs.existsSync(scenariosPath)) {
    throw new Error(`Scenarios file not found at: ${scenariosPath}. Run scenario_generator.ts first.`);
  }

  const suite: BlindBenchmarkSuite = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));

  // Collect all receipts for ecosystem graph analysis
  const allReceipts: Receipt[] = [];
  for (const agent of suite.agents) {
    allReceipts.push(...agent.receipts);
  }

  const TRUST_THRESHOLD = 70;
  const evaluations: EvaluatedBlindAgent[] = [];

  for (const agent of suite.agents) {
    const profile = calculateTrustProfile(agent.agent_id, agent.receipts, allReceipts);
    const naive = calculateNaiveReputation(agent.receipts);

    const isDetectedAsBad = profile.overall_trust <= TRUST_THRESHOLD;
    
    let isCorrect = false;
    if (agent.ground_truth === 'honest') {
      isCorrect = !isDetectedAsBad; // Honest should NOT be detected as bad
    } else if (agent.ground_truth === 'malicious') {
      isCorrect = isDetectedAsBad; // Malicious SHOULD be detected as bad
    } else {
      // Borderline: recorded for analysis
      isCorrect = true;
    }

    evaluations.push({
      agent_id: agent.agent_id,
      archetype: agent.archetype,
      ground_truth: agent.ground_truth,
      overall_trust: Math.round(profile.overall_trust * 10) / 10,
      naive_score: Math.round(naive * 10) / 10,
      risk_level: profile.risk_level,
      is_detected_as_bad: isDetectedAsBad,
      classification_correct: isCorrect,
      flags: {
        sybil_suspicious: profile.sybil_detection.is_suspicious,
        sybil_risk: Math.round(profile.sybil_detection.risk_score * 100) / 100,
        sybil_reasons: profile.sybil_detection.reasons,
        late_fraud_suspicious: profile.late_fraud_detection.is_suspicious,
        late_fraud_risk: Math.round(profile.late_fraud_detection.risk_score * 100) / 100,
        late_fraud_reasons: profile.late_fraud_detection.reasons,
        adaptive_suspicious: profile.adaptive_attacker_detection.is_suspicious,
        adaptive_risk: Math.round(profile.adaptive_attacker_detection.risk_score * 100) / 100,
        adaptive_reasons: profile.adaptive_attacker_detection.reasons
      }
    });
  }

  // Aggregate Metrics
  const honestEvals = evaluations.filter(e => e.ground_truth === 'honest');
  const maliciousEvals = evaluations.filter(e => e.ground_truth === 'malicious');
  const borderlineEvals = evaluations.filter(e => e.ground_truth === 'borderline');

  const honestAccepted = honestEvals.filter(e => !e.is_detected_as_bad).length;
  const honestRejected = honestEvals.filter(e => e.is_detected_as_bad).length;
  const honestRejectionRate = (honestRejected / honestEvals.length) * 100;
  const avgHonestScore = honestEvals.reduce((s, e) => s + e.overall_trust, 0) / honestEvals.length;

  const maliciousDetected = maliciousEvals.filter(e => e.is_detected_as_bad).length;
  const maliciousMissed = maliciousEvals.filter(e => !e.is_detected_as_bad).length;
  const maliciousDetectionRate = (maliciousDetected / maliciousEvals.length) * 100;
  const avgMaliciousScore = maliciousEvals.reduce((s, e) => s + e.overall_trust, 0) / maliciousEvals.length;

  const borderlineFlagged = borderlineEvals.filter(e => e.is_detected_as_bad).length;
  const borderlineCleared = borderlineEvals.filter(e => !e.is_detected_as_bad).length;
  const avgBorderlineScore = borderlineEvals.reduce((s, e) => s + e.overall_trust, 0) / borderlineEvals.length;

  // Criteria: >80% malicious detected AND <10% honest rejected
  const passesMaliciousCriteria = maliciousDetectionRate >= 80;
  const passesHonestCriteria = honestRejectionRate < 10;
  const isGo = passesMaliciousCriteria && passesHonestCriteria;

  const verdict: 'GO' | 'BESOIN_D_ITERER' = isGo ? 'GO' : 'BESOIN_D_ITERER';
  const verdictMessage = isGo
    ? '✅ GO (marché) : Plus de 80% des malveillants détectés ET moins de 10% des honnêtes rejetés sur scénarios aveugles.'
    : '⚠️ Besoin d\'itérer : Les seuils de décision sur scénarios aveugles ne satisfont pas les critères stricts.';

  // Terminal Output formatted as requested
  console.log('═══════════════════════════════════════════════════════');
  console.log('BLIND BENCHMARK RESULTS');
  console.log('=======================');
  console.log(`Total agents testés : ${evaluations.length}`);
  console.log(`- Honnêtes : ${honestEvals.length}`);
  console.log(`- Malveillants : ${maliciousEvals.length}`);
  console.log(`- Borderline : ${borderlineEvals.length}\n`);

  console.log('DÉTECTION :');
  console.log(`- Malveillants détectés : ${maliciousDetected}/${maliciousEvals.length} (${maliciousDetectionRate.toFixed(1)}%) [Cible: >80%]`);
  console.log(`- Honnêtes rejetés : ${honestRejected}/${honestEvals.length} (${honestRejectionRate.toFixed(1)}%) [Cible: <10%]\n`);

  console.log('SCORES MOYENS :');
  console.log(`- Honnêtes : ${avgHonestScore.toFixed(1)} / 100`);
  console.log(`- Malveillants : ${avgMaliciousScore.toFixed(1)} / 100`);
  console.log(`- Borderline : ${avgBorderlineScore.toFixed(1)} / 100\n`);

  console.log('DÉTAIL PAR ARCHÉTYPE MALVEILLANT :');
  const maliciousArchetypes = Array.from(new Set(maliciousEvals.map(e => e.archetype)));
  for (const arch of maliciousArchetypes) {
    const archEvals = maliciousEvals.filter(e => e.archetype === arch);
    const archDetected = archEvals.filter(e => e.is_detected_as_bad).length;
    const archAvg = archEvals.reduce((s, e) => s + e.overall_trust, 0) / archEvals.length;
    console.log(`  • ${arch} : ${archDetected}/${archEvals.length} détectés (score moyen: ${archAvg.toFixed(1)})`);
  }

  console.log('\nDÉTAIL PAR ARCHÉTYPE BORDERLINE :');
  const borderlineArchetypes = Array.from(new Set(borderlineEvals.map(e => e.archetype)));
  for (const arch of borderlineArchetypes) {
    const archEvals = borderlineEvals.filter(e => e.archetype === arch);
    const archFlagged = archEvals.filter(e => e.is_detected_as_bad).length;
    const archAvg = archEvals.reduce((s, e) => s + e.overall_trust, 0) / archEvals.length;
    console.log(`  • ${arch} : ${archFlagged}/${archEvals.length} pénalisés (score moyen: ${archAvg.toFixed(1)})`);
  }

  console.log('\nVERDICT :');
  console.log(`- Statut : ${isGo ? '✅ GO (marché)' : '⚠️ Besoin d\'itérer'}`);
  console.log(`- Raison : ${verdictMessage}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const report: BlindResultsReport = {
    timestamp: new Date().toISOString(),
    benchmark: 'AgentTrust Blind Benchmark Final',
    algorithm_status: 'FROZEN (ALGORITHM_FROZEN.md)',
    total_agents: evaluations.length,
    breakdown: {
      honest: {
        total: honestEvals.length,
        accepted: honestAccepted,
        rejected: honestRejected,
        rejection_rate: Math.round(honestRejectionRate * 10) / 10,
        avg_score: Math.round(avgHonestScore * 10) / 10
      },
      malicious: {
        total: maliciousEvals.length,
        detected: maliciousDetected,
        missed: maliciousMissed,
        detection_rate: Math.round(maliciousDetectionRate * 10) / 10,
        avg_score: Math.round(avgMaliciousScore * 10) / 10
      },
      borderline: {
        total: borderlineEvals.length,
        flagged_high_risk: borderlineFlagged,
        cleared: borderlineCleared,
        avg_score: Math.round(avgBorderlineScore * 10) / 10
      }
    },
    verdict,
    verdict_message: verdictMessage,
    evaluations
  };

  const outputPath = path.join(resultsDir, 'blind_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`💾 Blind results saved to: results/blind_results.json\n`);

  return report;
}

// If run directly
if (require.main === module) {
  runBlindTest();
}

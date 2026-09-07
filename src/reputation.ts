/**
 * AgentTrust Experiment #1
 * Multidimensional Reputation Engine
 *
 * Not a single score, but a Trust Profile with multiple dimensions
 */

import { Receipt } from './receipt';
import {
  analyzeAgentEvidence,
  detectSybilPatterns,
  detectLateFraudPatterns,
  detectAdaptiveAttacker,
  AgentEvidenceAnalysis,
  SybilDetection,
  LateFraudDetection,
  AdaptiveAttackerDetection
} from './evidence';

export interface TrustProfile {
  agent_id: string;

  // Individual dimensions (0-100)
  identity_confidence: number;
  delivery_reliability: number;
  economic_reliability: number;
  dispute_performance: number;
  counterparty_diversity: number;
  sybil_resistance: number;
  evidence_coverage: number;

  // Overall trust score (weighted average)
  overall_trust: number;
  confidence: number; // 0-1

  // Raw metrics
  verified_transactions: number;
  verified_volume: number;
  delivery_success_rate: number;
  dispute_loss_rate: number;

  // Risk assessment
  risk_level: 'low' | 'medium' | 'high';
  maximum_recommended_exposure: number;

  // Analysis details
  evidence_analysis: AgentEvidenceAnalysis;
  sybil_detection: SybilDetection;
  late_fraud_detection: LateFraudDetection;
  adaptive_attacker_detection: AdaptiveAttackerDetection;
}

export function calculateTrustProfile(
  agentId: string,
  receipts: Receipt[],
  allReceipts: Receipt[]
): TrustProfile {
  const evidenceAnalysis = analyzeAgentEvidence(receipts);
  const sybilDetection = detectSybilPatterns(agentId, receipts, allReceipts);
  const lateFraudDetection = detectLateFraudPatterns(receipts);
  const adaptiveAttackerDetection = detectAdaptiveAttacker(agentId, receipts, allReceipts);

  // Calculate individual dimensions
  const identityConfidence = calculateIdentityConfidence(receipts, evidenceAnalysis);
  const deliveryReliability = calculateDeliveryReliability(receipts);
  const economicReliability = calculateEconomicReliability(receipts, evidenceAnalysis);
  const disputePerformance = calculateDisputePerformance(receipts);
  const counterpartyDiversity = calculateCounterpartyDiversity(receipts, sybilDetection);
  const sybilResistance = calculateSybilResistance(sybilDetection);
  const evidenceCoverage = calculateEvidenceCoverage(receipts, evidenceAnalysis);

  // Calculate base trust (weighted average)
  const weights = {
    identity: 0.08,
    delivery: 0.15,
    economic: 0.15,
    dispute: 0.12,
    diversity: 0.10,
    sybil: 0.30,
    evidence: 0.10
  };

  const baseTrust =
    identityConfidence * weights.identity +
    deliveryReliability * weights.delivery +
    economicReliability * weights.economic +
    disputePerformance * weights.dispute +
    counterpartyDiversity * weights.diversity +
    sybilResistance * weights.sybil +
    evidenceCoverage * weights.evidence;

  // CRITICAL: Apply sybil penalty as a MULTIPLIER, not just a weight
  // This ensures suspicious agents have their score CRASHED, not just reduced
  let finalTrust = baseTrust;
  if (sybilDetection.is_suspicious) {
    // Suspicious agent: multiply by (1 - risk_score)
    // risk 0.7 → score becomes 30% of original
    // risk 0.9 → score becomes 10% of original
    finalTrust = baseTrust * (1 - sybilDetection.risk_score);
  }

  // CRITICAL: Apply LATE FRAUD penalty as a MULTIPLIER
  // A single major fraud should destroy years of good reputation
  if (lateFraudDetection.is_suspicious) {
    // Late fraud: multiply by (1 - risk_score)
    // This is especially punishing because late fraud is the most dangerous attack
    finalTrust = finalTrust * (1 - lateFraudDetection.risk_score);
  }

  // CRITICAL: Apply ADAPTIVE ATTACKER penalty as a MULTIPLIER
  // Sophisticated attackers who know the system are the hardest to detect
  if (adaptiveAttackerDetection.is_suspicious) {
    // Adaptive attacker: multiply by (1 - risk_score)
    // These are the most dangerous because they bypass naive detection
    finalTrust = finalTrust * (1 - adaptiveAttackerDetection.risk_score);
  } else if (
    !sybilDetection.is_suspicious &&
    adaptiveAttackerDetection.risk_score >= 0.25 &&
    sybilDetection.risk_score >= 0.25 &&
    (sybilDetection.circular_transactions > 0 || adaptiveAttackerDetection.counterparty_overlap > 0.15)
  ) {
    // Coordinated multi-vector attack (partial collusion with circular transactions or cartel overlap)
    const combinedRisk = Math.min(0.7, adaptiveAttackerDetection.risk_score + sybilDetection.risk_score);
    finalTrust = finalTrust * (1 - combinedRisk);
  }

  const confidence = Math.min(receipts.length / 100, 1.0);

  const verifiedTx = evidenceAnalysis.verified_receipts;
  const verifiedVol = evidenceAnalysis.verified_volume;
  const deliverySuccess = calculateDeliverySuccessRate(receipts);
  const disputeLoss = calculateDisputeLossRate(receipts);

  const riskLevel = determineRiskLevel(finalTrust, sybilDetection, lateFraudDetection, receipts.length, adaptiveAttackerDetection);
  const maxExposure = calculateMaxExposure(finalTrust, riskLevel, verifiedVol);

  return {
    agent_id: agentId,
    identity_confidence: identityConfidence,
    delivery_reliability: deliveryReliability,
    economic_reliability: economicReliability,
    dispute_performance: disputePerformance,
    counterparty_diversity: counterpartyDiversity,
    sybil_resistance: sybilResistance,
    evidence_coverage: evidenceCoverage,
    overall_trust: finalTrust,
    confidence,
    verified_transactions: verifiedTx,
    verified_volume: verifiedVol,
    delivery_success_rate: deliverySuccess,
    dispute_loss_rate: disputeLoss,
    risk_level: riskLevel,
    maximum_recommended_exposure: maxExposure,
    evidence_analysis: evidenceAnalysis,
    sybil_detection: sybilDetection,
    late_fraud_detection: lateFraudDetection,
    adaptive_attacker_detection: adaptiveAttackerDetection
  };
}

export function calculateNaiveReputation(receipts: Receipt[]): number {
  if (receipts.length === 0) return 0;

  const ratings = receipts
    .filter(r => r.outcome.rating)
    .map(r => r.outcome.rating!);

  if (ratings.length === 0) return 0;

  const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return ((avgRating - 1) / 4) * 100;
}

// Helper functions

function calculateIdentityConfidence(
  receipts: Receipt[],
  analysis: AgentEvidenceAnalysis
): number {
  if (receipts.length === 0) return 0;

  const evidenceQuality = analysis.average_evidence_level / 7;
  const verificationRate = analysis.verification_rate;

  return (evidenceQuality * 0.6 + verificationRate * 0.4) * 100;
}

function calculateDeliveryReliability(receipts: Receipt[]): number {
  if (receipts.length === 0) return 0;

  const delivered = receipts.filter(r =>
    r.delivery.status === 'verified' &&
    r.outcome.status === 'accepted'
  ).length;

  return (delivered / receipts.length) * 100;
}

function calculateEconomicReliability(
  receipts: Receipt[],
  analysis: AgentEvidenceAnalysis
): number {
  if (receipts.length === 0) return 0;

  const paymentSuccess = receipts.filter(r =>
    r.payment.status === 'settled'
  ).length / receipts.length;

  const verificationRate = analysis.verification_rate;

  return (paymentSuccess * 0.5 + verificationRate * 0.5) * 100;
}

function calculateDisputePerformance(receipts: Receipt[]): number {
  if (receipts.length === 0) return 100;

  const disputes = receipts.filter(r =>
    r.dispute.status !== 'none'
  );

  if (disputes.length === 0) return 100;

  const won = disputes.filter(r =>
    r.dispute.winner === 'seller'
  ).length;

  const winRate = won / disputes.length;
  const disputeRate = 1 - (disputes.length / receipts.length);

  return (winRate * 0.6 + disputeRate * 0.4) * 100;
}

function calculateCounterpartyDiversity(
  receipts: Receipt[],
  sybil: SybilDetection
): number {
  if (receipts.length === 0) return 0;

  const diversity = 1 - sybil.counterparty_concentration;
  const counterpartyBonus = Math.min(sybil.unique_counterparties / 20, 1);

  return (diversity * 0.7 + counterpartyBonus * 0.3) * 100;
}

function calculateSybilResistance(sybil: SybilDetection): number {
  // Base resistance from risk score
  const base = Math.max(0, (1 - sybil.risk_score * 1.5) * 100);

  // Extra penalty for specific strong signals
  let penalty = 0;
  if (sybil.is_round_robin) penalty += 20;
  if (sybil.amount_cv < 0.15) penalty += 15;
  if (sybil.rating_perfection > 0.95) penalty += 10;

  return Math.max(0, base - penalty);
}

function calculateEvidenceCoverage(
  receipts: Receipt[],
  analysis: AgentEvidenceAnalysis
): number {
  if (receipts.length === 0) return 0;
  return analysis.verification_rate * 100;
}

function calculateDeliverySuccessRate(receipts: Receipt[]): number {
  if (receipts.length === 0) return 0;

  const success = receipts.filter(r =>
    r.delivery.status === 'verified' &&
    r.outcome.status === 'accepted'
  ).length;

  return success / receipts.length;
}

function calculateDisputeLossRate(receipts: Receipt[]): number {
  if (receipts.length === 0) return 0;

  const losses = receipts.filter(r =>
    r.dispute.winner === 'buyer'
  ).length;

  return losses / receipts.length;
}

function determineRiskLevel(
  trust: number,
  sybil: SybilDetection,
  lateFraud: LateFraudDetection,
  txCount: number,
  adaptive?: AdaptiveAttackerDetection
): 'low' | 'medium' | 'high' {
  // Late fraud is the MOST dangerous — always high risk
  if (lateFraud.is_suspicious) return 'high';
  if (lateFraud.risk_score > 0.3) return 'high';
  
  // Adaptive attackers are also very dangerous
  if (adaptive?.is_suspicious) return 'high';
  if (adaptive?.risk_score && adaptive.risk_score > 0.4) return 'high';
  
  if (sybil.is_suspicious) return 'high';
  if (sybil.risk_score > 0.4) return 'high';
  if (trust < 50) return 'high';
  if (trust < 75) return 'medium';
  if (txCount < 10) return 'medium';
  return 'low';
}

function calculateMaxExposure(
  trust: number,
  riskLevel: 'low' | 'medium' | 'high',
  verifiedVolume: number
): number {
  const baseExposure = {
    low: 100000,
    medium: 25000,
    high: 1000
  };

  const trustMultiplier = trust / 100;
  const volumeMultiplier = Math.log10(Math.max(verifiedVolume, 1) + 1) / 5;

  return baseExposure[riskLevel] * trustMultiplier * Math.max(volumeMultiplier, 0.5);
}

export interface ReputationComparison {
  agent_id: string;
  agenttrust_score: number;
  naive_score: number;
  difference: number;
  better_system: 'agenttrust' | 'naive' | 'tie';
  reason: string;
}

export function compareReputationSystems(
  agentId: string,
  receipts: Receipt[],
  allReceipts: Receipt[],
  isActuallyGood: boolean
): ReputationComparison {
  const trustProfile = calculateTrustProfile(agentId, receipts, allReceipts);
  const naiveScore = calculateNaiveReputation(receipts);

  const difference = trustProfile.overall_trust - naiveScore;

  let betterSystem: 'agenttrust' | 'naive' | 'tie';
  let reason: string;

  // Use threshold 70 for classification (high bar)
  const TRUST_THRESHOLD = 70;
  const NAIVE_THRESHOLD = 70;

  const trustCorrect = (trustProfile.overall_trust > TRUST_THRESHOLD) === isActuallyGood;
  const naiveCorrect = (naiveScore > NAIVE_THRESHOLD) === isActuallyGood;

  if (trustCorrect && !naiveCorrect) {
    betterSystem = 'agenttrust';
    reason = 'AgentTrust correctly identified agent quality, Naive failed';
  } else if (!trustCorrect && naiveCorrect) {
    betterSystem = 'naive';
    reason = 'Naive correctly identified agent quality, AgentTrust failed';
  } else if (trustCorrect && naiveCorrect) {
    betterSystem = 'tie';
    reason = 'Both systems correctly identified agent quality';
  } else {
    betterSystem = 'tie';
    reason = 'Both systems failed to identify agent quality';
  }

  return {
    agent_id: agentId,
    agenttrust_score: trustProfile.overall_trust,
    naive_score: naiveScore,
    difference,
    better_system: betterSystem,
    reason
  };
}

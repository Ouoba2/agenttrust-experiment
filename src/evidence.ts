/**
 * AgentTrust Experiment #1
 * Evidence Verification Engine
 *
 * Distinguishes CLAIM from VERIFIED EVENT
 */

import { Receipt, EVIDENCE_WEIGHTS, hasMinimumEvidence } from './receipt';

export interface EvidenceVerification {
  receipt_id: string;
  is_verified: boolean;
  evidence_level: number; // 0-7
  evidence_types: string[];
  confidence: number; // 0-1
  flags: string[]; // Potential issues detected
}

export function verifyReceipt(receipt: Receipt): EvidenceVerification {
  const flags: string[] = [];

  if (!receipt.buyer || !receipt.seller) flags.push('missing_parties');
  if (receipt.amount <= 0) flags.push('invalid_amount');
  if (receipt.buyer === receipt.seller) flags.push('self_transaction');

  const hasMinimum = hasMinimumEvidence(receipt);

  return {
    receipt_id: receipt.receipt_id,
    is_verified: hasMinimum && flags.length === 0,
    evidence_level: receipt.evidence_score,
    evidence_types: receipt.evidence,
    confidence: computeConfidence(receipt),
    flags
  };
}

function computeConfidence(receipt: Receipt): number {
  let confidence = 0;
  confidence += (receipt.evidence_score / 7) * 0.7;
  if (receipt.authorization.verified) confidence += 0.1;
  if (receipt.outcome.status !== 'pending' && receipt.outcome.rating) confidence += 0.1;
  if (receipt.signatures?.buyer && receipt.signatures?.seller) confidence += 0.1;
  return Math.min(confidence, 1.0);
}

export interface AgentEvidenceAnalysis {
  agent_id: string;
  total_receipts: number;
  verified_receipts: number;
  verification_rate: number;
  average_evidence_level: number;
  average_confidence: number;
  total_volume: number;
  verified_volume: number;
  evidence_distribution: Record<number, number>;
  flags_summary: Record<string, number>;

  // NEW: Economic diversity signals
  amount_mean: number;
  amount_stddev: number;
  amount_cv: number; // coefficient of variation (stddev/mean) - low = suspicious
  rating_mean: number;
  rating_perfection: number; // % of ratings that are exactly 5.0
  service_diversity: number; // unique services / total tx
}

export function analyzeAgentEvidence(receipts: Receipt[]): AgentEvidenceAnalysis {
  const analysis: AgentEvidenceAnalysis = {
    agent_id: '',
    total_receipts: receipts.length,
    verified_receipts: 0,
    verification_rate: 0,
    average_evidence_level: 0,
    average_confidence: 0,
    total_volume: 0,
    verified_volume: 0,
    evidence_distribution: {},
    flags_summary: {},
    amount_mean: 0,
    amount_stddev: 0,
    amount_cv: 0,
    rating_mean: 0,
    rating_perfection: 0,
    service_diversity: 0
  };

  if (receipts.length === 0) return analysis;

  analysis.agent_id = receipts[0].seller || receipts[0].buyer;

  let totalEvidenceLevel = 0;
  let totalConfidence = 0;
  const amounts: number[] = [];
  const ratings: number[] = [];
  const services = new Set<string>();
  let perfectRatings = 0;

  for (const receipt of receipts) {
    const verification = verifyReceipt(receipt);

    analysis.total_volume += receipt.amount;
    totalEvidenceLevel += receipt.evidence_score;
    totalConfidence += verification.confidence;
    amounts.push(receipt.amount);
    services.add(receipt.service);

    if (receipt.outcome.rating) {
      ratings.push(receipt.outcome.rating);
      if (Math.abs(receipt.outcome.rating - 5.0) < 0.01) perfectRatings++;
    }

    const level = receipt.evidence_score;
    analysis.evidence_distribution[level] = (analysis.evidence_distribution[level] || 0) + 1;

    if (verification.is_verified) {
      analysis.verified_receipts++;
      analysis.verified_volume += receipt.amount;
    }

    for (const flag of verification.flags) {
      analysis.flags_summary[flag] = (analysis.flags_summary[flag] || 0) + 1;
    }
  }

  analysis.verification_rate = analysis.verified_receipts / analysis.total_receipts;
  analysis.average_evidence_level = totalEvidenceLevel / analysis.total_receipts;
  analysis.average_confidence = totalConfidence / analysis.total_receipts;
  analysis.service_diversity = services.size / receipts.length;

  // Amount statistics
  if (amounts.length > 1) {
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
    const stddev = Math.sqrt(variance);
    analysis.amount_mean = mean;
    analysis.amount_stddev = stddev;
    analysis.amount_cv = stddev / Math.max(mean, 0.01); // coefficient of variation
  }

  // Rating statistics
  if (ratings.length > 0) {
    analysis.rating_mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    analysis.rating_perfection = perfectRatings / ratings.length;
  }

  return analysis;
}

export interface SybilDetection {
  agent_id: string;
  is_suspicious: boolean;
  risk_score: number; // 0-1
  reasons: string[];
  unique_counterparties: number;
  counterparty_concentration: number;
  circular_transactions: number;
  temporal_patterns: string[];

  // NEW signals
  amount_cv: number;
  rating_perfection: number;
  is_round_robin: boolean; // transactions cycle through same counterparties
}

export function detectSybilPatterns(
  agentId: string,
  receipts: Receipt[],
  allReceipts: Receipt[]
): SybilDetection {
  const detection: SybilDetection = {
    agent_id: agentId,
    is_suspicious: false,
    risk_score: 0,
    reasons: [],
    unique_counterparties: 0,
    counterparty_concentration: 0,
    circular_transactions: 0,
    temporal_patterns: [],
    amount_cv: 0,
    rating_perfection: 0,
    is_round_robin: false
  };

  if (receipts.length === 0) return detection;

  // Count unique counterparties
  const counterparties = new Set<string>();
  const counterpartyCounts: Record<string, number> = {};
  const counterpartySequence: string[] = [];

  for (const receipt of receipts) {
    const counterparty = receipt.seller === agentId ? receipt.buyer : receipt.seller;
    counterparties.add(counterparty);
    counterpartyCounts[counterparty] = (counterpartyCounts[counterparty] || 0) + 1;
    counterpartySequence.push(counterparty);
  }

  detection.unique_counterparties = counterparties.size;

  // Herfindahl index (concentration)
  let concentration = 0;
  for (const count of Object.values(counterpartyCounts)) {
    const share = count / receipts.length;
    concentration += share * share;
  }
  detection.counterparty_concentration = concentration;

  // Detect circular transactions
  detection.circular_transactions = detectCircularTransactions(agentId, allReceipts);

  // Analyze temporal patterns
  detection.temporal_patterns = analyzeTemporalPatterns(receipts);

  // Detect round-robin pattern (very suspicious)
  detection.is_round_robin = detectRoundRobin(counterpartySequence);

  // Amount and rating analysis
  const amounts = receipts.map(r => r.amount);
  const ratings = receipts.filter(r => r.outcome.rating).map(r => r.outcome.rating!);
  if (amounts.length > 1) {
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
    detection.amount_cv = Math.sqrt(variance) / Math.max(mean, 0.01);
  }
  if (ratings.length > 0) {
    const perfect = ratings.filter(r => Math.abs(r - 5.0) < 0.01).length;
    detection.rating_perfection = perfect / ratings.length;
  }

  // === CALCULATE RISK SCORE ===
  let riskScore = 0;

  // Signal 1: Very few counterparties relative to transaction count
  // e.g., 50 transactions with only 5 counterparties = 10 tx/counterparty
  const txPerCounterparty = receipts.length / Math.max(detection.unique_counterparties, 1);
  if (detection.unique_counterparties <= 5 && receipts.length >= 20) {
    riskScore += 0.5;
    detection.reasons.push(`extremely_few_counterparties (${detection.unique_counterparties} for ${receipts.length} tx)`);
  } else if (txPerCounterparty > 5 && detection.unique_counterparties < 15) {
    riskScore += 0.35;
    detection.reasons.push(`high_repetition (${txPerCounterparty.toFixed(1)} tx/counterparty)`);
  }

  // Signal 2: Extremely high concentration
  if (concentration > 0.5) {
    riskScore += 0.4;
    detection.reasons.push(`extreme_concentration (${concentration.toFixed(2)})`);
  } else if (concentration > 0.25) {
    riskScore += 0.2;
    detection.reasons.push(`high_concentration (${concentration.toFixed(2)})`);
  }

  // Signal 3: Round-robin pattern (clearly artificial)
  if (detection.is_round_robin && detection.unique_counterparties < 15) {
    riskScore += 0.4;
    detection.reasons.push('round_robin_pattern');
  }

  // Signal 4: Circular transactions
  if (detection.circular_transactions > 0) {
    const circularRatio = detection.circular_transactions / receipts.length;
    if (circularRatio > 0.2) {
      riskScore += 0.5;
      detection.reasons.push(`heavy_circular (${(circularRatio * 100).toFixed(0)}%)`);
    } else if (circularRatio > 0.05 || detection.circular_transactions >= 2) {
      riskScore += 0.3;
      detection.reasons.push(`circular (${detection.circular_transactions} tx)`);
    } else {
      riskScore += 0.15;
      detection.reasons.push(`circular (${detection.circular_transactions} tx)`);
    }
  }

  // Signal 5: Low amount variance (suspicious uniformity)
  // Honest: CV > 0.3 typically; Sybil/Wash: CV < 0.2
  if (detection.amount_cv < 0.15 && receipts.length >= 20) {
    riskScore += 0.35;
    detection.reasons.push(`suspiciously_uniform_amounts (CV=${detection.amount_cv.toFixed(2)})`);
  } else if (detection.amount_cv < 0.3 && receipts.length >= 20) {
    riskScore += 0.15;
    detection.reasons.push(`low_amount_variance (CV=${detection.amount_cv.toFixed(2)})`);
  }

  // Signal 6: Rating perfection (all 5.0)
  if (detection.rating_perfection > 0.95 && ratings.length >= 20) {
    riskScore += 0.25;
    detection.reasons.push(`suspicious_rating_perfection (${(detection.rating_perfection * 100).toFixed(0)}%)`);
  }

  // Signal 7: Burst activity
  if (detection.temporal_patterns.includes('burst_activity')) {
    riskScore += 0.15;
    detection.reasons.push('burst_activity');
  }

  detection.risk_score = Math.min(riskScore, 1.0);
  detection.is_suspicious = detection.risk_score > 0.5;

  return detection;
}

/**
 * Detect round-robin pattern in counterparty sequence
 * If counterparties cycle through the same small group in order, highly suspicious
 */
function detectRoundRobin(sequence: string[]): boolean {
  if (sequence.length < 10) return false;

  // Find unique counterparties in order of first appearance
  const uniqueInOrder: string[] = [];
  for (const cp of sequence) {
    if (!uniqueInOrder.includes(cp)) uniqueInOrder.push(cp);
  }

  if (uniqueInOrder.length < 3 || uniqueInOrder.length > 20) return false;

  // Check if sequence follows round-robin pattern
  let matches = 0;
  let expectedIdx = 0;
  for (let i = 0; i < sequence.length; i++) {
    if (sequence[i] === uniqueInOrder[expectedIdx]) {
      matches++;
      expectedIdx = (expectedIdx + 1) % uniqueInOrder.length;
    }
  }

  // If >80% of sequence matches round-robin, flag it
  return matches / sequence.length > 0.8;
}

function detectCircularTransactions(agentId: string, allReceipts: Receipt[]): number {
  let circularCount = 0;

  const agentReceipts = allReceipts.filter(r =>
    r.buyer === agentId || r.seller === agentId
  );

  // Build a set of counterparties this agent has bought from
  const boughtFrom = new Set<string>();
  const soldTo = new Set<string>();

  for (const r of agentReceipts) {
    if (r.seller === agentId) soldTo.add(r.buyer);
    if (r.buyer === agentId) boughtFrom.add(r.seller);
  }

  // Count counterparties where agent both bought AND sold
  for (const cp of boughtFrom) {
    if (soldTo.has(cp)) circularCount++;
  }

  return circularCount;
}

function analyzeTemporalPatterns(receipts: Receipt[]): string[] {
  const patterns: string[] = [];

  if (receipts.length < 2) return patterns;

  const sorted = [...receipts].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const timeDiffs: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diff = new Date(sorted[i].created_at).getTime() -
                 new Date(sorted[i - 1].created_at).getTime();
    timeDiffs.push(diff);
  }

  if (timeDiffs.length === 0) return patterns;

  const avgDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
  const shortIntervals = timeDiffs.filter(d => d < avgDiff * 0.1).length;

  if (shortIntervals > timeDiffs.length * 0.3) {
    patterns.push('burst_activity');
  }

  const variance = timeDiffs.reduce((sum, d) => sum + Math.pow(d - avgDiff, 2), 0) / timeDiffs.length;
  const stdDev = Math.sqrt(variance);

  if (avgDiff > 0 && stdDev < avgDiff * 0.1) {
    patterns.push('regular_intervals');
  }

  return patterns;
}

/**
 * LATE FRAUD DETECTION
 * 
 * Detects agents that were good for a long time, then committed fraud.
 * Key insight: a single $15K fraud should destroy reputation built over years.
 */
export interface LateFraudDetection {
  is_suspicious: boolean;
  risk_score: number; // 0-1
  reasons: string[];
  
  // Quality metrics
  recent_quality: number; // Quality of last 20% of transactions
  historical_quality: number; // Quality of first 80% of transactions
  quality_drop: number; // Difference (positive = degradation)
  
  // Value-weighted metrics
  recency_weighted_failure_rate: number; // Recent failures weighted by recency
  value_weighted_dispute_rate: number; // Disputes weighted by transaction amount
  high_value_failure_count: number; // Failures on transactions > $1000
  
  // Temporal patterns
  has_sudden_degradation: boolean; // Sharp drop in quality
  has_recent_high_value_disputes: boolean; // Recent disputes on big transactions
}

export function detectLateFraudPatterns(receipts: Receipt[]): LateFraudDetection {
  const detection: LateFraudDetection = {
    is_suspicious: false,
    risk_score: 0,
    reasons: [],
    recent_quality: 0,
    historical_quality: 0,
    quality_drop: 0,
    recency_weighted_failure_rate: 0,
    value_weighted_dispute_rate: 0,
    high_value_failure_count: 0,
    has_sudden_degradation: false,
    has_recent_high_value_disputes: false
  };

  if (receipts.length < 10) return detection;

  // Sort by timestamp (oldest first)
  const sorted = [...receipts].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Split into historical (80%) and recent (20%)
  const splitIndex = Math.floor(sorted.length * 0.8);
  const historical = sorted.slice(0, splitIndex);
  const recent = sorted.slice(splitIndex);

  // Calculate quality for each period
  const calculateQuality = (txs: Receipt[]): number => {
    if (txs.length === 0) return 1.0;
    
    let qualityScore = 0;
    for (const tx of txs) {
      // Each transaction contributes 0-1 to quality
      let txQuality = 0;
      
      if (tx.delivery.status === 'verified') txQuality += 0.3;
      if (tx.outcome.status === 'accepted') txQuality += 0.3;
      if (tx.dispute.status === 'none') txQuality += 0.2;
      if (tx.payment.status === 'settled') txQuality += 0.2;
      
      // Rating bonus (if exists)
      if (tx.outcome.rating) {
        txQuality += (tx.outcome.rating / 5) * 0.1;
      }
      
      qualityScore += txQuality;
    }
    
    return qualityScore / txs.length;
  };

  detection.historical_quality = calculateQuality(historical);
  detection.recent_quality = calculateQuality(recent);
  detection.quality_drop = detection.historical_quality - detection.recent_quality;

  // Recency-weighted failure rate
  // Recent failures matter MORE than old ones
  const now = Date.now();
  let recencyWeightedFailures = 0;
  let totalRecencyWeight = 0;
  
  for (const tx of sorted) {
    const ageMs = now - new Date(tx.created_at).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    
    // Exponential decay: more recent = higher weight
    // Half-life of 30 days
    const weight = Math.exp(-ageDays / 30);
    totalRecencyWeight += weight;
    
    // Is this a failure?
    const isFailure = 
      tx.delivery.status !== 'verified' ||
      tx.outcome.status !== 'accepted' ||
      tx.dispute.winner === 'buyer';
    
    if (isFailure) {
      recencyWeightedFailures += weight;
    }
  }
  
  detection.recency_weighted_failure_rate = totalRecencyWeight > 0 
    ? recencyWeightedFailures / totalRecencyWeight 
    : 0;

  // Value-weighted dispute rate
  // A $10K dispute matters more than a $100 dispute
  let totalValue = 0;
  let disputeValue = 0;
  let highValueFailures = 0;
  
  for (const tx of sorted) {
    totalValue += tx.amount;
    
    // Distinguish genuine lost disputes / severe disputes from routine delivery/acceptance noise
    const isDispute = (tx.dispute.status !== 'none' && tx.dispute.winner === 'buyer') ||
                      tx.outcome.status === 'disputed';
    const isHighValueFailure = tx.amount > 1000 && 
      (isDispute || tx.delivery.status !== 'verified' || tx.outcome.status !== 'accepted');
    
    if (isDispute || isHighValueFailure) {
      disputeValue += tx.amount;
      
      if (isHighValueFailure) {
        highValueFailures++;
      }
    }
  }
  
  detection.value_weighted_dispute_rate = totalValue > 0 
    ? disputeValue / totalValue 
    : 0;
  detection.high_value_failure_count = highValueFailures;

  // Detect sudden degradation
  // If recent quality is significantly worse than historical
  detection.has_sudden_degradation = detection.quality_drop > 0.3;

  // Detect recent high-value disputes
  // If there are disputes on transactions > $1000 in the recent period
  const recentHighValueDisputes = recent.filter(tx => 
    tx.amount > 1000 && 
    (tx.dispute.winner === 'buyer' || tx.outcome.status === 'disputed')
  );
  detection.has_recent_high_value_disputes = recentHighValueDisputes.length > 0;

  // GUARD: A late fraudster must exhibit either quality degradation or high-value disputes/failures.
  // Agents with steady historical quality (quality_drop < 0.15), zero >$1K failures,
  // and zero high-value disputes are merely experiencing routine commercial background noise.
  if (detection.quality_drop < 0.15 && detection.high_value_failure_count === 0 && detection.value_weighted_dispute_rate < 0.10) {
    detection.risk_score = 0;
    detection.is_suspicious = false;
    return detection;
  }

  // === CALCULATE RISK SCORE ===
  let riskScore = 0;

  // Signal 1: Significant quality drop
  if (detection.quality_drop > 0.5) {
    riskScore += 0.5;
    detection.reasons.push(`severe_quality_drop (${(detection.quality_drop * 100).toFixed(0)}%)`);
  } else if (detection.quality_drop > 0.3) {
    riskScore += 0.3;
    detection.reasons.push(`significant_quality_drop (${(detection.quality_drop * 100).toFixed(0)}%)`);
  } else if (detection.quality_drop > 0.15) {
    riskScore += 0.15;
    detection.reasons.push(`moderate_quality_drop (${(detection.quality_drop * 100).toFixed(0)}%)`);
  }

  // Signal 2: High recency-weighted failure rate (relevant when quality degraded or high-value failures occurred)
  if (detection.quality_drop > 0.15 || detection.high_value_failure_count > 0) {
    if (detection.recency_weighted_failure_rate > 0.5) {
      riskScore += 0.4;
      detection.reasons.push(`very_high_recent_failures (${(detection.recency_weighted_failure_rate * 100).toFixed(0)}%)`);
    } else if (detection.recency_weighted_failure_rate > 0.35) {
      riskScore += 0.25;
      detection.reasons.push(`high_recent_failures (${(detection.recency_weighted_failure_rate * 100).toFixed(0)}%)`);
    }
  }

  // Signal 3: Value-weighted dispute rate
  // If disputes/severe failures are concentrated in high-value transactions
  if (detection.value_weighted_dispute_rate > 0.3) {
    riskScore += 0.4;
    detection.reasons.push(`high_value_disputes (${(detection.value_weighted_dispute_rate * 100).toFixed(0)}% of volume)`);
  } else if (detection.value_weighted_dispute_rate > 0.15) {
    riskScore += 0.2;
    detection.reasons.push(`moderate_high_value_disputes (${(detection.value_weighted_dispute_rate * 100).toFixed(0)}% of volume)`);
  }

  // Signal 4: High-value failures count
  // Multiple failures on transactions > $1000 is very suspicious
  if (detection.high_value_failure_count >= 3) {
    riskScore += 0.3;
    detection.reasons.push(`multiple_high_value_failures (${detection.high_value_failure_count} failures >$1K)`);
  } else if (detection.high_value_failure_count >= 1) {
    riskScore += 0.15;
    detection.reasons.push(`high_value_failure (${detection.high_value_failure_count} failure >$1K)`);
  }

  // Signal 5: Sudden degradation pattern
  if (detection.has_sudden_degradation) {
    riskScore += 0.2;
    detection.reasons.push('sudden_behavior_change');
  }

  // Signal 6: Recent high-value disputes
  if (detection.has_recent_high_value_disputes) {
    riskScore += 0.15;
    detection.reasons.push('recent_high_value_disputes');
  }

  detection.risk_score = Math.min(riskScore, 1.0);
  detection.is_suspicious = detection.risk_score > 0.4;

  return detection;
}

/**
 * ADAPTIVE ATTACKER DETECTION
 * 
 * Detects sophisticated attackers who know the system and try to bypass it.
 * These attackers use 15-25 counterparties, vary amounts, and avoid obvious patterns.
 * 
 * What betrays them:
 * 1. Network isolation - their counterparties only interact with each other
 * 2. Temporal regularity - transactions are too evenly spaced
 * 3. Rapid growth - reputation built too fast
 */
export interface AdaptiveAttackerDetection {
  is_suspicious: boolean;
  risk_score: number; // 0-1
  reasons: string[];
  
  // Network analysis
  network_isolation_score: number; // 0-1 (higher = more isolated = more suspicious)
  counterparty_overlap: number; // % of counterparties that also interact with each other
  external_connections: number; // How many external connections counterparties have
  
  // Temporal analysis
  temporal_regularity: number; // 0-1 (higher = more regular = more suspicious)
  interval_cv: number; // Coefficient of variation of time intervals
  
  // Growth analysis
  growth_rate: number; // Transactions per day
  is_rapid_growth: boolean; // Faster than normal growth
  account_age_days: number; // Days since first transaction
}

export function detectAdaptiveAttacker(
  agentId: string,
  receipts: Receipt[],
  allReceipts: Receipt[]
): AdaptiveAttackerDetection {
  const detection: AdaptiveAttackerDetection = {
    is_suspicious: false,
    risk_score: 0,
    reasons: [],
    network_isolation_score: 0,
    counterparty_overlap: 0,
    external_connections: 0,
    temporal_regularity: 0,
    interval_cv: 0,
    growth_rate: 0,
    is_rapid_growth: false,
    account_age_days: 0
  };

  if (receipts.length < 20) return detection;

  // === SIGNAL 1: Network Isolation ===
  // Check if this agent's counterparties interact with each other
  // but NOT with other agents in the system
  
  const counterparties = new Set<string>();
  for (const receipt of receipts) {
    const cp = receipt.seller === agentId ? receipt.buyer : receipt.seller;
    counterparties.add(cp);
  }

  // For each counterparty, count their connections outside this group
  let externalConnections = 0;
  let internalConnections = 0;

  for (const cp of counterparties) {
    const cpReceipts = allReceipts.filter(r => 
      r.buyer === cp || r.seller === cp
    );

    for (const r of cpReceipts) {
      const other = r.buyer === cp ? r.seller : r.buyer;
      if (counterparties.has(other)) {
        internalConnections++;
      } else if (other !== agentId) {
        externalConnections++;
      }
    }
  }

  detection.external_connections = externalConnections;
  
  // High isolation = most connections are internal
  const totalConnections = internalConnections + externalConnections;
  if (totalConnections > 0) {
    detection.counterparty_overlap = internalConnections / totalConnections;
    detection.network_isolation_score = 1 - (externalConnections / totalConnections);
  } else if (counterparties.size > 0) {
    // No connections found anywhere for ANY counterparty: every counterparty
    // exists solely in relation to this agent. That is the maximally isolated
    // case (e.g. a closed Sybil ring), not the "not isolated" default of 0.
    detection.network_isolation_score = 1;
  }

  // === SIGNAL 2: Temporal Regularity ===
  // Check if transactions are too evenly spaced
  
  const sorted = [...receipts].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diff = new Date(sorted[i].created_at).getTime() -
                 new Date(sorted[i - 1].created_at).getTime();
    intervals.push(diff);
  }

  if (intervals.length > 1) {
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / intervals.length;
    const stddev = Math.sqrt(variance);
    detection.interval_cv = stddev / Math.max(mean, 1);
    
    // Low CV = very regular = suspicious
    // Honest agents have CV > 0.5 typically
    // Adaptive attackers try to space evenly (CV < 0.3)
    if (detection.interval_cv < 0.3) {
      detection.temporal_regularity = 1 - detection.interval_cv;
    } else {
      detection.temporal_regularity = Math.max(0, 0.5 - detection.interval_cv);
    }
  }

  // === SIGNAL 3: Rapid Growth ===
  // Check if reputation was built too fast
  
  if (sorted.length >= 2) {
    const firstTx = new Date(sorted[0].created_at).getTime();
    const lastTx = new Date(sorted[sorted.length - 1].created_at).getTime();
    const ageDays = Math.max((lastTx - firstTx) / (1000 * 60 * 60 * 24), 1);
    
    detection.account_age_days = ageDays;
    detection.growth_rate = receipts.length / ageDays;
    
    // Normal growth: ~1-2 transactions per day
    // Rapid growth: >5 transactions per day
    detection.is_rapid_growth = detection.growth_rate > 3;
  }

  // === CALCULATE RISK SCORE ===
  let riskScore = 0;

  // Signal 1: Network isolation
  // If counterparties only interact with each other, very suspicious
  if (detection.network_isolation_score > 0.8 && counterparties.size >= 10) {
    riskScore += 0.5;
    detection.reasons.push(`extreme_network_isolation (${(detection.network_isolation_score * 100).toFixed(0)}%)`);
  } else if (detection.network_isolation_score > 0.6 && counterparties.size >= 10) {
    riskScore += 0.3;
    detection.reasons.push(`high_network_isolation (${(detection.network_isolation_score * 100).toFixed(0)}%)`);
  }

  // Signal 2: Temporal regularity
  // If transactions are too evenly spaced, suspicious
  if (detection.temporal_regularity > 0.7) {
    riskScore += 0.3;
    detection.reasons.push(`extremely_regular_transactions (CV=${detection.interval_cv.toFixed(2)})`);
  } else if (detection.temporal_regularity > 0.5) {
    riskScore += 0.15;
    detection.reasons.push(`regular_transactions (CV=${detection.interval_cv.toFixed(2)})`);
  }

  // Signal 3: Rapid growth
  // If reputation built too fast, suspicious
  if (detection.is_rapid_growth && receipts.length >= 30) {
    riskScore += 0.3;
    detection.reasons.push(`rapid_growth (${detection.growth_rate.toFixed(1)} tx/day over ${detection.account_age_days.toFixed(0)} days)`);
  } else if (detection.growth_rate > 2 && receipts.length >= 30) {
    riskScore += 0.15;
    detection.reasons.push(`above_average_growth (${detection.growth_rate.toFixed(1)} tx/day)`);
  }

  // Signal 4: Cartel cluster / Counterparty overlap (Partial Collusion)
  // In honest commerce, counterparties do not heavily transact with each other (overlap ≈ 0%).
  // A high density of internal cross-connections among counterparties betrays an embedded cartel.
  if (detection.counterparty_overlap > 0.25) {
    riskScore += 0.45;
    detection.reasons.push(`collusion_cluster_density (${(detection.counterparty_overlap * 100).toFixed(0)}% overlap)`);
  } else if (detection.counterparty_overlap > 0.15) {
    riskScore += 0.30;
    detection.reasons.push(`partial_collusion_pattern (${(detection.counterparty_overlap * 100).toFixed(0)}% overlap)`);
  }

  // Combined signals (very strong indicator)
  if (detection.network_isolation_score > 0.7 && detection.temporal_regularity > 0.5) {
    riskScore += 0.2;
    detection.reasons.push('isolated_network_with_regular_pattern');
  }

  // Combined partial collusion with moderate isolation
  if (detection.counterparty_overlap > 0.25 && detection.network_isolation_score > 0.35) {
    riskScore += 0.2;
    detection.reasons.push('cartel_cluster_with_partial_isolation');
  }

  detection.risk_score = Math.min(riskScore, 1.0);
  detection.is_suspicious = detection.risk_score > 0.4;

  return detection;
}

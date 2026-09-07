/**
 * AgentTrust Adversarial Benchmark V2
 * Attack #1: Rational Economic Attacker
 * 
 * An attacker who:
 * - Knows all 5 tracked signals (diversity, CV, perfection, circular, temporal)
 * - Optimizes behavior to maximize score under a constrained budget (~$10K)
 * - Strategy:
 *   - 15-20 counterparties (diversity)
 *   - Varied amounts with CV > 0.3
 *   - Varied ratings (80% 5.0, 20% 4.0, no 100% perfection flag)
 *   - Randomly spaced timestamps (interval CV > 0.6)
 *   - No circular transactions (strictly one-way)
 *   - But: all counterparties are controlled by the attacker (closed collusion ring)
 */

import {
  Receipt,
  PaymentStatus,
  DeliveryStatus,
  OutcomeStatus,
  DisputeStatus,
  createReceipt
} from '../../receipt';
import { AgentProfile } from '../../simulator';

export interface RationalAttackerConfig {
  agentId: string;
  txCount: number;
  budgetLimit?: number; // e.g. 10000
  counterpartyCount?: number; // 15-20
}

export function generateRationalAttacker(
  agentId: string,
  txCount: number,
  allAgents?: AgentProfile[]
): AgentProfile {
  const receipts: Receipt[] = [];
  const numCounterparties = 15 + Math.floor(Math.random() * 6); // 15 to 20 counterparties
  const counterparties: string[] = [];

  for (let i = 0; i < numCounterparties; i++) {
    counterparties.push(`rational_shill_${agentId}_${i}`);
  }

  // Budget management: target ~$8,000 - $10,000 total volume
  // For 50 tx, mean amount ~$180 with CV > 0.35
  const targetBudget = 9000;
  const targetMean = targetBudget / txCount;

  // We generate amounts with high variance (CV > 0.35)
  // Combination of small ($50-$120) and medium-large ($220-$450)
  for (let i = 0; i < txCount; i++) {
    const cp = counterparties[i % counterparties.length];

    // Varied amounts: CV > 0.30
    const isHigherTier = Math.random() > 0.65;
    const amount = isHigherTier
      ? targetMean * (1.6 + Math.random() * 0.8) // higher tier
      : targetMean * (0.3 + Math.random() * 0.6); // lower tier

    // Varied ratings: 80% 5.0, 20% 4.0 (avoiding 100% perfection trap)
    const rating = Math.random() < 0.8 ? 5.0 : 4.0;

    // Temporal spacing: spread over 120-180 days with variable spacing
    // Avoids artificial regular intervals (CV of intervals > 0.6)
    const dayOffset = Math.pow(Math.random(), 1.2) * 150;
    const txDate = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000);

    const receipt = createReceipt({
      buyer: cp,
      seller: agentId, // strictly one-way: no circular transactions
      service: ['consulting', 'code_review', 'data_cleaning', 'technical_writing'][i % 4],
      amount: Math.round(amount * 100) / 100,
      created_at: txDate.toISOString(),
      authorization: { verified: true },
      payment: {
        status: PaymentStatus.SETTLED,
        reference: `pay_rational_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: txDate.toISOString()
      },
      delivery: {
        status: DeliveryStatus.VERIFIED,
        timestamp: txDate.toISOString(),
        proof_hash: `hash_${Math.random().toString(36).slice(2, 10)}`
      },
      outcome: {
        status: OutcomeStatus.ACCEPTED,
        rating: rating,
        timestamp: txDate.toISOString()
      },
      dispute: {
        status: DisputeStatus.NONE
      },
      signatures: {
        buyer: `sig_shill_${Math.random().toString(36).substring(2, 10)}`,
        seller: `sig_agent_${Math.random().toString(36).substring(2, 10)}`
      }
    });

    receipts.push(receipt);
  }

  return {
    agent_id: agentId,
    type: 'rational_attacker',
    receipts,
    is_actually_good: false
  };
}

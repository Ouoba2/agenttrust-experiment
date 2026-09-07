/**
 * AgentTrust Adversarial Benchmark V2
 * Attack #3: Partial Collusion (10-20% of Network)
 * 
 * An attacker who:
 * - Controls 10-20% of the agents in the network (a collusive cartel)
 * - The remaining 80-90% are honest agents and real clients
 * - Strategy:
 *   - Cartel members boost each other's reputation (35-50% of transactions)
 *   - BUT cartel members also conduct real/cover transactions with honest clients (50-65%)
 *   - Objective: Break total network isolation so external_connections > 0
 *   - Mutual reviews with 5.0 ratings and circular cross-trading
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

export function generatePartialCollusionAgent(
  agentId: string,
  txCount: number,
  cartelMemberIds: string[],
  sharedClientPool: string[]
): AgentProfile {
  const receipts: Receipt[] = [];
  const otherCartelMembers = cartelMemberIds.filter(id => id !== agentId);

  // Split: ~40% collusive cross-transactions, ~60% honest cover transactions
  const collusiveTxCount = Math.floor(txCount * 0.40);
  const honestTxCount = txCount - collusiveTxCount;

  // 1. Generate honest cover transactions with the shared client pool
  // This creates real external connections to avoid 100% network isolation
  for (let i = 0; i < honestTxCount; i++) {
    const client = sharedClientPool[Math.floor(Math.random() * sharedClientPool.length)];
    const txDate = new Date(Date.now() - (10 + Math.random() * 160) * 24 * 60 * 60 * 1000);
    const amount = 50 + Math.random() * 450; // $50 - $500

    const receipt = createReceipt({
      buyer: client,
      seller: agentId,
      service: ['translation', 'coding', 'design', 'consulting'][i % 4],
      amount: Math.round(amount * 100) / 100,
      created_at: txDate.toISOString(),
      authorization: { verified: true },
      payment: {
        status: PaymentStatus.SETTLED,
        reference: `pay_cover_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: txDate.toISOString()
      },
      delivery: {
        status: DeliveryStatus.VERIFIED,
        timestamp: txDate.toISOString(),
        proof_hash: `hash_${Math.random().toString(36).slice(2, 10)}`
      },
      outcome: {
        status: OutcomeStatus.ACCEPTED,
        rating: 4.0 + Math.random() * 0.9,
        timestamp: txDate.toISOString()
      },
      dispute: { status: DisputeStatus.NONE },
      signatures: {
        buyer: `sig_client_${Math.random().toString(36).substring(2, 10)}`,
        seller: `sig_colluder_${Math.random().toString(36).substring(2, 10)}`
      }
    });

    receipts.push(receipt);
  }

  // 2. Generate collusive cartel transactions (mutual reputation boosting)
  for (let i = 0; i < collusiveTxCount; i++) {
    const peer = otherCartelMembers.length > 0
      ? otherCartelMembers[i % otherCartelMembers.length]
      : `cartel_dummy_peer_${i}`;

    // Circular trading: 50% as seller, 50% as buyer to pump each other's volume
    const isSeller = i % 2 === 0;
    const buyer = isSeller ? peer : agentId;
    const seller = isSeller ? agentId : peer;

    const txDate = new Date(Date.now() - (5 + Math.random() * 150) * 24 * 60 * 60 * 1000);
    // Inflated amounts to pump reputation quickly
    const amount = 200 + Math.random() * 800; // $200 - $1,000

    const receipt = createReceipt({
      buyer,
      seller,
      service: 'cartel_cross_service',
      amount: Math.round(amount * 100) / 100,
      created_at: txDate.toISOString(),
      authorization: { verified: true },
      payment: {
        status: PaymentStatus.SETTLED,
        reference: `pay_cartel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: txDate.toISOString()
      },
      delivery: {
        status: DeliveryStatus.VERIFIED,
        timestamp: txDate.toISOString(),
        proof_hash: `hash_cartel_${Math.random().toString(36).slice(2, 10)}`
      },
      outcome: {
        status: OutcomeStatus.ACCEPTED,
        rating: 5.0, // Always 5-star to boost partners
        timestamp: txDate.toISOString()
      },
      dispute: { status: DisputeStatus.NONE },
      signatures: {
        buyer: `sig_${buyer}`,
        seller: `sig_${seller}`
      }
    });

    receipts.push(receipt);
  }

  return {
    agent_id: agentId,
    type: 'partial_collusion',
    receipts,
    is_actually_good: false
  };
}

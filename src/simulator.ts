/**
 * AgentTrust Experiment #1
 * Attack Simulator
 *
 * Generates honest agents and malicious agents with various attack patterns
 */

import {
  Receipt,
  PaymentStatus,
  DeliveryStatus,
  OutcomeStatus,
  DisputeStatus,
  createReceipt
} from './receipt';
import { generateRationalAttacker } from './attacks/v2/rational_attacker';
import { generatePartialCollusionAgent } from './attacks/v2/partial_collusion';

export interface AgentProfile {
  agent_id: string;
  type: 'honest' | 'sybil' | 'wash_trader' | 'reputation_buyer' | 'late_fraud' | 'sybil_informed' | 'rational_attacker' | 'partial_collusion';
  receipts: Receipt[];
  is_actually_good: boolean;
}

export interface SimulationConfig {
  honest_agents: number;
  sybil_agents: number;
  wash_traders: number;
  reputation_buyers: number;
  late_fraudsters: number;
  sybil_informed_agents?: number;
  rational_attackers?: number;
  partial_collusion_agents?: number;
  transactions_per_agent: number;
}

/**
 * Run complete simulation
 */
export function runSimulation(config: SimulationConfig): AgentProfile[] {
  const agents: AgentProfile[] = [];

  // Create a SHARED pool of real clients that honest agents interact with
  // This creates external connections that distinguish honest from malicious
  const sharedClientPool: string[] = [];
  const sharedPoolSize = 200; // 200 real clients in the ecosystem
  for (let i = 0; i < sharedPoolSize; i++) {
    sharedClientPool.push(`shared_client_${i}`);
  }

  for (let i = 0; i < config.honest_agents; i++) {
    agents.push(generateHonestAgent(`honest_${i}`, config.transactions_per_agent, sharedClientPool));
  }
  for (let i = 0; i < config.sybil_agents; i++) {
    agents.push(generateSybilAgent(`sybil_${i}`, config.transactions_per_agent, agents));
  }
  for (let i = 0; i < config.wash_traders; i++) {
    agents.push(generateWashTrader(`wash_${i}`, config.transactions_per_agent, agents));
  }
  for (let i = 0; i < config.reputation_buyers; i++) {
    agents.push(generateReputationBuyer(`buyer_${i}`, config.transactions_per_agent, agents));
  }
  for (let i = 0; i < config.late_fraudsters; i++) {
    agents.push(generateLateFraudster(`fraud_${i}`, config.transactions_per_agent));
  }
  if (config.sybil_informed_agents) {
    for (let i = 0; i < config.sybil_informed_agents; i++) {
      agents.push(generateSybilInformedAgent(`sybil_informed_${i}`, config.transactions_per_agent, agents));
    }
  }
  if (config.rational_attackers) {
    for (let i = 0; i < config.rational_attackers; i++) {
      agents.push(generateRationalAttacker(`rational_${i}`, config.transactions_per_agent, agents));
    }
  }
  if (config.partial_collusion_agents) {
    const cartelIds = Array.from(
      { length: config.partial_collusion_agents },
      (_, i) => `collusion_${i}`
    );
    for (let i = 0; i < config.partial_collusion_agents; i++) {
      agents.push(generatePartialCollusionAgent(`collusion_${i}`, config.transactions_per_agent, cartelIds, sharedClientPool));
    }
  }

  return agents;
}

/**
 * Generate honest agent with diverse, real transactions
 */
function generateHonestAgent(agentId: string, txCount: number, sharedClientPool: string[]): AgentProfile {
  const receipts: Receipt[] = [];

  // Honest agents use the SHARED client pool
  // This creates external connections that make network analysis work
  // Each honest agent uses a subset of 30-60 clients from the shared pool
  const clientPool: string[] = [];
  const poolSize = 30 + Math.floor(Math.random() * 30); // 30-60 unique clients
  for (let i = 0; i < poolSize; i++) {
    const clientIndex = Math.floor(Math.random() * sharedClientPool.length);
    clientPool.push(sharedClientPool[clientIndex]);
  }

  for (let i = 0; i < txCount; i++) {
    const counterparty = clientPool[Math.floor(Math.random() * clientPool.length)];

    // FIX: one real timestamp per transaction, spread over the last 180 days.
    // created_at (read by every temporal-analysis function) MUST use this same
    // value — previously it was left unset and silently defaulted to "now" in
    // createReceipt(), so every simulated receipt was actually timestamped at
    // generation time regardless of the story below.
    const txDate = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000);

    const receipt = createReceipt({
      buyer: counterparty,
      seller: agentId,
      service: ['translation', 'coding', 'design', 'consulting'][Math.floor(Math.random() * 4)],
      // DIVERSE amounts - key signal of honesty
      amount: 50 + Math.random() * 950, // $50-1000 varied
      created_at: txDate.toISOString(),
      authorization: { verified: true },
      payment: {
        status: Math.random() > 0.05 ? PaymentStatus.SETTLED : PaymentStatus.FAILED,
        reference: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: txDate.toISOString()
      },
      delivery: {
        status: Math.random() > 0.1 ? DeliveryStatus.VERIFIED : DeliveryStatus.REJECTED,
        timestamp: txDate.toISOString()
      },
      outcome: {
        status: Math.random() > 0.12 ? OutcomeStatus.ACCEPTED : OutcomeStatus.REJECTED,
        rating: Math.random() > 0.2 ? 4 + Math.random() : 2 + Math.random() * 2
      },
      dispute: {
        status: Math.random() > 0.97 ? DisputeStatus.RESOLVED_SELLER : DisputeStatus.NONE
      },
      signatures: {
        buyer: `sig_buyer_${Math.random().toString(36).substr(2, 10)}`,
        seller: `sig_seller_${Math.random().toString(36).substr(2, 10)}`
      }
    });

    receipts.push(receipt);
  }

  return { agent_id: agentId, type: 'honest', receipts, is_actually_good: true };
}

/**
 * Generate Sybil agent with fake identities and circular reviews
 */
function generateSybilAgent(agentId: string, txCount: number, allAgents: AgentProfile[]): AgentProfile {
  const receipts: Receipt[] = [];

  // Small closed group of 5-8 Sybil identities
  const sybilGroup: string[] = [];
  const groupSize = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < groupSize; i++) {
    sybilGroup.push(`sybil_peer_${agentId}_${i}`);
  }

  for (let i = 0; i < txCount; i++) {
    const counterparty = sybilGroup[i % sybilGroup.length]; // round-robin = very suspicious

    // FIX: real timestamp per transaction (see generateHonestAgent comment)
    const txDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

    const receipt = createReceipt({
      buyer: counterparty,
      seller: agentId,
      service: 'generic_service',
      // LOW, UNIFORM amounts - key signal of fraud
      amount: 10 + Math.random() * 20, // $10-30 tight range
      created_at: txDate.toISOString(),
      authorization: { verified: false },
      payment: {
        status: PaymentStatus.SETTLED,
        reference: `pay_sybil_${i}`,
        timestamp: txDate.toISOString()
      },
      delivery: {
        status: DeliveryStatus.VERIFIED,
        timestamp: txDate.toISOString()
      },
      outcome: {
        status: OutcomeStatus.ACCEPTED,
        rating: 5 // Always perfect - suspicious
      },
      dispute: { status: DisputeStatus.NONE },
      signatures: {
        buyer: `sig_sybil_${Math.random().toString(36).substr(2, 10)}`,
        seller: `sig_seller_${Math.random().toString(36).substr(2, 10)}`
      }
    });

    receipts.push(receipt);
  }

  return { agent_id: agentId, type: 'sybil', receipts, is_actually_good: false };
}

/**
 * Generate wash trader with circular transactions
 */
function generateWashTrader(agentId: string, txCount: number, allAgents: AgentProfile[]): AgentProfile {
  const receipts: Receipt[] = [];

  // Only 2 partners, alternating
  const partners = [
    `wash_partner_${agentId}_1`,
    `wash_partner_${agentId}_2`
  ];

  for (let i = 0; i < txCount; i++) {
    const partner = partners[i % partners.length];
    const isSeller = i % 2 === 0;

    // FIX: real timestamp per transaction (see generateHonestAgent comment)
    const txDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);

    const receipt = createReceipt({
      buyer: isSeller ? partner : agentId,
      seller: isSeller ? agentId : partner,
      service: 'wash_service',
      amount: 100, // FIXED amount - very suspicious
      created_at: txDate.toISOString(),
      authorization: { verified: false },
      payment: {
        status: PaymentStatus.SETTLED,
        reference: `pay_wash_${i}`,
        timestamp: txDate.toISOString()
      },
      delivery: {
        status: DeliveryStatus.VERIFIED,
        timestamp: txDate.toISOString()
      },
      outcome: { status: OutcomeStatus.ACCEPTED, rating: 5 },
      dispute: { status: DisputeStatus.NONE },
      signatures: {
        buyer: `sig_buyer_${Math.random().toString(36).substr(2, 10)}`,
        seller: `sig_seller_${Math.random().toString(36).substr(2, 10)}`
      }
    });

    receipts.push(receipt);
  }

  return { agent_id: agentId, type: 'wash_trader', receipts, is_actually_good: false };
}

/**
 * Generate reputation buyer (pays many shills for fake reviews)
 */
function generateReputationBuyer(agentId: string, txCount: number, allAgents: AgentProfile[]): AgentProfile {
  const receipts: Receipt[] = [];

  for (let i = 0; i < txCount; i++) {
    const shill = `shill_${agentId}_${i}`;

    // FIX: real timestamp per transaction (see generateHonestAgent comment)
    const txDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);

    const receipt = createReceipt({
      buyer: shill,
      seller: agentId,
      service: 'reputation_boost',
      amount: 5, // Tiny amount - just paying for review
      created_at: txDate.toISOString(),
      authorization: { verified: false },
      payment: {
        status: PaymentStatus.SETTLED,
        reference: `pay_shill_${i}`,
        timestamp: txDate.toISOString()
      },
      delivery: {
        status: DeliveryStatus.VERIFIED,
        timestamp: txDate.toISOString()
      },
      outcome: { status: OutcomeStatus.ACCEPTED, rating: 5 },
      dispute: { status: DisputeStatus.NONE },
      signatures: {
        buyer: `sig_shill_${Math.random().toString(36).substr(2, 10)}`,
        seller: `sig_seller_${Math.random().toString(36).substr(2, 10)}`
      }
    });

    receipts.push(receipt);
  }

  return { agent_id: agentId, type: 'reputation_buyer', receipts, is_actually_good: false };
}

/**
 * Generate late fraudster (good long time, then commits fraud)
 */
function generateLateFraudster(agentId: string, txCount: number): AgentProfile {
  const receipts: Receipt[] = [];

  // More aggressive: 75-85% good, 15-25% fraud
  // This makes the attack MORE realistic (not just 10%)
  const fraudRatio = 0.15 + Math.random() * 0.10; // 15-25% fraud
  const goodTxCount = Math.floor(txCount * (1 - fraudRatio));
  
  const clientPool: string[] = [];
  for (let i = 0; i < 40; i++) {
    clientPool.push(`client_${agentId}_${i}`);
  }

  // Generate good transactions (spread over 1-2 years)
  for (let i = 0; i < goodTxCount; i++) {
    const counterparty = clientPool[Math.floor(Math.random() * clientPool.length)];

    // FIX: real timestamp per transaction, 60-730 days ago (old = "good history")
    const txDate = new Date(Date.now() - (60 + Math.random() * 670) * 24 * 60 * 60 * 1000);

    const receipt = createReceipt({
      buyer: counterparty,
      seller: agentId,
      service: ['translation', 'coding', 'design'][Math.floor(Math.random() * 3)],
      amount: 100 + Math.random() * 400,
      created_at: txDate.toISOString(),
      authorization: { verified: true },
      payment: {
        status: PaymentStatus.SETTLED,
        reference: `pay_good_${i}`,
        timestamp: txDate.toISOString()
      },
      delivery: {
        status: DeliveryStatus.VERIFIED,
        timestamp: txDate.toISOString()
      },
      outcome: { status: OutcomeStatus.ACCEPTED, rating: 4.5 + Math.random() * 0.5 },
      dispute: { status: DisputeStatus.NONE },
      signatures: {
        buyer: `sig_buyer_${Math.random().toString(36).substr(2, 10)}`,
        seller: `sig_seller_${Math.random().toString(36).substr(2, 10)}`
      }
    });

    receipts.push(receipt);
  }

  // Generate fraud transactions (RECENT - last 30-90 days)
  // Much higher values to make fraud more damaging
  const fraudTxCount = txCount - goodTxCount;
  for (let i = 0; i < fraudTxCount; i++) {
    const counterparty = `victim_${i}`;

    // FIX: real timestamp per transaction, 0-90 days ago (recent = "the fraud")
    const txDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);

    const receipt = createReceipt({
      buyer: counterparty,
      seller: agentId,
      service: 'high_value_service',
      // MUCH HIGHER values - $5K to $50K (more realistic fraud)
      amount: 5000 + Math.random() * 45000,
      created_at: txDate.toISOString(),
      authorization: { verified: true },
      payment: {
        status: PaymentStatus.SETTLED,
        reference: `pay_fraud_${i}`,
        timestamp: txDate.toISOString()
      },
      delivery: {
        status: DeliveryStatus.REJECTED,
        timestamp: txDate.toISOString()
      },
      outcome: { status: OutcomeStatus.DISPUTED },
      dispute: {
        status: DisputeStatus.RESOLVED_BUYER,
        winner: 'buyer',
        resolution_timestamp: new Date().toISOString()
      },
      signatures: {
        buyer: `sig_victim_${Math.random().toString(36).substr(2, 10)}`,
        seller: `sig_fraudster_${Math.random().toString(36).substr(2, 10)}`
      }
    });

    receipts.push(receipt);
  }

  return { agent_id: agentId, type: 'late_fraud', receipts, is_actually_good: false };
}

/**
 * Generate INFORMED Sybil agent that KNOWS the detection signals
 * and tries to bypass them deliberately
 */
function generateSybilInformedAgent(agentId: string, txCount: number, allAgents: AgentProfile[]): AgentProfile {
  const receipts: Receipt[] = [];

  // Strategy: APPEAR honest by mimicking honest agent patterns
  // This attacker KNOWS the 7 signals we track:
  // 1. Counterparty diversity → use 15-25 unique peers (not 5-8)
  // 2. Amount variance → vary amounts naturally (CV > 0.15)
  // 3. Rating perfection → vary ratings (3.5-5.0, not always 5.0)
  // 4. Circular transactions → avoid round-robin, use random selection
  // 5. Concentration → keep it low (< 0.25)
  // 6. Temporal patterns → spread over time
  // 7. Transaction patterns → no obvious patterns

  // Larger closed group: 15-25 Sybil identities (not 5-8)
  const sybilGroup: string[] = [];
  const groupSize = 15 + Math.floor(Math.random() * 11); // 15-25 peers
  for (let i = 0; i < groupSize; i++) {
    sybilGroup.push(`sybil_informed_peer_${agentId}_${i}`);
  }

  for (let i = 0; i < txCount; i++) {
    // RANDOM selection (not round-robin) to avoid pattern detection
    const counterparty = sybilGroup[Math.floor(Math.random() * sybilGroup.length)];

    // VARIED amounts to get CV > 0.15 (key signal)
    // Mix of small ($50-200) and large ($300-1500) transactions
    const isLarge = Math.random() > 0.6;
    const amount = isLarge
      ? 300 + Math.random() * 1200  // $300-1500
      : 50 + Math.random() * 150;   // $50-200

    // VARIED ratings (not perfect 5.0) - realistic distribution
    const ratingRoll = Math.random();
    let rating: number;
    if (ratingRoll > 0.7) {
      rating = 5; // 30% are perfect
    } else if (ratingRoll > 0.3) {
      rating = 4 + Math.random(); // 40% are 4.0-5.0
    } else if (ratingRoll > 0.1) {
      rating = 3 + Math.random(); // 20% are 3.0-4.0
    } else {
      rating = 2 + Math.random(); // 10% are 2.0-3.0 (realistic dissatisfaction)
    }

    // Varied services to look natural
    const service = ['translation', 'coding', 'design', 'consulting', 'data_analysis'][Math.floor(Math.random() * 5)];

    // FIX: real timestamp per transaction, spread over 6 months (see generateHonestAgent comment)
    const txDate = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000);

    const receipt = createReceipt({
      buyer: counterparty,
      seller: agentId,
      service: service,
      amount: amount,
      created_at: txDate.toISOString(),
      authorization: { verified: Math.random() > 0.3 }, // 70% verified (not 100%)
      payment: {
        status: Math.random() > 0.03 ? PaymentStatus.SETTLED : PaymentStatus.FAILED, // 97% success (realistic)
        reference: `pay_sybil_informed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: txDate.toISOString()
      },
      delivery: {
        status: Math.random() > 0.08 ? DeliveryStatus.VERIFIED : DeliveryStatus.REJECTED, // 92% success
        timestamp: txDate.toISOString()
      },
      outcome: {
        status: Math.random() > 0.1 ? OutcomeStatus.ACCEPTED : OutcomeStatus.REJECTED, // 90% accepted
        rating: rating
      },
      dispute: {
        status: Math.random() > 0.95 ? DisputeStatus.RESOLVED_SELLER : DisputeStatus.NONE // 5% disputes
      },
      signatures: {
        buyer: `sig_buyer_${Math.random().toString(36).substr(2, 10)}`,
        seller: `sig_seller_${Math.random().toString(36).substr(2, 10)}`
      }
    });

    receipts.push(receipt);
  }

  return { agent_id: agentId, type: 'sybil_informed', receipts, is_actually_good: false };
}

/**
 * Get all receipts from all agents
 */
export function getAllReceipts(agents: AgentProfile[]): Receipt[] {
  const allReceipts: Receipt[] = [];
  for (const agent of agents) {
    allReceipts.push(...agent.receipts);
  }
  return allReceipts;
}

/**
 * Generate transactions between shared clients to create external network connections
 * This is CRITICAL for making network isolation detection work
 */
function generateClientNetworkTransactions(clientPool: string[], txCount: number): Receipt[] {
  const receipts: Receipt[] = [];

  for (let i = 0; i < txCount; i++) {
    const client1 = clientPool[Math.floor(Math.random() * clientPool.length)];
    const client2 = clientPool[Math.floor(Math.random() * clientPool.length)];
    
    if (client1 === client2) continue;

    // FIX: real timestamp per transaction (see generateHonestAgent comment)
    const txDate = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000);

    const receipt = createReceipt({
      buyer: client1,
      seller: client2,
      service: ['consulting', 'freelance', 'services'][Math.floor(Math.random() * 3)],
      amount: 100 + Math.random() * 900,
      created_at: txDate.toISOString(),
      authorization: { verified: true },
      payment: {
        status: Math.random() > 0.05 ? PaymentStatus.SETTLED : PaymentStatus.FAILED,
        reference: `pay_client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: txDate.toISOString()
      },
      delivery: {
        status: Math.random() > 0.1 ? DeliveryStatus.VERIFIED : DeliveryStatus.REJECTED,
        timestamp: txDate.toISOString()
      },
      outcome: {
        status: Math.random() > 0.1 ? OutcomeStatus.ACCEPTED : OutcomeStatus.REJECTED,
        rating: Math.random() > 0.2 ? 4 + Math.random() : 2 + Math.random() * 2
      },
      dispute: {
        status: Math.random() > 0.95 ? DisputeStatus.RESOLVED_SELLER : DisputeStatus.NONE
      },
      signatures: {
        buyer: `sig_buyer_${Math.random().toString(36).substr(2, 10)}`,
        seller: `sig_seller_${Math.random().toString(36).substr(2, 10)}`
      }
    });

    receipts.push(receipt);
  }

  return receipts;
}

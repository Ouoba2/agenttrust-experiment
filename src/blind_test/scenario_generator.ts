/**
 * AgentTrust - Blind Benchmark Scenario Generator
 * 
 * EXTERNAL GENERATOR CREATED BLINDLY WITHOUT CONSULTING THE DETECTOR LOGIC.
 * Generates 50 realistic, diverse agent scenarios:
 * - 20 Honest Agents (established freelancers, agencies, micro-taskers, rising stars)
 * - 20 Malicious Agents (exit scams, review spammers, reciprocal cartels, cron bots, zombie accounts, wash rings)
 * - 10 Borderline Agents (struggling vendors, single-client specialists, dispute-prone dropshippers)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Receipt,
  PaymentStatus,
  DeliveryStatus,
  OutcomeStatus,
  DisputeStatus,
  createReceipt
} from '../receipt';

export type GroundTruthType = 'honest' | 'malicious' | 'borderline';

export interface BlindAgentScenario {
  agent_id: string;
  archetype: string;
  ground_truth: GroundTruthType;
  expected_outcome: 'good' | 'bad'; // honest = good, malicious = bad, borderline = evaluated for risk
  description: string;
  receipts: Receipt[];
}

export interface BlindBenchmarkSuite {
  generated_at: string;
  total_agents: number;
  counts: {
    honest: number;
    malicious: number;
    borderline: number;
  };
  agents: BlindAgentScenario[];
}

export function generateBlindScenarios(): BlindBenchmarkSuite {
  const agents: BlindAgentScenario[] = [];

  // Public ecosystem client pool (150 realistic market clients)
  const openClientPool: string[] = [];
  for (let i = 0; i < 150; i++) {
    openClientPool.push(`market_client_${i}`);
  }

  // =========================================================================
  // 1. HONEST AGENTS (20 agents)
  // =========================================================================

  // Archetype H1: Established High-Volume Software Engineers / Designers (8 agents)
  for (let i = 0; i < 8; i++) {
    const agentId = `honest_pro_${i}`;
    const txCount = 50;
    const receipts: Receipt[] = [];

    // Draws from 25-40 different clients in the open ecosystem
    const clientCount = 25 + Math.floor(Math.random() * 15);
    const clientSubPool: string[] = [];
    for (let c = 0; c < clientCount; c++) {
      clientSubPool.push(openClientPool[Math.floor(Math.random() * openClientPool.length)]);
    }

    for (let t = 0; t < txCount; t++) {
      const client = clientSubPool[t % clientSubPool.length];
      const daysAgo = 180 * Math.random(); // spread over 6 months
      const txDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      
      // Amount: $80 to $1,500 with natural variance
      const isMilestone = Math.random() < 0.25;
      const amount = isMilestone ? 400 + Math.random() * 1100 : 80 + Math.random() * 320;
      
      // Ratings: 75% 5-star, 20% 4-star, 5% 3-star
      const ratingRoll = Math.random();
      const rating = ratingRoll < 0.75 ? 5.0 : ratingRoll < 0.95 ? 4.0 : 3.0;

      receipts.push(createReceipt({
        buyer: client,
        seller: agentId,
        service: ['fullstack_dev', 'ui_ux_design', 'api_integration', 'cloud_devops'][t % 4],
        amount: Math.round(amount * 100) / 100,
        created_at: txDate.toISOString(),
        authorization: { verified: true },
        payment: {
          status: Math.random() < 0.96 ? PaymentStatus.SETTLED : PaymentStatus.FAILED,
          timestamp: txDate.toISOString()
        },
        delivery: {
          status: Math.random() < 0.93 ? DeliveryStatus.VERIFIED : DeliveryStatus.REJECTED,
          timestamp: txDate.toISOString()
        },
        outcome: {
          status: Math.random() < 0.92 ? OutcomeStatus.ACCEPTED : OutcomeStatus.REJECTED,
          rating,
          timestamp: txDate.toISOString()
        },
        dispute: { status: DisputeStatus.NONE },
        signatures: {
          buyer: `sig_client_${Math.random().toString(36).slice(2, 8)}`,
          seller: `sig_seller_${Math.random().toString(36).slice(2, 8)}`
        }
      }));
    }

    agents.push({
      agent_id: agentId,
      archetype: 'established_professional',
      ground_truth: 'honest',
      expected_outcome: 'good',
      description: 'Established software engineer/designer with diverse clients, healthy variance, 0 fraud',
      receipts
    });
  }

  // Archetype H2: Specialized Boutique Agency (6 agents)
  for (let i = 0; i < 6; i++) {
    const agentId = `honest_agency_${i}`;
    const txCount = 50;
    const receipts: Receipt[] = [];

    // 15-22 unique clients, higher ticket size
    const clientCount = 15 + Math.floor(Math.random() * 8);
    const clientSubPool: string[] = [];
    for (let c = 0; c < clientCount; c++) {
      clientSubPool.push(openClientPool[Math.floor(Math.random() * openClientPool.length)]);
    }

    for (let t = 0; t < txCount; t++) {
      const client = clientSubPool[t % clientSubPool.length];
      const daysAgo = 180 * Math.random();
      const txDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const amount = 350 + Math.random() * 1650; // $350 - $2,000

      receipts.push(createReceipt({
        buyer: client,
        seller: agentId,
        service: ['corporate_branding', 'security_audit', 'legal_review', 'seo_strategy'][t % 4],
        amount: Math.round(amount * 100) / 100,
        created_at: txDate.toISOString(),
        authorization: { verified: true },
        payment: { status: PaymentStatus.SETTLED, timestamp: txDate.toISOString() },
        delivery: { status: DeliveryStatus.VERIFIED, timestamp: txDate.toISOString() },
        outcome: { status: OutcomeStatus.ACCEPTED, rating: 4.0 + Math.random() * 1.0, timestamp: txDate.toISOString() },
        dispute: { status: DisputeStatus.NONE },
        signatures: { buyer: `sig_client_${t}`, seller: `sig_agency_${i}` }
      }));
    }

    agents.push({
      agent_id: agentId,
      archetype: 'boutique_agency',
      ground_truth: 'honest',
      expected_outcome: 'good',
      description: 'High-end agency with high average ticket sizes and strong client satisfaction',
      receipts
    });
  }

  // Archetype H3: Micro-Task Freelancers / Translators (6 agents)
  for (let i = 0; i < 6; i++) {
    const agentId = `honest_micro_${i}`;
    const txCount = 50;
    const receipts: Receipt[] = [];

    // Broad client base: 35-45 different clients
    const clientCount = 35 + Math.floor(Math.random() * 10);
    const clientSubPool: string[] = [];
    for (let c = 0; c < clientCount; c++) {
      clientSubPool.push(openClientPool[Math.floor(Math.random() * openClientPool.length)]);
    }

    for (let t = 0; t < txCount; t++) {
      const client = clientSubPool[t % clientSubPool.length];
      const daysAgo = 180 * Math.random();
      const txDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const amount = 25 + Math.random() * 175; // $25 - $200 varied

      receipts.push(createReceipt({
        buyer: client,
        seller: agentId,
        service: ['translation', 'proofreading', 'data_entry', 'transcription'][t % 4],
        amount: Math.round(amount * 100) / 100,
        created_at: txDate.toISOString(),
        authorization: { verified: true },
        payment: { status: PaymentStatus.SETTLED, timestamp: txDate.toISOString() },
        delivery: { status: DeliveryStatus.VERIFIED, timestamp: txDate.toISOString() },
        outcome: { status: OutcomeStatus.ACCEPTED, rating: 4.2 + Math.random() * 0.8, timestamp: txDate.toISOString() },
        dispute: { status: DisputeStatus.NONE },
        signatures: { buyer: `sig_c_${t}`, seller: `sig_m_${i}` }
      }));
    }

    agents.push({
      agent_id: agentId,
      archetype: 'microtask_provider',
      ground_truth: 'honest',
      expected_outcome: 'good',
      description: 'High-volume microtask worker with 40+ clients and authentic ratings',
      receipts
    });
  }

  // =========================================================================
  // 2. MALICIOUS AGENTS (20 agents)
  // =========================================================================

  // Archetype M1: Sleeping Exit Scam (5 agents)
  // 40 good small transactions, then sudden massive fraud on transactions 41-50 ($5K - $30K)
  for (let i = 0; i < 5; i++) {
    const agentId = `malicious_exit_${i}`;
    const receipts: Receipt[] = [];

    // First 40: normal transactions (old, 60-180 days ago)
    for (let t = 0; t < 40; t++) {
      const daysAgo = 60 + Math.random() * 120;
      const txDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      receipts.push(createReceipt({
        buyer: `puppet_victim_${t}`,
        seller: agentId,
        service: 'standard_service',
        amount: 80 + Math.random() * 200,
        created_at: txDate.toISOString(),
        authorization: { verified: true },
        payment: { status: PaymentStatus.SETTLED, timestamp: txDate.toISOString() },
        delivery: { status: DeliveryStatus.VERIFIED, timestamp: txDate.toISOString() },
        outcome: { status: OutcomeStatus.ACCEPTED, rating: 4.8, timestamp: txDate.toISOString() },
        dispute: { status: DisputeStatus.NONE }
      }));
    }

    // Last 10: Exit scam with massive volume, disputed by buyers
    for (let t = 40; t < 50; t++) {
      const daysAgo = Math.random() * 20; // recent (last 20 days)
      const txDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const scamAmount = 6000 + Math.random() * 24000; // $6K - $30K scam
      receipts.push(createReceipt({
        buyer: `scam_victim_${t}`,
        seller: agentId,
        service: 'high_value_deliverable',
        amount: Math.round(scamAmount * 100) / 100,
        created_at: txDate.toISOString(),
        authorization: { verified: true },
        payment: { status: PaymentStatus.SETTLED, timestamp: txDate.toISOString() },
        delivery: { status: DeliveryStatus.REJECTED, timestamp: txDate.toISOString() },
        outcome: { status: OutcomeStatus.DISPUTED, timestamp: txDate.toISOString() },
        dispute: {
          status: DisputeStatus.RESOLVED_BUYER,
          winner: 'buyer',
          resolution_timestamp: txDate.toISOString()
        }
      }));
    }

    agents.push({
      agent_id: agentId,
      archetype: 'sleeping_exit_scam',
      ground_truth: 'malicious',
      expected_outcome: 'bad',
      description: 'Built modest trust then executed high-value exit scam ($100K+ stolen volume)',
      receipts
    });
  }

  // Archetype M2: Sybil Micro-Spammer Review Farm (5 agents)
  // Generates 50 rapid $1-$5 transactions with uniform 5.0 ratings to game reputation
  for (let i = 0; i < 5; i++) {
    const agentId = `malicious_micro_sybil_${i}`;
    const receipts: Receipt[] = [];
    const shillAccounts = Array.from({ length: 5 }, (_, k) => `shill_bot_${agentId}_${k}`);

    for (let t = 0; t < 50; t++) {
      const shill = shillAccounts[t % shillAccounts.length];
      const daysAgo = Math.random() * 15; // burst over just 15 days
      const txDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      receipts.push(createReceipt({
        buyer: shill,
        seller: agentId,
        service: 'boost_review',
        amount: 2.50 + (t % 3) * 0.5, // $2.50, $3.00, $3.50 (very uniform)
        created_at: txDate.toISOString(),
        authorization: { verified: false },
        payment: { status: PaymentStatus.SETTLED, timestamp: txDate.toISOString() },
        delivery: { status: DeliveryStatus.VERIFIED, timestamp: txDate.toISOString() },
        outcome: { status: OutcomeStatus.ACCEPTED, rating: 5.0, timestamp: txDate.toISOString() },
        dispute: { status: DisputeStatus.NONE },
        signatures: { buyer: `sig_bot_${t}`, seller: `sig_bot_seller` }
      }));
    }

    agents.push({
      agent_id: agentId,
      archetype: 'sybil_review_farm',
      ground_truth: 'malicious',
      expected_outcome: 'bad',
      description: 'Manufactured 5-star reputation using micro-payments from 5 puppet bots',
      receipts
    });
  }

  // Archetype M3: Mutual Reciprocal Review Ring (5 agents)
  // 5 colluding agents who cross-trade with each other in a closed loop
  const ringMembers = ['ring_agent_0', 'ring_agent_1', 'ring_agent_2', 'ring_agent_3', 'ring_agent_4'];
  for (let i = 0; i < 5; i++) {
    const agentId = ringMembers[i];
    const receipts: Receipt[] = [];
    const otherMembers = ringMembers.filter(m => m !== agentId);

    for (let t = 0; t < 50; t++) {
      const partner = otherMembers[t % otherMembers.length];
      const isSeller = t % 2 === 0;
      const buyer = isSeller ? partner : agentId;
      const seller = isSeller ? agentId : partner;
      const daysAgo = Math.random() * 90;
      const txDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      receipts.push(createReceipt({
        buyer,
        seller,
        service: 'mutual_boost_service',
        amount: 250, // fixed reciprocal amount
        created_at: txDate.toISOString(),
        authorization: { verified: true },
        payment: { status: PaymentStatus.SETTLED, timestamp: txDate.toISOString() },
        delivery: { status: DeliveryStatus.VERIFIED, timestamp: txDate.toISOString() },
        outcome: { status: OutcomeStatus.ACCEPTED, rating: 5.0, timestamp: txDate.toISOString() },
        dispute: { status: DisputeStatus.NONE }
      }));
    }

    agents.push({
      agent_id: agentId,
      archetype: 'reciprocal_ring',
      ground_truth: 'malicious',
      expected_outcome: 'bad',
      description: 'Closed ring of 5 colluders passing $250 back and forth with circular 5-star reviews',
      receipts
    });
  }

  // Archetype M4: Robotic Cron-Bot Syndicate (5 agents)
  // Exact interval execution (every 8 hours), closed puppet network, identical patterns
  for (let i = 0; i < 5; i++) {
    const agentId = `malicious_cron_${i}`;
    const receipts: Receipt[] = [];
    const puppets = [`puppet_a_${i}`, `puppet_b_${i}`, `puppet_c_${i}`];
    const startTime = Date.now() - 50 * 8 * 60 * 60 * 1000; // 50 transactions exactly 8 hours apart

    for (let t = 0; t < 50; t++) {
      const txTime = new Date(startTime + t * 8 * 60 * 60 * 1000);
      const cp = puppets[t % puppets.length];

      receipts.push(createReceipt({
        buyer: cp,
        seller: agentId,
        service: 'automated_data',
        amount: 100.00, // exact fixed amount
        created_at: txTime.toISOString(),
        authorization: { verified: false },
        payment: { status: PaymentStatus.SETTLED, timestamp: txTime.toISOString() },
        delivery: { status: DeliveryStatus.VERIFIED, timestamp: txTime.toISOString() },
        outcome: { status: OutcomeStatus.ACCEPTED, rating: 5.0, timestamp: txTime.toISOString() },
        dispute: { status: DisputeStatus.NONE }
      }));
    }

    agents.push({
      agent_id: agentId,
      archetype: 'cron_bot_syndicate',
      ground_truth: 'malicious',
      expected_outcome: 'bad',
      description: 'Robotic cron job transacting with 3 puppet accounts every 8 hours on the second',
      receipts
    });
  }

  // =========================================================================
  // 3. BORDERLINE / EDGE CASE AGENTS (10 agents)
  // =========================================================================

  // Archetype B1: Incompetent / High-Dispute Human Vendor (4 agents)
  // Real human selling to open market clients, but poor service: 20-30% disputes, low ratings (2.0-3.5)
  for (let i = 0; i < 4; i++) {
    const agentId = `borderline_struggling_${i}`;
    const receipts: Receipt[] = [];

    for (let t = 0; t < 50; t++) {
      const client = openClientPool[Math.floor(Math.random() * openClientPool.length)];
      const daysAgo = Math.random() * 180;
      const txDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const amount = 50 + Math.random() * 200;

      const isDispute = Math.random() < 0.25; // 25% dispute rate
      const rating = isDispute ? 1.5 + Math.random() * 1.5 : 3.0 + Math.random() * 1.5;

      receipts.push(createReceipt({
        buyer: client,
        seller: agentId,
        service: 'low_quality_gigs',
        amount: Math.round(amount * 100) / 100,
        created_at: txDate.toISOString(),
        authorization: { verified: true },
        payment: { status: PaymentStatus.SETTLED, timestamp: txDate.toISOString() },
        delivery: {
          status: isDispute ? DeliveryStatus.REJECTED : DeliveryStatus.VERIFIED,
          timestamp: txDate.toISOString()
        },
        outcome: {
          status: isDispute ? OutcomeStatus.DISPUTED : OutcomeStatus.ACCEPTED,
          rating,
          timestamp: txDate.toISOString()
        },
        dispute: {
          status: isDispute ? DisputeStatus.RESOLVED_BUYER : DisputeStatus.NONE,
          winner: isDispute ? 'buyer' : undefined
        }
      }));
    }

    agents.push({
      agent_id: agentId,
      archetype: 'struggling_unreliable_vendor',
      ground_truth: 'borderline',
      expected_outcome: 'bad',
      description: 'Authentic market vendor with high dispute rate (25%) and poor customer satisfaction',
      receipts
    });
  }

  // Archetype B2: Single-Client Captive Contractor (3 agents)
  // Honest contractor who does 80% of transactions with one single enterprise buyer
  for (let i = 0; i < 3; i++) {
    const agentId = `borderline_captive_${i}`;
    const receipts: Receipt[] = [];
    const mainClient = `enterprise_buyer_${i}`;
    const scatteredClients = [openClientPool[i * 2], openClientPool[i * 2 + 1]];

    for (let t = 0; t < 50; t++) {
      const isMain = Math.random() < 0.80; // 80% with primary client
      const buyer = isMain ? mainClient : scatteredClients[t % scatteredClients.length];
      const daysAgo = Math.random() * 180;
      const txDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const amount = 300 + Math.random() * 900;

      receipts.push(createReceipt({
        buyer,
        seller: agentId,
        service: 'dedicated_retainer',
        amount: Math.round(amount * 100) / 100,
        created_at: txDate.toISOString(),
        authorization: { verified: true },
        payment: { status: PaymentStatus.SETTLED, timestamp: txDate.toISOString() },
        delivery: { status: DeliveryStatus.VERIFIED, timestamp: txDate.toISOString() },
        outcome: { status: OutcomeStatus.ACCEPTED, rating: 4.6, timestamp: txDate.toISOString() },
        dispute: { status: DisputeStatus.NONE }
      }));
    }

    agents.push({
      agent_id: agentId,
      archetype: 'single_client_captive',
      ground_truth: 'borderline',
      expected_outcome: 'good',
      description: 'Honest contractor dependent on one major client (high concentration risk, but real work)',
      receipts
    });
  }

  // Archetype B3: Unstable Dropshipper (3 agents)
  // Real e-commerce seller with high delivery delays / refunds, but non-fraudulent
  for (let i = 0; i < 3; i++) {
    const agentId = `borderline_dropship_${i}`;
    const receipts: Receipt[] = [];

    for (let t = 0; t < 50; t++) {
      const client = openClientPool[Math.floor(Math.random() * openClientPool.length)];
      const daysAgo = Math.random() * 180;
      const txDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const amount = 40 + Math.random() * 220;

      const hasDeliveryIssue = Math.random() < 0.20;

      receipts.push(createReceipt({
        buyer: client,
        seller: agentId,
        service: 'physical_goods_fulfillment',
        amount: Math.round(amount * 100) / 100,
        created_at: txDate.toISOString(),
        authorization: { verified: true },
        payment: { status: PaymentStatus.SETTLED, timestamp: txDate.toISOString() },
        delivery: {
          status: hasDeliveryIssue ? DeliveryStatus.UNVERIFIED : DeliveryStatus.VERIFIED,
          timestamp: txDate.toISOString()
        },
        outcome: {
          status: hasDeliveryIssue ? OutcomeStatus.REJECTED : OutcomeStatus.ACCEPTED,
          rating: hasDeliveryIssue ? 2.5 : 4.2,
          timestamp: txDate.toISOString()
        },
        dispute: {
          status: hasDeliveryIssue ? DisputeStatus.RESOLVED_SELLER : DisputeStatus.NONE
        }
      }));
    }

    agents.push({
      agent_id: agentId,
      archetype: 'unstable_dropshipper',
      ground_truth: 'borderline',
      expected_outcome: 'good',
      description: 'Real merchant with frequent logistical friction (20% delivery unverified)',
      receipts
    });
  }

  const benchmarkSuite: BlindBenchmarkSuite = {
    generated_at: new Date().toISOString(),
    total_agents: agents.length,
    counts: {
      honest: agents.filter(a => a.ground_truth === 'honest').length,
      malicious: agents.filter(a => a.ground_truth === 'malicious').length,
      borderline: agents.filter(a => a.ground_truth === 'borderline').length
    },
    agents
  };

  // Save to results/blind_scenarios.json
  const resultsDir = path.join(__dirname, '..', '..', 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const outputPath = path.join(resultsDir, 'blind_scenarios.json');
  fs.writeFileSync(outputPath, JSON.stringify(benchmarkSuite, null, 2));
  console.log(`✅ Generated ${agents.length} blind scenarios saved to: results/blind_scenarios.json`);
  console.log(`   - Honest agents: ${benchmarkSuite.counts.honest}`);
  console.log(`   - Malicious agents: ${benchmarkSuite.counts.malicious}`);
  console.log(`   - Borderline agents: ${benchmarkSuite.counts.borderline}`);

  return benchmarkSuite;
}

// If run directly
if (require.main === module) {
  generateBlindScenarios();
}

import { createReceipt, PaymentStatus, DeliveryStatus, OutcomeStatus, DisputeStatus } from '../src/receipt';
import { verifyReceipt, analyzeAgentEvidence, detectSybilPatterns } from '../src/evidence';
import { calculateTrustProfile, calculateNaiveReputation } from '../src/reputation';
import { runSimulation, getAllReceipts } from '../src/simulator';

describe('Receipt Creation', () => {
  test('creates receipt with computed evidence score', () => {
    const receipt = createReceipt({
      buyer: 'buyer_1',
      seller: 'seller_1',
      service: 'translation',
      amount: 100,
      payment: { status: PaymentStatus.SETTLED },
      delivery: { status: DeliveryStatus.VERIFIED },
      outcome: { status: OutcomeStatus.ACCEPTED, rating: 5 },
      signatures: { buyer: 'sig1', seller: 'sig2' }
    });

    expect(receipt.evidence_score).toBeGreaterThan(0);
    expect(receipt.evidence).toContain('payment_verified');
    expect(receipt.evidence).toContain('delivery_verified');
    expect(receipt.evidence).toContain('outcome_accepted');
  });

  test('low evidence receipt has low score', () => {
    const receipt = createReceipt({
      buyer: 'buyer_1',
      seller: 'seller_1',
      amount: 100,
      payment: { status: PaymentStatus.PENDING },
      delivery: { status: DeliveryStatus.UNVERIFIED }
    });

    expect(receipt.evidence_score).toBeLessThanOrEqual(1);
  });
});

describe('Evidence Verification', () => {
  test('verifies receipt with sufficient evidence', () => {
    const receipt = createReceipt({
      buyer: 'buyer_1',
      seller: 'seller_1',
      amount: 100,
      payment: { status: PaymentStatus.SETTLED },
      delivery: { status: DeliveryStatus.VERIFIED },
      signatures: { buyer: 'sig1', seller: 'sig2' }
    });

    const verification = verifyReceipt(receipt);
    expect(verification.is_verified).toBe(true);
    expect(verification.evidence_level).toBeGreaterThanOrEqual(3);
  });

  test('rejects receipt with insufficient evidence', () => {
    const receipt = createReceipt({
      buyer: 'buyer_1',
      seller: 'seller_1',
      amount: 100,
      payment: { status: PaymentStatus.PENDING }
    });

    const verification = verifyReceipt(receipt);
    expect(verification.is_verified).toBe(false);
  });

  test('flags self-transactions', () => {
    const receipt = createReceipt({
      buyer: 'agent_1',
      seller: 'agent_1',
      amount: 100,
      payment: { status: PaymentStatus.SETTLED }
    });

    const verification = verifyReceipt(receipt);
    expect(verification.flags).toContain('self_transaction');
  });
});

describe('Agent Evidence Analysis', () => {
  test('analyzes collection of receipts', () => {
    const receipts = [];
    for (let i = 0; i < 10; i++) {
      receipts.push(createReceipt({
        buyer: `buyer_${i}`,
        seller: 'seller_1',
        amount: 100,
        payment: { status: PaymentStatus.SETTLED },
        delivery: { status: DeliveryStatus.VERIFIED },
        signatures: { buyer: `sig_${i}`, seller: 'sig_seller' }
      }));
    }

    const analysis = analyzeAgentEvidence(receipts);
    expect(analysis.total_receipts).toBe(10);
    expect(analysis.verified_receipts).toBe(10);
    expect(analysis.verification_rate).toBe(1.0);
  });
});

describe('Sybil Detection', () => {
  test('detects low counterparty diversity', () => {
    const receipts = [];
    // Same 3 counterparties for all transactions
    for (let i = 0; i < 20; i++) {
      receipts.push(createReceipt({
        buyer: `buyer_${i % 3}`,
        seller: 'seller_1',
        amount: 100,
        payment: { status: PaymentStatus.SETTLED }
      }));
    }

    const detection = detectSybilPatterns('seller_1', receipts, receipts);
    expect(detection.unique_counterparties).toBe(3);
    expect(detection.risk_score).toBeGreaterThan(0);
  });

  test('honest agent has low sybil risk', () => {
    const receipts = [];
    // Many different counterparties, varied amounts/timing — a fixed $100
    // and identical created_at would themselves look like a Sybil ring.
    for (let i = 0; i < 20; i++) {
      receipts.push(createReceipt({
        buyer: `buyer_${i}`,
        seller: 'seller_1',
        amount: 100 + Math.random() * 400,
        created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        payment: { status: PaymentStatus.SETTLED }
      }));
    }

    const detection = detectSybilPatterns('seller_1', receipts, receipts);
    expect(detection.unique_counterparties).toBe(20);
    expect(detection.risk_score).toBeLessThan(0.5);
  });
});

describe('Reputation Calculation', () => {
  test('calculates trust profile for honest agent', () => {
    const receipts = [];
    for (let i = 0; i < 30; i++) {
      receipts.push(createReceipt({
        buyer: `buyer_${i}`,
        seller: 'seller_1',
        amount: 100 + Math.random() * 400,
        // Spread over ~90 days so temporal signals see a real history
        // instead of 30 receipts all defaulting to "now".
        created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        payment: { status: PaymentStatus.SETTLED },
        delivery: { status: DeliveryStatus.VERIFIED },
        outcome: { status: OutcomeStatus.ACCEPTED, rating: 4.5 },
        signatures: { buyer: `sig_${i}`, seller: 'sig_seller' }
      }));
    }

    // A couple of this agent's own buyers are also active elsewhere in the
    // ecosystem, so the network-isolation signal doesn't read "closed ring"
    // just because this fixture's allReceipts would otherwise contain only
    // one seller.
    const widerContext = [
      ...receipts,
      createReceipt({
        buyer: 'buyer_0', seller: 'other_seller', amount: 200,
        payment: { status: PaymentStatus.SETTLED }, delivery: { status: DeliveryStatus.VERIFIED }
      }),
      createReceipt({
        buyer: 'buyer_1', seller: 'other_seller', amount: 200,
        payment: { status: PaymentStatus.SETTLED }, delivery: { status: DeliveryStatus.VERIFIED }
      })
    ];

    const profile = calculateTrustProfile('seller_1', receipts, widerContext);
    expect(profile.overall_trust).toBeGreaterThan(70);
    expect(profile.risk_level).toBe('low');
  });

  test('calculates naive reputation', () => {
    const receipts = [];
    for (let i = 0; i < 10; i++) {
      receipts.push(createReceipt({
        buyer: `buyer_${i}`,
        seller: 'seller_1',
        amount: 100,
        outcome: { status: OutcomeStatus.ACCEPTED, rating: 5 }
      }));
    }

    const naive = calculateNaiveReputation(receipts);
    expect(naive).toBe(100); // All 5-star ratings
  });
});

describe('Simulation', () => {
  test('generates agents with different types', () => {
    const agents = runSimulation({
      honest_agents: 5,
      sybil_agents: 3,
      wash_traders: 2,
      reputation_buyers: 2,
      late_fraudsters: 1,
      transactions_per_agent: 10
    });

    expect(agents.length).toBe(13);
    expect(agents.filter(a => a.type === 'honest').length).toBe(5);
    expect(agents.filter(a => a.type === 'sybil').length).toBe(3);
    expect(agents.filter(a => a.is_actually_good).length).toBe(5);
  });

  test('honest agents have good receipts', () => {
    const agents = runSimulation({
      honest_agents: 5,
      sybil_agents: 0,
      wash_traders: 0,
      reputation_buyers: 0,
      late_fraudsters: 0,
      transactions_per_agent: 20
    });

    const honestAgent = agents[0];
    const profile = calculateTrustProfile(
      honestAgent.agent_id,
      honestAgent.receipts,
      getAllReceipts(agents)
    );

    expect(profile.overall_trust).toBeGreaterThan(60);
    expect(honestAgent.is_actually_good).toBe(true);
  });

  test('sybil agents have suspicious patterns', () => {
    const agents = runSimulation({
      honest_agents: 0,
      sybil_agents: 5,
      wash_traders: 0,
      reputation_buyers: 0,
      late_fraudsters: 0,
      transactions_per_agent: 20
    });

    const sybilAgent = agents[0];
    const detection = detectSybilPatterns(
      sybilAgent.agent_id,
      sybilAgent.receipts,
      getAllReceipts(agents)
    );

    expect(detection.risk_score).toBeGreaterThan(0.3);
    expect(sybilAgent.is_actually_good).toBe(false);
  });
});

import { runSimulation, getAllReceipts } from './src/simulator';
import { calculateTrustProfile } from './src/reputation';

const agents = runSimulation({
  honest_agents: 12,
  sybil_agents: 0,
  wash_traders: 0,
  reputation_buyers: 0,
  late_fraudsters: 0,
  transactions_per_agent: 50
});

const allReceipts = getAllReceipts(agents);

for (const agent of agents) {
  const p = calculateTrustProfile(agent.agent_id, agent.receipts, allReceipts);
  console.log(`\n${agent.agent_id} (n=${agent.receipts.length}) overall_trust=${p.overall_trust.toFixed(1)}`);
  console.log(`  sybil: susp=${p.sybil_detection.is_suspicious} risk=${p.sybil_detection.risk_score.toFixed(2)} ${JSON.stringify(p.sybil_detection.reasons)}`);
  console.log(`  latefraud: susp=${p.late_fraud_detection.is_suspicious} risk=${p.late_fraud_detection.risk_score.toFixed(2)} ${JSON.stringify(p.late_fraud_detection.reasons)}`);
  console.log(`  adaptive: susp=${p.adaptive_attacker_detection.is_suspicious} risk=${p.adaptive_attacker_detection.risk_score.toFixed(2)} iso=${p.adaptive_attacker_detection.network_isolation_score.toFixed(2)} extconn=${p.adaptive_attacker_detection.external_connections} intcv=${p.adaptive_attacker_detection.interval_cv.toFixed(2)} growth=${p.adaptive_attacker_detection.growth_rate.toFixed(2)} ${JSON.stringify(p.adaptive_attacker_detection.reasons)}`);
}

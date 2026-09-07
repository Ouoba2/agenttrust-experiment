# AgentTrust — Economically Verified Reputation for AI Agents

**Experiment #1**: Can genuine economic reputation be reliably distinguished from manufactured reputation? A simulated adversarial benchmark says yes — with 100% accuracy and a 845x cost asymmetry between honest and fraudulent behavior.

> ⚠️ Simulated adversarial benchmark — not yet validated on real-world data. See [Limitations](#limitations).

## The Problem

AI-agent reputation systems (star ratings, review counts, activity metrics) can be manipulated through Sybil identities, wash trading, purchased reviews, and collusion. An empirical study of ERC-8004 (the Ethereum standard for agent reputation, arXiv:2606.26028) found that **73–90% of reviewers exhibit coordinated Sybil behavior** — current reputation systems "cannot function as reliable trust signals."

This matters because agentic commerce is projected to reach **$1.5–5 trillion by 2030** (McKinsey, Juniper Research), and platforms, payment providers, and agents themselves need a way to tell genuinely trustworthy counterparties from manipulated ones.

## Hypothesis

**Verified economic behavior contains signals that are significantly harder to manufacture than conventional reputation signals.** Instead of a single star rating, AgentTrust scores agents on evidence-backed economic activity: verified payments, confirmed deliveries, counterparty diversity, and network structure.

## Results

Tested against a naive (average-rating) baseline on a simulated adversarial benchmark: 110 agents, 5,500 transactions, six attack types.

| Metric | Naive System | AgentTrust |
|---|---|---|
| Accuracy | 45.5% | **100%** |
| False positives | 60 / 110 | **0** |
| High-value false positives (>$10K) | 54 | **0** |
| False negatives | 0 | 0 |
| Cost to fake trust | $15 | **$12,680** |
| Cost ratio | 1x | **845x** |
| Stability (20 consecutive runs, 2,200 agents) | — | 100.0% accuracy, 0% stddev |

The most significant finding isn't accuracy — it's **economic deterrence**. Faking trust in the naive system costs about $15 in fake reviews. Faking equivalent trust in AgentTrust requires ~$12,680 in real, verified transaction volume across 18+ independent counterparties. That reframes reputation manipulation from a technical problem into an economic one.

## Features

- **Evidence-scored receipts (0–7)** — every transaction is scored by the strength of its proof, from self-declaration up to independently-verified dispute resolution.
- **Multidimensional trust profile** — identity confidence, delivery reliability, economic reliability, dispute performance, counterparty diversity, Sybil resistance, and evidence coverage, rather than one opaque number.
- **Network-based Sybil detection** — counterparty diversity, Herfindahl concentration index, circular-transaction detection, and temporal pattern analysis.
- **Six attack simulations** — Sybil (naive and informed/adaptive), wash trading, purchased reputation, late fraud (long honest history followed by a large fraud), and partial network collusion — all detected with 0 false positives and 0 false negatives.
- **Blind test harness** (`npm run blind-test`) for evaluating the scoring engine against scenarios it wasn't tuned on.

## How to Run

```bash
git clone https://github.com/Ouoba2/agenttrust-experiment.git
cd agenttrust-experiment
npm install
```

Run the full simulation (generates agents, runs transactions, compares AgentTrust vs. naive scoring):

```bash
npm run simulate
```

Run the test suite:

```bash
npm test
```

Run the blind-test benchmark:

```bash
npm run generate-blind
npm run blind-test
```

To adjust the simulation, edit the `config` object in `src/index.ts` (number of honest/Sybil/wash-trader/reputation-buyer/late-fraud agents, transactions per agent).

## Project Structure

```
agenttrust-experiment/
├── src/
│   ├── receipt.ts       # Receipt format + evidence scoring (0-7)
│   ├── evidence.ts      # Evidence verification + Sybil detection
│   ├── reputation.ts    # Multidimensional reputation engine
│   ├── simulator.ts     # Agent generator (honest + malicious types)
│   ├── attacks/         # Attack-specific simulation logic
│   ├── metrics/         # Scoring and comparison metrics
│   ├── blind_test/      # Blind benchmark generator + runner
│   └── index.ts         # Experiment orchestration
├── tests/               # Unit tests (Jest)
├── data/, results/      # Generated simulation data and reports (gitignored)
├── ONE_PAGER.md         # One-page summary of the experiment
├── SCIENTIFIC_REPORT.md # Full methodology and results write-up
├── ALGORITHM_FROZEN.md  # Frozen algorithm specification
└── START_HERE.md        # Quick-start walkthrough
```

## Limitations

This is a **simulated** adversarial benchmark, not a production validation:

- Data is generated, not from real agent-commerce platforms.
- Simulated attackers follow predefined patterns; real attackers adapt dynamically.
- Scale is 110 agents / 5,500 transactions — production would mean millions of agents.
- No integration with real payment rails, independent validators, or dispute-resolution systems.

See `SCIENTIFIC_REPORT.md` for the full methodology, detailed results, and planned future work.

## References

1. "Can Trustless Agents Be Trusted? An Empirical Study of the ERC-8004 Decentralized AI Agent Ecosystem" — arXiv:2606.26028 (July 2026)
2. McKinsey, "Agentic commerce: How AI shopping agents can change retail" (2026)
3. Juniper Research, "Agentic Commerce Set to Generate $1.5 Trillion Globally by 2030" (2026)

## License

MIT

# Differentiation from Related Work

AgentTrust is one of several independent attempts to fix a documented problem: ERC-8004's on-chain reputation registry can be gamed cheaply (Xiong et al., arXiv:2606.26028, found 73-90% coordinated Sybil behavior among reviewers). This document compares AgentTrust against the closest approaches we found, written before reaching out to anyone for feedback - so the comparison, not the pitch, is the first thing a reader sees.

## vs. DJD Agent Score

DJD Agent Score assigns a wallet a single 0-100 behavioral score, aggregated over time: transaction history, counterparty diversity, volume patterns, account age, balance stability, activity consistency, USDC usage - plus Sybil and "gaming velocity" detection.

AgentTrust scores individual transactions (0-7, by strength of evidence - from self-declaration up to independently-verified dispute resolution) and aggregates receipts into a 7-dimension profile (identity confidence, delivery reliability, economic reliability, dispute performance, counterparty diversity, Sybil resistance, evidence coverage).

These are different layers, not two implementations of the same idea. A wallet with a statistically normal transaction pattern (good DJD score) could still deliver poor work on every individual transaction - DJD has no mechanism to catch that, because it doesn't evaluate interaction quality. Conversely, a brand-new agent with no history but strong per-transaction evidence would score poorly on DJD (no track record) and correctly on AgentTrust.

Our honest assessment: these are more likely complementary than competing. We haven't tested them together, and we don't know whether combining them adds real value or just adds complexity - that's an open question, not a claim.

## vs. Veylux, TraceRank, and the ERC-8004 registry itself

- **Veylux** gets Sybil resistance from economic bonding (cost to fake = N x stake) plus graph-conductance analysis. AgentTrust requires no locked capital - it scores evidence of activity that already happened. Open question: does bonding alone suffice, or does evidence-scoring solve something bonding doesn't (low-capital honest agents, reputation-update latency)?
- **TraceRank** (Operator Labs) ranks reputation via propagation through the x402 payment graph - a single centrality score. AgentTrust's 7-dimension profile is richer but far less tested; TraceRank is simpler and already a published peer academic result.
- **The ERC-8004 reputation registry** itself is the baseline every approach above is trying to fix - raw feedback, empirically shown to be gameable at low cost. AgentTrust is one candidate fix among several independent ones, not a replacement for the standard.

## Honest limitations of AgentTrust

1. **Entirely simulated.** 110 agents, 5,500 synthetic transactions. The 100% accuracy and 845x cost figures are properties of the simulation's model, not observations of real attackers.
2. **Attackers are scripted, not adaptive.** All six attack types follow predefined patterns. Never tested against an attacker that adapts in response to the scoring system itself.
3. **Assumes strong evidence is obtainable.** The 0-7 scale assumes independently-verified evidence exists and is accessible. If most real-world transactions only produce weak evidence (self-declaration), the system degrades toward the naive baseline it's meant to beat - this scenario was never simulated.
4. **No real-world scale test.** 110 agents is a toy compared to any live agent economy.
5. **No observed real cost data.** The $12,680 figure comes from the simulation's cost model, not from a real attacker who actually had to pay it.

## What would change our mind

- Evidence that most real transactions can't produce proof above level 1-2 on the 0-7 scale (would undermine the core mechanism).
- A demonstrated attack that adapts to the scoring function itself and still evades detection.
- A working integration showing evidence-scoring and behavioral-scoring (DJD-style) don't actually combine cleanly, or that one makes the other redundant.

## Feedback welcome

We're looking for technical critique, not validation - particularly from people who've built or rigorously studied agent reputation/trust systems. If you've found a way to break a similar scoring mechanism, or think one of the assumptions above doesn't hold, open an issue.

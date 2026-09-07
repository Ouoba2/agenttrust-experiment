# 🚀 Démarrage rapide - AgentTrust Experiment #1

## Installation (2 minutes)

```bash
cd C:\Users\us\Desktop\agenttrust-experiment
npm install
```

## Lancer l'expérience (1 minute)

```bash
npm run simulate
```

**C'est tout !** L'expérience va :
1. Générer 100 agents (50 honnêtes + 50 malveillants)
2. Créer 5000 transactions
3. Comparer AgentTrust vs Naive reputation
4. Afficher les résultats
5. Sauvegarder dans `results/`

## Lire les résultats

Tu verras quelque chose comme :

```
📈 RESULTS
============================================================

🎯 Accuracy Comparison:
   AgentTrust: 87.0% (87/100)
   Naive:      62.0% (62/100)
   Difference: +25.0%

⚠️  False Positives (bad agents classified as good):
   AgentTrust: 8
   Naive:      35

💰 High-Value False Positives (authorized >$10K):
   AgentTrust: 2
   Naive:      18

✅ VERDICT: AgentTrust significantly outperforms Naive reputation
   The hypothesis is SUPPORTED. Proceed to Experiment #2.
```

## Modifier la configuration

Ouvre `src/index.ts` et change :

```typescript
const config: SimulationConfig = {
  honest_agents: 50,        // Augmente pour plus de données
  sybil_agents: 20,         // Types d'attaques
  wash_traders: 15,
  reputation_buyers: 10,
  late_fraudsters: 5,
  transactions_per_agent: 50 // Transactions par agent
};
```

## Lancer les tests

```bash
npm test
```

## Prochaines étapes

### Si l'expérience réussit ✅
→ On construit Experiment #2 (trouver un client payant)

### Si l'expérience échoue ❌
→ On abandonne AgentTrust
→ On passe à une autre idée

---

**Bonne chance ! 🧪**

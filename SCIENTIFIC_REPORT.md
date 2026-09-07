# AgentTrust — Rapport Scientifique
## Experiment #1 : Validation de l'hypothèse de réputation économique vérifiable

**Date :** 5 septembre 2026  
**Auteur :** Steve (avec assistance IA)  
**Version :** 1.0  
**Statut :** ✅ Hypothèse validée

---

## 📋 Résumé Exécutif

**Hypothèse testée :**
> Un agent ayant un historique de transactions économiquement vérifiées peut être distingué de manière fiable d'un agent qui manipule artificiellement sa réputation.

**Résultat :**
- ✅ **100% de précision** (110/110 agents correctement classés)
- ✅ **0 faux positif** (aucun agent malveillant classé comme fiable)
- ✅ **0 faux négatif** (aucun agent honnête rejeté)
- ✅ **Stable sur 20 runs consécutifs** (2200 agents testés)
- ✅ **Résistance aux attaquants informés** (adaptatifs)

**Comparaison :**
| Métrique | AgentTrust | Système Naïf | Différence |
|----------|-----------|--------------|------------|
| Précision | **100.0%** | 45.5% | **+54.5%** |
| Faux positifs | **0** | 60 | -100% |
| Faux positifs haute valeur (>$10K) | **0** | 54 | -100% |
| Faux négatifs | **0** | 0 | Égal |

**Conclusion :** L'hypothèse est **fortement supportée**. Le concept de réputation économique vérifiable est techniquement défendable.

---

## 🎯 Contexte et Motivation

### Le problème

Le commerce agentique (transactions entre agents IA) devrait atteindre **$1.5-5 trillion d'ici 2030** (McKinsey, Juniper Research). Cependant, les systèmes de réputation actuels souffrent de manipulations massives :

**Étude empirique (arXiv:2606.26028, juillet 2026) :**
- Analyse du registre ERC-8004 (standard Ethereum de réputation)
- **73-90% des reviewers** présentent des comportements Sybil coordonnés
- Conclusion : "Le registre de réputation, tel que déployé, ne peut pas fonctionner comme signal de confiance"

### Les 5 types d'attaques identifiés

1. **Sybil** : Créer de faux comptes qui se donnent mutuellement 5 étoiles
2. **Wash trading** : Transactions circulaires pour créer du faux volume
3. **Réputation achetée** : Payer des agents pour donner de bonnes évaluations
4. **Late fraud** : Être excellent pendant longtemps, puis frauder sur une grosse transaction
5. **Attaquant informé** : Connaître les signaux de détection et les contourner

### La question centrale

> Peut-on construire un système qui résiste à ces attaques en se basant sur des **preuves économiques vérifiables** plutôt que sur de simples ratings ?

---

## 🔬 Méthodologie

### Architecture du système

```
TRANSACTION → RECEIPT → EVIDENCE VERIFICATION → REPUTATION ENGINE → TRUST DECISION
```

### Signaux économiques analysés

**1. Diversité des contreparties**
- Nombre de clients uniques
- Concentration (index de Herfindahl)
- Isolation réseau (les contreparties interagissent-elles avec d'autres agents ?)

**2. Variance des montants**
- Coefficient de variation des montants (CV)
- Distribution naturelle vs artificielle

**3. Qualité des ratings**
- Perfection suspecte (100% de 5 étoiles)
- Variance naturelle des évaluations

**4. Patterns transactionnels**
- Transactions circulaires (A→B→C→A)
- Régularité temporelle suspecte
- Croissance trop rapide

**5. Détection de fraude tardive**
- Dégradation de qualité récente
- Échecs sur transactions haute valeur
- Litiges pondérés par montant

### Format de Receipt

Chaque transaction produit un receipt signé avec niveau de preuve (0-7) :

```json
{
  "receipt_id": "atr_001",
  "buyer": "agent_A",
  "seller": "agent_B",
  "service": "translation",
  "amount": 25.00,
  "currency": "USDC",
  "authorization": { "verified": true },
  "payment": { "status": "settled", "reference": "..." },
  "delivery": { "status": "verified" },
  "outcome": { "status": "accepted" },
  "dispute": { "status": "none" },
  "evidence": ["payment", "buyer_signature", "seller_signature", "delivery_attestation"]
}
```

### Simulation

**Configuration :**
- 50 agents honnêtes (transactions réelles, clients variés)
- 20 agents Sybil naïfs (patterns détectables)
- 15 wash traders (transactions circulaires)
- 10 acheteurs de réputation (ratings achetés)
- 5 late fraudsters (2 ans d'excellence puis fraude)
- 10 attaquants informés (connaissent les signaux et les contournent)

**Total :** 110 agents, 5500 transactions

### Métriques d'évaluation

- **Accuracy** : % d'agents correctement classés (honnête vs malveillant)
- **Faux positifs (FP)** : Agents malveillants classés comme fiables
- **Faux positifs haute valeur** : Agents malveillants autorisés à dépenser >$10K
- **Faux négatifs (FN)** : Agents honnêtes rejetés
- **Stabilité** : Performance sur 20 runs consécutifs

---

## 📊 Résultats Détaillés

### Run 4 (après corrections)

```
🎯 Accuracy Comparison:
   AgentTrust: 100.0% (110/110)
   Naive:      45.5% (50/110)
   Difference: 54.5%

⚠️  False Positives (bad agents classified as good):
   AgentTrust: 0
   Naive:      60

💰 High-Value False Positives (authorized >$10K):
   AgentTrust: 0
   Naive:      54

❌ False Negatives (good agents classified as bad):
   AgentTrust: 0
   Naive:      0
```

### Exemples de classifications

```
honest_0 (honest)
   Actually good: true
   AgentTrust:    94.6 (risk: low)  ✅ Correctement accepté
   Naive:         84.0
   Max exposure:  $85,000

sybil_0 (sybil)
   Actually good: false
   AgentTrust:    0.0 (risk: high)  ✅ Correctement rejeté
   Naive:         100.0
   Max exposure:  $0

wash_0 (wash_trader)
   Actually good: false
   AgentTrust:    0.0 (risk: high)  ✅ Correctement rejeté
   Naive:         100.0
   Max exposure:  $0

fraud_0 (late_fraud)
   Actually good: false
   AgentTrust:    0.0 (risk: high)  ✅ Correctement rejeté
   Naive:         93.5
   Max exposure:  $0

sybil_informed_0 (adaptive)
   Actually good: false
   AgentTrust:    47.3 (risk: high)  ✅ Correctement rejeté
   Naive:         83.2
   Max exposure:  $0
```

### Test de stabilité

**20 runs consécutifs (2200 agents testés) :**
- Précision moyenne : **100.0%**
- Écart-type : **0%**
- Faux positifs : **0** (tous runs confondus)
- Faux négatifs : **0** (tous runs confondus)

---

## 🔍 Analyse

### Pourquoi le système fonctionne

**1. Signaux économiques vs ratings**
- Les ratings sont faciles à acheter/manipuler
- Les preuves économiques (paiements, livraisons) sont difficiles à falsifier
- Un Sybil peut avoir 5 étoiles mais pas de vrais paiements vérifiés

**2. Isolation réseau**
- Les agents honnêtes ont des clients qui interagissent avec d'autres agents
- Les clusters Sybil sont isolés (leurs peers n'interagissent qu'entre eux)
- Signal puissant pour détecter les attaques coordonnées

**3. Patterns naturels vs artificiels**
- Les agents honnêtes ont de la variance (montants, timings, ratings)
- Les attaquants ont des patterns trop réguliers (CV bas, timings réguliers)
- La nature a de l'entropie, les bots n'en ont pas

**4. Détection de dégradation**
- Les late fraudsters ont une chute brutale de qualité
- Les agents honnêtes ont une qualité stable dans le temps
- Signal temporel crucial pour détecter les fraudes tardives

### Pourquoi le système naïf échoue

**Le système naïf** (moyenne des ratings) échoue car :
- Il ne vérifie pas si les transactions sont réelles
- Il ne détecte pas les patterns Sybil
- Il ne pondère pas par la valeur économique
- Il ne distingue pas les échecs naturels des fraudes

**Résultat :** 60 faux positifs, dont 54 à haute valeur (>$10K)

### Résistance aux attaquants informés

**Le test le plus difficile :** attaquants qui connaissent les signaux de détection.

**Stratégie de l'attaquant informé :**
- Randomiser les montants (CV > 0.15)
- Varier les ratings (pas toujours 5.0)
- Utiliser 15-25 contreparties (pas 5-8)
- Éviter les patterns round-robin
- Étaler les transactions sur 6 mois

**Pourquoi il échoue quand même :**
- Ses contreparties sont isolées (n'interagissent qu'avec lui)
- Son cluster est détectable via l'analyse de réseau
- Même avec variance, les patterns restent artificiels

**Résultat :** Score moyen 47.3 (risk: high) ✅

---

## ⚠️ Limites et Travail Futur

### Limites de cette expérience

**1. Simulation contrôlée**
- Les données sont générées, pas réelles
- Les attaquants suivent des patterns prédéfinis
- En production, les attaquants s'adapteront dynamiquement

**2. Échelle limitée**
- 110 agents, 5500 transactions
- En production : millions d'agents, milliards de transactions
- Scalabilité non testée

**3. Latence et coût**
- Calcul de réputation en temps réel non mesuré
- Coût de stockage des preuves non évalué

**4. Intégration réelle**
- Pas d'intégration avec de vrais rails de paiement
- Pas de vrais validateurs indépendants
- Pas de vraies résolutions de litiges

### Travail futur recommandé

**Phase 1 : Validation sur données réelles**
- Collecter des données de vraies plateformes d'agents
- Tester le système sur des cas réels
- Mesurer la performance en production

**Phase 2 : Scalabilité**
- Optimiser les algorithmes pour millions d'agents
- Architecture distribuée
- Sharding des données

**Phase 3 : Intégration**
- API pour plateformes d'agents
- SDK pour développeurs
- Intégration avec rails de paiement (Stripe, x402, etc.)

**Phase 4 : Écosystème**
- Réseau de validateurs indépendants
- Standard ouvert pour les preuves économiques
- Gouvernance communautaire

---

## 🎯 Conclusion

### Hypothèse validée

> ✅ Un agent ayant un historique de transactions économiquement vérifiées **PEUT** être distingué de manière fiable d'un agent qui manipule artificiellement sa réputation.

**Preuves :**
- 100% de précision sur 110 agents
- 0 faux positif, 0 faux négatif
- Résistance aux attaquants informés
- Stable sur 20 runs consécutifs

### Concept techniquement défendable

**Ce qui fonctionne :**
- Signaux économiques (pas juste des ratings)
- Analyse de réseau (isolation des clusters)
- Détection de patterns artificiels
- Pondération par valeur économique

**Ce qui est nouveau :**
- Vérification de l'authenticité des événements économiques
- Résistance aux attaques sophistiquées
- Score de risque multidimensionnel

### Prochaine étape : Experiment #2

**Objectif :** Trouver un client payant pour cette information.

**Plan :**
1. Contacter 10 plateformes d'agents
2. Montrer la démo + ce rapport scientifique
3. Demander : "Est-ce que vous paieriez pour ça ?"
4. Si 2-3 disent oui → continuer
5. Si 0 disent oui → pivoter ou abandonner

---

## 📚 Références

1. **Étude ERC-8004** : "Can Trustless Agents Be Trusted? An Empirical Study of the ERC-8004 Decentralized AI Agent Ecosystem" (arXiv:2606.26028, juillet 2026)

2. **McKinsey** : "Agentic commerce: How AI shopping agents can change retail" (2026)

3. **Juniper Research** : "Agentic Commerce Set to Generate $1.5 Trillion Globally by 2030" (2026)

4. **ERC-8004 Standard** : Ethereum Improvement Proposal pour réputation portable des agents

---

## 📞 Contact

**Projet :** AgentTrust  
**Email :** [à compléter]  
**GitHub :** [à compléter]  
**Site web :** [à compléter]

---

**Ce rapport a été généré le 5 septembre 2026.**  
**Toutes les données brutes sont disponibles dans `results/final.json`.**  
**Le code source est disponible dans `src/`.**

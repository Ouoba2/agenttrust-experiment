/**
 * AgentTrust Experiment #1
 * Receipt format with economic evidence tracking
 */

export enum PaymentStatus {
  PENDING = 'pending',
  SETTLED = 'settled',
  FAILED = 'failed',
  DISPUTED = 'disputed'
}

export enum DeliveryStatus {
  UNVERIFIED = 'unverified',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

export enum OutcomeStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  DISPUTED = 'disputed'
}

export enum DisputeStatus {
  NONE = 'none',
  OPEN = 'open',
  RESOLVED_SELLER = 'resolved_seller',
  RESOLVED_BUYER = 'resolved_buyer'
}

export interface Receipt {
  receipt_id: string;
  buyer: string;
  seller: string;
  service: string;
  amount: number;
  currency: string;
  created_at: string;
  
  authorization: {
    verified: boolean;
  };
  
  payment: {
    status: PaymentStatus;
    reference?: string;
    timestamp?: string;
  };
  
  delivery: {
    status: DeliveryStatus;
    timestamp?: string;
    proof_hash?: string;
  };
  
  outcome: {
    status: OutcomeStatus;
    timestamp?: string;
    rating?: number; // 1-5
  };
  
  dispute: {
    status: DisputeStatus;
    winner?: 'buyer' | 'seller' | 'none';
    resolution_timestamp?: string;
  };
  
  evidence: string[]; // List of evidence types present
  evidence_score: number; // 0-7 computed score
  
  // Optional: signatures for verification
  signatures?: {
    buyer?: string;
    seller?: string;
    validator?: string;
  };
}

/**
 * Evidence types and their weights
 */
export const EVIDENCE_WEIGHTS: Record<string, number> = {
  'self_declaration': 0,
  'seller_signature': 1,
  'buyer_signature': 2,
  'payment_verified': 3,
  'delivery_verified': 4,
  'outcome_accepted': 5,
  'independent_validator': 6,
  'dispute_resolved': 7
};

/**
 * Create a new receipt with computed evidence score
 */
export function createReceipt(data: Partial<Receipt>): Receipt {
  const receipt: Receipt = {
    receipt_id: data.receipt_id || `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    buyer: data.buyer || '',
    seller: data.seller || '',
    service: data.service || '',
    amount: data.amount || 0,
    currency: data.currency || 'USD',
    created_at: data.created_at || new Date().toISOString(),
    
    authorization: data.authorization || { verified: false },
    payment: data.payment || { status: PaymentStatus.PENDING },
    delivery: data.delivery || { status: DeliveryStatus.UNVERIFIED },
    outcome: data.outcome || { status: OutcomeStatus.PENDING },
    dispute: data.dispute || { status: DisputeStatus.NONE },
    
    evidence: [],
    evidence_score: 0
  };
  
  // Compute evidence list and score
  receipt.evidence = computeEvidence(receipt);
  receipt.evidence_score = computeEvidenceScore(receipt.evidence);
  
  return receipt;
}

/**
 * Compute which evidence types are present
 */
function computeEvidence(receipt: Receipt): string[] {
  const evidence: string[] = [];
  
  // Always has self-declaration (the receipt itself)
  evidence.push('self_declaration');
  
  // Check for signatures
  if (receipt.signatures?.seller) {
    evidence.push('seller_signature');
  }
  if (receipt.signatures?.buyer) {
    evidence.push('buyer_signature');
  }
  if (receipt.signatures?.validator) {
    evidence.push('independent_validator');
  }
  
  // Check payment status
  if (receipt.payment.status === PaymentStatus.SETTLED) {
    evidence.push('payment_verified');
  }
  
  // Check delivery status
  if (receipt.delivery.status === DeliveryStatus.VERIFIED) {
    evidence.push('delivery_verified');
  }
  
  // Check outcome status
  if (receipt.outcome.status === OutcomeStatus.ACCEPTED) {
    evidence.push('outcome_accepted');
  }
  
  // Check dispute resolution
  if (receipt.dispute.status !== DisputeStatus.NONE && 
      receipt.dispute.status !== DisputeStatus.OPEN) {
    evidence.push('dispute_resolved');
  }
  
  return evidence;
}

/**
 * Compute evidence score (0-7) based on highest evidence level
 */
function computeEvidenceScore(evidence: string[]): number {
  let maxScore = 0;
  
  for (const ev of evidence) {
    const weight = EVIDENCE_WEIGHTS[ev] || 0;
    if (weight > maxScore) {
      maxScore = weight;
    }
  }
  
  return maxScore;
}

/**
 * Check if a receipt has minimum viable evidence
 */
export function hasMinimumEvidence(receipt: Receipt): boolean {
  // At least payment verified (level 3)
  return receipt.evidence_score >= 3;
}

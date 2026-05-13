export type CriterionType = 'maximize' | 'minimize';
export type RuleOperator = '>' | '>=' | '<' | '<=' | '=';
export type RuleAction = 'exclude' | 'adjust';

export interface Alternative {
  id: string;
  name: string;
  description?: string;
  createdAt: any; // Firestore Timestamp
}

export interface Criterion {
  id: string;
  name: string;
  type: CriterionType;
  description?: string;
  createdAt: any;
  weight: number;
  thresholdMin?: number;
  thresholdMax?: number;
}

export interface Evaluation {
  alternative_id: string;
  criterion_id: string;
  value: number;
  updatedAt: any; // Firestore Timestamp
}

export interface DecisionData {
  alternatives: Alternative[];
  criteria: Criterion[];
  evaluations: Record<string, Evaluation>; // Key: alternativeId_criterionId
}

export interface ExpertRule {
  id: string;
  name?: string;
  criterionId: string;
  operator: RuleOperator;
  value: number;
  action: RuleAction;
  adjustmentPercent?: number;
  active: boolean;
  createdAt: any;
}

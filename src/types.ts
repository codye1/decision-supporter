export type CriterionType = 'maximize' | 'minimize';

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

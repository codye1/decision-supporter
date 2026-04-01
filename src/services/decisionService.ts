import {
  db,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  OperationType,
  handleFirestoreError,
} from '../firebase';
import { Alternative, Criterion, Evaluation } from '../types';

const ALTERNATIVES_COLLECTION = 'alternatives';
const CRITERIA_COLLECTION = 'criteria';
const EVALUATIONS_COLLECTION = 'evaluations';

export const decisionService = {
  // Alternatives
  subscribeToAlternatives(onUpdate: (alternatives: Alternative[]) => void) {
    const q = query(
      collection(db, ALTERNATIVES_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const alternatives = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Alternative
        );
        onUpdate(alternatives);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, ALTERNATIVES_COLLECTION);
      }
    );
  },

  async addAlternative(name: string, description?: string) {
    const id = doc(collection(db, ALTERNATIVES_COLLECTION)).id;
    const alternative: Alternative = {
      id,
      name,
      description,
      createdAt: Timestamp.now(),
    };
    try {
      await setDoc(doc(db, ALTERNATIVES_COLLECTION, id), alternative);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `${ALTERNATIVES_COLLECTION}/${id}`
      );
    }
  },

  async updateAlternative(id: string, name: string, description?: string) {
    try {
      await updateDoc(doc(db, ALTERNATIVES_COLLECTION, id), {
        name,
        description,
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `${ALTERNATIVES_COLLECTION}/${id}`
      );
    }
  },

  async deleteAlternative(id: string) {
    try {
      await deleteDoc(doc(db, ALTERNATIVES_COLLECTION, id));
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `${ALTERNATIVES_COLLECTION}/${id}`
      );
    }
  },

  // Criteria
  subscribeToCriteria(onUpdate: (criteria: Criterion[]) => void) {
    const q = query(
      collection(db, CRITERIA_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const criteria = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Criterion
        );
        onUpdate(criteria);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, CRITERIA_COLLECTION);
      }
    );
  },

  async addCriterion(
    name: string,
    type: 'maximize' | 'minimize',
    weight: number = 1,
    description?: string
  ) {
    const id = doc(collection(db, CRITERIA_COLLECTION)).id;
    const criterion: Criterion = {
      id,
      name,
      type,
      weight,
      description,
      createdAt: Timestamp.now(),
    };
    try {
      await setDoc(doc(db, CRITERIA_COLLECTION, id), criterion);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `${CRITERIA_COLLECTION}/${id}`
      );
    }
  },

  async updateCriterion(
    id: string,
    name: string,
    type: 'maximize' | 'minimize',
    weight: number,
    description?: string
  ) {
    try {
      await updateDoc(doc(db, CRITERIA_COLLECTION, id), {
        name,
        type,
        weight,
        description,
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `${CRITERIA_COLLECTION}/${id}`
      );
    }
  },

  async deleteCriterion(id: string) {
    try {
      await deleteDoc(doc(db, CRITERIA_COLLECTION, id));
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `${CRITERIA_COLLECTION}/${id}`
      );
    }
  },

  // Evaluations
  subscribeToEvaluations(
    onUpdate: (evaluations: Record<string, Evaluation>) => void
  ) {
    const q = collection(db, EVALUATIONS_COLLECTION);
    return onSnapshot(
      q,
      (snapshot) => {
        const evaluations: Record<string, Evaluation> = {};
        snapshot.docs.forEach((doc) => {
          evaluations[doc.id] = doc.data() as Evaluation;
        });
        onUpdate(evaluations);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, EVALUATIONS_COLLECTION);
      }
    );
  },

  async setEvaluation(
    alternativeId: string,
    criterionId: string,
    value: number
  ) {
    const id = `${alternativeId}_${criterionId}`;
    const evaluation: Evaluation = {
      alternative_id: alternativeId,
      criterion_id: criterionId,
      value,
      updatedAt: Timestamp.now(),
    };
    try {
      await setDoc(doc(db, EVALUATIONS_COLLECTION, id), evaluation);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `${EVALUATIONS_COLLECTION}/${id}`
      );
    }
  },
};

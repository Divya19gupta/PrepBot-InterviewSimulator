/**
 * ======================================================================
 * Reference Evaluation Types
 * ======================================================================
 *
 * These types describe the structured reference evaluation generated
 * by the LLM before any experimental manipulation is applied.
 *
 * They are used by:
 *
 * - generateReferenceEvaluation()
 * - manipulateEvaluation()
 * - validateManipulation()
 * - generateReferenceFeedback()
 *
 * They are NOT part of the experimental design.
 * ======================================================================
 */

// ---------------------------------------------------------------------
// Criterion Status
// ---------------------------------------------------------------------

export type CriterionStatus =
  | "Satisfied"
  | "Partially Satisfied"
  | "Not Satisfied";

// ---------------------------------------------------------------------
// Individual Criterion Evaluation
// ---------------------------------------------------------------------

export interface CriterionEvaluation {
  /**
   * Evaluation outcome for this criterion.
   */
  status: CriterionStatus;

  /**
   * Evidence extracted from the participant response.
   */
  evidence: string;

  /**
   * Constructive participant-facing feedback
   * for this criterion.
   */
  feedback: string;
}

// ---------------------------------------------------------------------
// Structure Rubric
// ---------------------------------------------------------------------

export interface StructureRubric {
  completeness: CriterionEvaluation;
  organization: CriterionEvaluation;
  development: CriterionEvaluation;
  coverage: CriterionEvaluation;
}

// ---------------------------------------------------------------------
// Intent Rubric
// ---------------------------------------------------------------------

export interface IntentRubric {
  taskRelevance: CriterionEvaluation;

  supportingEvidence: CriterionEvaluation;

  reasoning: CriterionEvaluation;

  goalFulfilment: CriterionEvaluation;
}

// ---------------------------------------------------------------------
// Reference Evaluations
// ---------------------------------------------------------------------

export interface StructureReferenceEvaluation {
  evaluationLogic: "structure";

  rubric: StructureRubric;

  overallAssessment: string;
}

export interface IntentReferenceEvaluation {
  evaluationLogic: "intent";

  rubric: IntentRubric;

  overallAssessment: string;
}

export type ReferenceEvaluation =
  | StructureReferenceEvaluation
  | IntentReferenceEvaluation;

// ---------------------------------------------------------------------
// Rubric Criterion Types
// ---------------------------------------------------------------------

export type StructureCriterion =
  | "completeness"
  | "organization"
  | "development"
  | "coverage";

export type IntentCriterion =
   "taskRelevance"
  | "supportingEvidence"
| "reasoning"
 |   "goalFulfilment";

export type RubricCriterion =
  | StructureCriterion
  | IntentCriterion;
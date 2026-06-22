/**
 * ======================================================================
 * Experimental Design Types
 * ======================================================================
 *
 * These types describe ONLY the experimental methodology.
 *
 * They MUST NOT contain:
 * - Reference evaluation schemas
 * - GPT response types
 * - Rubric definitions
 * - Validation logic
 *
 * Those belong in separate modules.
 * ======================================================================
 */

// ---------------------------------------------------------------------
// Experimental Manipulations
// ---------------------------------------------------------------------

/**
 * Whether the AI feedback shown for a question is generated
 * from the original evaluation or a manipulated evaluation.
 */
export type ErrorCondition =
  | "correct"
  | "wrong";

/**
 * Whether transcription uncertainty information is displayed
 * alongside the feedback.
 *
 * Visible:
 * - confidence score
 * - highlighted low-confidence transcript words
 *
 * Hidden:
 * - neither is shown
 */
export type UncertaintyCondition =
  | "visible"
  | "hidden";

/**
 * Session-level implementation used whenever
 * ErrorCondition = "wrong".
 *
 * This is NOT an independent variable.
 * It remains fixed for the participant's entire interview.
 */
export type ErrorImplementation =
  | "selectiveBlindness"
  | "misweighting";

// ---------------------------------------------------------------------
// Counterbalancing Versions
// ---------------------------------------------------------------------

export const EXPERIMENT_VERSIONS = [
  "V1",
  "V2",
  "V3",
  "V4",
] as const;

export type ExperimentVersion =
  (typeof EXPERIMENT_VERSIONS)[number];

// ---------------------------------------------------------------------
// Per-question Experimental Condition
// ---------------------------------------------------------------------

/**
 * Experimental condition assigned to one interview question.
 *
 * The evaluation logic (Structure vs Intent) is determined
 * by the evaluation pipeline, not by the experimental design.
 *
 * This object only stores the experimental manipulations.
 */
export interface QuestionCondition {
  error: ErrorCondition;

  uncertainty: UncertaintyCondition;
}
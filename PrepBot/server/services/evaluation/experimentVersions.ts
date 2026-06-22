import {
  ExperimentVersion,
  QuestionCondition,
} from "./experimentTypes";

/**
 * ==========================================================
 * Counterbalanced Experiment Versions
 * ==========================================================
 *
 * Every participant experiences:
 *
 * - 2 Wrong
 * - 2 Correct
 * - 2 Visible uncertainty
 * - 2 Hidden uncertainty
 *
 * Wrongness implementation (Selective Blindness / Misweighting)
 * is assigned separately per participant session.
 *
 * Versions only rotate the Error × Uncertainty conditions
 * across the four interview questions.
 * ==========================================================
 */

export const EXPERIMENT_VERSION_MAP: Record<
  ExperimentVersion,
  QuestionCondition[]
> = {

  // --------------------------------------------------------
  // Version 1
  // --------------------------------------------------------

  V1: [

    // Q1
    {
      error: "wrong",
      uncertainty: "visible",
    },

    // Q2
    {
      error: "wrong",
      uncertainty: "hidden",
    },

    // Q3
    {
      error: "correct",
      uncertainty: "visible",
    },

    // Q4
    {
      error: "correct",
      uncertainty: "hidden",
    },

  ],

  // --------------------------------------------------------
  // Version 2
  // --------------------------------------------------------

  V2: [

    // Q1
    {
      error: "wrong",
      uncertainty: "hidden",
    },

    // Q2
    {
      error: "correct",
      uncertainty: "visible",
    },

    // Q3
    {
      error: "correct",
      uncertainty: "hidden",
    },

    // Q4
    {
      error: "wrong",
      uncertainty: "visible",
    },

  ],

  // --------------------------------------------------------
  // Version 3
  // --------------------------------------------------------

  V3: [

    // Q1
    {
      error: "correct",
      uncertainty: "visible",
    },

    // Q2
    {
      error: "correct",
      uncertainty: "hidden",
    },

    // Q3
    {
      error: "wrong",
      uncertainty: "visible",
    },

    // Q4
    {
      error: "wrong",
      uncertainty: "hidden",
    },

  ],

  // --------------------------------------------------------
  // Version 4
  // --------------------------------------------------------

  V4: [

    // Q1
    {
      error: "correct",
      uncertainty: "hidden",
    },

    // Q2
    {
      error: "wrong",
      uncertainty: "visible",
    },

    // Q3
    {
      error: "wrong",
      uncertainty: "hidden",
    },

    // Q4
    {
      error: "correct",
      uncertainty: "visible",
    },

  ],

};
/**
 * ==========================================================
 * Validation Notes
 * ==========================================================
 *
 * Across the four versions:
 *
 * • Every question appears twice as Wrong
 * • Every question appears twice as Correct
 * • Every question appears twice with Visible uncertainty
 * • Every question appears twice with Hidden uncertainty
 *
 * This provides balanced counterbalancing for the
 * within-subject experimental design.
 */
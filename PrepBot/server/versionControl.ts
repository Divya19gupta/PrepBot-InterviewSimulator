import MODEL from "openai";

// ==========================================================
// STUDY LOCK — PrepBot Main Study
// ==========================================================
// This file is the single source of truth for every setting that
// could change the participant's experience if edited mid-collection
// — the model, prompt/rubric logic, and the confidence threshold.
//
// RULE: once the main study starts, do NOT edit the *behavior* behind
// these versions (prompts, rubric definitions, thresholds) without
// also bumping the relevant version number below. Every session
// records which versions were active when that participant went
// through the study (see session.ts), so if anything ever needs to
// change mid-collection, there's a permanent record of exactly which
// participants experienced which version — instead of finding out
// after the fact that participants 1–15 and 16–40 weren't actually
// in the same study.
//
// Bump the version number, don't just silently edit the behavior.
// ==========================================================

export const VERSION = "1.0";

// Prompt logic version — bump if structurePrompt.ts, intentPrompt.ts,
// or the manipulation prompts in manipulateEvaluation.ts change in any
// way that could affect what a participant sees.
export const PROMPT_VERSION = "1.0";

// Rubric definition version — bump if structureRubric.ts or
// intentRubric.ts change (criteria added/removed/redefined).
export const RUBRIC_VERSION = "1.0";

// The fixed 4-question set — bump only if the questions themselves
// change (not for unrelated code changes).
export const QUESTION_SET_VERSION = "1.0";

// Below this AssemblyAI word-confidence score, a word is flagged as
// "low confidence" and highlighted in the Visible-uncertainty
// condition. Chosen during pilot testing — see Chapter 7/8
// documentation for the empirical justification. Bump PROMPT_VERSION
// is NOT needed if only this number changes, but note the change in
// the decision log regardless, since it affects what participants see.
export const LOW_CONFIDENCE_WORD_THRESHOLD = 0.92;

// Pulled from openai.ts so there's one place that shows the exact
// frozen model snapshot in use for this study version.
export const MODEL_VERSION = MODEL;

export const VERSION_CONTROL = {
  versionControl: VERSION,
  promptVersion: PROMPT_VERSION,
  rubricVersion: RUBRIC_VERSION,
  questionSetVersion: QUESTION_SET_VERSION,
  modelVersion: MODEL_VERSION,
  lowConfidenceWordThreshold: LOW_CONFIDENCE_WORD_THRESHOLD,
};
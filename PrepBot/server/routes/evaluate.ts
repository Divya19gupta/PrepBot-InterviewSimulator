import express from "express";

import { generateReferenceEvaluation } from "../services/evaluation/generateReferenceEvaluation";
import { generateReferenceFeedback } from "../services/evaluation/generateReferenceFeedback";
import { manipulateEvaluation } from "../services/evaluation/manipulateEvaluation";
import { isEvaluableResponse } from "../services/evaluation/isEvaluableResponse";
import { getExperimentCondition } from "../services/evaluation/getExperimentCondition";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      sessionId,
      question,
      answer,
      questionIndex,
    } = req.body;

    //--------------------------------------------------
    // Load experimental condition
    //--------------------------------------------------

    const condition = await getExperimentCondition(
      sessionId,
      questionIndex
    );

    //--------------------------------------------------
    // Check whether the response contains enough
    // observable information to evaluate.
    //--------------------------------------------------

    const structureEvaluable =
      await isEvaluableResponse(
        question,
        answer,
        "structure"
      );

    const intentEvaluable =
      await isEvaluableResponse(
        question,
        answer,
        "intent"
      );

    //--------------------------------------------------
    // Skip evaluation if insufficient information
    //--------------------------------------------------

    if (!structureEvaluable || !intentEvaluable) {
       res.json({
        feedbackA:
          "Your response did not contain enough observable information to generate meaningful structured feedback.",

        feedbackB:
          "Your response did not contain enough observable information to generate meaningful content feedback.",

        uncertainty: condition.uncertainty,

        errorCondition: condition.error,

        wrongnessImplementation:
          condition.wrongnessImplementation,

        wrongExplanation:
          "Evaluation skipped because the response was not evaluable.",
      });
      return;
    }

    //--------------------------------------------------
    // Generate reference evaluations
    //--------------------------------------------------

    const structureReference =
      await generateReferenceEvaluation(
        question,
        answer,
        "structure"
      );

    const intentReference =
      await generateReferenceEvaluation(
        question,
        answer,
        "intent"
      );

    //--------------------------------------------------
    // Default evaluations
    //--------------------------------------------------

    let structureEvaluation =
      structureReference;

    let intentEvaluation =
      intentReference;

    let wrongExplanation: string | null =
      null;

    //--------------------------------------------------
    // Manipulate if assigned to Wrong condition
    //--------------------------------------------------

    if (condition.error === "wrong") {

      if (
        !condition.structureCriterion ||
        !condition.intentCriterion
      ) {
        throw new Error(
          "Manipulation criteria missing."
        );
      }

      // NOTE: validateManipulation is no longer called separately here.
      // manipulateEvaluation() now performs generation AND semantic
      // validation together, inside its own retry loop. Previously,
      // a semantic validation failure (e.g. "Selective Blindness requires
      // omission...") threw immediately with zero retries, killing the
      // whole request with a 500. Now it's treated as just another
      // reason to retry generation, same as a malformed JSON/schema error.
      //
      // We also wrap the whole manipulation step in a try/catch so that
      // if all retries are exhausted, we gracefully fall back to serving
      // the unmanipulated reference evaluation instead of failing the
      // participant's request outright. The trial is flagged in logs
      // for manual exclusion from analysis.

      try {

        //------------------------------
        // Structure
        //------------------------------

        const manipulatedStructure =
          await manipulateEvaluation(
            structureReference,
            condition.structureCriterion,
            condition.wrongnessImplementation,
            answer
          );

        //------------------------------
        // Intent
        //------------------------------

        const manipulatedIntent =
          await manipulateEvaluation(
            intentReference,
            condition.intentCriterion,
            condition.wrongnessImplementation,
            answer
          );

        structureEvaluation =
          manipulatedStructure.evaluation;

        intentEvaluation =
          manipulatedIntent.evaluation;

        wrongExplanation = `Structure:
${manipulatedStructure.explanation}

Intent:
${manipulatedIntent.explanation}`;

      } catch (manipulationErr) {

        // Fallback: serve the unmanipulated reference evaluations
        // (structureEvaluation / intentEvaluation already default to
        // structureReference / intentReference above) so the participant
        // is never stuck on a dead request. Flag this trial clearly in
        // logs so it can be excluded from analysis, since the assigned
        // "wrong" condition was not actually delivered.

        console.error(
          `[MANIPULATION_FALLBACK] session=${sessionId} questionIndex=${questionIndex} ` +
          `— manipulation failed after retries, falling back to reference evaluation. ` +
          `Flag this trial for exclusion.`,
          manipulationErr
        );

        wrongExplanation =
          "MANIPULATION_FAILED_FALLBACK_TO_REFERENCE";
      }
    }

    //--------------------------------------------------
    // Generate participant-facing feedback
    //--------------------------------------------------

    const feedbackA =
      await generateReferenceFeedback(
        structureEvaluation
      );

    const feedbackB =
      await generateReferenceFeedback(
        intentEvaluation
      );

    //--------------------------------------------------
    // Return response
    //--------------------------------------------------

    res.json({
      feedbackA,

      feedbackB,

      uncertainty:
        condition.uncertainty,

      errorCondition:
        condition.error,

      wrongnessImplementation:
        condition.wrongnessImplementation,

      wrongExplanation,
    });

  } catch (err) {

    console.error("Evaluation error:", err);

    res.status(500).json({
      error: "Evaluation failed.",
    });

  }
});

export default router;
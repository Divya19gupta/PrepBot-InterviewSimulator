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

    let structureExplanation: string | null = null;
    let intentExplanation: string | null = null;

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
      // validation together, inside its own retry loop, including a
      // contradiction check against the other 3 criteria — up to 5 tries,
      // with the model warned upfront (not just corrected after failing).
      //
      // Structure and Intent MUST succeed or fail together as one unit.
      // A "Wrong" trial means BOTH feedback summaries contain the
      // manipulation (per the ERB description) — there is no valid
      // state where one side is manipulated and the other isn't, so
      // this stays a single shared try/catch, not independent ones.

      try {

        const manipulatedStructure =
          await manipulateEvaluation(
            structureReference,
            condition.structureCriterion,
            condition.wrongnessImplementation,
            answer
          );

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

        if (condition.wrongnessImplementation === "selectiveBlindness") {
          structureExplanation =
            manipulatedStructure.explanation;

          intentExplanation =
            manipulatedIntent.explanation;
        }

        wrongExplanation = `Structure:
${manipulatedStructure.explanation}

Intent:
${manipulatedIntent.explanation}`;

      } catch (manipulationErr) {

        // Fallback: serve the unmanipulated reference evaluations for
        // BOTH sides together (structureEvaluation / intentEvaluation
        // already default to structureReference / intentReference
        // above), so the participant is never stuck on a dead request
        // and never ends up in a half-Wrong, half-Correct state.

        console.error(
          `[MANIPULATION_FALLBACK] session=${sessionId} questionIndex=${questionIndex} ` +
          `— manipulation failed after retries, falling back to reference evaluation for both sides. ` +
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
    // Same rule as the manipulation step above: if smoothing can't
    // safely avoid leaking the hidden fact on EITHER side after its
    // retries, BOTH sides fall back to reference feedback together —
    // otherwise the participant could see one side that reads as
    // genuinely wrong and one side that reads as correct, inside a
    // trial that's supposed to be uniformly "Wrong."

    let feedbackA: string;
    let feedbackB: string;

    try {
      feedbackA =
        await generateReferenceFeedback(
          structureEvaluation,
          structureExplanation
        );

      feedbackB =
        await generateReferenceFeedback(
          intentEvaluation,
          intentExplanation
        );

    } catch (smoothingErr) {

      console.error(
        `[SMOOTHING_LEAK_UNRESOLVED] session=${sessionId} questionIndex=${questionIndex} ` +
        `— smoothing could not avoid the excluded fact after retries on at least one side, ` +
        `falling back to reference feedback for BOTH sides. Flag this trial for exclusion.`,
        smoothingErr
      );

      feedbackA =
        await generateReferenceFeedback(structureReference);
      feedbackB =
        await generateReferenceFeedback(intentReference);

      wrongExplanation =
        (wrongExplanation || "") +
        "\n\n[SMOOTHING_LEAK_UNRESOLVED_FALLBACK_TO_REFERENCE]";
    }

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
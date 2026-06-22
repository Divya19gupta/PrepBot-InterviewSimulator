import express from "express";

import { generateReferenceEvaluation } from "../services/evaluation/generateReferenceEvaluation";
import { generateReferenceFeedback } from "../services/evaluation/generateReferenceFeedback";
import { manipulateEvaluation } from "../services/evaluation/manipulateEvaluation";
import { validateManipulation } from "../services/evaluation/validateManipulation";
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

      //------------------------------
      // Structure
      //------------------------------

      const manipulatedStructure =
        await manipulateEvaluation(
          structureReference,
          condition.structureCriterion,
          condition.wrongnessImplementation
        );

      const structureValidation =
        await validateManipulation(
          structureReference,
          manipulatedStructure.evaluation,
          condition.structureCriterion,
          condition.wrongnessImplementation
        );

      if (!structureValidation.valid) {
        throw new Error(
          structureValidation.reason
        );
      }

      //------------------------------
      // Intent
      //------------------------------

      const manipulatedIntent =
        await manipulateEvaluation(
          intentReference,
          condition.intentCriterion,
          condition.wrongnessImplementation
        );

      const intentValidation =
        await validateManipulation(
          intentReference,
          manipulatedIntent.evaluation,
          condition.intentCriterion,
          condition.wrongnessImplementation
        );

      if (!intentValidation.valid) {
        throw new Error(
          intentValidation.reason
        );
      }

      structureEvaluation =
        manipulatedStructure.evaluation;

      intentEvaluation =
        manipulatedIntent.evaluation;

      wrongExplanation = `Structure:
${manipulatedStructure.explanation}

Intent:
${manipulatedIntent.explanation}`;
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
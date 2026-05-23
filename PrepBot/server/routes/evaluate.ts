import express from "express";
import {
  evaluateAnswer,
  generateWrongFeedback,
  isMeaninglessAnswer,
} from "../services/openaiService";

const router = express.Router();

function shuffle<T>(array: T[]): T[] {
  return array.sort(() => Math.random() - 0.5);
}

router.post("/", async (req, res) => {
  try {
    const {
      question,
      answer,
      confidence,
      lowConfidenceRatio,
      sessionConditions,
      currentIndex,
    } = req.body;

    let conditions: string[] = sessionConditions;

    if (!conditions || conditions.length === 0) {
      conditions = shuffle([
        "A_wrong",
        "B_wrong",
        "both_correct",
        "A_wrong",
        "B_wrong",
        "both_correct",
      ]);
    }

    const answerIsMeaningless = isMeaninglessAnswer(answer);

    const intendedCondition = (currentIndex >= 0 && currentIndex < conditions.length)
      ? conditions[currentIndex]
      : "both_correct";

    let effectiveCondition = intendedCondition;
    let wrongExplanation: string | null = null;

    if (answerIsMeaningless) {
      effectiveCondition = "both_correct";
      wrongExplanation = `SKIPPED: answer was non-meaningful (rule-based detection). Intended condition was: ${intendedCondition}`;
    }
    if (!answerIsMeaningless && effectiveCondition === "both_correct") {
      wrongExplanation = "both_correct: no distortion intended for this question.";
    }

    const [feedbackA_real, feedbackB_real] = await Promise.all([
      evaluateAnswer(question, answer, "A"),
      evaluateAnswer(question, answer, "B"),
    ]);

    let feedbackA = feedbackA_real;
    let feedbackB = feedbackB_real;
    let wrongFeedbackType: "A" | "B" | null = null;
    let wrongErrorType: string | null = null;

    if (effectiveCondition === "A_wrong") {
      try {
        const wrong = await generateWrongFeedback(
          question, answer, "A",
          feedbackA_real
        );
        feedbackA = wrong.feedback;

        if (wrong.feedback !== feedbackA_real) {
          wrongFeedbackType = "A";
          wrongErrorType = wrong.errorType;
          wrongExplanation = wrong.errorExplanation;
        } else if (wrong.errorExplanation?.includes("Pass 1 JSON parse failed")) {
          wrongExplanation = "SKIPPED: distortion generation failed (JSON parse error). Intended condition was: A_wrong";
        } else {
          wrongExplanation = "SKIPPED: answer was non-meaningful (semantic check). Intended condition was: A_wrong";
        }
      } catch (err) {
        wrongExplanation = "SKIPPED: distortion generation threw an exception. Intended condition was: A_wrong. Correct feedback used.";
        feedbackA = feedbackA_real;
      }

    } else if (effectiveCondition === "B_wrong") {
      try {
        const wrong = await generateWrongFeedback(
          question, answer, "B",
          feedbackB_real
        );
        feedbackB = wrong.feedback;

        if (wrong.feedback !== feedbackB_real) {
          wrongFeedbackType = "B";
          wrongErrorType = wrong.errorType;
          wrongExplanation = wrong.errorExplanation;
        } else if (wrong.errorExplanation?.includes("Pass 1 JSON parse failed")) {
          wrongExplanation = "SKIPPED: distortion generation failed (JSON parse error). Intended condition was: B_wrong";
        } else {
          wrongExplanation = "SKIPPED: answer was non-meaningful (semantic check). Intended condition was: B_wrong";
        }
      } catch (err) {
        wrongExplanation = "SKIPPED: distortion generation threw an exception. Intended condition was: B_wrong. Correct feedback used.";
        feedbackB = feedbackB_real;
      }
    }

    res.json({
      feedbackA,
      feedbackB,
      wrongFeedbackType,
      wrongErrorType,
      wrongExplanation,
      sessionConditions: conditions,
    });

  } catch (err) {
    console.error("Evaluate route error:", err);
    res.status(500).json({ error: "Evaluation failed" });
  }
});

export default router;
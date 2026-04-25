import express from "express";
import {
  evaluateAnswer,
  generateWrongFeedback,
} from "../services/openaiService";

const router = express.Router();

// ==========================
// 🔀 SHUFFLE FUNCTION
// ==========================
function shuffle(array: string[]) {
  return array.sort(() => Math.random() - 0.5);
}

// ==========================
// 🚀 ROUTE
// ==========================
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

    // =========================
    // ✅ STEP 1: SESSION CONDITIONS (FIXED)
    // =========================
    let conditions = sessionConditions;

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

    const condition = conditions[currentIndex];

    // =========================
    // ✅ STEP 2: CORRECT FEEDBACK (RQ3)
    // =========================
    const feedbackA_real = await evaluateAnswer(
      question,
      answer,
      "A"
    );

    const feedbackB_real = await evaluateAnswer(
      question,
      answer,
      "B"
    );

    let feedbackA = feedbackA_real;
    let feedbackB = feedbackB_real;
    let wrongFeedbackType: "A" | "B" | null = null;

    // =========================
    // ✅ STEP 3: WRONGNESS (RQ2)
    // =========================
    let wrongErrorType: string | null = null;
let wrongExplanation: string | null = null;

if (condition === "A_wrong") {
  const wrong = await generateWrongFeedback(question, answer, "A");

      feedbackA = wrong.feedback;
      wrongFeedbackType = "A";
      wrongErrorType = wrong.errorType;
      wrongExplanation = wrong.errorExplanation;

    } else if (condition === "B_wrong") {
      const wrong = await generateWrongFeedback(question, answer, "B");

      feedbackB = wrong.feedback;
      wrongFeedbackType = "B";
      wrongErrorType = wrong.errorType;
      wrongExplanation = wrong.errorExplanation;
    }

    // =========================
    // ✅ RESPONSE (FIXED)
    // =========================
    res.json({
  feedbackA,
  feedbackB,
  wrongFeedbackType,
  wrongErrorType,
  wrongExplanation,
  sessionConditions: conditions,
});

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Evaluation failed" });
  }
});

export default router;
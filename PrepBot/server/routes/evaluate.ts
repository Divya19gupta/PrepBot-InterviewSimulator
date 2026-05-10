import express from "express";
import {
  evaluateAnswer,
  generateWrongFeedback,
  isMeaninglessAnswer,
} from "../services/openaiService";

const router = express.Router();

// ==========================
// 🔀 SHUFFLE FUNCTION
// ==========================
function shuffle<T>(array: T[]): T[] {
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
    // ✅ STEP 1: SESSION CONDITIONS
    // Conditions are shuffled once at the start of a session (first question)
    // and then reused for all subsequent questions.
    // This ensures counterbalancing across the 6 questions:
    //   - 2x A_wrong, 2x B_wrong, 2x both_correct
    // The array is stored in the session (passed back in every evaluate response)
    // and re-sent by the frontend with each subsequent question.
    // =========================
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

    // =========================
    // 🔴 STEP 2: OVERRIDE CONDITION FOR MEANINGLESS ANSWERS
    // If the answer has no real content, skip wrongness injection entirely.
    // Rationale: wrongness generation on a meaningless answer (e.g., "1,2,3,4")
    // causes the LLM to confabulate content that was never said, which:
    //   (a) pollutes RQ2 data — the "wrong" feedback is fabricated, not distorted
    //   (b) produces unfair data rows where blame/trust judgments are based on
    //       invented content rather than a real evaluative error
    // Forcing "both_correct" here ensures the answer is handled correctly
    // without compromising the experimental condition for that participant.
    // =========================
    const answerIsMeaningless = isMeaninglessAnswer(answer);

    let effectiveCondition = conditions[currentIndex] ?? "both_correct";

    if (answerIsMeaningless) {
      effectiveCondition = "both_correct";
    }

    // =========================
    // ✅ STEP 3: GENERATE CORRECT FEEDBACK (both modes, always)
    // We always generate both correct versions first.
    // This gives us a clean baseline for both A and B,
    // and one of them may be replaced by wrong feedback below.
    // =========================
    const [feedbackA_real, feedbackB_real] = await Promise.all([
      evaluateAnswer(question, answer, "A"),
      evaluateAnswer(question, answer, "B"),
    ]);

    let feedbackA = feedbackA_real;
    let feedbackB = feedbackB_real;
    let wrongFeedbackType: "A" | "B" | null = null;
    let wrongErrorType: string | null = null;
    let wrongExplanation: string | null = null;

    // =========================
    // ✅ STEP 4: INJECT WRONGNESS BASED ON CONDITION
    // questionIndex is passed to generateWrongFeedback so it can look up
    // the pre-authored blueprint for this specific question and mode.
    // This ensures the wrongness type and explanation are consistent
    // across all participants who answer this question.
    // =========================
    if (effectiveCondition === "A_wrong") {
  const wrong = await generateWrongFeedback(
    question, answer, "A", currentIndex,
    feedbackA_real  // ← pass correct feedback
  );
  feedbackA = wrong.feedback;
  wrongFeedbackType = "A";
  wrongErrorType = wrong.errorType;
  wrongExplanation = wrong.errorExplanation;

} else if (effectiveCondition === "B_wrong") {
  const wrong = await generateWrongFeedback(
    question, answer, "B", currentIndex,
    feedbackB_real  // ← pass correct feedback
  );
  feedbackB = wrong.feedback;
  wrongFeedbackType = "B";
  wrongErrorType = wrong.errorType;
  wrongExplanation = wrong.errorExplanation;
}
    // "both_correct" → feedbackA and feedbackB remain as generated above

    // =========================
    // ✅ STEP 5: RESPOND
    // sessionConditions is sent back so the frontend can persist it
    // and re-send it with the next question — preserving the shuffled order.
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
    console.error("❌ Evaluate route error:", err);
    res.status(500).json({ error: "Evaluation failed" });
  }
});

export default router;
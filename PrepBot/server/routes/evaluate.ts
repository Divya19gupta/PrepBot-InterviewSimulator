import express from "express";
import { evaluateAnswer } from "../services/openaiService";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      res.status(400).json({ error: "Audio was not clear. Please try again." });
      return;
    }
    
    const { prototype, lowConfidenceRatio, confidence, } = req.body; // 🔥 RECEIVE LOW CONFIDENCE RATIO

    const result = await evaluateAnswer(
      question,
      answer,
      prototype || "A",
      confidence,
      lowConfidenceRatio || 0, // 🔥 PASS LOW CONFIDENCE RATIO
    );

    // ✅ Type-safe handling
    const feedbackText =
      typeof result === "string"
        ? result
        : result?.feedback || "No feedback generated";

    res.json({
      feedback: feedbackText,
    });

  } catch (err) {
    console.error("❌ Evaluate error:", err);

    res.status(500).json({
      feedback: "Evaluation failed. Please try again.",
    });
    return;
  }
});

export default router;
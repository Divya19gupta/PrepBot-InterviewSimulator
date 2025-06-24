import express from "express";
import { generateInterviewQuestions, evaluateAnswer } from "../services/geminiService";

const router = express.Router();

// GET /api/questions
router.get("/questions", async (req, res) => {
  try {
    const questions = await generateInterviewQuestions();
    res.json({ questions });
  } catch (err) {
    console.error("Error generating questions:", err);
    res.status(500).json({ error: "Failed to get questions" });
  }
});

// POST /api/evaluate
router.post("/evaluate", async (req, res) => {
  try {
    const { question, answer } = req.body;
    const feedback = await evaluateAnswer(question, answer);
    res.json({ feedback });
  } catch (err) {
    console.error("Error evaluating answer:", err);
    res.status(500).json({ error: "Evaluation failed" });
  }
});

export default router;

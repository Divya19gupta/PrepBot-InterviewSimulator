// import express from "express";
// // import { generateInterviewQuestions } from "../services/geminiService";
// import { generateInterviewQuestions, evaluateAnswer } from "../services/openaiService";
// const router = express.Router();

// router.get("/", async (req, res) => {
//   try {
//     const questions = await generateInterviewQuestions();
//     res.json({ questions });
//   } catch (err) {
//     res.status(500).json({ error: "Failed to generate questions" });
//   }
// });

// export default router;

import express from "express";

const router = express.Router();

// ✅ Static questions (NO API CALL)
const questions = [
  "Tell me about a challenging project you worked on and how you handled it.",
  "Explain a technical concept to a non-technical person.",
  "Describe a time when you worked under pressure.",
  "What is one of your strengths with an example?",
  "Why should we hire you for this role?"
];

router.get("/", async (req, res) => {
  try {
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: "Failed to get questions" });
    return;
  }
});

export default router;

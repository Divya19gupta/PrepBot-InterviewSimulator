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

// Q1 → technical term distortion
// Q2 → structured storytelling gaps
// Q3 → recall + hesitation
// Q4 → numbers (ASR weak point)
// Q5 → complex grammar + reasoning
// ✅ Static questions (NO API CALL)
const questions = [
  "Explain a project where you used specific technologies like React, Node, or APIs. What exactly did you build and how did it work?",
  "Describe a challenging situation you faced at work or in a project. What did you do step by step and what was the final result?",
  "Tell me about a mistake you made in a project and how you identified and fixed it.",
  "Describe a project where you achieved measurable results, including any numbers, timelines, or performance improvements.",
  "Compare two different approaches you have used to solve a problem. Which one worked better and why?"
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

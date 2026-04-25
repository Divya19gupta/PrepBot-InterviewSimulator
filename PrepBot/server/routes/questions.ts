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
  // Q1 — Technical articulation (terminology + clarity vs intent)
  "Explain a project where you used specific technologies like React, Node, or APIs. What exactly did you build and how did the system work end-to-end?",

  // Q2 — Structured storytelling (behavioral + sequencing)
  "Describe a challenging situation you faced in a project. Walk me through what happened step by step and how you handled it until the final outcome.",

  // Q3 — Error reflection (metacognition)
  "Tell me about a mistake you made in a project. How did you realize it, and what did you change to fix it?",

  // Q4 — Recall + hesitation (cognitive load, explanation under pressure)
"Explain a process or concept you are familiar with as clearly as you can, but imagine you are explaining it to someone with no background in it.",

  // Q5 — Quantification (numbers + precision, ASR stress)
  "Describe a project where you improved performance or efficiency. What changes did you make, and what measurable impact did they have?",

  // Q6 — Comparative reasoning (higher-order thinking)
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

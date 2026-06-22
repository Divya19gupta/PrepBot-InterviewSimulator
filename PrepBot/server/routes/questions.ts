import express from "express";

const router = express.Router();

// Q1 → technical term distortion
// Q2 → structured storytelling gaps
// Q3 → recall + hesitation
// Q4 → numbers (ASR weak point)
// Q5 → complex grammar + reasoning

const questions = [
  // Q1 — Technical articulation (terminology + clarity vs intent)
  "Describe a project or piece of work you completed using any tools, methods, or systems you had to learn. What did you build or produce, and how did the different parts of your work connect together?",

  // Q2 — Structured storytelling (behavioral + sequencing)
  "Describe a challenging situation you faced in a project. Walk me through what happened step by step and how you handled it until the final outcome.",

  // Q3 — Error reflection (metacognition)
  "Tell me about a mistake you made in a project. How did you realize it, and what did you change to fix it?",

  // Q4 — Recall + hesitation (cognitive load, explanation under pressure)
"Explain a process or concept you are familiar with as clearly as you can, but imagine you are explaining it to someone with no background in it.",

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

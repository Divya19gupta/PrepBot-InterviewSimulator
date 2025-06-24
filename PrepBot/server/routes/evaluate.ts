import express from "express";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { transcribeAudio } from "../services/whisperService";
import { evaluateAnswer } from "../services/geminiService";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { question, answer } = req.body;

    const result = await evaluateAnswer(question, answer);
    res.json({ transcript: answer, ...result });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to evaluate answer" });
  }
});

export default router;

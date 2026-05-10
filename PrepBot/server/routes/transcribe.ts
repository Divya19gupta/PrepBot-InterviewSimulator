import express from "express";
import { AssemblyAI } from "assemblyai";

const router = express.Router();

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLY_API_KEY!,
  baseUrl: "https://api.eu.assemblyai.com",
});

router.post("/", async (req, res) => {
  try {
    const audioBase64 = req.body.audioBase64;

    // 🔴 VALIDATION
    if (!audioBase64 || !audioBase64.includes("base64")) {
      res.status(400).json({ error: "Invalid audio data" });
      return;
    }

    const base64Data = audioBase64.split(";base64,").pop();

    if (!base64Data) {
      res.status(400).json({ error: "Malformed base64" });
      return;
    }

    const buffer = Buffer.from(base64Data, "base64");

    // 🔹 UPLOAD
    const uploadResponse = await client.files.upload(buffer);

    // 🔹 TRANSCRIBE
    const transcriptData = await client.transcripts.transcribe({
      audio_url: uploadResponse,
      speech_models: ["universal"],
    });

    // 🔴 LANGUAGE FILTER
    if (
      transcriptData.language_code &&
      transcriptData.language_code !== "en"
    ) {
      res.json({
        transcript: "",
        error: "NON_ENGLISH",
      });
      return;
    }

    // ✅ EXTRACT WORDS
    const words = transcriptData.words || [];

    // // ✅ NORMALIZE FUNCTION
    // const normalize = (text: string) =>
    //   text.toLowerCase().replace(/[.,!?]/g, "");

   // ==========================
// ✅ CONFIDENCE CALCULATION (RESEARCH-BACKED CALIBRATION)
// ==========================

// 🔹 AVG CONFIDENCE (global signal)
const avgConfidence =
  words.length > 0
    ? words.reduce(
        (sum: number, w: any) => sum + (w.confidence || 0),
        0
      ) / words.length
    : null;

// 🔹 LOW CONFIDENCE THRESHOLD (standard ASR practice ~0.9–0.92)
const LOW_CONF_THRESHOLD = 0.92;

// 🔹 LOW CONFIDENCE WORDS
const lowConfidenceRaw = words.filter(
  (w: any) => (w.confidence || 0) < LOW_CONF_THRESHOLD
);

// 🔹 LOW CONFIDENCE WORDS (normalized for UI)
const normalize = (text: string) =>
  text.toLowerCase().replace(/[.,!?]/g, "");

const lowConfidenceWords = lowConfidenceRaw.map((w: any) =>
  normalize(w.text)
);

// 🔹 LOW CONFIDENCE RATIO (local uncertainty signal)
const lowConfidenceRatio =
  words.length > 0
    ? lowConfidenceRaw.length / words.length
    : 0;

// ==========================
// 🔥 CALIBRATED CONFIDENCE
// ==========================

// weights (sum = 1)
// grounded in combining global + local uncertainty
const alpha = 0.7; // global confidence weight
const beta = 0.3;  // local stability weight

let calibratedConfidence: number | null = null;

if (avgConfidence !== null) {
  calibratedConfidence =
    avgConfidence * alpha +
    (1 - lowConfidenceRatio) * beta;
}

// ==========================
// 🔍 DEBUG (optional)
// ==========================
console.log("Transcript:", transcriptData.text);
console.log("Avg Confidence:", avgConfidence);
console.log("Low Confidence Ratio:", lowConfidenceRatio);
console.log("Calibrated Confidence:", calibratedConfidence);

// ==========================
// ✅ FINAL RESPONSE
// ==========================
res.json({
  transcript: transcriptData.text || "",

  // 🔥 USE THIS IN UI
  confidence: calibratedConfidence,

  // 🔹 keep raw for research/debug
  rawConfidence: avgConfidence,

  lowConfidenceWords,
  lowConfidenceRatio,
});

  } catch (error) {
    console.error("AssemblyAI error:", error);

    res.status(500).json({
      error: "Transcription failed",
    });
  }
});

export default router;
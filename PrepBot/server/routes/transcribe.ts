import express from "express";
import { AssemblyAI } from "assemblyai";

const router = express.Router();

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLY_API_KEY!,
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

    // ✅ NORMALIZE FUNCTION
    const normalize = (text: string) =>
      text.toLowerCase().replace(/[.,!?]/g, "");

    // ✅ AVG CONFIDENCE
    const avgConfidence =
      words.length > 0
        ? words.reduce(
            (sum: number, w: any) => sum + (w.confidence || 0),
            0
          ) / words.length
        : null;

    // ✅ LOW CONFIDENCE WORDS
    const lowConfidenceWords = words
      .filter((w: any) => (w.confidence || 0) < 0.92)
      .map((w: any) => normalize(w.text));

    // ✅ LOW CONFIDENCE RATIO (NEW)
    const lowConfidenceRatio =
      words.length > 0
        ? words.filter((w: any) => (w.confidence || 0) < 0.92).length / words.length
        : 0;

    // 🔍 DEBUG (optional)
    console.log("Transcript:", transcriptData.text);
    console.log("Avg Confidence:", avgConfidence);
    console.log("Low Confidence Words:", lowConfidenceWords);

    // ✅ FINAL RESPONSE
    res.json({
      transcript: transcriptData.text || "",
      confidence: avgConfidence,
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
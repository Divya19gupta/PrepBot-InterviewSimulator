import express from "express";
import { AssemblyAI } from "assemblyai";
import { prisma } from "../db";

const router = express.Router();

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLY_API_KEY!,
  baseUrl: "https://api.eu.assemblyai.com",
});

router.post("/", async (req, res) => {
  try {
    const audioBase64 = req.body.audioBase64;

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

    const uploadResponse = await client.files.upload(buffer);

    const transcriptData = await client.transcripts.transcribe({
      audio_url: uploadResponse,
      speech_models: ["universal"],
    });

    if (transcriptData.language_code && transcriptData.language_code !== "en") {
      res.json({
        transcript: "",
        error: "NON_ENGLISH",
      });
      return;
    }
    const words = transcriptData.words || [];
    const avgConfidence =
      words.length > 0
        ? words.reduce((sum: number, w: any) => sum + (w.confidence || 0), 0) /
          words.length
        : null;

    const LOW_CONF_THRESHOLD = 0.92;

    const lowConfidenceRaw = words.filter(
      (w: any) => (w.confidence || 0) < LOW_CONF_THRESHOLD,
    );

    const normalize = (text: string) =>
      text.toLowerCase().replace(/[.,!?]/g, "");

    const lowConfidenceWords = lowConfidenceRaw.map((w: any) =>
      normalize(w.text),
    );

    const lowConfidenceRatio =
      words.length > 0 ? lowConfidenceRaw.length / words.length : 0;
    const alpha = 0.7;
    const beta = 0.3;

    let calibratedConfidence: number | null = null;

    if (avgConfidence !== null) {
      calibratedConfidence =
        avgConfidence * alpha + (1 - lowConfidenceRatio) * beta;
    }

    console.log("Transcript:", transcriptData.text);
    console.log("Avg Confidence:", avgConfidence);
    console.log("Low Confidence Ratio:", lowConfidenceRatio);
    console.log("Calibrated Confidence:", calibratedConfidence);

    try {
      await fetch(
        `https://api.eu.assemblyai.com/v2/transcript/${transcriptData.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: process.env.ASSEMBLY_API_KEY!,
          },
        },
      );
      console.log(`✅ AssemblyAI transcript deleted: ${transcriptData.id}`);
    } catch (err) {
      // Non-fatal: EU servers auto-delete audio within 24-48h anyway
      console.error(
        `⚠️ Failed to delete AssemblyAI transcript ${transcriptData.id}:`,
        err,
      );
    }

    res.json({
      transcript: transcriptData.text || "",
      transcriptId: transcriptData.id,
      confidence: calibratedConfidence,
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

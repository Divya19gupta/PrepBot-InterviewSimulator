import express from "express";
import { AssemblyAI } from "assemblyai";

const router = express.Router();

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLY_API_KEY!,
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

    const transcript = await client.transcripts.transcribe({
      audio_url: uploadResponse,
      speech_models: ["universal"],
    });
    if (transcript.language_code && transcript.language_code !== "en") {
    res.json({
      transcript: "",
      error: "NON_ENGLISH",
    });
    return;
  }

    console.log("AssemblyAI transcript:", transcript.text);

    res.json({
      transcript: transcript.text || "",
    });

  } catch (error) {
    console.error("AssemblyAI error:", error);
    res.status(500).json({ error: "Transcription failed" });
    return;
  }
});
export default router;
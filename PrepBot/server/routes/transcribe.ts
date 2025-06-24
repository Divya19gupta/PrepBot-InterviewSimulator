import express from "express";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const audioBase64 = req.body.audioBase64;
    const tempDir = path.join(__dirname, "..", "temp");

    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const inputWebmPath = path.join(tempDir, "input.webm");
    const inputWavPath = path.join(tempDir, "input.wav");
    const outputBasePath = path.join(tempDir, "output"); // No extension here

    // Step 1: Decode and save base64 .webm file
    const base64Data = audioBase64.split(";base64,").pop();
    fs.writeFileSync(inputWebmPath, Buffer.from(base64Data!, "base64"));

    // Step 2: Convert .webm to .wav using FFmpeg
    const ffmpegCommand = `ffmpeg -y -i "${inputWebmPath}" -ar 16000 -ac 1 -f wav "${inputWavPath}"`;
    exec(ffmpegCommand, (ffmpegErr) => {
      if (ffmpegErr) {
        console.error("FFmpeg conversion failed:", ffmpegErr);
        return res.status(500).json({ error: "Audio conversion failed" });
      }

      // Step 3: Transcribe .wav using whisper.cpp
      const whisperPath = path.join(__dirname, "..", "whisper.cpp", "build", "bin", "whisper-cli");
      const modelPath = path.join(__dirname, "..", "whisper.cpp", "models", "ggml-base.en.bin");
      const whisperCommand = `${whisperPath} -m "${modelPath}" -f "${inputWavPath}" -otxt -of "${outputBasePath}"`;

      exec(whisperCommand, (whisperErr, stdout, stderr) => {
        console.log("Whisper STDOUT:", stdout);
        console.log("Whisper STDERR:", stderr);

        if (whisperErr) {
          console.error("Whisper.cpp transcription failed:", whisperErr);
          return res.status(500).json({ error: "Transcription failed" });
        }

        const transcriptPath = `${outputBasePath}.txt`;
        if (!fs.existsSync(transcriptPath)) {
          console.error("Transcript not found at:", transcriptPath);
          return res.status(500).json({ error: "Transcript not found" });
        }

        const transcript = fs.readFileSync(transcriptPath, "utf-8");
        res.json({ transcript });
      });
    });

  } catch (err) {
    console.error("Error handling transcription:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

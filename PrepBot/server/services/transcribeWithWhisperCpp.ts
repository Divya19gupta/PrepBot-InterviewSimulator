import { exec } from "child_process";
import path from "path";
import fs from "fs";

export const transcribeWithWhisperCpp = (audioPath: string): Promise<string> => {
  const whisperPath = path.resolve(__dirname, "../../whisper.cpp/main");
  const modelPath = path.resolve(__dirname, "../../whisper.cpp/models/ggml-base.en.bin");

  return new Promise((resolve, reject) => {
    const outputPath = `${audioPath}.txt`;
    const command = `${whisperPath} -m ${modelPath} -f ${audioPath} -of ${audioPath}`;

    exec(command, (error) => {
      if (error) {
        console.error("Transcription failed:", error);
        reject("Whisper.cpp transcription failed");
        return;
      }

      fs.readFile(outputPath, "utf8", (err, data) => {
        if (err) {
          console.error("Reading output file failed:", err);
          reject("Whisper.cpp output read failed");
        } else {
          resolve(data.trim());
        }
      });
    });
  });
};

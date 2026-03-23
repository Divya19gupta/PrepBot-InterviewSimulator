import express from "express";
// import fs from "fs";
// import path from "path";
import { prisma } from "../db";
import { supabase } from "../supabaseClient";
// import prisma from "../prismaClient"; // adjust path if needed

const router = express.Router();

// const DATA_PATH = path.join(__dirname, "..", "data.json");

// helper to read/write safely
// const readData = () => {
//   try {
//     if (!fs.existsSync(DATA_PATH)) return [];
//     const raw = fs.readFileSync(DATA_PATH, "utf-8");
//     return raw ? JSON.parse(raw) : [];
//   } catch (err) {
//     console.error("❌ Failed to read DB", err);
//     return [];
//   }
// };

// const writeData = (data: any) => {
//   try {
//     fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
//   } catch (err) {
//     console.error("❌ Failed to write DB", err);
//   }
// };

// ✅ SAVE INTERVIEW ANSWER
router.post("/answer", async (req, res) => {
  try {
    const {
      userData,
      audioBase64,
      question,
      transcript,
      feedback,
      recordingAttempts
    } = req.body;

    // ✅ FIX: STOP EXECUTION
    if (!userData || !audioBase64 || !question) {
       res.status(400).json({ error: "Missing required data" });
        return;
    }

    // const dir = path.join(__dirname, "../data/audio");
    // if (!fs.existsSync(dir)) {
    //   fs.mkdirSync(dir, { recursive: true });
    // }

    const fileName = `${userData.userId}_${Date.now()}.webm`;
    // const filePath = path.join(dir, fileName);

    const base64Data = audioBase64.split(",")[1];
    // convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

    // upload to Supabase Storage
    const { data: fileData, error: uploadError } = await supabase
    .storage
    .from("interview-audios")
    .upload(`${userData.sessionId}/${fileName}`, buffer, {
        contentType: "audio/webm"
    });

    if (uploadError) throw uploadError;

    // fs.writeFileSync(filePath, buffer);

    // const db = readData();
    // db.push({
    //     type: "answer",
    //     timestamp: Date.now(),
    //     userData,
    //     question,
    //     transcript,
    //     feedback: feedback || "No feedback",
    //     recordingAttempts: recordingAttempts ?? 1,
    //     audioFile: fileName,
    //     });

    // writeData(db);

    // console.log("✅ Saved answer + audio:", fileName);
      await prisma.answer.upsert({
        where: {
            sessionId_question: {
            sessionId: userData.sessionId,
            question,
            },
        },
        update: {
            transcript,
            feedback: feedback || "No feedback",  // <-- FIX
            attempts: recordingAttempts ?? 1,
        },
        create: {
            sessionId: userData.sessionId,
            question,
            transcript,
            feedback: feedback || "No feedback",  // <-- FIX
            audioFile:`${userData.sessionId}/${fileName}`, // path in storage,
            attempts: recordingAttempts ?? 1,
        },
        });
    console.log("✅ Saved answer + audio:", `${userData.sessionId}/${fileName}`);
    res.json({ success: true });

  } catch (err) {
    console.error("❌ Answer save failed", err);
    res.status(500).json({ error: "Failed to save your answer. Please try again." });
     return;
  }
});

// ✅ SAVE REFLECTION (UPDATED FOR STRUCTURED DATA)
// router.post("/reflection", async (req, res) => {
//   try {
//     const { userData, reflectionAnswers } = req.body;

//     // ✅ FIX: STOP EXECUTION
//     if (!userData || !Array.isArray(reflectionAnswers)) {
//        res.status(400).json({ error: "Invalid data" });
//         return;
//     }

//         await prisma.reflection.createMany({
//         data: reflectionAnswers.map((a: any) => ({
//             sessionId: userData.sessionId,
//             sectionIndex: a.sectionIndex,
//             questionIndex: a.questionIndex,
//             text: a.text || "",
//             rating: a.rating ?? null,
//         })),
//         });

//     console.log("✅ Reflection saved");

//     res.json({ success: true });

//   } catch (err) {
//     console.error("❌ Reflection save failed", err);
//     res.status(500).json({ error: "Failed to save reflection" });
//      return;
//   }
// });

//SESSION START
router.post("/start", async (req, res) => {
  try {
    const { userData } = req.body;

    if (!userData?.sessionId || !userData?.userId) {
    res.status(400).json({ error: "Invalid session data" });
     return;
    }

    await prisma.session.create({
  data: {
    id: userData.sessionId,   // ✅ FIXED
    userId: userData.userId,
    name: userData.name,
    email: userData.email,
    language: userData.language || "en", // optional safety
  },
});

    console.log("✅ Session created:", userData.sessionId);

    res.json({ success: true });

  } catch (err) {
    console.error("❌ Session start failed", err);
    res.status(500).json({ error: "Failed to start session" });
    return;
  }
});
// ✅ RESUME SESSION
router.get("/resume/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
  where: { id: sessionId },
  include: {
    answers: true,
  },
});

    if (!session) {
       res.status(404).json({ error: "Session not found" });
       return;
    }

    res.json({
      session,
      answers: session.answers,
    });

  } catch (err) {
    console.error("❌ Resume fetch failed", err);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

export default router;
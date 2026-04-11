import express from "express";
import { prisma } from "../db";
import { supabase } from "../supabaseClient";

const router = express.Router();

// ✅ SAVE INTERVIEW ANSWER
router.post("/answer", async (req, res) => {
  let filePath: string | null = null;
  let uploaded = false;

  try {
    const {
      userData,
      audioBase64,
      question,
      transcript,
      feedback,
      recordingAttempts,
      questionIndex, // 🔥 NEW
    } = req.body;

    if (
      !userData?.sessionId ||
      !userData?.userId ||
      !audioBase64 ||
      !question ||
      !transcript
    ) {
       res.status(400).json({ error: "Missing required data" });
       return;
    }

    const base64Parts = audioBase64.split(",");
    if (base64Parts.length < 2) {
       res.status(400).json({ error: "Invalid audio format" });
       return;
    }

    const buffer = Buffer.from(base64Parts[1], "base64");

    const safeQuestion = question
      .replace(/[^a-zA-Z0-9]/g, "_")
      .slice(0, 30);

    const fileName = `${userData.prototype}_Q${safeQuestion}_attempt${recordingAttempts}_${Date.now()}.webm`;

    filePath = `${userData.sessionId}/${userData.prototype}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("interview-audios")
      .upload(filePath, buffer, {
        contentType: "audio/webm",
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);

    uploaded = true;

    // ✅ SAVE ANSWER
    await prisma.answer.upsert({
      where: {
        sessionId_question_prototype: {
          sessionId: userData.sessionId,
          question,
          prototype: userData.prototype,
        },
      },
      update: {
        transcript,
        feedback: feedback || "No feedback",
        attempts: recordingAttempts ?? 1,
        audioFile: filePath,
        prototype: userData.prototype,
        confidence: req.body.confidence ?? null,
        lowConfidenceWords: req.body.lowConfidenceWords ?? null,
        lowConfidenceRatio: req.body.lowConfidenceRatio ?? 0,
      },
      create: {
        sessionId: userData.sessionId,
        question,
        transcript,
        feedback: feedback || "No feedback",
        audioFile: filePath,
        attempts: recordingAttempts ?? 1,
        prototype: userData.prototype,
        confidence: req.body.confidence ?? null,
        lowConfidenceWords: req.body.lowConfidenceWords ?? null,
        lowConfidenceRatio: req.body.lowConfidenceRatio ?? 0,
      },
    });

    // 🔥 UPDATE CURRENT INDEX IN SESSION
    if (typeof questionIndex === "number") {
      await prisma.session.update({
        where: { id: userData.sessionId },
        data: {
          currentIndex: questionIndex,
        },
      });
    }

     res.json({ success: true });
     return;

  } catch (err: any) {
    console.error("❌ ERROR:", err);

    if (uploaded && filePath) {
      await supabase.storage.from("interview-audios").remove([filePath]);
    }

     res.status(500).json({ error: err.message });
     return;
  }
});

// START SESSION
router.post("/start", async (req, res) => {
  try {
    const { userData } = req.body;

    const currentPrototype = "A";

    await prisma.session.create({
      data: {
        id: userData.sessionId,
        userId: userData.userId,
        name: userData.name,
        email: userData.email,
        language: userData.language || "en",
        status: "in_progress",
        currentPrototype,
        phaseCompleted: 0,
        currentIndex: 0, // 🔥 IMPORTANT
      },
    });

     res.json({ success: true, prototype: currentPrototype });
     return;

  } catch (err) {
     res.status(500).json({ error: "Failed to start session" });
     return;
  }
});

// RESUME
router.get("/resume/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { answers: true },
    });

    if (!session) {
       res.status(404).json({ error: "Session not found" });
       return;
    }

    const currentPrototype = session.currentPrototype;

    const filteredAnswers = session.answers
      .filter((a) => a.prototype === currentPrototype)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

     res.json({
      sessionId: session.id,
      prototype: currentPrototype,
      phaseCompleted: session.phaseCompleted,
      currentIndex: session.currentIndex || 0, // 🔥 FIX
      answers: filteredAnswers.map((a) => ({
        question: a.question,
        transcript: a.transcript,
        feedback: a.feedback,
        attempts: a.attempts,
        confidence: a.confidence,
        lowConfidenceWords: a.lowConfidenceWords,
        lowConfidenceRatio: a.lowConfidenceRatio,
        prototype: a.prototype,
      })),
    });
    return;

  } catch (err) {
    console.error(err);
     res.status(500).json({ error: "Failed to fetch session" });
     return;
  }
});

// PHASE COMPLETE
router.post("/phase-complete", async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
       res.status(404).json({ error: "Session not found" });
       return;
    }

    const newPhase = session.phaseCompleted + 1;

    let nextPrototype = session.currentPrototype;

    if (newPhase === 1) {
      nextPrototype = "B";
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        phaseCompleted: newPhase,
        currentPrototype: nextPrototype,
        currentIndex: 0, // 🔥 RESET INDEX ON PHASE SWITCH
        status: newPhase === 2 ? "completed" : "in_progress",
      },
    });

     res.json({
      success: true,
      phaseCompleted: newPhase,
      nextPrototype,
    });
    return;

  } catch (err) {
     res.status(500).json({ error: "Failed to update phase" });
     return;
  }
});

// 🔥 DELETE SESSION (BULLETPROOF)
router.post("/delete", async (req, res) => {
  console.log("🔥 DELETE API HIT");

  const { sessionId } = req.body;

  if (!sessionId) {
    console.log("❌ Missing sessionId");
     res.status(400).json({ error: "Session ID required" });
     return;
  }

  try {
    // ---------- STORAGE DELETE ----------
    const collectFilesRecursive = async (path: string): Promise<string[]> => {
      let allFiles: string[] = [];

      const { data, error } = await supabase.storage
        .from("interview-audios")
        .list(path, { limit: 100 });

      if (error) {
        console.log("⚠️ Storage list error:", error.message);
        return [];
      }

      for (const item of data || []) {
        const fullPath = `${path}/${item.name}`;

        if (!item.metadata || item.metadata.size === null) {
          const nested = await collectFilesRecursive(fullPath);
          allFiles = [...allFiles, ...nested];
        } else {
          allFiles.push(fullPath);
        }
      }

      return allFiles;
    };

    const files = await collectFilesRecursive(sessionId);

    console.log("🧾 Files found:", files.length);

    if (files.length > 0) {
      const { error } = await supabase.storage
        .from("interview-audios")
        .remove(files);

      if (error) {
        console.log("⚠️ Delete error:", error.message);
      }
    }

    // ---------- DATABASE DELETE ----------
    await prisma.$transaction([
      prisma.answer.deleteMany({ where: { sessionId } }),
      prisma.phaseFeedback.deleteMany({ where: { sessionId } }),
      prisma.session.delete({ where: { id: sessionId } }),
    ]);

    console.log("✅ DELETE SUCCESS");

     res.json({
      success: true,
      deletedFiles: files.length,
    });
    return;

  } catch (err) {
    console.error("❌ DELETE FAILED:", err);
     res.status(500).json({ error: "Delete failed" });
     return;
  }
});

export default router;


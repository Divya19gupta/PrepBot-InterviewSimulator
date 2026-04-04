import express from "express";
import { prisma } from "../db";
import { supabase } from "../supabaseClient";
import { prototype } from "events";

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

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    uploaded = true;

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
        audioFile: filePath, // ✅ critical
        prototype: userData.prototype,
      },
      create: {
        sessionId: userData.sessionId,
        question,
        transcript,
        feedback: feedback || "No feedback",
        audioFile: filePath,
        attempts: recordingAttempts ?? 1,
        prototype: userData.prototype,
      },
    });

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

    const currentPrototype = "A"; // ✅ fixed order for now

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

     res.json({ session, answers: session.answers });
     return;

  } catch (err) {
     res.status(500).json({ error: "Failed to fetch session" });
     return;
  }
});

// COMPLETE SESSION
router.post("/complete", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
       res.status(400).json({ error: "Missing sessionId" });
       return;
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "completed" },
    });

     res.json({ success: true });
     return;

  } catch (err) {
     res.status(500).json({ error: "Failed to complete session" });
     return;
  }
});

// 🔥 DELETE SESSION (START FRESH)
router.post("/delete", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: "Missing sessionId" });
      return;
    }

    const answers = await prisma.answer.findMany({
      where: { sessionId },
    });

    // ✅ FILTER VALID PATHS
    const filePaths = answers
      .map((a) => a.audioFile)
      .filter((path) => typeof path === "string" && path.length > 0);

    console.log("🧹 Files to delete:", filePaths);

    if (filePaths.length > 0) {
      const { data, error } = await supabase.storage
        .from("interview-audios")
        .remove(filePaths);

      if (error) {
        console.error("❌ Supabase delete error:", error);
      } else {
        console.log("✅ Deleted files:", filePaths);
      }
    } else {
      console.log("⚠️ No valid files found to delete");
    }

    // 🔥 delete DB records
    await prisma.answer.deleteMany({
      where: { sessionId },
    });

    await prisma.session.delete({
      where: { id: sessionId },
    });

    res.json({ success: true });
    return;

  } catch (err) {
    console.error("❌ Delete session failed", err);
    res.status(500).json({ error: "Failed to delete session" });
    return;
  }
});

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
      nextPrototype = "B"; // switch after first phase
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        phaseCompleted: newPhase,
        currentPrototype: nextPrototype,
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
export default router;
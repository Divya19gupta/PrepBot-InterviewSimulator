import express from "express";
import { prisma } from "../db";
import { supabase } from "../supabaseClient";

const router = express.Router();

// =======================
// ✅ SAVE ANSWER
// =======================
router.post("/answer", async (req, res) => {
  let filePath: string | null = null;
  let uploaded = false;

  try {
    const {
      userData,
      audioBase64,
      question,
      questionIndex,
      transcript,
      feedbackA,
      feedbackB,
      wrongFeedbackType,
      wrongErrorType,
      wrongExplanation,
      recordingAttempts,
      confidence,
      lowConfidenceWords,
      lowConfidenceRatio,
    } = req.body;

    if (!userData?.sessionId || !audioBase64 || !question) {
      res.status(400).json({ error: "Missing required data" });
      return;
    }
    const existingAnswer = await prisma.answer.findUnique({
      where: {
       sessionId_questionIndex: {
          sessionId: userData.sessionId,
          questionIndex,
        },
      },
    });

    if (existingAnswer && existingAnswer.trustChoice) {
      res.status(403).json({
        error: "Answer is locked and cannot be modified",
      });
      return;
    }

    const base64Parts = audioBase64.split(",");
    if (base64Parts.length < 2) {
      res.status(400).json({ error: "Invalid audio format" });
      return;
    }

    const buffer = Buffer.from(base64Parts[1], "base64");

    // const safeQuestion = question.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
    const fileName = `Q_${questionIndex}.webm`;

     filePath = `${userData.sessionId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("interview-audios")
      .upload(filePath, buffer, {
        contentType: "audio/webm",
        upsert: true, // 🔥 OVERWRITE instead of new file
      });

    if (uploadError) throw new Error(uploadError.message);

    uploaded = true;

    // 🔥 UPSERT ANSWER
    await prisma.answer.upsert({
    where: {
      sessionId_questionIndex: {
        sessionId: userData.sessionId,
        questionIndex,
      },
    },
    update: {
      transcript,
      feedbackA,
      feedbackB,
      wrongFeedbackType,
      wrongErrorType,
      wrongExplanation,
      attempts: recordingAttempts ?? 1,
      audioFile: filePath,
      confidence,
      lowConfidenceWords,
      lowConfidenceRatio,
    },
    create: {
      sessionId: userData.sessionId,
      questionIndex,
      question, // optional
      transcript,
      feedbackA,
      feedbackB,
      wrongFeedbackType,
      wrongErrorType,
      wrongExplanation,
      attempts: recordingAttempts ?? 1,
      audioFile: filePath,
      confidence,
      lowConfidenceWords,
      lowConfidenceRatio,
    },
  });

    res.json({ success: true });
  } catch (err: any) {
    console.error("❌ SAVE ERROR:", err);

    if (uploaded && filePath) {
      await supabase.storage.from("interview-audios").remove([filePath]);
    }

    res.status(500).json({ error: err.message });
  }
});

// =======================
// ✅ SAVE USER FEEDBACK (RQ DATA)
// =======================
router.post("/answer/feedback", async (req, res) => {
  try {
    const {
      sessionId,
      questionIndex,
      trustChoice,
      relianceChoice,
      fairnessChoice,
      blameTarget,
      confidenceUsed,

      // 🔥 ADD THESE
      clarity,
      trustReason,
      understanding,
      bias,
    } = req.body;

    await prisma.answer.update({
      where: {
        sessionId_questionIndex: {
          sessionId,
          questionIndex,
        },
      },
      data: {
        // 🔵 RQ1
        confidenceUsed,
        blameTarget,

        // 🟡 RQ2
        trustChoice,
        relianceChoice,
        trustReason,

        // 🔴 RQ3
        fairnessChoice,
        understanding,
        bias,

        // control
        clarity,
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Feedback save error:", err);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

// =======================
// ✅ START SESSION
// =======================
router.post("/start", async (req, res) => {
  try {
    const { userData } = req.body;

    await prisma.session.create({
      data: {
        id: userData.sessionId,
        userId: userData.userId,
        name: userData.name,
        email: userData.email,
        language: userData.language || "en",
      },
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to start session" });
  }
});

// =======================
// ✅ RESUME SESSION
// =======================
router.get("/resume/:sessionId", async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.sessionId },
      include: { answers: true },
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json(session);
  } catch {
    res.status(500).json({ error: "Resume failed" });
  }
});

// =======================
// ✅ DELETE SESSION
// =======================
router.post("/delete", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
       res.status(400).json({ error: "Missing sessionId" });
       return;
    }

    // =========================
    // 🔥 STEP 1: FETCH ALL AUDIO FILE PATHS
    // =========================
    const answers = await prisma.answer.findMany({
      where: { sessionId },
      select: { audioFile: true },
    });

    const filePaths = answers
      .map((a: any) => a.audioFile)
      .filter((p: any): p is string => !!p);

    // =========================
    // 🔥 STEP 2: DELETE FROM SUPABASE STORAGE
    // =========================
   if (filePaths.length > 0) {
  const { error: deleteError } = await supabase.storage
    .from("interview-audios")
    .remove(filePaths);

  if (deleteError) {
    console.error("❌ Supabase delete error:", deleteError.message);
  } else {
    console.log("✅ Deleted files:", filePaths);
  }
}

    // =========================
    // 🔥 STEP 3: DELETE DB RECORDS
    // =========================
    await prisma.$transaction([
      prisma.answer.deleteMany({ where: { sessionId } }),
      prisma.session.delete({ where: { id: sessionId } }),
    ]);

    res.json({ success: true });

  } catch (err) {
    console.error("❌ Delete failed:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

router.post("/viewed", async (req, res) => {
  const { sessionId, questionIndex, type } = req.body;

  await prisma.answer.update({
    where: {
      sessionId_questionIndex: { sessionId, questionIndex },
    },
    data:
      type === "A"
        ? { viewedFeedbackA: true }
        : { viewedFeedbackB: true },
  });

  res.json({ success: true });
});
router.post("/update-index", async (req, res) => {
  try {
    const { sessionId, questionIndex } = req.body;

    if (!sessionId) {
       res.status(400).json({ error: "Missing sessionId" });
       return;
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { currentIndex: questionIndex },
    });

    res.json({ success: true });
    return;
  } catch (err) {
    console.error("❌ Index update failed:", err);
    res.status(500).json({ error: "Failed to update index" });
    return;
  }
});

export default router;
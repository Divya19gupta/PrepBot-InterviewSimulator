import express from "express";
import { prisma } from "../db";
import { supabase } from "../supabaseClient";
import { assignExperimentVersion } from "../services/evaluation/assignExperimentVersion";

const router = express.Router();

/**
 * ==========================================================
 * Save Answer
 * ==========================================================
 */

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
      wrongExplanation,
      uncertainty,
      errorCondition,
      recordingAttempts,
      confidence,
      lowConfidenceWords,
      lowConfidenceRatio,
      assemblyTranscriptId,
    } = req.body;

    if (
      !userData?.sessionId ||
      !audioBase64 ||
      !question
    ) {
      res.status(400).json({
        error: "Missing required data",
      });
      return;
    }

    //--------------------------------------------------
    // Prevent overwriting completed questionnaire
    //--------------------------------------------------

    const existingAnswer =
      await prisma.answer.findUnique({
        where: {
          sessionId_questionIndex: {
            sessionId: userData.sessionId,
            questionIndex,
          },
        },
      });

    if (
      existingAnswer &&
      existingAnswer.trustChoice
    ) {
      res.status(403).json({
        error:
          "Answer is locked and cannot be modified.",
      });
      return;
    }

    //--------------------------------------------------
    // Decode audio
    //--------------------------------------------------

    const base64Parts =
      audioBase64.split(",");

    if (base64Parts.length < 2) {
      res.status(400).json({
        error: "Invalid audio format",
      });
      return;
    }

    const buffer = Buffer.from(
      base64Parts[1],
      "base64"
    );

    const fileName = `Q_${questionIndex}.webm`;

    filePath =
      `${userData.sessionId}/${fileName}`;

    //--------------------------------------------------
    // Upload audio
    //--------------------------------------------------

    const { error: uploadError } =
      await supabase.storage
        .from("interview-audios")
        .upload(filePath, buffer, {
          contentType: "audio/webm",
          upsert: true,
        });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    uploaded = true;

    //--------------------------------------------------
    // Save answer
    //--------------------------------------------------

    await prisma.answer.upsert({

      where: {
        sessionId_questionIndex: {
          sessionId: userData.sessionId,
          questionIndex,
        },
      },

      update: {

        transcript,

        assemblyTranscriptId,

        feedbackA,

        feedbackB,

        wrongExplanation,
        uncertainty,
        errorCondition,

        attempts:
          recordingAttempts ?? 1,

        audioFile: filePath,

        confidence,

        lowConfidenceWords,

        lowConfidenceRatio,

      },

      create: {

        sessionId:
          userData.sessionId,

        questionIndex,

        question,

        transcript,

        assemblyTranscriptId,

        feedbackA,

        feedbackB,

        wrongExplanation,
        uncertainty,
        errorCondition,

        attempts:
          recordingAttempts ?? 1,

        audioFile: filePath,

        confidence,

        lowConfidenceWords,

        lowConfidenceRatio,

      },

    });

    res.json({
      success: true,
    });

  } catch (err: any) {

    console.error(
      "SAVE ERROR:",
      err
    );

    if (uploaded && filePath) {
      try {
        await supabase.storage
          .from("interview-audios")
          .remove([filePath]);
      } catch (cleanupErr) {
        console.error(
          "SAVE ERROR CLEANUP FAILED:",
          cleanupErr
        );
      }
    }

    res.status(500).json({
      error: err.message,
    });

  }

});

/**
 * ==========================================================
 * Save Questionnaire
 * ==========================================================
 */

router.post("/answer/feedback", async (req, res) => {

  try {

    const {

      sessionId,

      questionIndex,

     
      blameTarget,         // Q1 — attribution (1–5)
 
      selfCompetence,      // Q2 — confidence (1–5)
 
      trustChoice,         // Q3 — trust (1–5) ← lock gate
 
      reengageIntent,      // Q4 — re-engage (1–5)
 
      perceivedAccuracy,    // Q5 — perceived accuracy (1–5)
 
      feedbackAUsefulness,  // Q6 — Feedback A usefulness (1–5)
 
      feedbackBUsefulness,         // Q7 — Feedback B usefulness (1–5)
 
      uncertaintyBuffer,   // Q8 — noticed cues? (yes/no/not_sure | null if hidden)
 
      uncertaintyInfluence, // Q9 — cue influence (1–5 | null unless Q8=yes)
 

    } = req.body;

    await prisma.answer.update({

      where: {

        sessionId_questionIndex: {

          sessionId,

          questionIndex,

        },

      },

      data: {

        blameTarget,
 
        selfCompetence,
 
        trustChoice,
 
        reengageIntent,
 
        perceivedAccuracy,
 
        feedbackAUsefulness,
 
        feedbackBUsefulness,
 
        uncertaintyBuffer,
 
        uncertaintyInfluence,
      },

    });

    res.json({
      success: true,
    });

  } catch (err) {

    console.error(
      "Feedback save error:",
      err
    );

    res.status(500).json({
      error:
        "Failed to save feedback",
    });

  }

});

/**
 * ==========================================================
 * Start Session
 * ==========================================================
 */

router.post("/start", async (req, res) => {

  try {

    const { userData } = req.body;

    const assignment =
      await assignExperimentVersion();

    await prisma.session.create({

      data: {

        id:
          userData.sessionId,

        userId:
          userData.userId,

        participantId:
          userData.participantId,

        language:
          userData.language || "en",

        experimentVersion:
          assignment.version,

        wrongnessImplementation:
          assignment.wrongnessImplementation,

        structureCriteria:
          assignment.structureCriteria,

        intentCriteria:
          assignment.intentCriteria,

      },

    });

    res.json({

      success: true,

      experimentVersion:
        assignment.version,

      wrongnessImplementation:
        assignment.wrongnessImplementation,

    });

  } catch (err) {

    console.error(
      "Failed to start session:",
      err
    );

    res.status(500).json({
      error:
        "Failed to start session",
    });

  }

});

/**
 * ==========================================================
 * Resume Session
 * ==========================================================
 */

router.get("/resume/:sessionId", async (req, res) => {

  try {

    const session =
      await prisma.session.findUnique({

        where: {
          id: req.params.sessionId,
        },

        include: {
          answers: true,
        },

      });

    if (!session) {

      res.status(404).json({
        error:
          "Session not found",
      });

      return;

    }

    res.json(session);

  } catch {

    res.status(500).json({
      error:
        "Resume failed",
    });

  }

});

/**
 * ==========================================================
 * Delete Session
 * ==========================================================
 */

router.post("/delete", async (req, res) => {

  try {

    const { sessionId } = req.body;

    if (!sessionId) {

      res.status(400).json({
        error:
          "Missing sessionId",
      });

      return;

    }

    const answers =
      await prisma.answer.findMany({

        where: {
          sessionId,
        },

        select: {
          audioFile: true,
        },

      });

    const filePaths =
      answers
        .map((a: { audioFile: string | null }) => a.audioFile)
        .filter(
          (p:any): p is string => !!p
        );

    if (filePaths.length > 0) {

      await supabase.storage

        .from("interview-audios")

        .remove(filePaths);

    }

    await prisma.$transaction([

      prisma.answer.deleteMany({

        where: {
          sessionId,
        },

      }),

      prisma.session.delete({

        where: {
          id: sessionId,
        },

      }),

    ]);

    res.json({
      success: true,
    });

  } catch (err) {

    console.error(
      "Delete failed:",
      err
    );

    res.status(500).json({
      error:
        "Delete failed",
    });

  }

});

/**
 * ==========================================================
 * Feedback Viewed
 * ==========================================================
 */

router.post("/viewed", async (req, res) => {

  try {

    const {
      sessionId,
      questionIndex,
      type,
    } = req.body;

    await prisma.answer.update({

      where: {

        sessionId_questionIndex: {

          sessionId,

          questionIndex,

        },

      },

      data:

        type === "A"

          ? {
              viewedFeedbackA: true,
            }

          : {
              viewedFeedbackB: true,
            },

    });

    res.json({
      success: true,
    });

  } catch (err) {

    console.error(
      "Viewed update failed:",
      err
    );

    res.status(500).json({

      error:
        "Failed to update viewed status",

    });

  }

});

/**
 * ==========================================================
 * Update Current Question
 * ==========================================================
 */

router.post("/update-index", async (req, res) => {

  try {

    const {
      sessionId,
      questionIndex,
    } = req.body;

    if (!sessionId) {

      res.status(400).json({
        error:
          "Missing sessionId",
      });

      return;

    }

    await prisma.session.update({

      where: {
        id: sessionId,
      },

      data: {
        currentIndex:
          questionIndex,
      },

    });

    res.json({
      success: true,
    });

  } catch (err) {

    console.error(
      "Index update failed:",
      err
    );

    res.status(500).json({
      error:
        "Failed to update index",
    });

  }

});

/**
 * ==========================================================
 * Complete Session
 * ==========================================================
 */

router.post("/complete", async (req, res) => {

  try {

    const { sessionId } = req.body;

    if (!sessionId) {

      res.status(400).json({
        error:
          "Missing sessionId",
      });

      return;

    }

    await prisma.session.update({

      where: {
        id: sessionId,
      },

      data: {
        status: "complete",
      },

    });

    res.json({
      success: true,
    });

  } catch (err) {

    console.error(
      "Complete session error:",
      err
    );

    res.status(500).json({
      error:
        "Failed to complete session",
    });

  }

});

export default router;
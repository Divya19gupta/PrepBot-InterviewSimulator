import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  CircularProgress,
  Container,
  Typography,
  Backdrop,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Lottie from "lottie-react";
import interviewGuyAnimationData from "../assets/interview-guy.json";
import FeedbackModal from "./FeedbackModal";
import TopBar from "../pages/TopBar";

import CallEndIcon from "@mui/icons-material/CallEnd";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import MicIcon from "@mui/icons-material/Mic";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FeedbackIcon from "@mui/icons-material/Feedback";
import toast from "react-hot-toast";
import AIBackdrop from "../pages/AIBackdrop";
import RuleIcon from "@mui/icons-material/Rule";
import PsychologyIcon from "@mui/icons-material/Psychology";

const API_URL =
  import.meta.env.VITE_API_URL || "https://prepbot-server.onrender.com";
const TOTAL_QUESTIONS = 4;

const InterviewSimulator: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const [userData, setUserData] = useState<any>(null);
  const [questions, setQuestions] = useState<string[]>([]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const [answers, setAnswers] = useState<string[]>(
    Array(TOTAL_QUESTIONS).fill(""),
  );

  const [feedback, setFeedback] = useState<(any | null)[]>(
    Array(TOTAL_QUESTIONS).fill(null),
  );

  const [attempts, setAttempts] = useState<number[]>(
    Array(TOTAL_QUESTIONS).fill(0),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [popup, setPopup] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
  }>({ open: false, title: "", message: "" });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const hasFetchedRef = useRef(false);
  const isMountedRef = useRef(true);

  const [lowConfidenceWords, setLowConfidenceWords] = useState<string[]>([]);
  const [processingStage, setProcessingStage] = useState<
    "idle" | "transcribing" | "evaluating"
  >("idle");

  const [globalStage, setGlobalStage] = useState<
    | null
    | "loading"
    | "transcribing"
    | "evaluating"
    | "resetting"
    | "starting"
    | "preparing-questions"
    | "submitting"
  >(null);

  const [showRQDialog, setShowRQDialog] = useState(false);

  const [rqAnswers, setRqAnswers] = useState({
    Q1_blameTarget:         "",
    Q2_selfCompetence:      "",
    Q3_trustChoice:         "",
    Q4_reengageIntent:      "",
    Q5_perceivedAccuracy:   "",
    Q6_feedbackAUsefulness: "",
    Q7_feedbackBUsefulness: "",
    Q8_noticedCues:         "",
  });

  const [q9Influence, setQ9Influence] = useState("");

  const isDisabled = recording;
  const [selectedFeedbackType, setSelectedFeedbackType] =
    useState<"A" | "B">("A");
  const currentFeedback = feedback[currentIndex] || {};

  const viewedA = !!currentFeedback.viewedFeedbackA;
  const viewedB = !!currentFeedback.viewedFeedbackB;

  const isLocked = !!currentFeedback.trustChoice;

  const hasAnswer = !!answers[currentIndex];

  const hasFeedback =
    !!currentFeedback.feedbackA && !!currentFeedback.feedbackB;

  const canRecord = !isLocked;

  const canOpenRQ =
    hasAnswer &&
    hasFeedback &&
    viewedA &&
    viewedB &&
    !isLocked &&
    !recording;

  const isNextEnabled =
    hasAnswer &&
    viewedA &&
    viewedB &&
    isLocked;

  const isFinishEnabled =
    currentIndex === TOTAL_QUESTIONS - 1 &&
    isNextEnabled;

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmittingRQ, setIsSubmittingRQ] = useState(false);
  const [showDebriefing, setShowDebriefing] = useState(false);
  const [highlightFeedbackButtons, setHighlightFeedbackButtons] = useState(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const init = async () => {
      try {
        const storedUserData = localStorage.getItem("userData");

        if (!storedUserData) {
          navigate("/", { replace: true });
          return;
        }

        const parsed = JSON.parse(storedUserData);
        setUserData(parsed);

        setIsInitialLoading(true);

        const [qRes, res] = await Promise.all([
          fetch(`${API_URL}/api/questions`),
          fetch(`${API_URL}/api/session/resume/${parsed.sessionId}`),
        ]);

        if (!qRes.ok) throw new Error("Failed to fetch questions");
        if (!res.ok) throw new Error("Failed to resume session");

        const qData = await qRes.json();
        const data = await res.json();

        const fetchedQuestions = qData.questions.slice(0, TOTAL_QUESTIONS);
        const answersMap = data.answers || [];

        const answersArr = Array(TOTAL_QUESTIONS).fill("");
        const feedbackArr = Array(TOTAL_QUESTIONS).fill(null);
        const attemptsArr = Array(TOTAL_QUESTIONS).fill(0);

        fetchedQuestions.forEach((q: string, index: number) => {
          const found = answersMap.find(
            (a: any) => a.questionIndex === index
          );

          if (found) {
            answersArr[index] = found.transcript || "";

            feedbackArr[index] = {
              question: q,
              answer: found.transcript,
              feedbackA: found.feedbackA || "",
              feedbackB: found.feedbackB || "",
              uncertainty: found.uncertainty,
              errorCondition: found.errorCondition,
              wrongExplanation: found.wrongExplanation || null,
              viewedFeedbackA: found.viewedFeedbackA || false,
              viewedFeedbackB: found.viewedFeedbackB || false,

              trustChoice: found.trustChoice || null,
              blameTarget: found.blameTarget || null,
              selfCompetence: found.selfCompetence || null,
              perceivedAccuracy: found.perceivedAccuracy || null,
              feedbackAUsefulness: found.feedbackAUsefulness || null,
              feedbackBUsefulness: found.feedbackBUsefulness || null,
              reengageIntent: found.reengageIntent || null,
              uncertaintyBuffer: found.uncertaintyBuffer || null,
              uncertaintyInfluence: found.uncertaintyInfluence || null,

              lowConfidenceWords: found.lowConfidenceWords || [],
              confidence: found.confidence,
              lowConfidenceRatio: found.lowConfidenceRatio || 0,
            };
            
            attemptsArr[index] = found.attempts || 0;
          }
        });

        setQuestions(fetchedQuestions);
        setAnswers(answersArr);
        setFeedback(feedbackArr);
        setAttempts(attemptsArr);

        const safeIndex = data.currentIndex ?? 0;
        setCurrentIndex(safeIndex);

      } catch (err: any) {
        console.error("Resume failed:", err);
        toast.error(err.message || "Failed to restore session");
      } finally {
        setIsInitialLoading(false);
      }
    };

    init();
  }, []);

  const startRecording = async () => {
    try {
      if (isLoading) return;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      audioChunksRef.current = [];

      setTranscript("");
      setLowConfidenceWords([]);

      const newAttempts = [...attempts];
      newAttempts[currentIndex] += 1;
      setAttempts(newAttempts);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        handleRecordingStop();
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Mic access error:", err);
      setPopup({
        open: true,
        title: "Microphone Error",
        message:
          "Microphone access denied. Please enable permissions and try again.",
      });
    }
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setRecording(false);
  };

  const handleRecordingStop = async () => {
    if (audioChunksRef.current.length === 0) return;

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const reader = new FileReader();

    const index = currentIndex;
    const question = questions[index];

    if (!question) {
      toast.error("Question not loaded properly");
      return;
    }

    const attempt = attempts[index] + 1;

    const fetchJSON = async (url: string, body: any, timeout = 20000) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Something went wrong");
        }

        return data;
      } catch (err: any) {
        if (err.name === "AbortError") {
          throw new Error("Request timed out. Please try again.");
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    };

    reader.onloadend = async () => {
      if (!isMountedRef.current) return;

      const base64Audio = reader.result as string;

      if (!base64Audio) {
        toast.error("Audio processing failed");
        return;
      }

      setIsLoading(true);

      try {
        setProcessingStage("transcribing");

        const resData = await fetchJSON(`${API_URL}/api/transcribe`, {
          audioBase64: base64Audio,
        });
        if (!resData?.transcript || resData.transcript.trim().length === 0) {
          toast.error("No speech detected. Please try again.");

          setFeedback((prev) => {
            const updated = [...prev];
            updated[index] = {
              question,
              answer: "",
              feedbackA: "⚠️ Could not generate feedback. Please try again.",
              feedbackB: "⚠️ Could not generate feedback. Please try again.",
              wrongExplanation: null,
              uncertainty: "hidden",
              errorCondition: null,
              lowConfidenceWords: resData.lowConfidenceWords || [],
              confidence: resData.confidence,
              lowConfidenceRatio: resData.lowConfidenceRatio || 0,
            };
            return updated;
          });

          setAnswers((prev) => {
            const updated = [...prev];
            updated[index] = "";
            return updated;
          });

          setTranscript("");
          setLowConfidenceWords([]);
          setProcessingStage("idle");
          setIsLoading(false);

          return;
        }
        setTranscript(resData.transcript);
        setLowConfidenceWords(resData.lowConfidenceWords || []);
        const assemblyTranscriptId = resData.transcriptId || null;
        setProcessingStage("evaluating");

        const evaluation = await fetchJSON(`${API_URL}/api/evaluate`, {
          sessionId: userData.sessionId,
          question,
          answer: resData.transcript,
          questionIndex: index,
        });

        

        const feedbackA = evaluation?.feedbackA || "";
        const feedbackB = evaluation?.feedbackB || "";
        const wrongExplanation = evaluation?.wrongExplanation || null;

        if (!feedbackA || !feedbackB) {
          setIsLoading(false);
          setProcessingStage("idle");
          return;
        }

        await fetchJSON(`${API_URL}/api/session/answer`, {
          userData,
          question,
          questionIndex: index,
          transcript: resData.transcript,
          assemblyTranscriptId,
          feedbackA,
          feedbackB,
          wrongExplanation,
          uncertainty: evaluation.uncertainty,
          errorCondition: evaluation.errorCondition,
          audioBase64: base64Audio,
          recordingAttempts: attempt,
          confidence: resData.confidence,
          lowConfidenceWords: resData.lowConfidenceWords,
          lowConfidenceRatio: resData.lowConfidenceRatio,
        });

        setAnswers((prev) => {
          const updated = [...prev];
          updated[index] = resData.transcript;
          return updated;
        });

        setFeedback((prev) => {
          const updated = [...prev];
          updated[index] = {
            question,
            answer: resData.transcript,
            feedbackA,
            feedbackB,
            wrongExplanation,
            uncertainty: evaluation.uncertainty,
            errorCondition: evaluation.errorCondition,
            lowConfidenceWords: resData.lowConfidenceWords || [],
            confidence: resData.confidence,
            lowConfidenceRatio: resData.lowConfidenceRatio || 0,
          };
          return updated;
        });

        setProcessingStage("idle");
        toast.success("Response recorded successfully.");
        setHighlightFeedbackButtons(true);
      } catch (err: any) {
        console.error(err);
        setHighlightFeedbackButtons(false);
        toast.error(err.message || "Processing failed. Please retry.");

        setFeedback((prev) => {
          const updated = [...prev];
          updated[index] = {
            question,
            answer: "",
            feedbackA: "⚠️ Could not generate feedback. Please try again.",
            feedbackB: "⚠️ Could not generate feedback. Please try again.",
            uncertainty: "hidden",
            errorCondition: null,
            wrongExplanation: null,
            lowConfidenceWords: [],
            lowConfidenceRatio: 1,
            confidence: null,
            error: true,
          };
          return updated;
        });

        setAnswers((prev) => {
          const updated = [...prev];
          updated[index] = "";
          return updated;
        });

        setTranscript("⚠️ Error processing audio");
        setLowConfidenceWords([]);
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsDataURL(audioBlob);
  };


  const handleNext = async () => {
    if (recording) return;

    if (!answers[currentIndex]) {
      toast.error("Please answer before moving ahead.");
      return;
    }

    if (!viewedA || !viewedB) {
      toast.error("Please review both feedback types.");
      return;
    }

    if (!isLocked) {
      toast.error("Please submit feedback first.");
      return;
    }

    if (currentIndex < TOTAL_QUESTIONS - 1) {
      const nextIndex = currentIndex + 1;

      try {
        await fetch(`${API_URL}/api/session/update-index`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: userData.sessionId,
            questionIndex: nextIndex,
          }),
        });
      } catch (err) {
        console.error("Index update failed", err);
      }

      setGlobalStage("preparing-questions");

      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setTranscript("");
        setHighlightFeedbackButtons(false);
        setGlobalStage(null);
      }, 1500);
    }
  };
  const handleRQSubmit = async () => {
    if (isSubmittingRQ) return;
    setIsSubmittingRQ(true);

    const {
    Q1_blameTarget,
    Q2_selfCompetence,
    Q3_trustChoice,
    Q4_reengageIntent,
    Q5_perceivedAccuracy,
    Q6_feedbackAUsefulness,
    Q7_feedbackBUsefulness,
    Q8_noticedCues,
    } = rqAnswers;
    const isUncertaintyVisible = currentFeedback.uncertainty === "visible";
const q9Required = isUncertaintyVisible && Q8_noticedCues === "yes";

const baseRequired = [
  Q1_blameTarget,
  Q2_selfCompetence,
  Q3_trustChoice,
  Q4_reengageIntent,
  Q5_perceivedAccuracy,
  Q6_feedbackAUsefulness,
  Q7_feedbackBUsefulness,
];
if (isUncertaintyVisible) baseRequired.push(Q8_noticedCues);

if (baseRequired.some((v) => !v) || (q9Required && !q9Influence)) {
  toast.error("Please answer all feedback questions");
  setIsSubmittingRQ(false);
  return;
}

   try {
  const res = await fetch(`${API_URL}/api/session/answer/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
   body: JSON.stringify({
  sessionId: userData.sessionId,
  questionIndex: currentIndex,

  blameTarget: Number(Q1_blameTarget),
  selfCompetence: Number(Q2_selfCompetence),
  trustChoice: Number(Q3_trustChoice),
  reengageIntent: Number(Q4_reengageIntent),

  perceivedAccuracy: Number(Q5_perceivedAccuracy),
  feedbackAUsefulness: Number(Q6_feedbackAUsefulness),
  feedbackBUsefulness: Number(Q7_feedbackBUsefulness),

  uncertaintyBuffer:
    isUncertaintyVisible
      ? Q8_noticedCues
      : null,

  uncertaintyInfluence:
    q9Required
      ? Number(q9Influence)
      : null,
})
  });

       if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to save feedback");
  }

  setFeedback((prev) => {
    const updated = [...prev];
    const existing = updated[currentIndex] || {};
    updated[currentIndex] = {
      ...existing,
      trustChoice: Number(Q3_trustChoice),
    };
    return updated;
  });

  setShowRQDialog(false);
  toast.success("Feedback submitted successfully");

    } catch (err: any) {
      console.error("Feedback save failed:", err);
      toast.error(err.message || "Failed to save feedback");

    } finally {
      setIsSubmittingRQ(false);
    }
  };


  const handleFinishRound = async () => {
    if (recording) return;

    const currentFeedback = feedback[currentIndex] || {};

    const viewedA = !!currentFeedback.viewedFeedbackA;
    const viewedB = !!currentFeedback.viewedFeedbackB;
    const isLocked = !!currentFeedback.trustChoice;

    const isLast = currentIndex === TOTAL_QUESTIONS - 1;

    if (!isLast) {
      toast.error("Complete all questions first.");
      return;
    }

    if (!answers[currentIndex]) {
      toast.error("Please answer the last question.");
      return;
    }

    if (!viewedA || !viewedB) {
      toast.error("Please review both feedback types.");
      return;
    }

    if (!isLocked) {
      toast.error("Please save feedback before finishing.");
      return;
    }


    setPopup({
      open: true,
      title: "End Interview",
      message: "Are you sure you want to end the interview?",
      confirmText: "End",
      onConfirm: async () => {
        try {
          setGlobalStage("submitting");
          await new Promise((r) => setTimeout(r, 50));

          const res = await fetch(`${API_URL}/api/session/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: userData.sessionId }),
          });

          if (!res.ok) throw new Error("Failed to complete interview");

          localStorage.removeItem("userData");

          setGlobalStage(null);
          setShowDebriefing(true);

        } catch (err) {
          console.error(err);
          toast.error("Failed to finish interview");
          setGlobalStage(null);
        }
      },
    });
  };


  const markFeedbackViewed = async (type: "A" | "B") => {
    try {

      const isValidFeedback =
        hasAnswer &&
        currentFeedback.feedbackA &&
        currentFeedback.feedbackB &&
        !currentFeedback.error &&
        !currentFeedback.feedbackA.includes("⚠️") &&
        !currentFeedback.feedbackB.includes("⚠️");

      if (isValidFeedback) {
        await fetch(`${API_URL}/api/session/viewed`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: userData.sessionId,
            questionIndex: currentIndex,
            type,
          }),
        });

        setFeedback((prev) => {
          const updated = [...prev];
          const existing = updated[currentIndex] || {};

          updated[currentIndex] = {
            ...existing,
            viewedFeedbackA:
              type === "A" ? true : existing.viewedFeedbackA,
            viewedFeedbackB:
              type === "B" ? true : existing.viewedFeedbackB,
          };

          return updated;
        });
      }
      else {
        console.warn("Invalid feedback state, not marking viewed");
        return;
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isInitialLoading) {
    return <AIBackdrop open stage="loading" />;
  }


  return (
    <>
      <Box
        sx={{
          minHeight: "100vh",
          height: "100vh",
          overflow: "hidden",
          backgroundColor: recording
            ? "#dbf1ff"
            : "#eef6fb",
          transition: "background-color 0.4s ease",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          py: 4,
          px: 3,
          position: "relative",
        }}
      >
        <TopBar />

        {(isLoading || globalStage) && (
          <AIBackdrop
            open
            stage={
              globalStage
                ? globalStage
                : processingStage === "idle"
                  ? "loading"
                  : processingStage
            }
          />
        )}

        <Container
          maxWidth="md"
          sx={{
            p: 0,
            display: "flex",
            flexDirection: "column",
            gap: 0,
            position: "relative",
            zIndex: 2,
          }}
        >

          {questions.length === 0 ? (
            <Backdrop
              sx={{ color: "#fff", zIndex: theme.zIndex.drawer + 1 }}
              open
            >
              <CircularProgress color="inherit" />
            </Backdrop>
          ) : (
            <>

              <Box
                sx={{
                  backgroundColor: "#ffffff",
                  p: 3,
                  mt: 1,
                  textAlign: "center",
                  borderRadius: 3,
                  transition: "all 0.25s ease",
                  transform: "scale(1)",
                  opacity: 1,
                }}
              >
                <Typography variant="h5" sx={{ color: "#07466E", mb: 1 }}>
                  Question {currentIndex + 1} of {TOTAL_QUESTIONS}
                </Typography>

                <Typography
                  variant="h6"
                  sx={{ fontWeight: 500, fontSize: "1rem" }}
                >
                  {questions[currentIndex]}
                </Typography>
              </Box>


              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexGrow: 1,
                  minHeight: 320,
                }}
              >
                <Lottie
                  animationData={interviewGuyAnimationData}
                  style={{
                    width: "100%",
                    maxWidth: 400,
                    height: "auto",
                  }}
                />
              </Box>

              <Box
                sx={{
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 3,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: "red",
                    opacity: recording ? 1 : 0,
                    transition: "opacity 0.2s ease",
                    transform: recording
                      ? "translateY(0px)"
                      : "translateY(4px)",
                    transitionProperty: "opacity, transform",
                  }}
                >
                  🎙️ Recording in progress...
                </Typography>
              </Box>

              <Box
                sx={{
                  mt: 1,
                  display: "flex",
                  justifyContent: "center",
                  gap: 3,
                  backdropFilter: "blur(8px)",
                  backgroundColor: "rgba(255, 255, 255, 0.75)",
                  borderRadius: "50px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                  p: 2,
                }}
              >
                <Tooltip
                  title={recording ? "Stop Recording" : "Start Recording"}
                >
                  <span>
                    <IconButton
                      onClick={recording ? stopRecording : startRecording}
                      disabled={!canRecord}
                      sx={{
                        color: "#fff",
                        backgroundColor: recording ? "#e53935" : "#07466E",
                        borderRadius: "50%",
                        p: 1.5,
                        "&:hover": {
                          backgroundColor: recording ? "#d32f2f" : "#063655",
                        },
                        "&.Mui-disabled": {
                          color: "#bbb",
                          backgroundColor: "#e0e0e0",
                        },
                      }}
                    >
                      {recording ? (
                        <StopCircleIcon fontSize="small" />
                      ) : (
                        <MicIcon fontSize="small" />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Next Question">
                  <span>
                    <IconButton
                      onClick={handleNext}
                      disabled={!isNextEnabled}
                      sx={{
                        color:
                          currentIndex >= TOTAL_QUESTIONS - 1 ? "#ccc" : "#fff",
                        backgroundColor:
                          currentIndex >= TOTAL_QUESTIONS - 1
                            ? "#e0e0e0"
                            : "#07466E",
                        borderRadius: "50%",
                        p: 1.5,
                        "&:hover": {
                          backgroundColor:
                            currentIndex >= TOTAL_QUESTIONS - 1
                              ? "#e0e0e0"
                              : "#063655",
                        },
                        "&.Mui-disabled": {
                          color: "#bbb",
                          backgroundColor: "#e0e0e0",
                        },
                      }}

                    >
                      <ArrowForwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title="Feedback (A)">
                  <span>
                    <IconButton
                      onClick={() => {
                        setSelectedFeedbackType("A");
                        markFeedbackViewed("A");
                        setIsFeedbackModalOpen(true);
                        setHighlightFeedbackButtons(false);
                      }}
                      sx={{
                        borderRadius: "20px",
                        p: 1.5,
                        px: 2,
                        backgroundColor: "#d0873e",
                        color: "#fff",
                        "&:hover": { backgroundColor: "#D4A373" },
                        "&.Mui-disabled": {
                          color: "#bbb",
                          backgroundColor: "#e0e0e0",
                        },
                        ...(highlightFeedbackButtons && {
                          animation: "pulseGlow 1.2s infinite",
                          "@keyframes pulseGlow": {
                            "0%": { boxShadow: "0 0 0 0 rgba(208, 135, 62, 0.7)" },
                            "70%": { boxShadow: "0 0 0 10px rgba(208, 135, 62, 0)" },
                            "100%": { boxShadow: "0 0 0 0 rgba(208, 135, 62, 0)" },
                          },
                        }),
                      }}
                      disabled={isDisabled}
                    >
                      <RuleIcon fontSize="small" />
                      <Typography sx={{ ml: 0.8, fontSize: "0.75rem", fontWeight: 700 }}>A</Typography>
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title="Feedback (B)">
                  <span>
                    <IconButton
                      onClick={() => {
                        setSelectedFeedbackType("B");
                        markFeedbackViewed("B");
                        setIsFeedbackModalOpen(true);
                        setHighlightFeedbackButtons(false);
                      }}
                      sx={{
                        borderRadius: "20px",
                        p: 1.5,
                        px: 2,
                        backgroundColor: "#8cad12",
                        color: "#fff",
                        "&:hover": { backgroundColor: "#99a66a" },
                        "&.Mui-disabled": {
                          color: "#bbb",
                          backgroundColor: "#e0e0e0",
                        },
                        ...(highlightFeedbackButtons && {
                          animation: "pulseGlowB 1.2s infinite",
                          "@keyframes pulseGlowB": {
                            "0%": { boxShadow: "0 0 0 0 rgba(140, 173, 18, 0.7)" },
                            "70%": { boxShadow: "0 0 0 10px rgba(140, 173, 18, 0)" },
                            "100%": { boxShadow: "0 0 0 0 rgba(140, 173, 18, 0)" },
                          },
                        }),
                      }}
                      disabled={isDisabled}
                    >
                      <PsychologyIcon fontSize="small" />
                      <Typography sx={{ ml: 0.8, fontSize: "0.75rem", fontWeight: 700 }}>B</Typography>
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title="Answer feedback questions">
                  <span>
                    <IconButton
                     onClick={() => {
                      setRqAnswers({
                        Q1_blameTarget:         "",
                        Q2_selfCompetence:      "",
                        Q3_trustChoice:         "",
                        Q4_reengageIntent:      "",
                        Q5_perceivedAccuracy:   "",
                        Q6_feedbackAUsefulness: "",
                        Q7_feedbackBUsefulness: "",
                        Q8_noticedCues:         "",
                      });
                      setQ9Influence("");
                      setShowRQDialog(true);

                      }}
                      disabled={!canOpenRQ}
                      sx={{
                        borderRadius: "50%",
                        p: 1.5,
                        backgroundColor: "#6a1b9a",
                        color: "#fff",
                        "&:hover": { backgroundColor: "#4a148c" },
                        "&.Mui-disabled": {
                          backgroundColor: "#e0e0e0",
                          color: "#aaa",
                        },
                      }}
                    >
                      <FeedbackIcon />
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title="End Interview">
                  <span>
                    <IconButton
                      onClick={handleFinishRound}
                      disabled={!isFinishEnabled}
                      sx={{
                        p: 1.5,
                        borderRadius: "50%",
                        color: "#fff",
                        backgroundColor: "#e53935",

                        "&:hover": {
                          backgroundColor: "#c62828",
                        },

                        "&.Mui-disabled": {
                          color: "#bbb",
                          backgroundColor: "#e0e0e0",
                        },
                      }}
                    >
                      <CallEndIcon />
                    </IconButton>
                  </span>
                </Tooltip>


                <FeedbackModal
                  open={isFeedbackModalOpen}
                  onClose={() => setIsFeedbackModalOpen(false)}
                  feedback={feedback}
                  currentIndex={currentIndex}
                  selectedType={selectedFeedbackType}
                />
              </Box>

              <Dialog
                open={popup.open}
                onClose={() => setPopup((p) => ({ ...p, open: false }))}
                PaperProps={{
                  sx: {
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "80%",
                    maxWidth: 600,
                    maxHeight: "80vh",
                    overflowY: "auto",
                    bgcolor: "#fcfcfc",
                    borderRadius: "10px",
                    boxShadow: 24,
                    p: 4,
                    border: "1px solid #ddd",
                    fontFamily: "Segoe UI, sans-serif",
                  },
                }}
              >
                <DialogTitle sx={{ fontWeight: "bold" }}>
                  {popup.title}
                </DialogTitle>
                <DialogContent>
                  <Typography>{popup.message}</Typography>
                </DialogContent>
                <DialogActions>
                  <Button
                    onClick={() => setPopup((p) => ({ ...p, open: false }))}
                  >
                    Cancel
                  </Button>
                  {popup.onConfirm && (
                    <Button
                      sx={{ bgcolor: '#c62828' }}
                      variant="contained"
                      onClick={() => {
                        popup.onConfirm?.();
                        setPopup((p) => ({ ...p, open: false }));
                      }}
                    >
                      {popup.confirmText || "OK"}
                    </Button>
                  )}
                </DialogActions>
              </Dialog>

              <Dialog
                open={showRQDialog}
                onClose={() => setShowRQDialog(false)}
                PaperProps={{
                  sx: {
                    borderRadius: "16px",
                    p: 2,
                    width: "95%",
                    maxWidth: 900,
                    background: "linear-gradient(145deg, #f7faff, #edf4fb)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                  },
                }}
              >
                <DialogTitle
                  sx={{
                    fontWeight: 600,
                    color: "#07466E",
                    textAlign: "center",
                    pb: 1,
                  }}
                >
                  Quick Feedback
                </DialogTitle>

                <DialogContent
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    gap: 2,
                    alignItems: "stretch",
                    pt: 1,
                    pb: 0,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      minWidth: 0,
                      height: "60vh",
                      overflowY: "auto",
                      pr: 1,
                      "&::-webkit-scrollbar": { width: "4px" },
                      "&::-webkit-scrollbar-track": { background: "transparent" },
                      "&::-webkit-scrollbar-thumb": { background: "#cce3f5", borderRadius: "4px" },
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: "#fff8f0",
                        border: "1px solid #f0c080",
                        flexShrink: 0,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <RuleIcon fontSize="small" sx={{ color: "#d0873e" }} />
                        <Typography sx={{ fontWeight: 700, color: "#d0873e", fontSize: "0.85rem" }}>
                          Feedback A
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: "0.82rem", color: "#444", lineHeight: 1.6 }}>
                        {currentFeedback.feedbackA || "No feedback available"}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: "#f6faed",
                        border: "1px solid #c5dc70",
                        flexShrink: 0,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <PsychologyIcon fontSize="small" sx={{ color: "#8cad12" }} />
                        <Typography sx={{ fontWeight: 700, color: "#8cad12", fontSize: "0.85rem" }}>
                          Feedback B
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: "0.82rem", color: "#444", lineHeight: 1.6 }}>
                        {currentFeedback.feedbackB || "No feedback available"}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      height: "60vh",
                      position: "relative",
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: "48px",
                        background: "linear-gradient(to bottom, transparent, rgba(237, 244, 251, 0.95))",
                        pointerEvents: "none",
                        zIndex: 1,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        pr: 0.5,
                        pb: 6,
                        "&::-webkit-scrollbar": { display: "none" },
                        scrollbarWidth: "none",
                      }}
                    >
                      {/* Q1 — Attribution */}
                      {[
                        {
                          label: "If you had concerns about the feedback, where do you think those concerns would most likely come from?",
                          key: "Q1_blameTarget",
                          options: [
                            { value: "1", label: "Definitely my answer" },
                            { value: "2", label: "Probably my answer" },
                            { value: "3", label: "Not sure" },
                            { value: "4", label: "Probably the AI evaluation" },
                            { value: "5", label: "Definitely the AI evaluation" },
                          ],
                        },
                        {
                          label: "After reading this feedback, how confident are you in your answer to this question?",
                          key: "Q2_selfCompetence",
                          options: [
                            { value: "1", label: "Not confident at all" },
                            { value: "2", label: "Slightly confident" },
                            { value: "3", label: "Moderately confident" },
                            { value: "4", label: "Very confident" },
                            { value: "5", label: "Extremely confident" },
                          ],
                        },
                        {
                          label: "How much do you trust the feedback provided for this question?",
                          key: "Q3_trustChoice",
                          options: [
                            { value: "1", label: "Not at all" },
                            { value: "2", label: "Slightly" },
                            { value: "3", label: "Moderately" },
                            { value: "4", label: "Quite a lot" },
                            { value: "5", label: "Completely" },
                          ],
                        },
                        {
                          label: "Based on this experience, how likely would you be to use an AI interview coaching tool like this again?",
                          key: "Q4_reengageIntent",
                          options: [
                            { value: "1", label: "Definitely not" },
                            { value: "2", label: "Probably not" },
                            { value: "3", label: "Unsure" },
                            { value: "4", label: "Probably yes" },
                            { value: "5", label: "Definitely yes" },
                          ],
                        },
                        {
                          label: "To what extent do you believe the feedback accurately reflected your answer?",
                          key: "Q5_perceivedAccuracy",
                          options: [
                            { value: "1", label: "Not at all" },
                            { value: "2", label: "Slightly" },
                            { value: "3", label: "Moderately" },
                            { value: "4", label: "Mostly" },
                            { value: "5", label: "Completely" },
                          ],
                        },
                        {
                          label: "How useful was Feedback A for understanding your performance?",
                          key: "Q6_feedbackAUsefulness",
                          options: [
                            { value: "1", label: "Not useful at all" },
                            { value: "2", label: "Slightly useful" },
                            { value: "3", label: "Moderately useful" },
                            { value: "4", label: "Very useful" },
                            { value: "5", label: "Extremely useful" },
                          ],
                        },
                        {
                          label: "How useful was Feedback B for understanding your performance?",
                          key: "Q7_feedbackBUsefulness",
                          options: [
                            { value: "1", label: "Not useful at all" },
                            { value: "2", label: "Slightly useful" },
                            { value: "3", label: "Moderately useful" },
                            { value: "4", label: "Very useful" },
                            { value: "5", label: "Extremely useful" },
                          ],
                        },
                      ].map((q) => (
                        <Box
                          key={q.key}
                          sx={{
                            p: 1.5,
                            borderRadius: 3,
                            backgroundColor: "#ffffffcc",
                            border: "1px solid #e3ecf5",
                            flexShrink: 0,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.9rem",
                              fontWeight: 500,
                              mb: 1,
                              color: "#333",
                            }}
                          >
                            {q.label}
                          </Typography>

                          <RadioGroup
                            row
                            value={(rqAnswers as any)[q.key]}
                            onChange={(e) =>
                              setRqAnswers((prev) => ({
                                ...prev,
                                [q.key]: e.target.value,
                              }))
                            }
                          >
                            {q.options.map((opt) => (
                              <FormControlLabel
                                key={opt.value}
                                value={opt.value}
                                control={<Radio size="small" />}
                                label={opt.label}
                                sx={{
                                  mr: 2,
                                  "& .MuiFormControlLabel-label": {
                                    fontSize: "0.85rem",
                                  },
                                }}
                              />
                            ))}
                          </RadioGroup>
                        </Box>
                      ))}

                      {/* Q8 + Q9 — only when uncertainty=visible */}
                      {currentFeedback.uncertainty === "visible" && (
                        <>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, my: 0.5 }}>
                            <Box sx={{ flex: 1, height: "1px", backgroundColor: "#ddeaf5" }} />
                            <Typography sx={{ fontSize: "0.7rem", color: "#99b4cc", fontWeight: 600, whiteSpace: "nowrap", letterSpacing: "0.05em" }}>
                              ABOUT THE CONFIDENCE DISPLAY
                            </Typography>
                            <Box sx={{ flex: 1, height: "1px", backgroundColor: "#ddeaf5" }} />
                          </Box>

                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: 3,
                              backgroundColor: "#ffffffcc",
                              border: "1px solid #e3ecf5",
                              flexShrink: 0,
                            }}
                          >
                            <Typography sx={{ fontSize: "0.9rem", fontWeight: 500, mb: 1, color: "#333" }}>
                              Did you notice the confidence score or highlighted transcript words while reviewing the feedback?
                            </Typography>
                            <RadioGroup
                              row
                              value={rqAnswers.Q8_noticedCues}
                              onChange={(e) => {
                                const v = e.target.value;
                                setRqAnswers((prev) => ({ ...prev, Q8_noticedCues: v }));
                                if (v !== "yes") setQ9Influence("");
                              }}
                            >
                              {[
                                { value: "yes", label: "Yes" },
                                { value: "no", label: "No" },
                                { value: "not_sure", label: "Not sure" },
                              ].map((opt) => (
                                <FormControlLabel
                                  key={opt.value}
                                  value={opt.value}
                                  control={<Radio size="small" />}
                                  label={opt.label}
                                  sx={{ mr: 2, "& .MuiFormControlLabel-label": { fontSize: "0.85rem" } }}
                                />
                              ))}
                            </RadioGroup>

                            {/* Q9 slides in under Q8 when "Yes" selected */}
                            <Box
                              sx={{
                                overflow: "hidden",
                                maxHeight: rqAnswers.Q8_noticedCues === "yes" ? "260px" : "0px",
                                opacity: rqAnswers.Q8_noticedCues === "yes" ? 1 : 0,
                                transition: "max-height 0.35s ease, opacity 0.25s ease",
                                mt: rqAnswers.Q8_noticedCues === "yes" ? 1.5 : 0,
                              }}
                            >
                              <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: "#edf4fb", border: "1px solid #c5dcf0" }}>
                                <Typography sx={{ fontSize: "0.9rem", fontWeight: 500, mb: 1, color: "#1a4a6e" }}>
                                  To what extent did the confidence score or highlighted words influence your interpretation of the feedback?
                                </Typography>
                                <RadioGroup
                                  row
                                  value={q9Influence}
                                  onChange={(e) => setQ9Influence(e.target.value)}
                                >
                                  {[
                                    { value: "1", label: "Not at all" },
                                    { value: "2", label: "Slightly" },
                                    { value: "3", label: "Moderately" },
                                    { value: "4", label: "Strongly" },
                                    { value: "5", label: "Very strongly" },
                                  ].map((opt) => (
                                    <FormControlLabel
                                      key={opt.value}
                                      value={opt.value}
                                      control={<Radio size="small" />}
                                      label={opt.label}
                                      sx={{ mr: 2, "& .MuiFormControlLabel-label": { fontSize: "0.85rem", color: "#1a4a6e" } }}
                                    />
                                  ))}
                                </RadioGroup>
                              </Box>
                            </Box>
                          </Box>
                        </>
                      )}
                    </Box>
                  </Box>
                </DialogContent>

                <DialogActions sx={{ justifyContent: "center", pb: 2, flexDirection: "column", gap: 1 }}>
                  {(() => {
                    const isVisible = currentFeedback.uncertainty === "visible";
                    const q9Required = isVisible && rqAnswers.Q8_noticedCues === "yes";
                    const baseAnswered = Object.values(rqAnswers).filter(v => v !== "").length;
                    // Q8 not in count when hidden
                    const adjustedAnswered = isVisible ? baseAnswered : baseAnswered - (rqAnswers.Q8_noticedCues !== "" ? 1 : 0);
                    const answered = adjustedAnswered + (q9Influence !== "" ? 1 : 0);
                    const total = 7 + (isVisible ? 1 : 0) + (q9Required ? 1 : 0);
                    const allDone = answered >= total;
                    return !allDone ? (
                      <Typography variant="caption" sx={{ color: "#999" }}>
                        {answered} of {total} questions answered (scroll down to complete)
                      </Typography>
                    ) : null;
                  })()}
                  <Button
                    onClick={handleRQSubmit}
                    disabled={isSubmittingRQ || (() => {
                      const isVisible = currentFeedback.uncertainty === "visible";
                      const q9Required = isVisible && rqAnswers.Q8_noticedCues === "yes";
                      const base = [
                        rqAnswers.Q1_blameTarget,
                        rqAnswers.Q2_selfCompetence,
                        rqAnswers.Q3_trustChoice,
                        rqAnswers.Q4_reengageIntent,
                        rqAnswers.Q5_perceivedAccuracy,
                        rqAnswers.Q6_feedbackAUsefulness,
                        rqAnswers.Q7_feedbackBUsefulness,
                      ];
                      if (isVisible) base.push(rqAnswers.Q8_noticedCues);
                      return base.some(v => !v) || (q9Required && !q9Influence);
                    })()}
                    variant="contained"
                    sx={{
                      px: 4,
                      py: 1,
                      borderRadius: "18px",
                      textTransform: "none",
                      fontWeight: 500,
                      backgroundColor: "#07466E",
                      "&:hover": { backgroundColor: "#063655" },
                      "&.Mui-disabled": {
                        backgroundColor: "#e0e0e0",
                        color: "#aaa",
                      },
                    }}
                  >
                    Save Feedback
                  </Button>
                </DialogActions>
              </Dialog>

              <Dialog
                open={showDebriefing}
                PaperProps={{
                  sx: {
                    borderRadius: "16px",
                    p: 3,
                    width: "90%",
                    maxWidth: 520,
                    background: "linear-gradient(145deg, #f7faff, #edf4fb)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                  },
                }}
              >
                <DialogTitle sx={{ fontWeight: 600, color: "#07466E", textAlign: "center" }}>
                  Study Debrief
                </DialogTitle>
                <DialogContent>
                  <Typography sx={{ fontSize: "0.95rem", color: "#333", lineHeight: 1.7 }}>
                    Thank you for completing the session. We can now inform you that some feedback presented during 
                    the study <b>may have contained intentionally introduced evaluation inaccuracies</b>. This was necessary
                    because informing participants in advance could have influenced responses and
                    affected the study results.
                    <br /><br />
                    Your data will be used <b>solely for research purposes</b>. If, after learning this
                    information, you would prefer to withdraw your participation or request
                    deletion of your data, or have any questions you may contact the researcher.
                  </Typography>
                </DialogContent>
                <DialogActions sx={{ justifyContent: "center", pb: 1 }}>
                  <Button
                    variant="contained"
                    onClick={() => {
                      setShowDebriefing(false);
                      navigate("/", { replace: true });
                    }}
                    sx={{
                      px: 4,
                      borderRadius: "18px",
                      textTransform: "none",
                      backgroundColor: "#07466E",
                      "&:hover": { backgroundColor: "#063655" },
                    }}
                  >
                    OK
                  </Button>
                </DialogActions>
              </Dialog>
            </>
          )}
        </Container>
      </Box>
    </>
  );
};

export default InterviewSimulator;

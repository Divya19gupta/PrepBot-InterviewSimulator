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
  Step,
  StepLabel,
  Stepper,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Lottie from "lottie-react";
// import animationData from "../assets/interview-character.json";
import interviewGuyAnimationData from "../assets/interview-guy.json";
import FeedbackModal from "./FeedbackModal";
import TopBar from "../pages/TopBar";

import CallEndIcon from "@mui/icons-material/CallEnd";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import MicIcon from "@mui/icons-material/Mic";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FeedbackIcon from "@mui/icons-material/Feedback";
import toast from "react-hot-toast";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AIBackdrop from "../pages/AIBackdrop";

const API_URL =
  import.meta.env.VITE_API_URL || "https://prepbot-server.onrender.com";
const TOTAL_QUESTIONS = 5;

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
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const hasFetchedRef = useRef(false);
  const isMountedRef = useRef(true);
  const prevPrototypeRef = useRef<string | null>(null);
  const isDisabled = recording;
  const [lowConfidenceWords, setLowConfidenceWords] = useState<string[]>([]);
  const [endFlowStep, setEndFlowStep] = useState<"confirm" | "feedback">(
    "confirm",
  );
  const [showEndFlow, setShowEndFlow] = useState(false);
  const [processingStage, setProcessingStage] = useState<
    "idle" | "transcribing" | "evaluating"
  >("idle");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [globalStage, setGlobalStage] = useState<
    | null
    | "loading"
    | "transcribing"
    | "evaluating"
    | "resetting"
    | "starting"
    | "new-round"
    | "submitting"
  >(null);

  const [phaseFeedback, setPhaseFeedback] = useState({
    accuracy: "",
    fairness: "",
    understanding: "",
    blame: "",
  });

  // ----------------- CLEANUP -----------------

  useEffect(() => {
    return () => {
      isMountedRef.current = false; // ✅ FIX
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ----------------- LOAD SESSION -----------------

  useEffect(() => {
    if (
      hasFetchedRef.current &&
      prevPrototypeRef.current === userData?.prototype
    )
      return;

    const storedUserData = localStorage.getItem("userData");
    if (!storedUserData) {
      navigate("/", { replace: true });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(storedUserData);
    } catch {
      localStorage.removeItem("userData");
      navigate("/", { replace: true });
      return;
    }

    // 🔥 DETECT PROTOTYPE CHANGE
    const isPrototypeChanged =
      prevPrototypeRef.current !== null &&
      prevPrototypeRef.current !== parsed.prototype;

    setUserData(parsed);

    // 🔥 HARD RESET IF MODE CHANGED
    if (isPrototypeChanged) {
      setAnswers(Array(TOTAL_QUESTIONS).fill(""));
      setFeedback(Array(TOTAL_QUESTIONS).fill(null));
      setAttempts(Array(TOTAL_QUESTIONS).fill(0));
      setCurrentIndex(0);
      setTranscript("");
    }

    const fetchEverything = async () => {
      try {
        // ---------------- QUESTIONS ----------------
        const qRes = await fetch(`${API_URL}/api/questions`);
        if (!qRes.ok) {
          const err = await qRes.json();
          throw new Error(err.error || "Something went wrong");
        }

        const qData = await qRes.json();
        const fetchedQuestions = qData.questions.slice(0, TOTAL_QUESTIONS);
        setQuestions(fetchedQuestions);

        // ---------------- RESUME ----------------
        const res = await fetch(
          `${API_URL}/api/session/resume/${parsed.sessionId}`,
        );

        if (!res.ok) {
          throw new Error("Failed to restore session");
        }

        const data = await res.json();

        const answersMap = data.answers || [];

        const answersArr = Array(TOTAL_QUESTIONS).fill("");
        const feedbackArr = Array(TOTAL_QUESTIONS).fill(null);
        const attemptsArr = Array(TOTAL_QUESTIONS).fill(0);

        fetchedQuestions.forEach((q: string, index: number) => {
          const found = answersMap.find(
            (a: any) => a.question === q && a.prototype === data.prototype, // 🔥 CRITICAL FIX
          );

          if (found) {
            answersArr[index] = found.transcript || "";
            feedbackArr[index] = {
              question: q,
              answer: found.transcript,
              feedback: found.feedback,
              lowConfidenceWords: found.lowConfidenceWords || [],
              confidence: found.confidence,
              lowConfidenceRatio: found.lowConfidenceRatio || 0,
              prototype: found.prototype,
            };

            attemptsArr[index] = found.attempts || 0;
          }
        });

        setAnswers(answersArr);
        setFeedback(feedbackArr);
        setAttempts(attemptsArr);

        const firstUnanswered = answersArr.findIndex((a) => !a);
        setCurrentIndex(
          firstUnanswered === -1 ? TOTAL_QUESTIONS - 1 : firstUnanswered,
        );

        // 🔥 SAVE CURRENT PROTOTYPE
        prevPrototypeRef.current = parsed.prototype;

        hasFetchedRef.current = true;
      } catch (err: any) {
        toast.error(err.message);
        console.error("❌ Resume failed", err);
      }
    };

    fetchEverything();
  }, [navigate, userData?.prototype]);

  // ----------------- RECORDING -----------------
  const startRecording = async () => {
    try {
      if (isLoading) return;

      // 🔥 CLEAN PREVIOUS STREAM ONLY
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
      console.error("🎤 Mic access error:", err);
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

  // ----------------- HANDLE RECORDING STOP -----------------
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

    const attempt = attempts[index];

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

        let data;
        try {
          data = await res.json();
        } catch {
          throw new Error("Invalid server response");
        }

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
        // 🔹 TRANSCRIBE (UPDATED)
        setProcessingStage("transcribing");
        const resData = await fetchJSON(
          `${API_URL}/api/transcribe`,
          { audioBase64: base64Audio },
          45000,
        );

        setTranscript(resData.transcript);
        setLowConfidenceWords(resData.lowConfidenceWords || []);

        // 🔹 EVALUATE
        setProcessingStage("evaluating");
        const evaluation = await fetchJSON(
          `${API_URL}/api/evaluate`,
          {
            question,
            answer: resData.transcript,
            prototype: userData.prototype,
            confidence: resData.confidence,
            lowConfidenceWords: resData.lowConfidenceWords || [],
            lowConfidenceRatio: resData.lowConfidenceRatio || 0,
          },
          15000,
        );

        // 🔹 SAVE
        await fetchJSON(
          `${API_URL}/api/session/answer`,
          {
            userData,
            question,
            transcript: resData.transcript,
            feedback: evaluation?.feedback,
            audioBase64: base64Audio,
            recordingAttempts: attempt,
            confidence: resData.confidence,
            lowConfidenceWords: resData.lowConfidenceWords,
            lowConfidenceRatio: resData.lowConfidenceRatio,
            prototype: userData.prototype,
          },
          15000,
        );

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
            feedback: evaluation?.feedback || "No feedback",
            lowConfidenceWords: resData.lowConfidenceWords || [],
            confidence: resData.confidence || null,
            lowConfidenceRatio: resData.lowConfidenceRatio || 0, // 🔥 ADD THIS
            prototype: userData.prototype,
          };

          return updated;
        });
        setProcessingStage("idle");
        toast.success("Response recorded successfully.");
      } catch (err: any) {
        console.error("❌ Error:", err);

        toast.error(err.message || "Processing failed. Please retry.");

        setFeedback((prev) => {
          const updated = [...prev];
          updated[index] = {
            question,
            answer: "",
            feedback: "⚠️ Could not generate feedback. Please try again.",
            lowConfidenceWords: [],
            lowConfidenceRatio: 1, // 🔥 ASSUME WORST CASE
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

  // ----------------- NAVIGATION -----------------
  const handleNext = () => {
    if (recording) return;

    if (!answers[currentIndex]) {
      setPopup({
        open: true,
        title: "Incomplete Answer",
        message: "Please answer before moving ahead.",
      });
      return;
    }

    if (currentIndex < TOTAL_QUESTIONS - 1) {
      setIsTransitioning(true);

      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setTranscript("");
        setIsTransitioning(false);
      }, 250);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setIsTransitioning(true);

      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1);
        setTranscript("");
        setIsTransitioning(false);
      }, 250);
    }
  };

  // ----------------- FINISH ROUND -----------------

  const handleFinishRound = () => {
    if (recording) return;

    if (!answers[currentIndex]) {
      setPopup({
        open: true,
        title: "Incomplete Answer",
        message: "Please answer before proceeding.",
      });
      return;
    }

    setPhaseFeedback({
      accuracy: "",
      fairness: "",
      understanding: "",
      blame: "",
    });

    setEndFlowStep("confirm");
    setShowEndFlow(true);
  };

  const handleSubmitFeedback = async () => {
    const { accuracy, fairness, understanding, blame } = phaseFeedback;

    if (!accuracy || !fairness || !understanding || !blame) {
      toast.error("All feedback fields are mandatory.");
      return;
    }

    // 🔥 CLOSE DIALOG IMMEDIATELY (THIS IS THE FIX)
    setShowEndFlow(false);

    // 🔥 SHOW LOADER
    setGlobalStage("submitting");

    // 🔥 FORCE UI UPDATE BEFORE API
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      // 🔹 SEND FEEDBACK
      await fetch(`${API_URL}/api/phase-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: userData.sessionId,
          prototype: userData.prototype,
          accuracy: Number(accuracy),
          fairness: Number(fairness),
          understanding: Number(understanding),
          blame,
        }),
      });

      // 🔹 COMPLETE PHASE
      const res = await fetch(`${API_URL}/api/session/phase-complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: userData.sessionId,
        }),
      });

      const data = await res.json();

      // ===============================
      // 🔥 NEXT ROUND
      // ===============================
      if (data.phaseCompleted === 1) {
        const updatedUser = {
          ...userData,
          prototype: data.nextPrototype,
        };

        hasFetchedRef.current = false;

        localStorage.setItem("userData", JSON.stringify(updatedUser));
        setUserData(updatedUser);

        setGlobalStage("new-round");

        await new Promise((r) => setTimeout(r, 600));

        hasFetchedRef.current = false;
        navigate("/interview", { replace: true });

        return;
      }

      // ===============================
      // 🔥 FINAL EXIT
      // ===============================
      if (data.phaseCompleted === 2) {
        setGlobalStage("loading");

        localStorage.removeItem("userData");

        await new Promise((r) => setTimeout(r, 600));

        navigate("/");
      }
    } catch (err) {
      console.error(err);
      toast.error("Submission failed. Try again.");
    } finally {
      setTimeout(() => {
        setGlobalStage(null);
      }, 800);
    }
  };

  // ----------------- RENDER -----------------

  if (!userData || questions.length === 0) {
    return (
      <>
        <AIBackdrop open stage={"loading"} />
      </>
    );
  }

  return (
    <>
      <Box
        sx={{
          minHeight: "100vh",
          height: "100vh",
          overflow: "hidden",

          // 🔥 COLOR SHIFT (clean pastel)
          backgroundColor: recording
            ? "#dbf1ff" // slightly deeper pastel blue
            : "#eef6fb", // base pastel

          transition: "background-color 0.4s ease", // smooth

          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          py: 6,
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
          <Stepper
            activeStep={userData?.prototype === "A" ? 0 : 1}
            alternativeLabel
            sx={{
              mb: 2,

              "& .MuiStepIcon-root.Mui-completed": {
                color: "#2e7d32", // ✅ green
              },

              "& .MuiStepIcon-root.Mui-active": {
                color: "#07466E", // keep your blue
              },

              "& .MuiStepIcon-text": {
                fill: "#fff",
                fontWeight: "bold",
              },
            }}
          >
            <Step>
              <StepLabel>Round 1</StepLabel>
            </Step>
            <Step>
              <StepLabel>Round 2</StepLabel>
            </Step>
          </Stepper>

          {questions.length === 0 ? (
            <Backdrop
              sx={{ color: "#fff", zIndex: theme.zIndex.drawer + 1 }}
              open
            >
              <CircularProgress color="inherit" />
            </Backdrop>
          ) : (
            <>
              {/* QUESTION BOX */}
              <Box
                sx={{
                  backgroundColor: "#ffffff",
                  p: 3,
                  mt: 1,
                  textAlign: "center",
                  borderRadius: 3,
                  transition: "all 0.25s ease",
                  transform: isTransitioning ? "scale(0.96)" : "scale(1)",
                  opacity: isTransitioning ? 0.5 : 1,
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

              {/* 🔥 LOTTIE CENTER (FIXED SIZE + SPACE FILL) */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexGrow: 1, // 🔥 takes available space
                  minHeight: 320, // ensures presence
                }}
              >
                <Lottie
                  animationData={interviewGuyAnimationData}
                  style={{
                    width: "100%",
                    maxWidth: 400, // 🔥 bigger but controlled
                    height: "auto",
                  }}
                />
              </Box>
              {/* RECORDING TEXT */}
              <Box
                sx={{
                  height: 24, // 🔥 reserve space always
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
                    opacity: recording ? 1 : 0, // 🔥 fade instead of mount
                    transition: "opacity 0.2s ease",
                    transform: recording
                      ? "translateY(0px)"
                      : "translateY(4px)", // subtle motion
                    transitionProperty: "opacity, transform",
                  }}
                >
                  🎙️ Recording in progress...
                </Typography>
              </Box>
              {/* CONTROLS */}
              <Box
                sx={{
                  mt: 1,
                  display: "flex",
                  justifyContent: "center",
                  gap: 3,
                  backdropFilter: "blur(8px)",
                  backgroundColor: "rgba(255, 255, 255, 0.75)",
                  borderRadius: "50px",
                  p: 2,
                }}
              >
                <Tooltip title="Previous Question">
                  <IconButton
                    onClick={handlePrevious}
                    disabled={isDisabled || currentIndex === 0}
                    sx={{
                      color: currentIndex === 0 ? "#ccc" : "#fff",
                      backgroundColor:
                        currentIndex === 0 ? "#e0e0e0" : "#07466E",
                      borderRadius: "50%",
                      p: 1.5,
                      "&:hover": {
                        backgroundColor:
                          currentIndex === 0 ? "#e0e0e0" : "#063655",
                      },
                    }}
                  >
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip
                  title={recording ? "Stop Recording" : "Start Recording"}
                >
                  <IconButton
                    onClick={recording ? stopRecording : startRecording}
                    sx={{
                      color: "#fff",
                      backgroundColor: recording ? "#e53935" : "#07466E",
                      borderRadius: "50%",
                      p: 1.5,
                      "&:hover": {
                        backgroundColor: recording ? "#d32f2f" : "#063655",
                      },
                    }}
                  >
                    {recording ? (
                      <StopCircleIcon fontSize="small" />
                    ) : (
                      <MicIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Next Question">
                  <IconButton
                    onClick={handleNext}
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
                    }}
                    disabled={isDisabled || currentIndex >= TOTAL_QUESTIONS - 1}
                  >
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="View Feedback">
                  <IconButton
                    onClick={() => setIsFeedbackModalOpen(true)}
                    sx={{
                      color: "#fff",
                      backgroundColor: "#07466E",
                      borderRadius: "50%",
                      p: 1.5,
                      "&:hover": { backgroundColor: "#063655" },
                    }}
                    disabled={isDisabled}
                  >
                    <FeedbackIcon />
                  </IconButton>
                </Tooltip>
                {/* 🟢 FINISH ROUND BUTTON */}
                <Tooltip
                  title={
                    currentIndex === TOTAL_QUESTIONS - 1
                      ? userData?.prototype === "A"
                        ? "Finish Round"
                        : "End Interview"
                      : "Complete all questions to proceed"
                  }
                >
                  <span>
                    <IconButton
                      onClick={handleFinishRound}
                      disabled={
                        isDisabled || currentIndex !== TOTAL_QUESTIONS - 1
                      }
                      sx={{
                        p: 1.5,
                        borderRadius: "50%",
                        color:
                          currentIndex !== TOTAL_QUESTIONS - 1
                            ? "#ccc"
                            : "#fff",
                        backgroundColor:
                          currentIndex !== TOTAL_QUESTIONS - 1
                            ? "#e0e0e0"
                            : userData?.prototype === "A"
                              ? "#2e7d32" // green for round finish
                              : "#e53935", // red for final end
                      }}
                    >
                      {userData?.prototype === "A" ? (
                        <CheckCircleIcon />
                      ) : (
                        <CallEndIcon />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
                {/* <Tooltip title="End Interview">
                  <span>
                    <IconButton onClick={handleEndInterview} disabled={isDisabled || currentIndex !== TOTAL_QUESTIONS - 1} sx={{ p: 1.5, borderRadius: '50%', color: currentIndex !== TOTAL_QUESTIONS - 1 ? '#ccc' : '#fff', backgroundColor: currentIndex !== TOTAL_QUESTIONS - 1 ? '#e0e0e0' : '#e53935' }}><CallEndIcon fontSize="small" /></IconButton>
                  </span>
                </Tooltip> */}

                <FeedbackModal
                  open={isFeedbackModalOpen}
                  onClose={() => setIsFeedbackModalOpen(false)}
                  feedback={feedback}
                  currentIndex={currentIndex}
                />
              </Box>
              {/* <Dialog open={showEndConfirm}
    PaperProps={{ sx: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto', bgcolor: '#fcfcfc', borderRadius: '10px', boxShadow: 24, p: 4, border: '1px solid #ddd', fontFamily: 'Segoe UI, sans-serif' } }}
    onClose={() => setShowEndConfirm(false)}
  >
    <DialogTitle>
      {userData?.prototype === "A" ? "Finish Round" : "End Interview"}
    </DialogTitle>

    <DialogContent>
      <Typography>
        {userData?.prototype === "A"
          ? "You have completed this round. Proceed to the next round?"
          : "You have completed the interview. Do you want to exit?"}
      </Typography>
    </DialogContent>

    <DialogActions>
      <Button onClick={() => setShowEndConfirm(false)}>Cancel</Button>
      <Button variant="contained" color="error" onClick={confirmEndInterview}>
        {userData?.prototype === "A" ? "Next Round" : "Exit"}
      </Button>
    </DialogActions>
  </Dialog> */}
              {/* 🔴 END INTERVIEW BUTTON */}
              <Dialog
                open={showEndFlow}
                disableEscapeKeyDown
                PaperProps={{
                  sx: {
                    width: "80%",
                    maxWidth: 600,
                    borderRadius: "12px",
                    p: 3,
                  },
                }}
              >
                <DialogTitle>
                  {endFlowStep === "confirm"
                    ? userData?.prototype === "A"
                      ? "Finish Round"
                      : "End Interview"
                    : "Quick Feedback"}
                </DialogTitle>

                <DialogContent>
                  {endFlowStep === "confirm" ? (
                    <Typography>
                      {userData?.prototype === "A"
                        ? "You have completed this round. Proceed to next round?"
                        : "You have completed the interview. Submit and exit?"}
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        mt: 2,
                        p: 3,
                        borderRadius: 3,
                        background: "linear-gradient(145deg, #f5f7fa, #e4ecf7)",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{ mb: 2, fontWeight: 600, color: "#07466E" }}
                      >
                        Please provide feedback (all fields required)
                      </Typography>

                      {/* Accuracy */}
                      <Box sx={{ mb: 3 }}>
                        <Typography sx={{ mb: 1 }}>Accuracy</Typography>
                        <RadioGroup
                          row
                          value={phaseFeedback.accuracy}
                          onChange={(e) =>
                            setPhaseFeedback((p) => ({
                              ...p,
                              accuracy: e.target.value,
                            }))
                          }
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <FormControlLabel
                              key={n}
                              value={String(n)}
                              control={<Radio />}
                              label={n}
                            />
                          ))}
                        </RadioGroup>
                      </Box>

                      {/* Fairness */}
                      <Box sx={{ mb: 3 }}>
                        <Typography sx={{ mb: 1 }}>Fairness</Typography>
                        <RadioGroup
                          row
                          value={phaseFeedback.fairness}
                          onChange={(e) =>
                            setPhaseFeedback((p) => ({
                              ...p,
                              fairness: e.target.value,
                            }))
                          }
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <FormControlLabel
                              key={n}
                              value={String(n)}
                              control={<Radio />}
                              label={n}
                            />
                          ))}
                        </RadioGroup>
                      </Box>

                      {/* Understanding */}
                      <Box sx={{ mb: 3 }}>
                        <Typography sx={{ mb: 1 }}>Understanding</Typography>
                        <RadioGroup
                          row
                          value={phaseFeedback.understanding}
                          onChange={(e) =>
                            setPhaseFeedback((p) => ({
                              ...p,
                              understanding: e.target.value,
                            }))
                          }
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <FormControlLabel
                              key={n}
                              value={String(n)}
                              control={<Radio />}
                              label={n}
                            />
                          ))}
                        </RadioGroup>
                      </Box>

                      {/* Blame */}
                      <Box>
                        <Typography sx={{ mb: 1 }}>
                          Who do you think is responsible?
                        </Typography>
                        <RadioGroup
                          value={phaseFeedback.blame}
                          onChange={(e) =>
                            setPhaseFeedback((p) => ({
                              ...p,
                              blame: e.target.value,
                            }))
                          }
                        >
                          <FormControlLabel
                            value="self"
                            control={<Radio />}
                            label="Myself"
                          />
                          <FormControlLabel
                            value="system"
                            control={<Radio />}
                            label="System"
                          />
                          <FormControlLabel
                            value="unsure"
                            control={<Radio />}
                            label="Not sure"
                          />
                        </RadioGroup>
                      </Box>
                    </Box>
                  )}
                </DialogContent>

                <DialogActions>
                  {endFlowStep === "confirm" ? (
                    <>
                      <Button onClick={() => setShowEndFlow(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => setEndFlowStep("feedback")}
                      >
                        Continue
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleSubmitFeedback}
                      disabled={
                        !phaseFeedback.accuracy ||
                        !phaseFeedback.fairness ||
                        !phaseFeedback.understanding ||
                        !phaseFeedback.blame
                      }
                      sx={{
                        backgroundColor: "#07466E",
                        "&:hover": { backgroundColor: "#063655" },
                        opacity:
                          !phaseFeedback.accuracy ||
                            !phaseFeedback.fairness ||
                            !phaseFeedback.understanding ||
                            !phaseFeedback.blame
                            ? 0.5
                            : 1,
                      }}
                    >
                      Submit
                    </Button>
                  )}
                </DialogActions>
              </Dialog>

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
              {/* {isSwitching && (
    <Backdrop sx={{ color: "#fff", zIndex: theme.zIndex.drawer + 3 }} open>
      <CircularProgress color="inherit" />
      <AIBackdrop open stage="new-round" />
    </Backdrop>
  )} */}
            </>
          )}
        </Container>
      </Box>
    </>
  );
};

export default InterviewSimulator;

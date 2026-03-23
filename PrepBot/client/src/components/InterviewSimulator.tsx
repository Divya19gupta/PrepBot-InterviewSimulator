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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Lottie from "lottie-react";
import animationData from "../assets/interview-character.json";
import FeedbackModal from "./FeedbackModal";
import TopBar from "../pages/TopBar";

import CallEndIcon from "@mui/icons-material/CallEnd";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import MicIcon from "@mui/icons-material/Mic";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FeedbackIcon from "@mui/icons-material/Feedback";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "https://prepbot-server.onrender.com";
const TOTAL_QUESTIONS = 5;

const InterviewSimulator: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const [userData, setUserData] = useState<any>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const storedUserData = localStorage.getItem("userData");
    if (!storedUserData) return 0;
    try {
      const sessionId = JSON.parse(storedUserData).sessionId;
      const storedIndex = localStorage.getItem(`currentIndex_${sessionId}`);
      return storedIndex ? Number(storedIndex) : 0;
    } catch {
      return 0;
    }
  });

  const [answers, setAnswers] = useState<string[]>(() => {
    const storedUserData = localStorage.getItem("userData");
    if (!storedUserData) return Array(TOTAL_QUESTIONS).fill("");
    try {
      const sessionId = JSON.parse(storedUserData).sessionId;
      const storedAnswers = localStorage.getItem(`answers_${sessionId}`);
      return storedAnswers ? JSON.parse(storedAnswers) : Array(TOTAL_QUESTIONS).fill("");
    } catch {
      return Array(TOTAL_QUESTIONS).fill("");
    }
  });

  const [feedback, setFeedback] = useState<(any | null)[]>(() => {
    const storedUserData = localStorage.getItem("userData");
    if (!storedUserData) return Array(TOTAL_QUESTIONS).fill(null);
    try {
      const sessionId = JSON.parse(storedUserData).sessionId;
      const storedFeedback = localStorage.getItem(`feedback_${sessionId}`);
      return storedFeedback ? JSON.parse(storedFeedback) : Array(TOTAL_QUESTIONS).fill(null);
    } catch {
      return Array(TOTAL_QUESTIONS).fill(null);
    }
  });

  const [attempts, setAttempts] = useState<number[]>(() => {
    const storedUserData = localStorage.getItem("userData");
    if (!storedUserData) return Array(TOTAL_QUESTIONS).fill(0);
    try {
      const sessionId = JSON.parse(storedUserData).sessionId;
      const storedAttempts = localStorage.getItem(`attempts_${sessionId}`);
      return storedAttempts ? JSON.parse(storedAttempts) : Array(TOTAL_QUESTIONS).fill(0);
    } catch {
      return Array(TOTAL_QUESTIONS).fill(0);
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [popup, setPopup] = useState<{ open: boolean; title: string; message: string; onConfirm?: () => void; confirmText?: string }>({ open: false, title: "", message: "" });
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const hasFetchedRef = useRef(false);
  const isMountedRef = useRef(true); // ✅ FIX

  const isDisabled = recording;

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
    if (hasFetchedRef.current) return;
    const storedUserData = localStorage.getItem("userData");
    if (!storedUserData) { navigate("/", { replace: true }); return; }

    let parsed;
    try { parsed = JSON.parse(storedUserData); } catch { localStorage.removeItem("userData"); navigate("/", { replace: true }); return; }

    setUserData(parsed);

    const fetchEverything = async () => {
      try {
        const qRes = await fetch(`${API_URL}/api/questions`)
        if (!qRes.ok) {
          const err = await qRes.json();
          throw new Error(err.error || "Something went wrong");
        }
        const qData = await qRes.json();
        const fetchedQuestions = qData.questions.slice(0, TOTAL_QUESTIONS);
        setQuestions(fetchedQuestions);

        const storedAnswers = localStorage.getItem(`answers_${parsed.sessionId}`);
        const storedFeedback = localStorage.getItem(`feedback_${parsed.sessionId}`);
        const storedIndex = localStorage.getItem(`currentIndex_${parsed.sessionId}`);
        const storedAttempts = localStorage.getItem(`attempts_${parsed.sessionId}`);

        setAnswers(storedAnswers ? JSON.parse(storedAnswers) : Array(TOTAL_QUESTIONS).fill(""));
        setFeedback(storedFeedback ? JSON.parse(storedFeedback) : Array(TOTAL_QUESTIONS).fill(null));
        setCurrentIndex(storedIndex ? Number(storedIndex) : 0);
        setAttempts(storedAttempts ? JSON.parse(storedAttempts) : Array(TOTAL_QUESTIONS).fill(0));
      } catch (err) { 
        toast.error(err.message);
        console.error("❌ Resume failed", err); 
      }
    };

    fetchEverything();
    hasFetchedRef.current = true;
  }, [navigate]);

  // ----------------- SAVE TO LOCALSTORAGE -----------------
  useEffect(() => {
    if (!userData?.sessionId) return;
    localStorage.setItem(`answers_${userData.sessionId}`, JSON.stringify(answers));
    localStorage.setItem(`feedback_${userData.sessionId}`, JSON.stringify(feedback));
    localStorage.setItem(`currentIndex_${userData.sessionId}`, currentIndex.toString());
    localStorage.setItem(`attempts_${userData.sessionId}`, JSON.stringify(attempts));
  }, [answers, feedback, currentIndex, attempts, userData?.sessionId]);



  

  // ----------------- RECORDING -----------------
  const startRecording = async () => {
    try {
      setTranscript("");
      const newAttempts = [...attempts];
      newAttempts[currentIndex] += 1;
      setAttempts(newAttempts);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      recorder.onstop = handleRecordingStop;

      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error("🎤 Mic access error:", err);
      setPopup({
        open: true,
        title: "Microphone Error",
        message: "Microphone access denied. Please enable permissions and try again.",
      });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setRecording(false);
  };

  // ----------------- HANDLE RECORDING STOP -----------------
   const handleRecordingStop = async () => {
    if (audioChunksRef.current.length === 0) return;

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const reader = new FileReader();

    // ✅ FIX: snapshot
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
          throw new Error("Request timed out");
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    };

    reader.onloadend = async () => {
      if (!isMountedRef.current) return; // ✅ FIX

      const base64Audio = reader.result as string;

      if (!base64Audio) {
        toast.error("Audio processing failed");
        setIsLoading(false); // ✅ FIX
        return;
      }

      setIsLoading(true);

      try {
        const { transcript } = await fetchJSON(
          `${API_URL}/api/transcribe`,
          { audioBase64: base64Audio },
          45000
        );

        setTranscript(transcript);

        const evaluation = await fetchJSON(
          `${API_URL}/api/evaluate`,
          { question, answer: transcript },
          15000
        );

        await fetchJSON(
          `${API_URL}/api/session/answer`,
          {
            userData,
            question,
            transcript,
            feedback: evaluation?.feedback,
            audioBase64: base64Audio,
            recordingAttempts: attempt,
          },
          15000
        );

        setAnswers((prev) => {
          const updated = [...prev];
          updated[index] = transcript;
          return updated;
        });

        setFeedback((prev) => {
          const updated = [...prev];
          updated[index] = {
            question,
            answer: transcript,
            feedback: evaluation?.feedback || "No feedback",
          };
          return updated;
        });

      } catch (err: any) {
        console.error("❌ Error:", err);
        toast.error(err.message || "Something went wrong");
        setTranscript("⚠️ Error processing audio");
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
      setPopup({ open: true, title: "Incomplete Answer", message: "Please answer before moving ahead." });
      return;
    }
    if (currentIndex < TOTAL_QUESTIONS - 1) {
      setCurrentIndex((prev) => prev + 1);
      setTranscript("");
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setTranscript("");
    }
  };

  
  const handleEndInterview = () => {
  setShowEndConfirm(true); // Open confirmation dialog instead of immediately clearing
  };

const confirmEndInterview = async () => {
  try {
    await fetch(`${API_URL}/api/session/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: userData.sessionId }),
    });
  } catch (err) {
    console.error("❌ Failed to mark complete", err);
  }

  setShowEndConfirm(false);

  localStorage.removeItem(`answers_${userData.sessionId}`);
  localStorage.removeItem(`feedback_${userData.sessionId}`);
  localStorage.removeItem(`currentIndex_${userData.sessionId}`);
  localStorage.removeItem(`attempts_${userData.sessionId}`);
  localStorage.removeItem("userData");

  navigate("/");
};

  // ----------------- RENDER -----------------
  return (
    <Box sx={{ minHeight: '100vh', height: '100vh', overflow: 'hidden', background: '#e3f2fd', display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 6, px: 3 }}>
      <TopBar/>
      {isLoading && (
        <Backdrop sx={{ color: "#fff", zIndex: theme.zIndex.drawer + 2 }} open>
          <CircularProgress color="inherit" />
          <Typography sx={{ mt: 2 }}>Transcribing / Evaluating...</Typography>
        </Backdrop>
      )}
      <Container maxWidth="md" sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h4" sx={{ textAlign: 'center', color: '#07466E' }}>Interview Session</Typography>

        {questions.length === 0 ? (
          <Backdrop sx={{ color: '#fff', zIndex: theme.zIndex.drawer + 1 }} open>
            <CircularProgress color="inherit" />
          </Backdrop>
        ) : (
          <>
            <Box sx={{ backgroundColor: '#ffffff', p: 3, textAlign: 'center', borderRadius: 3 }}>
              <Typography variant="h5" sx={{ color: '#07466E', mb: 1 }}>Question {currentIndex + 1} of {TOTAL_QUESTIONS}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 500, fontSize: '1rem' }}>{questions[currentIndex]}</Typography>
            </Box>

            {recording && <Box sx={{ textAlign: 'center', mt: 1 }}><Typography variant="body2" sx={{ color: 'red' }}>🎙️ Recording in progress...</Typography></Box>}

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Lottie animationData={animationData} style={{ height: 250 }} />
            </Box>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 3, backdropFilter: 'blur(8px)', backgroundColor: 'rgba(255, 255, 255, 0.75)', borderRadius: '50px', p: 2 }}>
              <Tooltip title="Previous Question">
                <IconButton onClick={handlePrevious} disabled={isDisabled || currentIndex === 0} sx={{ color: currentIndex === 0 ? '#ccc' : '#fff', backgroundColor: currentIndex === 0 ? '#e0e0e0' : '#07466E', borderRadius: '50%', p: 1.5, '&:hover': { backgroundColor: currentIndex === 0 ? '#e0e0e0' : '#063655' } }}><ArrowBackIcon fontSize="small" /></IconButton>
              </Tooltip>
              <Tooltip title={recording ? "Stop Recording" : "Start Recording"}>
                <IconButton onClick={recording ? stopRecording : startRecording} sx={{ color: '#fff', backgroundColor: recording ? '#e53935' : '#07466E', borderRadius: '50%', p: 1.5, '&:hover': { backgroundColor: recording ? '#d32f2f' : '#063655' } }}>{recording ? <StopCircleIcon fontSize="small"/> : <MicIcon fontSize="small"/>}</IconButton>
              </Tooltip>
              <Tooltip title="Next Question">
                <IconButton onClick={handleNext} sx={{ color: currentIndex >= TOTAL_QUESTIONS - 1 ? '#ccc' : '#fff', backgroundColor: currentIndex >= TOTAL_QUESTIONS - 1 ? '#e0e0e0' : '#07466E', borderRadius: '50%', p: 1.5, '&:hover': { backgroundColor: currentIndex >= TOTAL_QUESTIONS - 1 ? '#e0e0e0' : '#063655' } }} disabled={isDisabled || currentIndex >= TOTAL_QUESTIONS - 1}><ArrowForwardIcon fontSize="small"/></IconButton>
              </Tooltip>
              <Tooltip title="View Feedback">
                <IconButton onClick={() => setIsFeedbackModalOpen(true)} sx={{ color: '#fff', backgroundColor: '#07466E', borderRadius: '50%', p: 1.5, '&:hover': { backgroundColor: '#063655' } }} disabled={isDisabled}><FeedbackIcon /></IconButton>
              </Tooltip>
              <Tooltip title="End Interview">
                <span>
                  <IconButton onClick={handleEndInterview} disabled={isDisabled || currentIndex !== TOTAL_QUESTIONS - 1} sx={{ p: 1.5, borderRadius: '50%', color: currentIndex !== TOTAL_QUESTIONS - 1 ? '#ccc' : '#fff', backgroundColor: currentIndex !== TOTAL_QUESTIONS - 1 ? '#e0e0e0' : '#e53935' }}><CallEndIcon fontSize="small" /></IconButton>
                </span>
              </Tooltip>
              <FeedbackModal open={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} feedback={feedback} currentIndex={currentIndex} />
            </Box>
            <Dialog open={showEndConfirm} 
            PaperProps={{ sx: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto', bgcolor: '#fcfcfc', borderRadius: '10px', boxShadow: 24, p: 4, border: '1px solid #ddd', fontFamily: 'Segoe UI, sans-serif' } }}
            onClose={() => setShowEndConfirm(false)}>
            <DialogTitle>End Interview</DialogTitle>
  <DialogContent>
    <Typography>
      Your progress will be saved. Are you sure you want to end the interview?
    </Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setShowEndConfirm(false)}>Cancel</Button>
    <Button variant="contained" color="error" onClick={confirmEndInterview}>
      End Interview
    </Button>
  </DialogActions>
</Dialog>

            <Dialog open={popup.open} onClose={() => setPopup((p) => ({ ...p, open: false }))} PaperProps={{ sx: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto', bgcolor: '#fcfcfc', borderRadius: '10px', boxShadow: 24, p: 4, border: '1px solid #ddd', fontFamily: 'Segoe UI, sans-serif' } }}>
              <DialogTitle sx={{ fontWeight: 'bold' }}>{popup.title}</DialogTitle>
              <DialogContent><Typography>{popup.message}</Typography></DialogContent>
              <DialogActions>
                <Button onClick={() => setPopup((p) => ({ ...p, open: false }))}>Cancel</Button>
                {popup.onConfirm && <Button variant="contained" onClick={() => { popup.onConfirm?.(); setPopup((p) => ({ ...p, open: false })); }}>{popup.confirmText || "OK"}</Button>}
              </DialogActions>
            </Dialog>
          </>
        )}
      </Container>
    </Box>
  );
};

export default InterviewSimulator;
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, CircularProgress, Container, Typography, Backdrop, IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Lottie from "lottie-react";
import animationData from "../assets/interview-character.json";
import FeedbackModal from "./FeedbackModal";
import CallEndIcon from '@mui/icons-material/CallEnd'; 
import StopCircleIcon from '@mui/icons-material/StopCircle';
import MicIcon from '@mui/icons-material/Mic';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import FeedbackIcon from '@mui/icons-material/Feedback';

const TOTAL_QUESTIONS = 5;

const InterviewSimulator: React.FC = () => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(TOTAL_QUESTIONS).fill(""));
  const [feedback, setFeedback] = useState<(any | null)[]>(Array(TOTAL_QUESTIONS).fill(null));
  const [isLoading, setIsLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const navigate = useNavigate();
  const theme = useTheme();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      const res = await fetch("http://localhost:3001/api/questions");
      const data = await res.json();
      setQuestions(data.questions.slice(0, TOTAL_QUESTIONS));
    };
    fetchQuestions();
  }, []);

  const startRecording = async () => {
    setTranscript("");
    setFeedback(prev => {
      const newFeedback = [...prev];
      newFeedback[currentIndex] = null;
      return newFeedback;
    });

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = event => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;

        setIsLoading(true);
        try {
          const transcribeRes = await fetch("http://localhost:3001/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioBase64: base64Audio }),
          });
          const { transcript } = await transcribeRes.json();
          setTranscript(transcript);

          const evalRes = await fetch("http://localhost:3001/api/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: questions[currentIndex],
              answer: transcript,
            }),
          });
          const evaluation = await evalRes.json();

          const updatedAnswers = [...answers];
          updatedAnswers[currentIndex] = transcript;

          const updatedFeedback = [...feedback];
          updatedFeedback[currentIndex] = {
            question: questions[currentIndex],
            answer: transcript,
            feedback: evaluation.feedback,
            score: evaluation.score,
          };

          setAnswers(updatedAnswers);
          setFeedback(updatedFeedback);
        } catch (err) {
          console.error("Error during evaluation:", err);
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsDataURL(audioBlob);
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleNext = () => {
    if (currentIndex < TOTAL_QUESTIONS - 1) {
      setCurrentIndex(currentIndex + 1);
      setTranscript("");
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setTranscript("");
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        height: '100vh',
        overflow: 'hidden',
        background: '#e3f2fd',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        py: 6,
        px: 3,
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <Typography variant="h4" sx={{ textAlign: 'center', color: '#07466E' }}>
          Interview Session
        </Typography>

        {questions.length === 0 || isLoading ? (
          <Backdrop sx={{ color: '#fff', zIndex: theme.zIndex.drawer + 1 }} open>
            <CircularProgress color="inherit" />
          </Backdrop>
        ) : (
          <>
            <Box
              sx={{
                backgroundColor: '#ffffff',
                p: 3,
                textAlign: 'center',
                borderRadius: 3,
              }}
            >
              <Typography variant="h5" sx={{ color: '#07466E', mb: 1 }}>
                Question {currentIndex + 1} of {TOTAL_QUESTIONS}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 500, fontSize: '1rem' }}>
                {questions[currentIndex]}
              </Typography>
            </Box>

            {recording && (
              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Typography variant="body2" sx={{ color: 'red' }}>
                  🎙️ Recording in progress...
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Lottie animationData={animationData} style={{ height: 250 }} />
            </Box>

            <Box
              sx={{
                mt: 4,
                display: 'flex',
                justifyContent: 'center',
                gap: 3,
                backdropFilter: 'blur(8px)',
                backgroundColor: 'rgba(255, 255, 255, 0.75)',
                borderRadius: '50px',
                p: 2,
              }}
            >
              <Tooltip title="Home">
                <IconButton
                  onClick={() => navigate("/")}
                  sx={{
                    color: '#fff',
                    backgroundColor: '#07466E',
                    borderRadius: '50%',
                    p: 1.5,
                    '&:hover': {
                      backgroundColor: '#063655',
                    },
                  }}
                >
                  <HomeIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Previous Question">
              <IconButton
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                sx={{
                  color: currentIndex === 0 ? '#ccc' : '#fff',
                  backgroundColor: currentIndex === 0 ? '#e0e0e0' : '#07466E',
                  borderRadius: '50%',
                  p: 1.5,
                  '&:hover': {
                    backgroundColor: currentIndex === 0 ? '#e0e0e0' : '#063655',
                  },
                }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>

              <Tooltip title={recording ? "Stop Recording" : "Start Recording"}>
                <IconButton
                  onClick={recording ? stopRecording : startRecording}
                  sx={{
                    color: '#fff',
                    backgroundColor: recording ? '#e53935' : '#07466E',
                    borderRadius: '50%',
                    p: 1.5,
                    '&:hover': {
                      backgroundColor: recording ? '#d32f2f' : '#063655',
                    },
                  }}
                >
                  {recording ? <StopCircleIcon fontSize="small"/> : <MicIcon fontSize="small"/>}
                </IconButton>
              </Tooltip>

              <Tooltip title="Next Question">
                <IconButton
                  onClick={handleNext}
                  sx={{
                    color: currentIndex >= TOTAL_QUESTIONS - 1 ? '#ccc' : '#fff',
                    backgroundColor: currentIndex >= TOTAL_QUESTIONS - 1 ? '#e0e0e0' : '#07466E',
                    borderRadius: '50%',
                    p: 1.5,
                    '&:hover': {
                      backgroundColor: currentIndex >= TOTAL_QUESTIONS - 1 ? '#e0e0e0' : '#063655',
                    },
                  }}
                  disabled={currentIndex >= TOTAL_QUESTIONS - 1}
                >
                  <ArrowForwardIcon fontSize="small"/>
                </IconButton>
              </Tooltip>

              <Tooltip title="View Feedback">
                <IconButton
                  onClick={() => setIsFeedbackModalOpen(true)}
                  sx={{
                    color: '#fff',
                    backgroundColor: '#07466E',
                    borderRadius: '50%',
                    p: 1.5,
                    '&:hover': {
                      backgroundColor: '#063655',
                    },
                  }}
                >
                  <FeedbackIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="End Interview">
                <IconButton
                  onClick={() => navigate("/reflection")}
                  sx={{
                    color: '#fff',
                    backgroundColor: '#e53935',
                    borderRadius: '50%',
                    p: 1.5,
                    '&:hover': {
                      backgroundColor: '#d32f2f',
                    },
                  }}
                >
                  <CallEndIcon fontSize="small"/>
                </IconButton>
              </Tooltip>
            </Box>

            <FeedbackModal
              open={isFeedbackModalOpen}
              onClose={() => setIsFeedbackModalOpen(false)}
              feedback={feedback}
              currentIndex={currentIndex}
            />
          </>
        )}
      </Container>
    </Box>
  );
};

export default InterviewSimulator;

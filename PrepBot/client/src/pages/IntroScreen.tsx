import React, { useState } from "react";
import {
  Box, Container, Typography, Button, Chip
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import RuleIcon from "@mui/icons-material/Rule";
import PsychologyIcon from "@mui/icons-material/Psychology";
import FeedbackIcon from "@mui/icons-material/Feedback";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";

import AIBackdrop from "./AIBackdrop";

interface IntroScreenProps {
  onBegin: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onBegin }) => {
    const [loading, setLoading] = useState(false);
  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#eef6fb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
        px: 3,
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            backgroundColor: "#ffffff",
            borderRadius: 3,
            p: 4,
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Chip
              icon={<WorkOutlineIcon sx={{ fontSize: "1rem" }} />}
              label="Behavioural Interview Simulation"
              sx={{
                backgroundColor: "#e8f4fd",
                color: "#07466E",
                fontWeight: 600,
                fontSize: "0.8rem",
                px: 1,
              }}
            />
          </Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: "#07466E",
              textAlign: "center",
              mt: 0.5,
            }}
          >
            Welcome to PrepBot
          </Typography>

         <Typography
  variant="body2"
  sx={{
    color: "#555",
    textAlign: "center",
    lineHeight: 1.7,
    px: 1,
  }}
>
  You are about to begin a simulated behavioural interview.
  Please answer each question as you would in a real interview and speak as naturally as possible.
  There are <b>no right or wrong answers</b>. We are interested in your genuine responses.
</Typography>
          <Box
            sx={{
              backgroundColor: "#f7faff",
              borderRadius: 2,
              p: 2.5,
              border: "1px solid #e3ecf5",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, color: "#07466E", mb: 0.5 }}
            >
              What will happen:
            </Typography>

            {[
  {
    icon: (
      <MicIcon
        fontSize="small"
        sx={{ color: "#07466E", mt: 0.2, flexShrink: 0 }}
      />
    ),
    text: "You will be asked 4 behavioural interview questions. Record your spoken answer for each question as naturally as you would in a real interview.",
  },
  {
    icon: (
      <Box
        sx={{
          display: "flex",
          gap: 0.5,
          mt: 0.2,
          flexShrink: 0,
        }}
      >
        <RuleIcon fontSize="small" sx={{ color: "#d0873e" }} />
        <PsychologyIcon fontSize="small" sx={{ color: "#8cad12" }} />
      </Box>
    ),
    text: "After each answer, you will receive two AI-generated feedback summaries: (A) Feedback and (B) Feedback. Please review both before continuing.",
  },
  {
    icon: (
      <FeedbackIcon
        fontSize="small"
        sx={{ color: "#6a1b9a", mt: 0.2, flexShrink: 0 }}
      />
    ),
    text: "For some questions, additional information about the speech transcription quality (such as a confidence score and highlighted transcript words) may also be displayed.",
  },
  {
    icon: (
      <FeedbackIcon
        fontSize="small"
        sx={{ color: "#6a1b9a", mt: 0.2, flexShrink: 0 }}
      />
    ),
    text: "After reviewing the feedback, you will complete a short questionnaire about your experience with the AI feedback before moving to the next question.",
  },
].map((item, i) => (
  <Box
    key={i}
    sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}
  >
    {item.icon}
    <Typography
      variant="body2"
      sx={{ color: "#444", lineHeight: 1.65 }}
    >
      {item.text}
    </Typography>
  </Box>
))}
          </Box>
          <Typography
            variant="caption"
            sx={{ color: "#999", textAlign: "center" }}
          >
            Estimated time: 15–25 minutes
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
            setLoading(true);
            setTimeout(() => {
                onBegin();
            }, 1800);
            }}
            sx={{
              backgroundColor: "#07466E",
              borderRadius: "18px",
              padding: "10px 20px",
              fontSize: "16px",
              fontWeight: "bold",
              "&:hover": { backgroundColor: "#063655" },
              mt: 0.5,
            }}
          >
            Begin Interview
          </Button>
        
        </Box>
      </Container>
      <AIBackdrop open={loading} stage="starting" />
    </Box>
  );
};

export default IntroScreen;
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
            You are about to begin a simulated behavioural job interview.
            Please answer each question as you would in a real interview.
            Speak naturally (there are no right or wrong answers).
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
                icon: <MicIcon fontSize="small" sx={{ color: "#07466E", mt: 0.2, flexShrink: 0 }} />,
                text: "You will be asked 6 questions. Record your spoken answer for each one.",
              },
              {
                icon: (
                  <Box sx={{ display: "flex", gap: 0.5, mt: 0.2, flexShrink: 0 }}>
                    <RuleIcon fontSize="small" sx={{ color: "#d0873e" }} />
                    <PsychologyIcon fontSize="small" sx={{ color: "#8cad12" }} />
                  </Box>
                ),
                text: "After each answer, you will receive two AI feedback items: 'Feedback A' and 'Feedback B'. Read both the feedbacks carefully.",
              },
              {
                icon: <FeedbackIcon fontSize="small" sx={{ color: "#6a1b9a", mt: 0.2, flexShrink: 0 }} />,
                text: "You will then answer a short survey comparing the two feedback items.",
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
            Estimated time: 20–35 minutes
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
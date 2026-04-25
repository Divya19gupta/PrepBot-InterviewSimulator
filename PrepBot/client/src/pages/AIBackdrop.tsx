import React from "react";
import { Backdrop, Box, CircularProgress, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

type Props = {
  open: boolean;
  stage?: "transcribing" | "evaluating" | "loading" | "resetting" | "starting" | "new-round" | "submitting";
};

const AIBackdrop: React.FC<Props> = ({ open, stage = "loading" }) => {
  const theme = useTheme();

  const getText = () => {
    switch (stage) {
      case "transcribing":
        return "Transcribing";
      case "evaluating":
        return "Evaluating";
      case "resetting":
        return "Resetting session";
      case "starting":
        return "Starting interview";
    case "new-round":
        return "Preparing next round";
    case "submitting":
        return "Submitting feedback";
      default:
        return "Loading";
    }
  };

  return (
    <Backdrop
      open={open}
      sx={{
        color: "#fff",
        zIndex: theme.zIndex.drawer + 3,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        flexDirection: "column",
      }}
    >
      {/* 🔥 WAVEFORM (TRANSCRIBING) */}
      {stage === "transcribing" && (
        <Box sx={{ display: "flex", gap: 0.6, mb: 3 }}>
          {[...Array(6)].map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 4,
                height: 20,
                background: "#fff",
                borderRadius: 2,
                animation: "wave 1s infinite ease-in-out",
                animationDelay: `${i * 0.1}s`,
                "@keyframes wave": {
                  "0%,100%": { transform: "scaleY(0.4)" },
                  "50%": { transform: "scaleY(1.2)" },
                },
              }}
            />
          ))}
        </Box>
      )}

      {/* 🔥 THINKING ANIMATION (EVALUATING) */}
      {stage === "evaluating" && (
        <Box
          sx={{
            mb: 3,
            width: 60,
            height: 60,
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.2)",
            borderTop: "3px solid #fff",
            animation: "spin 1s linear infinite, pulse 2s ease-in-out infinite",
            "@keyframes spin": {
              "0%": { transform: "rotate(0deg)" },
              "100%": { transform: "rotate(360deg)" },
            },
            "@keyframes pulse": {
              "0%": { transform: "scale(1)", opacity: 0.7 },
              "50%": { transform: "scale(1.1)", opacity: 1 },
              "100%": { transform: "scale(1)", opacity: 0.7 },
            },
          }}
        />
      )}

      {/* 🔥 DEFAULT LOADER */}
      {stage !== "transcribing" && stage !== "evaluating" && (
        <Box
          sx={{
            mb: 3,
            animation: "pulse 1.5s infinite ease-in-out",
            "@keyframes pulse": {
              "0%": { transform: "scale(1)", opacity: 0.7 },
              "50%": { transform: "scale(1.15)", opacity: 1 },
              "100%": { transform: "scale(1)", opacity: 0.7 },
            },
          }}
        >
          <CircularProgress color="inherit" size={50} />
        </Box>
      )}

      {/* 🔥 TEXT + TYPING DOTS */}
      <Typography
      component="div"
        sx={{
          fontSize:
            stage === "evaluating"
              ? "1.6rem"
              : stage === "transcribing"
              ? "1.4rem"
              : "1.2rem",
          fontWeight: stage === "evaluating" ? 600 : 400,
          display: "flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        {getText()}

        {/* Typing dots */}
        <Box sx={{ display: "flex", gap: 0.3, ml: 0.5 }}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#fff",
                opacity: 0.3,
                animation: "dots 1.4s infinite",
                animationDelay: `${i * 0.2}s`,
                "@keyframes dots": {
                  "0%, 80%, 100%": { opacity: 0.2, transform: "scale(0.8)" },
                  "40%": { opacity: 1, transform: "scale(1.2)" },
                },
              }}
            />
          ))}
        </Box>
      </Typography>
    </Backdrop>
  );
};

export default AIBackdrop;
import React from "react";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Fade from "@mui/material/Fade";
import Backdrop from "@mui/material/Backdrop";
import Typography from "@mui/material/Typography";
import ReactMarkdown from "react-markdown";

const modalStyle = {
  position: "absolute" as const,
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
};

type FeedbackType = {
  feedback: string;
  answer: string;
  lowConfidenceWords?: string[];
  confidence?: number;
  prototype?: string;
  lowConfidenceRatio?: number;
};

type FeedbackModalProps = {
  open: boolean;
  onClose: () => void;
  feedback: FeedbackType[];
  currentIndex: number;
};

export default function FeedbackModal({
  open,
  onClose,
  feedback,
  currentIndex,
}: FeedbackModalProps) {
  const current = feedback[currentIndex];
  // 🔥 HIGHLIGHT FUNCTION
  const renderTranscript = (
    text: string,
    lowConfidenceWords: string[] = [],
  ) => {
    if (!text) return null;

    const normalize = (word: string) =>
      word.toLowerCase().replace(/[.,!?]/g, "");

    const words = text.split(" ");

    return words.map((word, index) => {
      const cleanWord = normalize(word);
      const isLow = lowConfidenceWords.includes(cleanWord);

      return (
        <span
          key={index}
          style={{
            color: isLow ? "#e53935" : "inherit",
            fontWeight: isLow ? "bold" : "normal",
          }}
        >
          {word + " "}
        </span>
      );
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{ backdrop: { timeout: 500 } }}
    >
      <Fade in={open}>
        <Box sx={modalStyle}>
          <Typography variant="h6" sx={{ color: "#2c3e50", mb: 2 }}>
            Evaluation Feedback
          </Typography>
          <Typography variant="body2" sx={{ color: "#666", mb: 2 }}>
            {current?.prototype === "B"
              ? (() => {
                  const percent = current?.confidence
                    ? (current.confidence * 100).toFixed(0)
                    : null;

                  const ratio = current?.lowConfidenceRatio || 0;

                  if (ratio > 0.25) {
                    return `Transcript Confidence: Low ${
                      percent ? `(${percent}%)` : ""
                    } — multiple parts may be uncertain`;
                  }

                  if (ratio > 0.05) {
                    return `Transcript Confidence: Moderate ${
                      percent ? `(${percent}%)` : ""
                    } — some parts may be uncertain`;
                  }

                  return `Transcript Confidence: High ${
                    percent ? `(${percent}%)` : ""
                  }`;
                })()
              : ""}
          </Typography>
          {/* 🔥 TRANSCRIPT (ONLY IF DATA EXISTS → effectively Mode B) */}
          {current?.prototype === "B" && current?.answer && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ color: "#555", mb: 1 }}>
                <strong>Your Response (Transcribed):</strong>
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  backgroundColor: "#f5f5f5",
                  p: 2,
                  borderRadius: 2,
                }}
              >
                {renderTranscript(
                  current.answer,
                  current.lowConfidenceWords || [],
                )}
              </Typography>

              {/* 🔥 CONFIDENCE
              {current?.confidence !== undefined && current?.confidence !== null && (
              <Typography variant="caption" sx={{ color: '#888', mt: 1, display: 'block' }}>
                  Confidence: {(current.confidence * 100).toFixed(0)}% — lower values
                  indicate the system was less certain about parts of your speech.
                </Typography>
              )} */}
            </Box>
          )}

          {/* 🔹 FEEDBACK */}
          <Typography variant="subtitle2" sx={{ color: "#555", mb: 1 }}>
            <strong>Feedback:</strong>
          </Typography>

          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <Typography
                  variant="body1"
                  sx={{ fontSize: "1rem", lineHeight: 1.6 }}
                  paragraph
                >
                  {children}
                </Typography>
              ),
              ul: ({ children }) => (
                <ul style={{ paddingLeft: "1.5rem", marginTop: 0 }}>
                  {children}
                </ul>
              ),
              li: ({ children }) => (
                <li style={{ marginBottom: "0.5rem" }}>{children}</li>
              ),
            }}
          >
            {current?.feedback || "No feedback available."}
          </ReactMarkdown>
        </Box>
      </Fade>
    </Modal>
  );
}

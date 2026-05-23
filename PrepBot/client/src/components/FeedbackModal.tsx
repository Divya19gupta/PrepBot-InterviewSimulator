import React from "react";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Fade from "@mui/material/Fade";
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

type FeedbackModalProps = {
  open: boolean;
  onClose: () => void;
  feedback: any[];
  currentIndex: number;
  selectedType: "A" | "B";
};

export default function FeedbackModal({
  open,
  onClose,
  feedback,
  currentIndex,
  selectedType,
}: FeedbackModalProps) {
  const current = feedback[currentIndex];

  const selectedFeedback =
    selectedType === "A"
      ? current?.feedbackA
      : current?.feedbackB;
  const renderTranscript = (
    text: string,
    lowWords: string[] = [],
    selectedType: "A" | "B"
  ) => {
    if (!text) return "No transcript available";

    if (selectedType === "A") {
      return text;
    }
    const normalize = (word: string) =>
      word.toLowerCase().replace(/[.,!?]/g, "");

    const words = text.split(" ");

    return words.map((word, index) => {
      const clean = normalize(word);
      const isLow = lowWords.includes(clean);

      return (
        <span
          key={index}
          style={{
            color: isLow ? "rgb(239, 148, 2)" : "inherit",
            fontWeight: isLow ? "bold" : "normal",
          }}
        >
          {word + " "}
        </span>
      );
    });
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Fade in={open}>
        <Box sx={modalStyle}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Feedback ({selectedType})
          </Typography>
          {current?.answer && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{ color: "#555", mb: 1 }}
              >
                <strong>Your Answer (Transcribed):</strong>
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
                  selectedType
                )}
              </Typography>
            </Box>
          )}
          {selectedType === "B" &&
            current?.confidence !== undefined &&
            current?.confidence !== null && (
              <Typography
                variant="body2"
                sx={{ mb: 2, color: "#666" }}
              >
                Transcription Confidence: {(current.confidence * 100).toFixed(0)}%
                {current?.lowConfidenceWords?.length > 0
                  ? " — highlighted words may be incorrect"
                  : " — no transcription issues detected"}
              </Typography>
            )}
          <Typography
            variant="subtitle2"
            sx={{ color: "#555", mb: 1 }}
          >
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
                <ul style={{ paddingLeft: "1.5rem" }}>
                  {children}
                </ul>
              ),
              li: ({ children }) => (
                <li style={{ marginBottom: "0.5rem" }}>
                  {children}
                </li>
              ),
            }}
          >
            {selectedFeedback || "No feedback available"}
          </ReactMarkdown>
        </Box>
      </Fade>
    </Modal>
  );
}
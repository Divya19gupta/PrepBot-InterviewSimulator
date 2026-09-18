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
  uncertainty: "visible" | "hidden" = "hidden"
) => {
  if (!text) return "No transcript available";

  if (uncertainty !== "visible") {
    return text;
  }

  const normalize = (word: string) =>
    word.toLowerCase().replace(/[.,!?]/g, "");

  const words = text.split(" ");

  return words.map((word, index) => {
    const clean = normalize(word);
   const isLow = lowWords.some((lw: any) => lw.index === index);

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
 {current?.uncertainty === "visible" &&
            current?.confidence !== undefined &&
            current?.confidence !== null && (
              <Box sx={{
                backgroundColor: "rgba(239, 148, 2, 0.1)",
                border: "1px solid rgba(239, 148, 2, 0.4)",
                borderRadius: 2,
                p: 1.5,
                mb: 2,
              }}>
                <Typography variant="body2" sx={{ color: "#8a5a00" }}>
                  The system's average word-recognition confidence was <b>{(current.confidence * 100).toFixed(0)}%.</b>
                  {current?.lowConfidenceWords?.length > 0
                    ? ` However, ${current.lowConfidenceWords.length} word${current.lowConfidenceWords.length === 1 ? "" : "s"} (highlighted) may have been misheard.`
                    : " No words were flagged as uncertain."}
                </Typography>
              </Box>
          )}
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
                current.uncertainty ?? "hidden"
              )}
              </Typography>
            </Box>
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
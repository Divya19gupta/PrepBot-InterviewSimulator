import React, { useState, useEffect } from "react";
import { Box, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Fade } from "@mui/material";
import { useNavigate } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ContentCopyIcon from "@mui/icons-material/ContentCopyRounded";
import CheckIcon from "@mui/icons-material/CheckRounded";
import AIBackdrop from "./AIBackdrop";

const API_URL = import.meta.env.VITE_API_URL || "https://prepbot-server.onrender.com";

interface TopBarProps {
  color?: string;
}

const TopBar: React.FC<TopBarProps> = ({ color = "#07466E" }) => {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("userData");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.participantId) {
          setParticipantId(parsed.participantId);
        }
      }
    } catch {
      // no-op — badge just won't render
    }
  }, []);

  const handleCopy = async () => {
    if (!participantId) return;
    try {
      await navigator.clipboard.writeText(participantId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked — ID is still visible to read manually
    }
  };

  const handleReset = async () => {
  setConfirmOpen(false);

  setTimeout(async () => {
    setIsResetting(true);

    const storedUser = localStorage.getItem("userData");

    try {
      if (storedUser) {
        const parsed = JSON.parse(storedUser);

        if (parsed?.sessionId) {
          await fetch(`${API_URL}/api/session/delete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sessionId: parsed.sessionId }),
          });
        }
      }
    } catch (err) {
      console.error("Reset failed:", err);
    }

    localStorage.removeItem("userData");

    setTimeout(() => {
      navigate("/", { replace: true });
    }, 500);

  }, 150);
};

  return (
    <>
      <Box
        sx={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 1000,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Tooltip title="Home">
            <IconButton onClick={() => navigate("/")} sx={{ color }}>
              <HomeIcon />
            </IconButton>
          </Tooltip>

          <Fade in={!!participantId} timeout={400}>
            <Box
              onClick={handleCopy}
              sx={{
                display: "flex",
                alignItems: "center",
                bgcolor: "#FFFFFF",
                border: "1px solid rgba(15, 23, 42, 0.10)",
                borderRadius: "10px",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                pl: "12px",
                pr: "6px",
                py: "6px",
                cursor: participantId ? "pointer" : "default",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                "&:hover": {
                  borderColor: "rgba(15, 23, 42, 0.18)",
                  boxShadow: "0 2px 6px rgba(15, 23, 42, 0.08)",
                },
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", lineHeight: 1.25, mr: "10px" }}>
                <Typography
                  sx={{
                    fontSize: "10px",
                    fontWeight: 500,
                    color: "#8A8F98",
                  }}
                >
                  Participant ID
                </Typography>
                <Typography
                  sx={{
                    fontSize: "13.5px",
                    fontWeight: 700,
                    fontFamily: "'Roboto Mono', 'SFMono-Regular', Consolas, monospace",
                    letterSpacing: "0.01em",
                    color: "#1F2937",
                    userSelect: "text",
                  }}
                >
                  {participantId}
                </Typography>
              </Box>

              <Box sx={{ width: "1px", height: "26px", bgcolor: "rgba(15, 23, 42, 0.08)", mr: "6px" }} />

              <Tooltip title={copied ? "Copied" : "Copy ID"} placement="top">
                <IconButton size="small" sx={{ p: "6px" }}>
                  {copied ? (
                    <CheckIcon sx={{ fontSize: 16, color: "#16A34A" }} />
                  ) : (
                    <ContentCopyIcon sx={{ fontSize: 15, color: "#9CA3AF" }} />
                  )}
                </IconButton>
              </Tooltip>
            </Box>
          </Fade>
        </Box>

        <Tooltip title="Start Fresh">
          <IconButton onClick={() => setConfirmOpen(true)} sx={{ color: "red" }}>
            <RestartAltIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Dialog open={confirmOpen} 
       PaperProps={{ sx: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto', bgcolor: '#fcfcfc', borderRadius: '10px', boxShadow: 24, p: 4, border: '1px solid #ddd', fontFamily: 'Segoe UI, sans-serif' } }}
      onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Start Fresh</DialogTitle>
        <DialogContent>
          <Typography>
            This will delete your entire session and recordings. Continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleReset}>
            Yes, Reset
          </Button>
        </DialogActions>
      </Dialog>
      {isResetting && (
      <AIBackdrop open={isResetting} stage="resetting" />
  )}
    </>
  );
};

export default TopBar;
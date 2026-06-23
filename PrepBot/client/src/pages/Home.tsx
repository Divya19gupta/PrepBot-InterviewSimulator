import React, { useState, useEffect } from "react";
import {
  Box, Container, Typography, Button, TextField,
  MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { AvatarHome } from "./AvatarHome";
import toast from "react-hot-toast";
import AIBackdrop from "./AIBackdrop";

const API_URL = import.meta.env.VITE_API_URL || "https://prepbot-server.onrender.com";

const generateParticipantId = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "PREP-";
  for (let i = 0; i < 4; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
};

const generateUserId = () =>
  "user_" + Math.random().toString(36).substring(2, 9);

const Home = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("not-fluent");
  const [existingSession, setExistingSession] = useState<any>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [confirmFreshOpen, setConfirmFreshOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [generatedId, setGeneratedId] = useState("");

  useEffect(() => {
    setGeneratedId(generateParticipantId());

    const storedUser = localStorage.getItem("userData");
    if (!storedUser) {
      setIsCheckingSession(false);
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      if (!parsed?.sessionId || !parsed?.userId) {
        localStorage.removeItem("userData");
        setIsCheckingSession(false);
        return;
      }

      fetch(`${API_URL}/api/session/resume/${parsed.sessionId}`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then(() => {
          if (!parsed.participantId) {
            localStorage.removeItem("userData");
            setIsCheckingSession(false);
            return;
          }
          setExistingSession(parsed);
          setLanguage(parsed.language || "not-fluent");
        })
        .catch(() => {
          localStorage.removeItem("userData");
        })
        .finally(() => {
          setIsCheckingSession(false);
        });
    } catch {
      localStorage.removeItem("userData");
      setIsCheckingSession(false);
    }
  }, []);

  const handleStart = async () => {
    setIsStarting(true);
    await new Promise((resolve) => setTimeout(resolve, 50));

    let userData;

      try {
        if (existingSession) {
            if (!existingSession.participantId) {
              localStorage.removeItem("userData");
              setExistingSession(null);
              setIsStarting(false);
              return;
        }
        userData = existingSession;
        } else {
        userData = {
          userId: generateUserId(),
          participantId: generatedId,
          language,
          sessionId: Date.now().toString(),
        };

        const res = await fetch(`${API_URL}/api/session/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userData }),
        });

        if (!res.ok) throw new Error("Failed to start session");

        localStorage.setItem("userData", JSON.stringify(userData));
      }

      await new Promise((resolve) => setTimeout(resolve, 600));
      if (existingSession) {
        navigate("/interview");
      } else {
        navigate("/intro");
      }
    } catch (err: any) {
      console.error("Session start error:", err);
      toast.error(err.message);
      setIsStarting(false);
    }
  };

  const handleStartFresh = async () => {
    setConfirmFreshOpen(false);
    setIsResetting(true);

    try {
      if (existingSession?.sessionId) {
        await fetch(`${API_URL}/api/session/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: existingSession.sessionId }),
        });
      }
    } catch (err) {
      console.error("Delete failed", err);
    }

    localStorage.clear();
    setExistingSession(null);
    setLanguage("not-fluent");
    setGeneratedId(generateParticipantId());

    setTimeout(() => {
      setIsResetting(false);
    }, 700);
  };

  if (isCheckingSession) {
    return <AIBackdrop open stage="loading" />;
  }

  return (
    <>
      <Container
        maxWidth="lg"
        sx={{ height: "100vh", display: "flex", alignItems: "center", gap: 4 }}
      >
        <Box flex={1} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <AvatarHome />
        </Box>

        <Box flex={1} sx={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
          <Typography variant="h2" sx={{ color: "#07466E" }}>PrepBot</Typography>
          <Typography variant="subtitle1" sx={{ fontStyle: "italic" }}>
            See how AI judges you, clearly
          </Typography>

          {!existingSession && (
            <Box sx={{ mt: 2, gap: 3, display: "flex", flexDirection: "column", width: "80%" }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "#eef6fb",
                  border: "1px solid #cce3f5",
                }}
              >
                <Typography variant="caption" sx={{ color: "#555" }}>
                  Your Participant ID (please note this down):
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: "bold", color: "#07466E", letterSpacing: 2 }}
                >
                  {generatedId}
                </Typography>
                <Typography variant="caption" sx={{ color: "#888" }}>
                  Use this ID if you need to request data deletion.
                </Typography>
              </Box>

              <TextField
                select
                label="Language Background"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                fullWidth
              >
                <MenuItem value="fluent">Fluent Speaker</MenuItem>
                <MenuItem value="not-fluent">Not Fluent Speaker</MenuItem>
              </TextField>
            </Box>
          )}

          {existingSession && (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: "#eef6fb",
                border: "1px solid #cce3f5",
                width: "80%",
              }}
            >
              <Typography variant="caption" sx={{ color: "#555" }}>
                Resuming session for Participant ID:
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: "bold", color: "#07466E", letterSpacing: 2 }}
              >
                {existingSession.participantId}
              </Typography>
            </Box>
          )}

          <Button
            variant="contained"
            disabled={isStarting}
            sx={{
              backgroundColor: "#07466E",
              borderRadius: "18px",
              padding: "10px 20px",
              fontSize: "16px",
              fontWeight: "bold",
              "&:hover": { backgroundColor: "#063655" },
              width: "80%",
              mt: 2,
            }}
            onClick={handleStart}
          >
            {isStarting
              ? "Starting..."
              : existingSession
              ? "Resume Interview"
              : "Start Interview"}
          </Button>

          {existingSession && (
            <Button
              variant="outlined"
              sx={{
                borderRadius: "18px",
                padding: "10px 20px",
                fontSize: "16px",
                fontWeight: "bold",
                backgroundColor: "red",
                color: "white",
                width: "80%",
                "&:hover": { backgroundColor: "white", color: "red" },
              }}
              onClick={() => setConfirmFreshOpen(true)}
            >
              Start Fresh
            </Button>
          )}
        </Box>

        {isStarting && <AIBackdrop open={isStarting} stage="starting" />}

        <Dialog
          PaperProps={{
            sx: {
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)", width: "80%",
              maxWidth: 600, bgcolor: "#fcfcfc", borderRadius: "10px",
              boxShadow: 24, p: 4, border: "1px solid #ddd",
            },
          }}
          open={confirmFreshOpen}
          onClose={() => setConfirmFreshOpen(false)}
        >
          <DialogTitle>Start Fresh</DialogTitle>
          <DialogContent>
            <Typography>
              This will delete all your progress. Are you sure?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmFreshOpen(false)}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleStartFresh}>
              Yes, Reset
            </Button>
          </DialogActions>
        </Dialog>

        {isResetting && <AIBackdrop open={isResetting} stage="resetting" />}
      </Container>
    </>
  );
};

export default Home;
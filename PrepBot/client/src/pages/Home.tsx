import React, { useState, useEffect } from "react";
import { Box, Container, Typography, Button, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Backdrop } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { AvatarHome } from "./AvatarHome";
import toast from "react-hot-toast";
import theme from "../theme";
import AIBackdrop from "./AIBackdrop";

const API_URL = import.meta.env.VITE_API_URL || "https://prepbot-server.onrender.com";

const Home = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState("non-native");
  const [existingSession, setExistingSession] = useState<any>(null);

  const [isStarting, setIsStarting] = useState(false); // ✅ loader
  const [confirmFreshOpen, setConfirmFreshOpen] = useState(false); // ✅ confirm dialog
  const [isResetting, setIsResetting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Load session from localStorage
  useEffect(() => {
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
        setExistingSession(parsed);
        setName(parsed.name || "");
        setEmail(parsed.email || "");
        setLanguage(parsed.language || "non-native");
      })
      .catch(() => {
        localStorage.removeItem("userData");
      })
      .finally(() => {
        setIsCheckingSession(false); // 🔥 IMPORTANT
      });

  } catch {
    localStorage.removeItem("userData");
    setIsCheckingSession(false);
  }
}, []);

  const generateUserId = () => "user_" + Math.random().toString(36).substring(2, 9);

  // 🚀 START INTERVIEW
  const handleStart = async () => {
  if (!name.trim() || !email.trim()) return;

  // 🔥 START LOADER
  setIsStarting(true);

  // 🔥 FORCE RENDER BEFORE API / NAVIGATION
  await new Promise((resolve) => setTimeout(resolve, 50));

  let userData;

  try {
    if (existingSession) {
      userData = existingSession;
    } else {
      const newUserId = generateUserId();

      userData = {
        userId: newUserId,
        name,
        email,
        language,
        sessionId: Date.now().toString(),
        prototype: "",
      };

      const res = await fetch(`${API_URL}/api/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userData }),
      });

      const data = await res.json();

      userData.prototype = data.prototype;

      localStorage.setItem("userData", JSON.stringify(userData));
    }

    // 🔥 KEEP LOADER VISIBLE BEFORE NAVIGATION
    await new Promise((resolve) => setTimeout(resolve, 600));

    navigate("/interview");

  } catch (err: any) {
    console.error("❌ Session start error:", err);
    toast.error(err.message);
    setIsStarting(false); // only stop on error
  }
};

  // 🔥 START FRESH
  const handleStartFresh = async () => {
  setConfirmFreshOpen(false);
  setIsResetting(true); // 🔥 START LOADER

  try {
    if (existingSession?.sessionId) {
      await fetch(`${API_URL}/api/session/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: existingSession.sessionId }),
      });
    }
  } catch (err) {
    console.error("❌ Delete failed", err);
  }

  localStorage.clear();

  // 🔁 Reset UI state
  setExistingSession(null);
  setName("");
  setEmail("");
  setLanguage("non-native");

  // 🔥 DELAY so loader is visible
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
        <Typography variant="h2" sx={{ color: "#07466E" }}>Welcome to PrepBot</Typography>
        <Typography variant="subtitle1" sx={{fontStyle: "italic"}}>Practice like it’s real. Improve like a pro.</Typography>

        {!existingSession && (
          <Box
            sx={{ mt: 2, gap: 3, display: "flex", flexDirection: "column", width: "80%" }}
              >
            <TextField
              label="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              
            />
            <TextField
              label="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              type="email"
            />
            <TextField
              select
              label="Language Background"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              fullWidth
            >
              <MenuItem value="native">Native Speaker</MenuItem>
              <MenuItem value="non-native">Non-Native Speaker</MenuItem>
            </TextField>
          </Box>
        )}

        <Button
          variant="contained"
          disabled={isStarting || (!existingSession && (!name.trim() || !email.trim()))}
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

        {/* 🔥 START FRESH BUTTON (same styling as logout) */}
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

      {/* 🔥 LOADER (no styling change) */}
      {/* <Dialog open={isStarting}
      PaperProps={{ sx: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto', bgcolor: '#fcfcfc', borderRadius: '10px', boxShadow: 24, p: 4, border: '1px solid #ddd', fontFamily: 'Segoe UI, sans-serif' } }}
            
      >
        <DialogContent>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>
            Starting your interview...
          </Typography>
        </DialogContent>
      </Dialog> */}
        {isStarting && (
          <AIBackdrop open={isStarting} stage="starting" />
        )}
      {/* 🔥 CONFIRM RESET */}
      <Dialog 
      PaperProps={{ sx: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto', bgcolor: '#fcfcfc', borderRadius: '10px', boxShadow: 24, p: 4, border: '1px solid #ddd', fontFamily: 'Segoe UI, sans-serif' } }}
      open={confirmFreshOpen} onClose={() => setConfirmFreshOpen(false)}>
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
      {isResetting && (
  <AIBackdrop open={isResetting} stage="resetting" />
)}
    </Container>
    </>
  );
};

export default Home;
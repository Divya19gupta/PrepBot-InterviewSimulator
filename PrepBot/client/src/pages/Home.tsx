import React, { useState, useEffect } from "react";
import { Box, Container, Typography, Button, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { AvatarHome } from "./AvatarHome";
import toast from "react-hot-toast";
const API_URL = import.meta.env.VITE_API_URL;

const Home = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState("non-native");
  const [existingSession, setExistingSession] = useState<any>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Load session from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("userData");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.sessionId && parsed?.userId) {
          setExistingSession(parsed);
          setName(parsed.name || "");
          setEmail(parsed.email || "");
          setLanguage(parsed.language || "non-native");
        } else localStorage.removeItem("userData");
      } catch {
        localStorage.removeItem("userData");
      }
    }
  }, []);

  const generateUserId = () => "user_" + Math.random().toString(36).substring(2, 9);

  const handleStart = async () => {
    if (!name.trim() || !email.trim()) return;

    let userData;

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
      };

      localStorage.setItem("userData", JSON.stringify(userData));

      await fetch(`${API_URL}/api/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userData }),
      }).catch((err) => {
        console.error("❌ Session start error:", err);
        toast.error(err.message);
      }); 
    }

    navigate("/interview");
  };

  const handleLogout = () => setLogoutDialogOpen(true);

  const confirmLogout = () => {
    localStorage.clear();
    setLogoutDialogOpen(false);
    setExistingSession(null);
    setName("");
    setEmail("");
    setLanguage("non-native");
    navigate("/", { replace: true });
  };

  return (
    <Container
      maxWidth="lg"
      sx={{ height: "100vh", display: "flex", alignItems: "center", gap: 4 }}
    >
      <Box flex={1} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <AvatarHome />
      </Box>

      <Box flex={1} sx={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
        <Typography variant="h3" sx={{ color: "#07466E" }}>Welcome to PrepBot</Typography>
        <Typography variant="body1">Practice interviews and get AI feedback.</Typography>

        {!existingSession && (
          <>
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
          </>
        )}

        <Button
          variant="contained"
          disabled={!existingSession && (!name.trim() || !email.trim())}
          sx={{
            backgroundColor: "#07466E",
            borderRadius: "18px",
            padding: "10px 20px",
            fontSize: "16px",
            fontWeight: "bold",
            "&:hover": { backgroundColor: "#063655" },
          }}
          onClick={handleStart}
        >
          {existingSession ? "Resume Interview" : "Start Interview"}
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
              "&:hover": { backgroundColor: "white", color: "red" },
            }}
            onClick={handleLogout}
          >
            Logout
          </Button>
        )}
      </Box>

      <Dialog open={logoutDialogOpen} 
      PaperProps={{ sx: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto', bgcolor: '#fcfcfc', borderRadius: '10px', boxShadow: 24, p: 4, border: '1px solid #ddd', fontFamily: 'Segoe UI, sans-serif' } }}
      onClose={() => setLogoutDialogOpen(false)}>
        <DialogTitle>Confirm Logout</DialogTitle>
        <DialogContent>
          <Typography>Logging out will erase your current progress. Are you sure?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmLogout}>Logout</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Home;
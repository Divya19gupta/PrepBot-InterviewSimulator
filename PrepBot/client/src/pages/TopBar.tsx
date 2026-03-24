import React, { useState } from "react";
import { Box, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

const API_URL = import.meta.env.VITE_API_URL || "https://prepbot-server.onrender.com";

interface TopBarProps {
  color?: string;
}

const TopBar: React.FC<TopBarProps> = ({ color = "#07466E" }) => {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleReset = async () => {
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
      console.error("❌ Reset failed:", err);
    }

    // clear frontend
    localStorage.clear();

    setConfirmOpen(false);
    navigate("/", { replace: true });
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
          zIndex: 1000,
        }}
      >
        <Tooltip title="Home">
          <IconButton onClick={() => navigate("/")} sx={{ color }}>
            <HomeIcon />
          </IconButton>
        </Tooltip>

        {/* 🔥 RESET BUTTON */}
        <Tooltip title="Start Fresh">
          <IconButton onClick={() => setConfirmOpen(true)} sx={{ color: "red" }}>
            <RestartAltIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 🔥 CONFIRM DIALOG */}
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
    </>
  );
};

export default TopBar;
import React, { useState } from "react";
import { Box, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";

interface TopBarProps {
  color?: string;
}

const TopBar: React.FC<TopBarProps> = ({ color = "#07466E" }) => {
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleLogout = () => setLogoutDialogOpen(true);

  const confirmLogout = () => {
    localStorage.clear();
    setLogoutDialogOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <>
      <Box sx={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", justifyContent: "space-between", zIndex: 1000 }}>
        <Tooltip title="Home">
          <IconButton onClick={() => navigate("/")} sx={{ color }}>
            <HomeIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Logout">
          <IconButton onClick={handleLogout} sx={{ color: "red" }}>
            <LogoutIcon />
          </IconButton>
        </Tooltip>
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
    </>
  );
};

export default TopBar;
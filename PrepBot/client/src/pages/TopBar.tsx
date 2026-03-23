import React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";

interface TopBarProps {
  color?: string;
}

const TopBar: React.FC<TopBarProps> = ({ color = "#07466E" }) => {
  const navigate = useNavigate();

  return (
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
    </Box>
  );
};

export default TopBar;
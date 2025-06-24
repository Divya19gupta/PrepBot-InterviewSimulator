import Lottie from 'lottie-react';
import animationData from '../assets/avatar-home.json';
import { Box, Container, Typography, Button } from '@mui/material';
export const AvatarHome = () => {
  return (
    <Box
      sx={{
        height: '100%', 
        width: '100%',   
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Lottie
        animationData={animationData}
        loop
        style={{ height: '100%', width: '100%' }} 
      />
    </Box>
  );
};

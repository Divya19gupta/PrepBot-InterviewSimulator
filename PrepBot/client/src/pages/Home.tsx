import React from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AvatarHome } from './AvatarHome';

const Home = () => {
  const navigate = useNavigate();

  return (
    <Container
      maxWidth="lg"
      sx={{
        height: '100vh',          
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Box
        flex={1}
        sx={{
          height: '100%',            
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <AvatarHome />
      </Box>
      <Box
        flex={1}
        sx={{
          height: '100%',            
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          textAlign: 'left',
          gap: 2,
        }}
      >
        <Typography variant="h2" sx={{ color: '#07466E' }}>
          Welcome to PrepBot
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          Nail your interviews with a little help from AI magic.
        </Typography>
        <Button
          variant="outlined"
          size="medium"
          sx={{
            backgroundColor: '#07466E',
            borderRadius: '18px',
            color: 'white',
            '&:hover': {
              color: '#07466E',
              backgroundColor: 'white',
              borderColor: '#07466E',
            },
            padding: '8px 20px',
            fontSize: '16px',
            fontWeight: 'bold',
            width: 'fit-content',   
          }}
          onClick={() => navigate('/interview')}
        >
          Start Interview
        </Button>
      </Box>
    </Container>
  );
};

export default Home;

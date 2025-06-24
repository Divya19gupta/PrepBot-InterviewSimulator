import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, TextField } from '@mui/material';
import { motion, Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const reflectionPrompts = [
  "Which answer are you most proud of?",
  "Which question felt hardest, and why?",
  "What would you improve next time?",
  "How did you feel during this interview?",
];

const containerVariants: Variants = {
  hidden: { opacity: 0, x: 100 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { type: 'spring', stiffness: 100, damping: 20 }
  },
  exit: { opacity: 0, x: -100, transition: { duration: 0.3 } }
};

const ReflectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  // Load saved answers from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('reflectionAnswers');
    if (saved) {
      setAnswers(JSON.parse(saved));
    } else {
      setAnswers(new Array(reflectionPrompts.length).fill(''));
    }
  }, []);

  // Save answers to localStorage whenever answers change
  useEffect(() => {
    localStorage.setItem('reflectionAnswers', JSON.stringify(answers));
  }, [answers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = e.target.value;
    setAnswers(newAnswers);
  };

  const goNext = () => {
    if (currentIndex < reflectionPrompts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // On finish, navigate home (or anywhere)
      navigate('/');
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        p: 4,
        background: 'linear-gradient(135deg, #e3f2fd, #ffffff)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography variant="h4" align="center" color="#07466E" gutterBottom>
        Reflection Time
      </Typography>

      <motion.div
        key={currentIndex} // key triggers re-animation on change
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{
          padding: 24,
          backgroundColor: '#f0f8ff',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(7, 70, 110, 0.15)',
          width: '100%',
          maxWidth: 600,
          minHeight: 200,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Typography
          variant="h6"
          sx={{ color: '#07466E', mb: 2, fontWeight: 600 }}
        >
          {reflectionPrompts[currentIndex]}
        </Typography>

        <TextField
          multiline
          minRows={4}
          maxRows={8}
          placeholder="Type your answer here..."
          value={answers[currentIndex] || ''}
          onChange={handleChange}
          variant="outlined"
          sx={{ flexGrow: 1, mb: 3 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            disabled={currentIndex === 0}
            onClick={goPrev}
            sx={{ color: '#07466E', borderColor: '#07466E' }}
          >
            Previous
          </Button>

          <Button
            variant="contained"
            onClick={goNext}
            sx={{ backgroundColor: '#07466E' }}
          >
            {currentIndex === reflectionPrompts.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </Box>
      </motion.div>
    </Box>
  );
};

export default ReflectionPage;

import React from 'react';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import Backdrop from '@mui/material/Backdrop';
import Typography from '@mui/material/Typography';
import ReactMarkdown from 'react-markdown';

const modalStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  maxWidth: 600,
  maxHeight: '80vh',
  overflowY: 'auto',
  bgcolor: '#fcfcfc',
  borderRadius: '10px',
  boxShadow: 24,
  p: 4,
  border: '1px solid #ddd',
  fontFamily: 'Segoe UI, sans-serif',
};

type FeedbackType = {
  feedback: string;
  answer: string;
};

type FeedbackModalProps = {
  open: boolean;
  onClose: () => void;
  feedback: FeedbackType[];
  currentIndex: number;
};

export default function FeedbackModal({
  open,
  onClose,
  feedback,
  currentIndex,
}: FeedbackModalProps) {
  const current = feedback[currentIndex];

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{ backdrop: { timeout: 500 } }}
    >
      <Fade in={open}>
        <Box sx={modalStyle}>
          <Typography variant="h6" sx={{ color: '#2c3e50', mb: 2 }}>
            Evaluation Feedback
          </Typography>

          <Typography variant="subtitle2" sx={{ color: '#555', mb: 1 }}>
            <strong>Transcription:</strong>
          </Typography>
          <Typography
            variant="body2"
            sx={{ mb: 3, backgroundColor: '#f5f5f5', p: 2, borderRadius: 2 }}
          >
            {current?.answer || 'No transcription available.'}
          </Typography>

          <Typography variant="subtitle2" sx={{ color: '#555', mb: 1 }}>
            <strong>Feedback:</strong>
          </Typography>
          <Typography variant="body1" sx={{ fontSize: '1rem', lineHeight: 1.6 }}>
            <ReactMarkdown>
              {current?.feedback || 'No feedback available.'}
            </ReactMarkdown>
          </Typography>
        </Box>
      </Fade>
    </Modal>
  );
}
// import React, { useState, useEffect } from 'react';
// import { Box, Button, Typography, TextField, Slider, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
// import { useNavigate } from 'react-router-dom';
// import TopBar from './TopBar';

// type ReflectionAnswer = {
//   text: string;
//   rating: number | null;
// };

// type Section = {
//   title: string;
//   questions: {
//     text: string;
//     hasRating: boolean;
//   }[];
// };

// // ✅ GROUPED BY RQs
// const sections: Section[] = [
//   {
//     title: "RQ1: Fairness & Accuracy",
//     questions: [
//       { text: "How accurately do you think the system understood your spoken answers?", hasRating: true },
//       { text: "Did you notice any errors or mismatches in the transcription?", hasRating: true },
//       { text: "How fair do you think the feedback was?", hasRating: true },
//     ],
//   },
//   {
//     title: "RQ2: Blame & Trust",
//     questions: [
//       { text: "What was the main reason for any incorrect feedback?", hasRating: false },
//       { text: "To what extent do you trust this system?", hasRating: true },
//     ],
//   },
//   {
//     title: "RQ3: System Perception",
//     questions: [
//       { text: "Did your accent or way of speaking influence the system?", hasRating: false },
//       { text: "How confident are you in relying on this system for interview preparation?", hasRating: true },
//     ],
//   },
// ];

// const ReflectionPage: React.FC = () => {
//   const navigate = useNavigate();
//   const [sectionIndex, setSectionIndex] = useState(0);
//   const [answers, setAnswers] = useState<ReflectionAnswer[][]>([]);

//   const [popup, setPopup] = useState<{ open: boolean; title: string; message: string; onConfirm?: () => void; confirmText?: string; }>({ open: false, title: "", message: "" });

//   // ----------------- SESSION CHECK -----------------
//   const [sessionId, setSessionId] = useState<string | null>(null);
//   useEffect(() => {
//     const stored = localStorage.getItem("userData");
//     if (!stored) navigate("/", { replace: true });
//     const parsed = JSON.parse(stored || "{}");
//     setSessionId(parsed.sessionId || null);
//   }, [navigate]);

//   // ----------------- INIT STATE -----------------
//   useEffect(() => {
//     const initial = sections.map(section =>
//       section.questions.map(() => ({ text: "", rating: null }))
//     );

//     // ✅ Load saved partial responses from localStorage
//     if (sessionId) {
//       const storedAnswers = localStorage.getItem(`reflection_${sessionId}`);
//       if (storedAnswers) {
//         setAnswers(JSON.parse(storedAnswers));
//         return;
//       }
//     }

//     setAnswers(initial);
//   }, [sessionId]);

//   // ----------------- SAVE TO LOCALSTORAGE ON CHANGE -----------------
//   useEffect(() => {
//     if (!sessionId) return;
//     localStorage.setItem(`reflection_${sessionId}`, JSON.stringify(answers));
//   }, [answers, sessionId]);

//   // ----------------- UPDATE FUNCTIONS -----------------
//   const updateText = (qIndex: number, value: string) => {
//     const copy = [...answers];
//     copy[sectionIndex][qIndex].text = value;
//     setAnswers(copy);
//   };

//   const updateRating = (qIndex: number, value: number | number[]) => {
//     const copy = [...answers];
//     copy[sectionIndex][qIndex].rating = value as number;
//     setAnswers(copy);
//   };

//   // ----------------- VALIDATION -----------------
//   const isSectionValid = () => {
//     const currentSection = sections[sectionIndex];
//     const currentAnswers = answers[sectionIndex];
//     if (!currentAnswers) return false;
//     return currentSection.questions.every((q, i) => {
//       const ans = currentAnswers[i];
//       return ans.text.trim().length > 0;
//     });
//   };

//   // ----------------- NAVIGATION -----------------
//   const goNext = async () => {
//     if (!isSectionValid()) {
//       setPopup({ open: true, title: "Incomplete Questions", message: "Please complete all questions before continuing." });
//       return;
//     }

//     if (sectionIndex < sections.length - 1) {
//       setSectionIndex((p) => p + 1);
//       return;
//     }

//     // ✅ FINAL SUBMIT
//     try {
//       const userData = JSON.parse(localStorage.getItem("userData") || "{}");
//       const structuredAnswers = answers.flatMap((sectionAnswers, sectionIndex) =>
//         sectionAnswers.map((ans, questionIndex) => ({
//           sectionIndex,
//           questionIndex,
//           text: ans.text,
//           rating: ans.rating,
//         }))
//       );

//       await fetch("http://localhost:3001/api/session/reflection", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ userData, reflectionAnswers: structuredAnswers }),
//       });

//       // ✅ REMOVE LOCALSTORAGE
//        localStorage.removeItem(`answers_${userData.sessionId}`);
//       localStorage.removeItem(`feedback_${userData.sessionId}`);
//       localStorage.removeItem(`currentIndex_${userData.sessionId}`);
//       localStorage.removeItem(`attempts_${userData.sessionId}`);
//       localStorage.removeItem(`reflection_${userData.sessionId}`);
//       localStorage.removeItem("userData");
//       navigate("/", { replace: true });

//     } catch (err) {
//       console.error("❌ Submission failed", err);
//     }
//   };

//   const goPrev = () => {
//     if (sectionIndex > 0) setSectionIndex((p) => p - 1);
//   };

//   const currentSection = sections[sectionIndex];
//   const currentAnswers = answers[sectionIndex] || [];

//   // ----------------- RENDER -----------------
//   return (
//     <Box sx={{ minHeight: '100vh', p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
//       <TopBar />
//       <Box sx={{ width: '100%', maxWidth: 1000, padding: 10, borderRadius: 12, background: '#f5faff' }}>
//         <Typography variant="h4" sx={{ mb: 5, color: "#555" }}>{currentSection.title}</Typography>

//         {currentSection.questions.map((q, i) => {
//           const ans = currentAnswers[i] || { text: "", rating: null };
//           return (
//             <Box key={i} sx={{ mb: 4, mt: 4 }}>
//               <Typography sx={{ mb: 1 }}>{q.text}</Typography>

//               {q.hasRating && (
//                 <Box sx={{ mb: 2 }}>
//                   <Typography>Rating: {ans.rating !== null ? ans.rating : "Not selected"}</Typography>
//                   <Slider value={ans.rating ?? 3} min={1} max={5} step={1} onChange={(_, v) => updateRating(i, v)} marks valueLabelDisplay="auto" />
//                 </Box>
//               )}

//               <TextField multiline fullWidth minRows={3} value={ans.text} onChange={(e) => updateText(i, e.target.value)} />
//             </Box>
//           );
//         })}

//         <Box display="flex" justifyContent="space-between">
//           <Button onClick={goPrev} disabled={sectionIndex === 0}>Previous</Button>
//           <Button variant="contained" sx={{backgroundColor: sectionIndex === sections.length - 1  ? '#e53935' : '#063655'}} onClick={goNext}>{sectionIndex === sections.length - 1 ? "Finish" : "Next"}</Button>
//         </Box>

//       </Box>

//       {/* ----------------- POPUP ----------------- */}
//       <Dialog open={popup.open} onClose={() => setPopup((p) => ({ ...p, open: false }))} PaperProps={{
//         sx: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto', bgcolor: '#fcfcfc', borderRadius: '10px', boxShadow: 24, p: 4, border: '1px solid #ddd', fontFamily: 'Segoe UI, sans-serif' }
//       }}>
//         <DialogTitle sx={{ fontWeight: 'bold' }}>{popup.title}</DialogTitle>
//         <DialogContent><Typography>{popup.message}</Typography></DialogContent>
//         <DialogActions>
//           <Button onClick={() => setPopup((p) => ({ ...p, open: false }))}>Cancel</Button>
//           {popup.onConfirm && <Button variant="contained" onClick={() => { popup.onConfirm?.(); setPopup((p) => ({ ...p, open: false })); }}>{popup.confirmText || "OK"}</Button>}
//         </DialogActions>
//       </Dialog>

//     </Box>
//   );
// };

// export default ReflectionPage;
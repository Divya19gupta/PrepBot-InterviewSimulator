import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Interview from './pages/Interview';
import { Toaster } from 'react-hot-toast';
import IntroScreen from './pages/IntroScreen';

const App = () => {
  return (
    <>
    <Toaster position="top-right" />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/intro" element={<IntroScreen />} />
      <Route path="/interview" element={<Interview />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
};

export default App;

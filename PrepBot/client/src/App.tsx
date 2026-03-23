import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Interview from './pages/Interview';
import { Toaster } from 'react-hot-toast';

// import ReflectionPage from './pages/Reflection';

const App = () => {
  return (
    <>
    <Toaster position="top-right" />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/interview" element={<Interview />} />
      {/* <Route path="/reflection" element={<ReflectionPage />} /> */}
    </Routes>
    </>
  );
};

export default App;

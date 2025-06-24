import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Interview from './pages/Interview';
import ReflectionPage from './pages/Reflection';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/interview" element={<Interview />} />
      <Route path="/reflection" element={<ReflectionPage />} />
    </Routes>
  );
};

export default App;

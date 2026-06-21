import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/dashboard/Dashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App

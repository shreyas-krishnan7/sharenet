import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import ShareNet from './components/Sharenet.jsx'
import Login from './components/Login.jsx'
import Signup from './components/Signup.jsx'
import Dashboard from './components/Dashboard.jsx'
import Chatpage from './components/Chatpage.jsx'
import CallRoom from './components/Callroom.jsx'
import AudioCallRoom from './components/Audioroom.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import 'react-toastify/dist/ReactToastify.css';

import { io } from "socket.io-client";

// ✅ Create ONE socket for the entire app
const socket = io("https://sharenet-production.up.railway.app", {
  transports: ["websocket"],
});

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<ShareNet />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="/chatpage" element={
          <ProtectedRoute>
            <Chatpage socket={socket} />
          </ProtectedRoute>
        } />

        <Route path="/call/:roomId" element={
          <ProtectedRoute>
            <CallRoom socket={socket} />
          </ProtectedRoute>
        } />

        <Route path="/audio-room/:roomId" element={
          <ProtectedRoute>
            <AudioCallRoom socket={socket} />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;

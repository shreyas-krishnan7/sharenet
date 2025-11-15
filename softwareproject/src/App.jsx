import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import ShareNet from './components/Sharenet.jsx'
import Login from './components/Login.jsx'
import Signup from './components/Signup.jsx'
import Dashboard from './components/Dashboard.jsx'
import Chatpage from './components/Chatpage.jsx'
import CallRoom from './components/Callroom.jsx'
import 'react-toastify/dist/ReactToastify.css';

import { io } from "socket.io-client";

// ✅ Create ONE socket for the entire app
const socket = io("https://sharenet-dehy.onrender.com", {
  transports: ["websocket"],
});

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ShareNet />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Pass socket to Chatpage */}
        <Route path="/chatpage" element={<Chatpage socket={socket} />} />

        {/* Pass same socket to CallRoom */}
        <Route path="/call/:roomId" element={<CallRoom socket={socket} />} />
      </Routes>
    </Router>
  );
}

export default App;

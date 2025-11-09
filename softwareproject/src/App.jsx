import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import ShareNet from './components/Sharenet.jsx'
import Login from './components/Login.jsx'
import Signup from './components/Signup.jsx'
import Dashboard from './components/Dashboard.jsx'
import Chatpage from './components/Chatpage.jsx'
import 'react-toastify/dist/ReactToastify.css';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ShareNet />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chatpage" element={<Chatpage />} />
      </Routes>
    </Router>

  )
}

export default App

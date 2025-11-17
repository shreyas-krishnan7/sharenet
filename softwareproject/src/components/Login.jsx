// // Login.jsx
// import React, { useState } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import { EyeOff, Eye, BarChart3 } from 'lucide-react';
// import axios from 'axios';
// import { toast, ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import './Login.css';

// const Login = () => {
//   const navigate = useNavigate();
//   const [showPassword, setShowPassword] = useState(false);
//   const [formData, setFormData] = useState({
//     email: '',
//     password: ''
//   });

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value
//     }));
//   };

//   const togglePasswordVisibility = () => {
//     setShowPassword(!showPassword);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     try {
//       // Send login request to backend
//       const { data } = await axios.post('http://localhost:5000/api/users/login', formData);

//       // Save token in local storage
//       localStorage.setItem('userInfo', JSON.stringify({'name': data.name, 'token': data.token}));

//       // Show success toast
//       toast.success('Logged in successfully!', { position: 'top-center' });

//       // Redirect after 1.5 seconds
//       setTimeout(() => navigate('/dashboard'), 1500);
//     } catch (err) {
//       // Get message from backend or default
//       const message = err.response?.data?.message || 'Invalid email or password';
//       toast.error(` ${message}`, { position: 'top-center' });
//     }
//   };

//   return (
//     <div className="login-container">
//       {/* Toast Notification Container */}
//       <ToastContainer autoClose={2000} hideProgressBar={false} theme="colored" />

//       <div className="login-content">
//         {/* Header */}
//         <div className="login-header">
//           <div className="logo-container">
//             <div className="logo-icon">
//               <BarChart3 size={32} />
//             </div>
//             <h1 className="logo-text">ShareNet</h1>
//           </div>
//           <p className="welcome-text">Welcome back! Log in to continue.</p>
//         </div>

//         {/* Login Form */}
//         <div className="login-card">
//           <form onSubmit={handleSubmit}>
//             {/* Email Field */}
//             <div className="form-group">
//               <label htmlFor="email" className="form-label">
//                 Email
//               </label>
//               <div className="input-wrapper">
//                 <input
//                   type="email"
//                   id="email"
//                   name="email"
//                   className="form-input"
//                   placeholder="Enter your email"
//                   value={formData.email}
//                   onChange={handleInputChange}
//                   required
//                 />
//               </div>
//             </div>

//             {/* Password Field */}
//             <div className="form-group">
//               <label htmlFor="password" className="form-label">
//                 Password
//               </label>
//               <div className="input-wrapper">
//                 <input
//                   type={showPassword ? 'text' : 'password'}
//                   id="password"
//                   name="password"
//                   className="form-input"
//                   placeholder="Enter your password"
//                   value={formData.password}
//                   onChange={handleInputChange}
//                   required
//                 />
//                 <button
//                   type="button"
//                   className="password-toggle"
//                   onClick={togglePasswordVisibility}
//                   aria-label="Toggle password visibility"
//                 >
//                   {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
//                 </button>
//               </div>
//             </div>

//             {/* Forgot Password Link */}
//             <div className="forgot-password-wrapper">
//               <a href="#" className="forgot-password-link">
//                 Forgot Password?
//               </a>
//             </div>

//             {/* Login Button */}
//             <button type="submit" className="login-button">
//               Login
//             </button>
//           </form>
//         </div>

//         {/* Sign Up Link */}
//         <div className="signup-section">
//           <p className="signup-text">
//             Don't have an account?{' '}
//             <Link to="/signup" className="login-link">
//               Sign Up
//             </Link>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Login;


// Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { EyeOff, Eye } from 'lucide-react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Login = () => {
  const navigate = useNavigate();
  const BACKEND_URL = "https://sharenet-production.up.railway.app";
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Send login request to backend
      const { data } = await axios.post(`${BACKEND_URL}/api/users/login`, formData);

      // Save token in local storage
      localStorage.setItem('userInfo', JSON.stringify({ 'id': data._id, 'name': data.name, 'token': data.token}));

      // Show success toast
      toast.success('Logged in successfully!', { position: 'top-center' });

      // Redirect after 1.5 seconds
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      // Get message from backend or default
      const message = err.response?.data?.message || 'Invalid email or password';
      toast.error(` ${message}`, { position: 'top-center' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#f5e6ee' }}>
      {/* Toast Notification Container */}
      <ToastContainer autoClose={2000} hideProgressBar={false} theme="colored" />

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #e91359 0%, #ff1f6e 100%)' }}
            >
              <div 
                className="w-5 h-5 bg-white"
                style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}
              ></div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">ShareNet</h1>
          </div>
          <p className="text-gray-600 text-base">Welcome back! Log in to continue.</p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e91359] focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e91359] focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={togglePasswordVisibility}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <a 
                href="#" 
                className="text-sm font-medium hover:underline"
                style={{ color: '#e91359' }}
              >
                Forgot Password?
              </a>
            </div>

            {/* Login Button */}
            <button 
              type="submit" 
              className="w-full text-white py-3 rounded-lg font-semibold text-base transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
              style={{ backgroundColor: '#e91359' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d01050'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e91359'}
            >
              Login
            </button>
          </form>
        </div>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Don't have an account?{' '}
            <Link 
              to="/signup" 
              className="font-semibold hover:underline"
              style={{ color: '#e91359' }}
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
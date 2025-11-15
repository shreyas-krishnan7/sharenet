// Signup.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Signup = () => {
  const navigate = useNavigate();
  const BACKEND_URL = "https://sharenet-dehy.onrender.com";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
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

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match!', { position: 'top-center' });
      return;
    }

    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/users/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      // Save JWT token in localStorage - session remembrance
      localStorage.setItem('userInfo', JSON.stringify({'name': data.name, 'token': data.token}));

      // Show success toast
      toast.success(' Account created successfully!', { position: 'top-center' });

      // Redirect to login
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (err) {
      const message = err.response?.data?.message || 'Signup failed. Please try again.';
      toast.error(` ${message}`, { position: 'top-center' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 overflow-y-auto" style={{ backgroundColor: '#f5e6ee' }}>
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
          <p className="text-gray-600 text-base">Create your ShareNet account.</p>
        </div>

        {/* Signup Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e91359] focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

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

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e91359] focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={toggleConfirmPasswordVisibility}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Create Account Button */}
            <button 
              type="submit" 
              className="w-full text-white py-3 rounded-lg font-semibold text-base transition-all duration-200 hover:shadow-lg active:scale-[0.98] mt-6"
              style={{ backgroundColor: '#e91359' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d01050'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e91359'}
            >
              Create Account
            </button>
          </form>
        </div>

        {/* Log In Link */}
        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="font-semibold hover:underline"
              style={{ color: '#e91359' }}
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
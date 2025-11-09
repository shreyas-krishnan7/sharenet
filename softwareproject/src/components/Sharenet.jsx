import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Folder, Video, Share2, Lock, WifiOff, User } from 'lucide-react';

const ShareNet = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <header className="py-5 px-10 bg-white">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-6 h-6 rounded relative"
            style={{ background: 'linear-gradient(135deg, #e91359 0%, #ff1f6e 100%)' }}
          >
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white"
              style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}
            ></div>
          </div>
          <span className="text-lg font-bold text-black">ShareNet</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-10 text-center bg-gray-100 min-h-[calc(100vh-80px)] flex flex-col justify-center overflow-visible md:py-16 sm:py-12">
        <h1 className="text-[64px] font-extrabold text-black mb-4 md:text-5xl sm:text-4xl">
          ShareNet
        </h1>
        <p className="text-lg leading-relaxed mb-8 md:text-base" style={{ color: '#4a90e2' }}>
          Connect. Chat. Share. Call — Instantly over your<br className="hidden sm:inline" />
          local network.
        </p>
        <div className="flex gap-4 justify-center items-center flex-wrap">
          <button
            className="px-8 py-3 text-base font-semibold border-none rounded-md cursor-pointer transition-all duration-300 text-white hover:-translate-y-0.5"
            style={{ backgroundColor: '#e91359' }}
            onClick={() => navigate('/signup')}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#d01050';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(233, 19, 89, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#e91359';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Sign Up
          </button>
          <button
            className="px-8 py-3 text-base font-semibold border-none rounded-md cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
            style={{ backgroundColor: '#e8f4fd', color: '#4a90e2' }}
            onClick={() => navigate('/login')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d4ebfa'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e8f4fd'}
          >
            Login
          </button>
        </div>

        {/* Floating Icons */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div 
            className="absolute bg-white rounded-xl p-4 shadow-lg text-[#e91359] animate-float md:hidden"
            style={{ top: '25%', left: '15%', animationDelay: '0s' }}
          >
            <MessageSquare size={24} />
          </div>
          <div 
            className="absolute bg-white rounded-xl p-4 shadow-lg animate-float md:hidden"
            style={{ top: '20%', right: '15%', animationDelay: '0.5s' }}
          >
            <div className="text-[28px]" style={{ filter: 'hue-rotate(320deg) saturate(2)' }}>
              ☁️
            </div>
          </div>
          <div 
            className="absolute bg-white rounded-xl p-4 shadow-lg text-[#e91359] animate-float md:hidden"
            style={{ bottom: '35%', left: '10%', animationDelay: '1s' }}
          >
            <Folder size={24} />
          </div>
          <div 
            className="absolute bg-white rounded-xl p-4 shadow-lg animate-float md:hidden"
            style={{ bottom: '30%', right: '10%', animationDelay: '1.5s' }}
          >
            <div className="grid grid-cols-2 gap-1 relative">
              <User size={16} className="text-gray-400" />
              <User size={16} className="text-gray-400" />
              <User size={16} className="text-gray-400" />
              <div 
                className="absolute -bottom-1 -right-1 rounded-full w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white border-2 border-white"
                style={{ backgroundColor: '#e91359' }}
              >
                ×
              </div>
            </div>
          </div>
        </div>

        {/* Center Gradient Blur */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none"
          style={{ 
            background: 'radial-gradient(circle, rgba(233, 19, 89, 0.15) 0%, rgba(233, 19, 89, 0) 70%)',
            filter: 'blur(60px)'
          }}
        ></div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-10 bg-white text-center">
        <h2 className="text-[42px] font-bold text-black mb-4 leading-tight md:text-3xl sm:text-2xl">
          Everything you need for seamless local<br className="hidden sm:inline" />
          communication
        </h2>
        <p className="text-base leading-relaxed mb-[60px]" style={{ color: '#4a90e2' }}>
          ShareNet provides a suite of tools to connect with peers on your network, without needing an internet<br className="hidden lg:inline" />
          connection.
        </p>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6 max-w-[1200px] mx-auto lg:grid-cols-2 sm:grid-cols-1">
          {/* Feature 1 */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 px-6 text-left transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:-translate-y-1 hover:border-[#e91359]">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-[#e91359]"
              style={{ backgroundColor: '#fef2f6' }}
            >
              <MessageSquare size={24} />
            </div>
            <h3 className="text-xl font-semibold text-black mb-3">Real-time Chat</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Instantly message anyone on your local network with our fast and responsive chat.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 px-6 text-left transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:-translate-y-1 hover:border-[#e91359]">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-[#e91359]"
              style={{ backgroundColor: '#fef2f6' }}
            >
              <Folder size={24} />
            </div>
            <h3 className="text-xl font-semibold text-black mb-3">File Sharing</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Share documents, images, and other files of any size quickly and securely.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 px-6 text-left transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:-translate-y-1 hover:border-[#e91359]">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-[#e91359]"
              style={{ backgroundColor: '#fef2f6' }}
            >
              <Video size={24} />
            </div>
            <h3 className="text-xl font-semibold text-black mb-3">Video Calls</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              High-quality video calls without latency, using your local network's bandwidth.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 px-6 text-left transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:-translate-y-1 hover:border-[#e91359]">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-[#e91359]"
              style={{ backgroundColor: '#fef2f6' }}
            >
              <Share2 size={24} />
            </div>
            <h3 className="text-xl font-semibold text-black mb-3">LAN-based Connection</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Connect directly with devices on the same Wi-Fi, ensuring a stable connection.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 px-6 text-left transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:-translate-y-1 hover:border-[#e91359]">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-[#e91359]"
              style={{ backgroundColor: '#fef2f6' }}
            >
              <Lock size={24} />
            </div>
            <h3 className="text-xl font-semibold text-black mb-3">Secure & Private</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your conversations and files are private and never leave your local network.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 px-6 text-left transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:-translate-y-1 hover:border-[#e91359]">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-[#e91359]"
              style={{ backgroundColor: '#fef2f6' }}
            >
              <WifiOff size={24} />
            </div>
            <h3 className="text-xl font-semibold text-black mb-3">No Internet Required</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Communicate freely even when the internet is down or unavailable.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-10 bg-white text-center border-t border-gray-200">
        <p className="text-sm text-gray-400">
          © 2025 ShareNet | Works only on the same Wi-Fi network.
        </p>
      </footer>

      {/* Custom Animation for Floating Icons */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ShareNet;
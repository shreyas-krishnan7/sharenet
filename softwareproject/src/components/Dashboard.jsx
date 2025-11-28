import React from 'react';
import { MessageSquare, FolderOpen, Video, User, LogOut } from 'lucide-react';
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  
  function handlelogout(){
    localStorage.removeItem('userInfo');
    navigate('/login');
  }
  
  function handlechat(){
    navigate('/chatpage')
  }
  
  const userinfo = JSON.parse(localStorage.getItem('userInfo'));
  const name = userinfo?.name;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="bg-white px-[60px] py-5 flex justify-between items-center border-b border-gray-200 sticky top-0 z-10 md:px-10 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-6 h-6 rounded relative flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #e91359 0%, #ff1f6e 100%)' }}
          >
            <div 
              className="w-3 h-3 bg-white"
              style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}
            ></div>
          </div>
          <span className="text-xl font-bold text-black">ShareNet</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-[15px] font-medium text-gray-800 hidden md:inline">
            {name}
          </span>
          <button className="w-10 h-10 rounded-full bg-gray-100 border-none flex items-center justify-center cursor-pointer transition-all duration-200 text-gray-600 hover:bg-gray-200 hover:text-gray-800">
            <User size={20} />
          </button>
          <button 
            className="w-10 h-10 rounded-full bg-gray-100 border-none flex items-center justify-center cursor-pointer transition-all duration-200 text-gray-600 hover:bg-red-100 hover:text-red-600"
            onClick={handlelogout}
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-[60px] py-20 pt-20 max-w-[1400px] w-full mx-auto md:px-10 md:py-[60px] sm:px-6 sm:py-10">
        <div className="mb-12">
          <h1 className="text-[52px] font-extrabold text-gray-800 mb-3 tracking-tight md:text-4xl sm:text-3xl">
            Welcome, {name} !
          </h1>
          <p className="text-lg text-gray-500 font-normal md:text-base">
            Select what you'd like to do today.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-8 max-w-[1200px] md:gap-6 sm:grid-cols-1 sm:gap-5">
          {/* Card 1 - Start a Conversation */}
          <div 
            className="bg-white rounded-2xl p-12 py-12 px-8 text-center transition-all duration-300 cursor-pointer border-2 border-transparent hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
            onClick={handlechat}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#e91359'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
          >
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center text-[#e91359]">
              <MessageSquare size={48} strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Start a Conversation
            </h2>
            <p className="text-[15px] text-gray-500 leading-relaxed max-w-[280px] mx-auto">
              Chat with online users . Share Files . Make audio / video calls .
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white px-[60px] py-6 text-center border-t border-gray-200 mt-auto md:px-10 sm:px-6">
        <p className="text-sm text-gray-400 sm:text-xs">
          © 2025 ShareNet | Connect. Chat. Share. Call.
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
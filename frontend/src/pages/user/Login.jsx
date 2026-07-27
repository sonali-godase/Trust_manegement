import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { FaEnvelope, FaLock, FaRegEye, FaRegEyeSlash } from "react-icons/fa";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const [error, setError] = useState(location.state?.message || "");

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError("Please fill all fields");
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/auth/login", {
        email,
        password,
        role: "Devotee"
      });
      
      if (response.data.success) {
        login(response.data.token, response.data.user);
        const from = location.state?.returnUrl || "/home";
        navigate(from);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to login. Please check credentials.");
    } finally {
      setLoading(false);
    }
    

    
  };

  return (
    <div className="flex h-screen bg-orange-50 relative overflow-hidden font-sans">
      
      {/* Background Om Pattern Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] overflow-hidden flex flex-wrap gap-20 p-10 justify-center items-center">
         {Array.from({length: 12}).map((_, i) => (
            <span key={i} className="text-9xl text-saffron-600 font-serif">ॐ</span>
         ))}
      </div>

      {/* Background Gradient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-saffron-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-gold-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-orange-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob" style={{ animationDelay: '4s' }}></div>

      {/* Floating Particles */}
      <div className="absolute inset-0 z-0 pointer-events-none hidden md:block">
        <div className="absolute top-[10%] left-[20%] text-2xl animate-float">🪔</div>
        <div className="absolute top-[40%] right-[15%] text-4xl animate-float" style={{ animationDelay: '1s' }}>🪔</div>
        <div className="absolute bottom-[20%] left-[10%] text-2xl animate-float" style={{ animationDelay: '2s' }}>🪔</div>
        <div className="absolute top-[20%] right-[30%] text-5xl opacity-40 animate-twinkle">🔱</div>
        <div className="absolute bottom-[30%] right-[20%] text-4xl opacity-50 animate-twinkle" style={{ animationDelay: '1.5s' }}>🔔</div>
      </div>

      {/* Left Pane */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center p-20 z-10 relative text-center">
        <div className="absolute rounded-full w-[400px] h-[400px] bg-white blur-[100px] animate-pulse-glow pointer-events-none opacity-50"></div>
        <h1 className="text-6xl font-bold text-saffron-600 mb-6 drop-shadow-md flex items-center justify-center gap-4">
          <span className="text-4xl text-saffron-500">🔱</span> Shri Gurumurti Rudrapashupati Lingayat Monastery <span className="text-4xl text-saffron-500">🔱</span>
        </h1>
        <p className="text-2xl text-caramel-dark font-medium tracking-wide max-w-lg leading-relaxed mix-blend-multiply">
          Embark on your spiritual journey. Securely access the divine management system.
        </p>
      </div>

      {/* Right Pane */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-[0_8px_32px_rgba(255,107,0,0.15)] animate-[fade-in_1s_ease-out]">
          
          <div className="text-center mb-8">
             <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-saffron-500 to-orange-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,107,0,0.4)]">
               <span className="text-3xl text-caramel-deep">ॐ</span>
             </div>
             <h2 className="text-3xl font-bold text-caramel-deep tracking-wide">Welcome Devotee</h2>
             <p className="text-saffron-600 font-medium mt-2">Sign in to your sacred account</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaEnvelope className="text-caramel-dark group-focus-within:text-saffron-500 transition-colors" />
                </div>
                <input 
                  type="email" 
                  placeholder="Email address"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-saffron-400 focus:ring-2 focus:ring-saffron-100 outline-none transition-all text-caramel-deep placeholder-gray-400 shadow-sm"
                />
              </div>
            </div>

            <div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="text-caramel-dark group-focus-within:text-saffron-500 transition-colors" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:border-saffron-400 focus:ring-2 focus:ring-saffron-100 outline-none transition-all text-caramel-deep placeholder-gray-400 shadow-sm"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-caramel-dark hover:text-saffron-500 transition-colors"
                >
                  {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm font-semibold text-saffron-500 hover:text-saffron-600 transition-colors">Forgot credentials?</Link>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-saffron-500 to-orange-500 hover:from-saffron-600 hover:to-orange-600 rounded-xl text-caramel-deep font-bold tracking-wide shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 disabled:transform-none"
            >
              {loading ? "Seeking Blessings..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-center text-sm font-medium text-caramel-dark">
            New devotee?{" "}
            <Link to="/register" className="text-saffron-600 hover:text-saffron-700 font-bold transition-colors">
              Sign up here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

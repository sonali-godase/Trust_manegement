import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { FaUser, FaEnvelope, FaLock, FaPhone, FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import OtpInput from "../../components/OTPInput";

const Register = () => {
  const navigate = useNavigate();
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1: Form, 2: OTP Verification

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: ""
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.phone) {
      setError("All fields are required");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Invalid email address format");
      return false;
    }
    if (!/^[a-zA-Z0-9]+$/.test(formData.password)) {
      setError("Password must contain only alphanumeric characters (letters and numbers)");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters (Weak password)");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        mobile: formData.phone,
        password: formData.password,
        address: "Not Provided"
      });

      if (response.data.success) {
        setStep(2); // Move to OTP step
        setError("");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndRegister = async (otpValue) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post('/auth/verify-otp', {
        email: formData.email,
        otp: otpValue
      });
      
      if (response.data.success) {
        navigate("/");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Registration failed or incorrect OTP.");
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
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-saffron-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-gold-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob" style={{ animationDelay: '2s' }}></div>

      {/* Floating Particles */}
      <div className="absolute inset-0 z-0 pointer-events-none hidden md:block">
        <div className="absolute top-[15%] left-[10%] text-3xl animate-float" style={{ animationDelay: '0.5s' }}>🪔</div>
        <div className="absolute bottom-[25%] left-[5%] text-5xl opacity-40 animate-twinkle">🔱</div>
        <div className="absolute top-[50%] right-[10%] text-4xl animate-float" style={{ animationDelay: '2s' }}>🪔</div>
        <div className="absolute top-[10%] right-[20%] text-4xl opacity-50 animate-twinkle" style={{ animationDelay: '1.5s' }}>🔔</div>
      </div>

      {/* Main Form Container */}
      <div className="w-full flex items-center justify-center p-6 z-10 overflow-y-auto min-h-screen">
        <div className="w-full max-w-lg bg-white/90 backdrop-blur-xl border border-white p-8 pt-10 rounded-3xl shadow-[0_8px_40px_rgba(255,107,0,0.15)] my-8 animate-[fade-in_1s_ease-out] relative">
          
          <div className="absolute top-[-40px] left-1/2 transform -translate-x-1/2">
             <div className="w-20 h-20 bg-gradient-to-br from-saffron-500 to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,107,0,0.4)] border-4 border-white">
               <span className="text-4xl text-caramel-deep">🔱</span>
             </div>
          </div>

          <div className="text-center mb-8 mt-6">
             <h2 className="text-3xl font-bold text-caramel-deep tracking-wide">Register Devotee</h2>
             <p className="text-saffron-600 font-medium mt-1">Join the Temple Management System</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center shadow-sm font-medium">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              {/* Full Name */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaUser className="text-caramel-dark group-focus-within:text-saffron-500 transition-colors" />
                </div>
                <input 
                  type="text" 
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-saffron-400 focus:ring-2 focus:ring-saffron-100 outline-none transition-all text-caramel-deep placeholder-gray-400 shadow-sm"
                />
              </div>

              {/* Email */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaEnvelope className="text-caramel-dark group-focus-within:text-saffron-500 transition-colors" />
                </div>
                <input 
                  type="email" 
                  name="email"
                  placeholder="Email Address"
                  autoComplete="username"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-saffron-400 focus:ring-2 focus:ring-saffron-100 outline-none transition-all text-caramel-deep placeholder-gray-400 shadow-sm"
                />
              </div>

              {/* Phone */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaPhone className="text-caramel-dark group-focus-within:text-saffron-500 transition-colors" />
                </div>
                <input 
                  type="tel" 
                  name="phone"
                  placeholder="Mobile Number (e.g. 9876543210)"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-saffron-400 focus:ring-2 focus:ring-saffron-100 outline-none transition-all text-caramel-deep placeholder-gray-400 shadow-sm"
                />
              </div>

              {/* Password */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="text-caramel-dark group-focus-within:text-saffron-500 transition-colors" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password"
                  placeholder="Password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleInputChange}
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

              {/* Confirm Password */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="text-caramel-dark group-focus-within:text-saffron-500 transition-colors" />
                </div>
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:border-saffron-400 focus:ring-2 focus:ring-saffron-100 outline-none transition-all text-caramel-deep placeholder-gray-400 shadow-sm"
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-caramel-dark hover:text-saffron-500 transition-colors"
                >
                  {showConfirmPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                </button>
              </div>

              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-saffron-500 to-orange-500 hover:from-saffron-600 hover:to-orange-600 rounded-xl text-caramel-deep font-bold tracking-wide shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 disabled:transform-none"
                >
                  {loading ? "Sending Holy OTP..." : "Proceed with Divine Registration"}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-6 flex flex-col items-center">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-caramel-deep mb-2 tracking-wide">Verify Devotee Contact</h3>
                <p className="text-caramel-dark font-medium">
                  Enter the 6-digit code sent to <br/>
                  <span className="font-bold text-saffron-600 tracking-wide text-lg">{formData.email}</span>
                </p>
              </div>
              
              <OtpInput length={6} onOtpSubmit={handleVerifyOtpAndRegister} />

              {loading && <p className="text-saffron-500 animate-pulse text-sm font-bold mt-4 tracking-widest">Registering your account...</p>}

              <button 
                disabled={loading}
                onClick={() => setStep(1)}
                className="text-sm font-semibold text-caramel-dark hover:text-saffron-500 transition-colors underline-offset-4 hover:underline mt-4"
              >
                Return to form
              </button>
            </div>
          )}

          <div className="mt-8 text-center text-sm font-medium text-caramel-dark">
            Already registered?{" "}
            <Link to="/" className="text-saffron-600 hover:text-saffron-700 font-bold transition-colors cursor-pointer relative z-20">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

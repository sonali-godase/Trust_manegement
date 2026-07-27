import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaArrowRight, FaCheckCircle } from "react-icons/fa";
import OtpInput from "../../components/OTPInput";
import { toast, Toaster } from "react-hot-toast";
import api from "../../utils/api";
import { getPasswordError } from "../../utils/validationUtils";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your registered email");

    setLoading(true);
    try {
      const response = await api.post("/auth/forgot-password", { email });
      if (response.data.success) {
        toast.success(response.data.message || "OTP sent successfully!");
        setStep(2);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = (otpValue) => {
    if (otpValue.length === 6) {
      setOtp(otpValue);
      setStep(3);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match");
    }
    const pwdError = getPasswordError(newPassword);
    if (pwdError) {
      return toast.error(pwdError);
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/reset-password", {
        email,
        otp,
        newPassword
      });
      if (response.data.success) {
        toast.success("Password reset successful!");
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password.");
      if (err.response?.status === 400 && err.response?.data?.message.includes('OTP')) {
         setStep(2); // Go back to OTP if it's incorrect
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-orange-50 relative overflow-hidden font-sans">
      <Toaster position="top-center" />
      
      {/* Background Enhancements */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] overflow-hidden flex flex-wrap gap-20 p-10 justify-center items-center">
         {Array.from({length: 12}).map((_, i) => (
            <span key={i} className="text-9xl text-saffron-600 font-serif">ॐ</span>
         ))}
      </div>
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-saffron-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob"></div>
      <div className="absolute bottom-[-20%] right-[10%] w-[600px] h-[600px] bg-gold-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob" style={{ animationDelay: '2s' }}></div>

      <div className="w-full flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-[0_8px_32px_rgba(255,107,0,0.15)] animate-[fade-in_0.5s_ease-out]">
          
          <div className="text-center mb-8">
             <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-saffron-500 to-orange-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,107,0,0.4)]">
               <FaLock className="text-2xl text-caramel-deep" />
             </div>
             <h2 className="text-3xl font-bold text-caramel-deep tracking-wide">
               {step === 1 && "Forgot Password"}
               {step === 2 && "Verify OTP"}
               {step === 3 && "Reset Password"}
             </h2>
             <p className="text-saffron-600 font-medium mt-2">
               {step === 1 && "Enter your email to receive a reset code"}
               {step === 2 && `Enter the 6-digit code sent to ${email}`}
               {step === 3 && "Create a new strong password"}
             </p>
          </div>

          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaEnvelope className="text-caramel-dark group-focus-within:text-saffron-500 transition-colors" />
                </div>
                <input 
                  type="email" 
                  placeholder="Registered Email Address"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:border-saffron-400 focus:ring-2 focus:ring-saffron-100 outline-none transition-all text-caramel-deep placeholder-gray-400 shadow-sm font-medium"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-saffron-500 to-orange-500 hover:from-saffron-600 hover:to-orange-600 rounded-xl text-caramel-deep font-bold tracking-wide shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? "Sending..." : "Send OTP Code"}
                {!loading && <FaArrowRight />}
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-6 flex flex-col items-center">
              <OtpInput length={6} onOtpSubmit={handleVerifyOtp} />
              <button 
                 onClick={() => setStep(1)}
                 className="text-sm font-semibold text-saffron-500 hover:text-saffron-600 transition-colors underline underline-offset-4 mt-4"
              >
                Change Email Address
              </button>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="text-caramel-dark group-focus-within:text-saffron-500 transition-colors" />
                </div>
                  <input 
                    required
                    type="password" 
                    pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}" 
                    title="Password must be at least 8 chars long with 1 uppercase, 1 lowercase, 1 number, and 1 special character"
                    placeholder="New Password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:border-saffron-400 focus:ring-2 focus:ring-saffron-100 outline-none transition-all text-caramel-deep placeholder-gray-400 shadow-sm font-medium"
                  />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaCheckCircle className="text-caramel-dark group-focus-within:text-saffron-500 transition-colors" />
                </div>
                <input 
                  type="password" 
                  placeholder="Confirm New Password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:border-saffron-400 focus:ring-2 focus:ring-saffron-100 outline-none transition-all text-caramel-deep placeholder-gray-400 shadow-sm font-medium"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-saffron-500 to-orange-500 hover:from-saffron-600 hover:to-orange-600 rounded-xl text-caramel-deep font-bold tracking-wide shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-70"
              >
                {loading ? "Updating..." : "Reset Password"}
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <Link to="/login" className="text-caramel-dark font-semibold hover:text-saffron-600 transition-colors text-sm">
              ← Back to Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

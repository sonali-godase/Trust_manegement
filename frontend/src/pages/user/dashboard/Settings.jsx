import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getProfile, updateProfile } from '../../../services/userDashboardService';
import { ProfileSkeleton } from '../../../components/dashboard/LoadingSkeleton';
import { FaUser, FaEnvelope, FaPhoneAlt, FaCamera, FaShieldAlt, FaSave } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { validateName, getMobileError } from '../../../utils/validationUtils';

export const Settings = () => {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: ''
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        const res = await getProfile();
        if (res.data?.success && res.data.data) {
          const u = res.data.data;
          setFormData({
            name: u.name || '',
            email: u.email || '',
            mobile: u.mobile || ''
          });
          if (u.profilePhoto) {
            const photoUrl = u.profilePhoto.startsWith('http') 
              ? u.profilePhoto 
              : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${u.profilePhoto.startsWith('/') ? '' : '/'}${u.profilePhoto}`;
            setPhotoPreview(photoUrl);
          }
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
        toast.error("Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, []);

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'name') value = value.replace(/[^A-Za-z\s]/g, '');
    if (name === 'mobile') value = value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image file size must be less than 5MB.");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required.");
      return;
    }
    if (!validateName(formData.name.trim())) {
      toast.error("Name must contain only alphabets and spaces.");
      return;
    }
    if (formData.mobile) {
      const mobileError = getMobileError(formData.mobile.trim());
      if (mobileError) {
        toast.error(mobileError);
        return;
      }
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('name', formData.name.trim());
      data.append('email', formData.email.trim());
      data.append('mobile', formData.mobile.trim());
      if (photoFile) {
        data.append('profilePhoto', photoFile);
      }

      const res = await updateProfile(data);
      if (res.data?.success && res.data.data) {
        toast.success("Profile updated successfully!");
        
        // Sync with AuthContext and sessionStorage
        const updatedUser = res.data.data;
        const currentToken = sessionStorage.getItem("token");
        login(currentToken, updatedUser);

        // Update photo preview link
        if (updatedUser.profilePhoto) {
          const photoUrl = updatedUser.profilePhoto.startsWith('http') 
            ? updatedUser.profilePhoto 
            : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${updatedUser.profilePhoto.startsWith('/') ? '' : '/'}${updatedUser.profilePhoto}`;
          setPhotoPreview(photoUrl);
        }
      }
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error(err.response?.data?.message || "Failed to update profile details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Toaster position="top-center" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-md rounded-2xl border border-cream-dark/20 p-6 md:p-8 shadow-soft"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Avatar Edit Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group cursor-pointer">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary/20 group-hover:border-primary/50 transition-all duration-300 shadow-soft">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary to-gold text-white flex items-center justify-center font-bold text-4xl">
                    {formData.name ? formData.name.charAt(0).toUpperCase() : 'ॐ'}
                  </div>
                )}
              </div>
              <label htmlFor="profilePhotoInput" className="absolute bottom-1 right-1 bg-primary text-white p-2.5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer border-2 border-white">
                <FaCamera size={14} />
              </label>
              <input
                id="profilePhotoInput"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-caramel-dark/70 mt-3 font-medium">JPEG, PNG or WebP up to 5MB</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-caramel-deep/80 uppercase tracking-wider mb-2">Full Name</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-caramel-dark/50">
                  <FaUser size={14} />
                </span>
                <input
                  type="text"
                  name="name"
                  pattern="[A-Za-z\s]+"
                  title="Name must contain only alphabets and spaces"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-cream-dark/40 bg-white/50 text-caramel-deep placeholder-caramel-dark/40 focus:outline-none focus:border-primary transition-colors text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-caramel-deep/80 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-caramel-dark/50">
                  <FaEnvelope size={14} />
                </span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-cream-dark/40 bg-gray-50 text-caramel-deep/70 placeholder-caramel-dark/40 focus:outline-none transition-colors text-sm font-medium cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-caramel-deep/80 uppercase tracking-wider mb-2">Mobile Number</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-caramel-dark/50">
                  <FaPhoneAlt size={14} />
                </span>
                <input
                  type="tel"
                  name="mobile"
                  pattern="\d{10}"
                  title="Mobile number must be exactly 10 digits"
                  maxLength={10}
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-cream-dark/40 bg-white/50 text-caramel-deep placeholder-caramel-dark/40 focus:outline-none focus:border-primary transition-colors text-sm font-medium"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-gold text-white font-semibold shadow-neon-primary hover:scale-[1.01] active:scale-99 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
            >
              <FaSave size={15} />
              <span>{submitting ? 'Saving changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </motion.div>

      {/* Security Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/80 backdrop-blur-md rounded-2xl border border-cream-dark/20 p-6 shadow-soft flex items-start gap-4"
      >
        <div className="p-3 bg-orange-50 rounded-xl text-primary flex-shrink-0">
          <FaShieldAlt size={18} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-caramel-deep mb-1">Security & Login</h4>
          <p className="text-xs text-caramel-dark/80 leading-relaxed">
            Your devotee account is protected using secure, passwords-free **One-Time Passwords (OTP)** sent to your registered email. There is no password required to log in. Always keep your email access secure.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FiUser, FiMail, FiPhone, FiMapPin, FiShield, FiSave, FiEdit2, FiCamera, FiLock, FiBell, FiEye, FiEyeOff } from 'react-icons/fi';
import { Globe, Clock, Activity, ChevronDown } from 'lucide-react';
import api from '../../utils/api';

const Toggle = ({ enabled, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-sky-600' : 'bg-gray-200'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const DocumentAdminProfile = () => {
  const { user, setUser } = useAuth();
  const { i18n, t } = useTranslation();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNo: '',
    address: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        contactNo: user.contactNo || user.mobile || user.phone || '',
        address: user.address || ''
      });
      if (user.profilePhoto) {
        const url = user.profilePhoto.startsWith('http') 
          ? user.profilePhoto 
          : `${API_URL}${user.profilePhoto.startsWith('/') ? '' : '/'}${user.profilePhoto}`;
        setImagePreview(url);
      }
    }
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSavePersonalInfo = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('contactNo', formData.contactNo);
      data.append('address', formData.address);
      if (profileImage) {
        data.append('profileImage', profileImage);
      }

      const res = await api.put('/document-admin/profile', data);
      if (res.data.success) {
        setSuccessMsg('Personal information updated successfully!');
        setIsEditing(false);
        const updatedUser = res.data.user || res.data.data;
        if (setUser && updatedUser) {
          const userWithRole = { ...user, ...updatedUser, role: updatedUser.role || user?.role || 'DocumentHandler' };
          setUser(userWithRole);
        }
      } else {
        setErrorMsg(res.data.message || 'Failed to update personal information.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to update personal information.');
    } finally {
      setLoading(false);
    }
  };

  const [preferences, setPreferences] = useState({
    showActivities: true,
    showBranches: true,
    showDonations: true,
    showEvents: true,
    language: 'English'
  });

  const handleTogglePref = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const handleVerifyPassword = async () => {
    if (!securityData.currentPassword) {
      return setErrorMsg("Please enter your current password first.");
    }
    setVerifyingPassword(true);
    setErrorMsg('');
    try {
      const res = await api.post('/document-admin/verify-password', { currentPassword: securityData.currentPassword });
      if (res.data.success) {
        setIsPasswordVerified(true);
        setSuccessMsg("Current password verified. You may now set a new password.");
      } else {
        setErrorMsg(res.data.message || "Invalid current password.");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Invalid current password.");
      setIsPasswordVerified(false);
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleUpdateSecurity = async (e) => {
    e.preventDefault();
    if (!isPasswordVerified) {
      return setErrorMsg("Please verify your current password first.");
    }
    if (!PASSWORD_REGEX.test(securityData.newPassword)) {
      return setErrorMsg("Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&).");
    }
    if (securityData.newPassword !== securityData.confirmPassword) {
      return setErrorMsg("Passwords do not match");
    }
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await api.put('/document-admin/profile', {
        currentPassword: securityData.currentPassword,
        newPassword: securityData.newPassword
      });
      if (res.data.success) {
        setSuccessMsg('Security settings updated successfully!');
        setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setIsPasswordVerified(false);
      } else {
        setErrorMsg(res.data.message || 'Failed to update security settings.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to update security settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      localStorage.setItem('adminPreferences', JSON.stringify(preferences));
      
      let lngCode = 'en';
      if (preferences.language === 'Hindi') lngCode = 'hi';
      if (preferences.language === 'Marathi') lngCode = 'mr';
      
      i18n.changeLanguage(lngCode);
      document.cookie = `googtrans=/en/${lngCode}; path=/;`;
      document.cookie = `googtrans=/en/${lngCode}; path=/; domain=${window.location.hostname};`;
      
      window.dispatchEvent(new Event('preferencesUpdated'));

      await new Promise(res => setTimeout(res, 400)); 
      setSuccessMsg('Preferences saved successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save preferences.');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    return user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'D');
  };

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Document Handler');

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-gray-800 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
            <FiUser className="text-sky-500" /> Document Handler Profile
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage your document administrator identity and dashboard preferences.</p>
        </div>
        {activeTab === 'personal' && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)} 
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-colors"
          >
            <FiEdit2 /> Edit Profile
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 bg-gray-50 border-r border-gray-100 p-6 shrink-0">
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-800 flex items-center justify-center shadow-md overflow-hidden relative">
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl text-white font-bold">{getInitials()}</span>
                )}
                
                {/* Overlay for image upload */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <FiCamera className="text-white text-xl mb-1" />
                  <span className="text-white text-[10px] font-bold uppercase tracking-wider">Change</span>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
            </div>
            <h3 className="mt-4 font-bold text-slate-900 text-center">{displayName}</h3>
            <span className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-bold uppercase tracking-wider mt-2 flex items-center gap-1">
              <FiShield /> Document Handler
            </span>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => {setActiveTab('personal'); setSuccessMsg(''); setErrorMsg('');}}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'personal' ? 'bg-sky-50 text-sky-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <FiUser className="text-lg" /> Personal Info
            </button>
            <button 
              onClick={() => {setActiveTab('security'); setSuccessMsg(''); setErrorMsg(''); setIsEditing(false);}}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'security' ? 'bg-sky-50 text-sky-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <FiLock className="text-lg" /> Security
            </button>
            <button 
              onClick={() => {setActiveTab('preferences'); setSuccessMsg(''); setErrorMsg(''); setIsEditing(false);}}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'preferences' ? 'bg-sky-50 text-sky-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <FiBell className="text-lg" /> Preferences
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-10 relative">
          
          <AnimatePresence mode="wait">
            {successMsg && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-6 left-10 right-10 p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-bold text-sm z-10 shadow-sm">
                {successMsg}
              </motion.div>
            )}
            {errorMsg && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-6 left-10 right-10 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 font-bold text-sm z-10 shadow-sm">
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <div className={(successMsg || errorMsg) ? "mt-16" : ""}>
            {/* Personal Info Tab */}
            {activeTab === 'personal' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                <h2 className="text-xl font-bold text-slate-900 mb-6 border-b border-gray-100 pb-4">Personal Information</h2>
                <form onSubmit={handleSavePersonalInfo} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">Full Name</label>
                      <div className="relative">
                        <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" disabled={!isEditing} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-gray-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500 transition-all disabled:opacity-70 disabled:bg-gray-100 font-medium" required />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">Email Address</label>
                      <div className="relative">
                        <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="email" disabled={true} value={formData.email} className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-gray-800 opacity-70 cursor-not-allowed font-medium" title="Email address cannot be changed" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">Mobile Number</label>
                      <div className="relative">
                        <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="tel" disabled={!isEditing} value={formData.contactNo} onChange={e => setFormData({...formData, contactNo: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-gray-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500 transition-all disabled:opacity-70 disabled:bg-gray-100 font-medium" required />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">Location / Address</label>
                      <div className="relative">
                        <FiMapPin className="absolute left-4 top-3 text-gray-400" />
                        <textarea disabled={!isEditing} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-gray-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500 transition-all disabled:opacity-70 disabled:bg-gray-100 font-medium resize-none h-24" />
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                      <button type="button" onClick={() => { setIsEditing(false); setSuccessMsg(''); setErrorMsg(''); setImagePreview(user?.profilePhoto ? (user.profilePhoto.startsWith('http') ? user.profilePhoto : `${API_URL.replace(/\/api$/, '')}${user.profilePhoto}`) : null); setProfileImage(null); setFormData({ name: user.name || '', email: user.email || '', contactNo: user.contactNo || '', address: user.address || '' }); }} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">
                        Cancel
                      </button>
                      <button type="submit" disabled={loading} className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                        {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><FiSave /> Save Changes</>}
                      </button>
                    </div>
                  )}
                </form>
              </motion.div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                <h2 className="text-xl font-bold text-slate-900 mb-6 border-b border-gray-100 pb-4">Security Settings</h2>
                <form onSubmit={handleUpdateSecurity} className="max-w-md space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Password</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type={showCurrentPassword ? "text" : "password"} 
                          required 
                          value={securityData.currentPassword} 
                          onChange={e => {
                            setSecurityData({...securityData, currentPassword: e.target.value});
                            setIsPasswordVerified(false);
                          }} 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500 transition-all" 
                        />
                        <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                      <button 
                        type="button" 
                        onClick={handleVerifyPassword} 
                        disabled={verifyingPassword || !securityData.currentPassword}
                        className={`px-4 py-3 rounded-xl font-bold text-xs transition-colors shadow-sm shrink-0 ${isPasswordVerified ? 'bg-emerald-600 text-white' : 'bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50'}`}
                      >
                        {verifyingPassword ? 'Verifying...' : isPasswordVerified ? '✓ Verified' : 'Verify'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Password</label>
                    <div className="relative">
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        required 
                        disabled={!isPasswordVerified}
                        value={securityData.newPassword} 
                        onChange={e => setSecurityData({...securityData, newPassword: e.target.value})} 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                        placeholder={!isPasswordVerified ? "Verify current password first" : "Min 8 chars, 1 upper, 1 lower, 1 num, 1 special"}
                      />
                      <button type="button" disabled={!isPasswordVerified} onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50">
                        {showNewPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirm New Password</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        required 
                        disabled={!isPasswordVerified}
                        value={securityData.confirmPassword} 
                        onChange={e => setSecurityData({...securityData, confirmPassword: e.target.value})} 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                        placeholder={!isPasswordVerified ? "Verify current password first" : "Re-enter new password"}
                      />
                      <button type="button" disabled={!isPasswordVerified} onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50">
                        {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button type="submit" disabled={loading || !isPasswordVerified} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Update Password'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-6 mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">System Preferences</h2>
                    <p className="text-gray-500 mt-1">Customize your document handler dashboard experience.</p>
                  </div>
                  <button 
                    onClick={handleUpdatePreferences}
                    className="w-full md:w-auto justify-center bg-white border border-sky-500 text-sky-600 hover:bg-sky-50 px-6 py-2.5 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2">
                    <FiSave className="w-4 h-4"/> Save Preferences
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Section 1: Dashboard Items */}
                  <section className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Activity className="w-5 h-5 text-sky-500"/> Dashboard Items</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Show Recent Activities</span>
                        <Toggle enabled={preferences.showActivities} onChange={() => handleTogglePref('showActivities')} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Show Branch Statistics</span>
                        <Toggle enabled={preferences.showBranches} onChange={() => handleTogglePref('showBranches')} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Show Donation Analytics</span>
                        <Toggle enabled={preferences.showDonations} onChange={() => handleTogglePref('showDonations')} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Show Upcoming Events</span>
                        <Toggle enabled={preferences.showEvents} onChange={() => handleTogglePref('showEvents')} />
                      </div>
                    </div>
                  </section>

                  {/* Section 2: Localization */}
                  <section className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Globe className="w-5 h-5 text-sky-500"/> Localization</h3>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Display Language</label>
                        <div className="relative">
                          <select 
                            value={preferences.language} 
                            onChange={(e) => setPreferences({...preferences, language: e.target.value})}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none appearance-none transition-all"
                          >
                            <option value="English">English</option>
                            <option value="Hindi">Hindi (हिंदी)</option>
                            <option value="Marathi">Marathi (मराठी)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentAdminProfile;

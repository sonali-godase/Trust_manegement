import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FiUser, FiMail, FiPhone, FiMapPin, FiShield, FiSave, FiEdit2, FiCamera, FiLock, FiBell, FiEye, FiEyeOff, FiSettings } from 'react-icons/fi';
import { Globe, Clock, Activity, ChevronDown } from 'lucide-react';
import api from '../../utils/api';

const AdminProfile = () => {
  const { user, login } = useAuth();
  const { i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    address: ''
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const [preferences, setPreferences] = useState({
    language: 'English',
    showActivities: true, showBranches: true, showDonations: true
  });

  const [systemSettings, setSystemSettings] = useState({
    adminLoginPin: '',
    cloudinaryCloudName: '',
    cloudinaryApiKey: '',
    cloudinaryApiSecret: ''
  });
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [showCloudinarySecret, setShowCloudinarySecret] = useState(false);

  const fetchSystemSettings = async () => {
    try {
      const res = await api.get('/admins/settings');
      if (res.data.success) {
        setSystemSettings({
          adminLoginPin: res.data.data.adminLoginPin || '',
          cloudinaryCloudName: res.data.data.cloudinaryCloudName || '',
          cloudinaryApiKey: res.data.data.cloudinaryApiKey || '',
          cloudinaryApiSecret: res.data.data.cloudinaryApiSecret || ''
        });
      }
    } catch (err) {
      console.error("Failed to fetch system settings", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'systemSettings') {
      fetchSystemSettings();
    }
  }, [activeTab]);

  const handleUpdateSystemSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    try {
      const res = await api.put('/admins/settings', systemSettings);
      if (res.data.success) {
        setSuccessMsg('System settings saved successfully!');
        setSystemSettings({
          adminLoginPin: res.data.data.adminLoginPin || '',
          cloudinaryCloudName: res.data.data.cloudinaryCloudName || '',
          cloudinaryApiKey: res.data.data.cloudinaryApiKey || '',
          cloudinaryApiSecret: res.data.data.cloudinaryApiSecret || ''
        });
      } else {
        alert(res.data.message || 'Failed to update system settings.');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update system settings.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    const savedPrefs = localStorage.getItem('adminPreferences');
    if (savedPrefs) {
      try {
        setPreferences(prev => ({ ...prev, ...JSON.parse(savedPrefs) }));
      } catch (e) {
        console.error("Failed to parse preferences", e);
      }
    }
  }, []);

  const handleTogglePref = (key) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('adminPreferences', JSON.stringify(updated));
      window.dispatchEvent(new Event('preferencesUpdated'));
      return updated;
    });
  };


  const Toggle = ({ enabled, onChange }) => (
    <div 
      onClick={onChange}
      className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${enabled ? 'bg-sky-500' : 'bg-gray-300'}`}
    >
      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${enabled ? 'translate-x-6' : ''}`} />
    </div>
  );

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || user.phone || '',
        address: user.address || ''
      });
      if (user.profilePhoto) {
        setImagePreview(`${API_URL}${user.profilePhoto}`);
      }
    }
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
      setIsEditing(true); // Auto enable edit mode if they change photo
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('mobile', formData.mobile);
      data.append('address', formData.address);
      if (profileImage) {
        data.append('profileImage', profileImage);
      }

      const res = await api.put('/admins/profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        login(sessionStorage.getItem('token') || localStorage.getItem('token'), res.data.data);
        setSuccessMsg('Profile information updated successfully!');
        setIsEditing(false);
      } else {
        alert(res.data.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSecurity = async (e) => {
    e.preventDefault();
    if (securityData.newPassword !== securityData.confirmPassword) {
      return alert("Passwords do not match");
    }
    setLoading(true);
    setSuccessMsg('');
    try {
      const res = await api.put('/admins/password', {
        currentPassword: securityData.currentPassword,
        newPassword: securityData.newPassword
      });
      if (res.data.success) {
        setSuccessMsg('Security settings updated successfully!');
        setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        alert(res.data.message || 'Failed to update security settings.');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update security settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    try {
      localStorage.setItem('adminPreferences', JSON.stringify(preferences));
      
      let lngCode = 'en';
      if (preferences.language === 'Hindi') lngCode = 'hi';
      if (preferences.language === 'Marathi') lngCode = 'mr';
      
      i18n.changeLanguage(lngCode);
      document.cookie = `googtrans=/en/${lngCode}; path=/;`;
      document.cookie = `googtrans=/en/${lngCode}; path=/; domain=${window.location.hostname};`;
      
      // Dispatch event to notify other components
      window.dispatchEvent(new Event('preferencesUpdated'));

      await new Promise(res => setTimeout(res, 400)); 
      setSuccessMsg('Preferences saved successfully!');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    return user?.name ? user.name.charAt(0).toUpperCase() : 'A';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-gray-800 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 text-slate-900 tracking-tight">
            <FiUser className="text-sky-500" /> Admin Profile
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage your administrative identity and security preferences.</p>
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
            <h3 className="mt-4 font-bold text-slate-900 text-center">{user?.name}</h3>
            <span className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-bold uppercase tracking-wider mt-2 flex items-center gap-1">
              <FiShield /> {user?.role || 'Administrator'}
            </span>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => {setActiveTab('personal'); setSuccessMsg('');}}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'personal' ? 'bg-sky-50 text-sky-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <FiUser className="text-lg" /> Personal Info
            </button>
            <button 
              onClick={() => {setActiveTab('security'); setSuccessMsg(''); setIsEditing(false);}}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'security' ? 'bg-sky-50 text-sky-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <FiLock className="text-lg" /> Security
            </button>
            <button 
              onClick={() => {setActiveTab('preferences'); setSuccessMsg(''); setIsEditing(false);}}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'preferences' ? 'bg-sky-50 text-sky-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <FiBell className="text-lg" /> Preferences
            </button>
            <button 
              onClick={() => {setActiveTab('systemSettings'); setSuccessMsg(''); setIsEditing(false);}}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'systemSettings' ? 'bg-sky-50 text-sky-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <FiSettings className="text-lg" /> System Settings
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
          </AnimatePresence>

          <div className={successMsg ? "mt-16" : ""}>
            {/* Personal Info Tab */}
            {activeTab === 'personal' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                <h2 className="text-xl font-bold text-slate-900 mb-6 border-b border-gray-100 pb-4">Personal Information</h2>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
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
                        <input type="tel" disabled={!isEditing} value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-gray-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500 transition-all disabled:opacity-70 disabled:bg-gray-100 font-medium" />
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
                    <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-end gap-3">
                      <button type="button" onClick={() => { setIsEditing(false); setSuccessMsg(''); setImagePreview(null); setProfileImage(null); }} className="w-full md:w-auto px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors order-2 md:order-1">
                        Cancel
                      </button>
                      <button type="submit" disabled={loading} className="w-full md:w-auto justify-center px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2 disabled:opacity-50 order-1 md:order-2">
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
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required value={securityData.currentPassword} onChange={e => setSecurityData({...securityData, currentPassword: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500 transition-all" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Password</label>
                    <input type={showPassword ? "text" : "password"} required minLength={6} value={securityData.newPassword} onChange={e => setSecurityData({...securityData, newPassword: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500 transition-all" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirm New Password</label>
                    <input type={showPassword ? "text" : "password"} required minLength={6} value={securityData.confirmPassword} onChange={e => setSecurityData({...securityData, confirmPassword: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500 transition-all" />
                  </div>

                  <div className="pt-4">
                    <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
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
                    <p className="text-gray-500 mt-1">Customize your admin dashboard experience.</p>
                  </div>
                  <button 
                    onClick={handleUpdatePreferences}
                    className="w-full md:w-auto justify-center bg-white border border-sky-500 text-sky-600 hover:bg-sky-50 px-6 py-2.5 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2">
                    <FiSave className="w-4 h-4"/> Save Preferences
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Removed Notifications Section */}

                  {/* Section 2: Dashboard Items */}
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
                    </div>
                  </section>

                  {/* Section 3: Localization */}
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
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Removed Date & Time Section */}
                </div>
              </motion.div>
            )}

            {/* System Settings Tab */}
            {activeTab === 'systemSettings' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-6 mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">System Settings</h2>
                    <p className="text-gray-500 mt-1">Configure global application variables and credentials.</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateSystemSettings} className="space-y-6 max-w-xl">
                  {/* Admin Login PIN */}
                  <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 space-y-4">
                    <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
                      <FiLock className="text-sky-500" /> Admin Security Settings
                    </h3>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Admin Login PIN</label>
                      <div className="relative">
                        <input
                          type={showAdminPin ? "text" : "password"}
                          required
                          value={systemSettings.adminLoginPin}
                          onChange={e => setSystemSettings({...systemSettings, adminLoginPin: e.target.value})}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPin(!showAdminPin)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showAdminPin ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cloudinary Config */}
                  <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 space-y-4">
                    <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
                      <Globe className="text-sky-500 w-5 h-5" /> Cloudinary Configuration
                    </h3>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cloud Name</label>
                      <input
                        type="text"
                        placeholder="e.g. dkciljoot"
                        value={systemSettings.cloudinaryCloudName}
                        onChange={e => setSystemSettings({...systemSettings, cloudinaryCloudName: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">API Key</label>
                      <input
                        type="text"
                        placeholder="e.g. 341723512741569"
                        value={systemSettings.cloudinaryApiKey}
                        onChange={e => setSystemSettings({...systemSettings, cloudinaryApiKey: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">API Secret</label>
                      <div className="relative">
                        <input
                          type={showCloudinarySecret ? "text" : "password"}
                          placeholder="Your Cloudinary API Secret"
                          value={systemSettings.cloudinaryApiSecret}
                          onChange={e => setSystemSettings({...systemSettings, cloudinaryApiSecret: e.target.value})}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCloudinarySecret(!showCloudinarySecret)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCloudinarySecret ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full md:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <><FiSave /> Save Settings</>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;

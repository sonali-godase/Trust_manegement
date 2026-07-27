import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { User, Phone, MapPin, Mail, Shield, Lock, Save, Camera, Globe, Bell, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const Profile = () => {
  const { user, login } = useAuth();
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: ''
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [preferences, setPreferences] = useState({
    language: 'English',
    showActivities: true, showBranches: true, showDonations: true, showEvents: true
  });
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // Load preferences from global adminPreferences for consistency
    const savedPrefs = localStorage.getItem('adminPreferences');
    if (savedPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        setPreferences(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse preferences", e);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || user.name || '',
        phone: user.phone || '',
        address: user.address || ''
      });
      if (user.profilePhoto) {
        const photoUrl = user.profilePhoto.startsWith('http') 
          ? user.profilePhoto 
          : `${API_URL.replace(/\/api$/, '')}${user.profilePhoto.startsWith('/') ? '' : '/'}${user.profilePhoto}`;
        setImagePreview(photoUrl);
      }
    }
  }, [user]);

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
      className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
    >
      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${enabled ? 'translate-x-6' : ''}`} />
    </div>
  );

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToUpdate = new FormData();
      dataToUpdate.append('fullName', formData.fullName);
      dataToUpdate.append('phone', formData.phone);
      dataToUpdate.append('address', formData.address);
      if (profileImageFile) {
        dataToUpdate.append('profileImage', profileImageFile);
      }

      const res = await api.put('/accountants/profile/me', dataToUpdate, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Profile updated successfully");
      
      // Update AuthContext user state instantly
      const updatedUser = {
        ...user,
        ...res.data.user,
        name: res.data.user?.fullName || res.data.user?.name || formData.fullName,
        fullName: res.data.user?.fullName || formData.fullName
      };
      setUser(updatedUser);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto overflow-hidden">
      <div className="mb-6 md:mb-8 text-center md:text-left">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center tracking-tight">Account Settings</h1>
        <p className="text-sm md:text-base text-gray-500 mt-1 md:mt-2">Manage your personal information and preferences.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-indigo-50/50 p-6 border-b border-indigo-100 flex flex-col items-center justify-center text-center">
            <div className="relative w-28 h-28 bg-white rounded-full border-4 border-indigo-100 shadow-sm flex items-center justify-center overflow-hidden mb-4 group cursor-pointer">
              <label className="absolute inset-0 z-10 cursor-pointer w-full h-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                 <Camera size={24} className="text-white mb-1" />
                 <span className="text-white text-xs font-bold">Change</span>
                 <input type="file" onChange={handleImageChange} className="hidden" accept="image/*" />
              </label>
              {(imagePreview || user?.profilePhoto) ? (
                 <img src={imagePreview || (user.profilePhoto?.startsWith('http') ? user.profilePhoto : `${API_URL.replace(/\/api$/, '')}${user.profilePhoto}`)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-indigo-300">{formData.fullName.charAt(0) || 'A'}</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{formData.fullName || 'Accountant'}</h2>
              <p className="text-sm font-medium text-indigo-600 flex items-center justify-center gap-1 mt-1">
                <Shield size={14} /> Managed by Trustee
              </p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Editable Fields */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <User size={16} className="text-gray-400" /> Full Name
              </label>
              <input 
                type="text" required
                autoComplete="name"
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Phone size={16} className="text-gray-400" /> Phone Number
              </label>
              <input 
                type="text" required
                autoComplete="tel"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <MapPin size={16} className="text-gray-400" /> Residential Address
              </label>
              <textarea 
                required rows="3"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>

            {/* Read Only Fields */}
            <div className="col-span-1 md:col-span-2 pt-6 border-t border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">System Information</h3>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Mail size={16} className="text-gray-400" /> Email Address (Read Only)
              </label>
              <input 
                type="email" disabled
                autoComplete="username"
                value={user?.email || ''}
                className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-lg p-3 outline-none cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Shield size={16} className="text-gray-400" /> System Role (Read Only)
              </label>
              <input 
                type="text" disabled
                value={user?.role || 'Accountant'}
                className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-lg p-3 outline-none cursor-not-allowed"
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Lock size={16} className="text-gray-400" /> Password (Read Only)
              </label>
              <div className="relative">
                <input 
                  type="password" disabled
                  autoComplete="current-password"
                  value="****************"
                  className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-lg p-3 outline-none cursor-not-allowed"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 bg-gray-200 px-2 py-1 rounded">Managed by Trustee</span>
              </div>
            </div>

          </div>

          <div className="flex justify-end pt-6 border-t border-gray-100">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] disabled:opacity-70"
            >
              <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Preferences Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="bg-indigo-50/50 p-6 border-b border-indigo-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell size={20} className="text-indigo-600" /> Preferences
          </h2>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Section: Dashboard Preferences */}
            <section className="bg-gray-50/50 rounded-2xl p-4 sm:p-6 border border-gray-100 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-500"/> Dashboard Items</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-sm font-medium text-gray-700">Recent Activities</span>
                  <Toggle enabled={preferences.showActivities} onChange={() => handleTogglePref('showActivities')} />
                </div>
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-sm font-medium text-gray-700">Branch Statistics</span>
                  <Toggle enabled={preferences.showBranches} onChange={() => handleTogglePref('showBranches')} />
                </div>
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-sm font-medium text-gray-700">Donation Analytics</span>
                  <Toggle enabled={preferences.showDonations} onChange={() => handleTogglePref('showDonations')} />
                </div>
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-sm font-medium text-gray-700">Upcoming Events</span>
                  <Toggle enabled={preferences.showEvents} onChange={() => handleTogglePref('showEvents')} />
                </div>
              </div>
            </section>

            {/* Section: Localization */}
            <section className="bg-gray-50/50 rounded-2xl p-4 sm:p-6 border border-gray-100 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Globe className="w-5 h-5 text-indigo-500"/> Localization</h3>
                <button 
                  onClick={() => {
                    let lngCode = 'en';
                    if (preferences.language === 'Hindi') lngCode = 'hi';
                    if (preferences.language === 'Marathi') lngCode = 'mr';
                    i18n.changeLanguage(lngCode);
                    document.cookie = `googtrans=/en/${lngCode}; path=/;`;
                    document.cookie = `googtrans=/en/${lngCode}; path=/; domain=${window.location.hostname};`;
                    toast.success('Language preferences saved successfully.');
                    setTimeout(() => window.location.reload(), 1000);
                  }}
                  className="w-full sm:w-auto bg-white border border-indigo-500 text-indigo-600 hover:bg-indigo-50 px-5 py-2 sm:py-1.5 rounded-lg text-sm font-bold shadow-sm transition whitespace-nowrap"
                >
                  Save Language
                </button>
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Display Language</label>
                  <select 
                    value={preferences.language}
                    onChange={e => setPreferences({...preferences, language: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                    <option value="Marathi">Marathi (मराठी)</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Profile;

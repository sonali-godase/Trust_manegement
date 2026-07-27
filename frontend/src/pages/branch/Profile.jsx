import React, { useState, useEffect } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from 'react-i18next';
import api from "../../utils/api";
import { 
  User, Shield, Settings, Camera, Mail, Phone, Calendar, CreditCard,
  Key, Eye, EyeOff, Smartphone, Monitor, Clock, Bell, Globe, 
  Activity, MapPin, ChevronDown, Check, Save
} from 'lucide-react';

const Profile = () => {
  const { user, login } = useAuth();
  const { i18n } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [personalInfo, setPersonalInfo] = useState({
    name: '', email: '', mobile: '', managerId: '', joiningDate: '', address: '', profilePhoto: ''
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [preferences, setPreferences] = useState({
    showActivities: true,
    showBranches: true,
    showDonations: true,
    showEvents: true,
    language: 'English'
  });

  useEffect(() => {
    if (user) {
      setPersonalInfo({
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || user.phone || '',
        managerId: user.managerId || user._id || '',
        joiningDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
        address: user.address || user.branch?.location || '',
        profilePhoto: user.profilePhoto || ''
      });
      if (user.profilePhoto) {
        const url = user.profilePhoto.startsWith('http') 
          ? user.profilePhoto 
          : `${API_URL}${user.profilePhoto.startsWith('/') ? '' : '/'}${user.profilePhoto}`;
        setImagePreview(url);
      }
    }
  }, [user]);

  const handlePersonalChange = (e) => {
    const { name, value } = e.target;
    setPersonalInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSavePersonalInfo = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const data = new FormData();
      data.append('name', personalInfo.name);
      data.append('mobile', personalInfo.mobile);
      data.append('address', personalInfo.address);
      if (profileImageFile) {
        data.append('profileImage', profileImageFile);
      }

      const res = await api.put('/branch-managers/profile', data);
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Personal information updated successfully.' });
        if (login && res.data.user) {
          login(res.data.user);
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update personal information.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  const handleTogglePref = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  // Tab 2: Security Settings
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const handleVerifyPassword = async () => {
    if (!passwords.old) {
      return setMessage({ type: 'error', text: 'Please enter your current password first.' });
    }
    setVerifyingPassword(true);
    try {
      const res = await api.post('/branch-managers/verify-password', { currentPassword: passwords.old });
      if (res.data.success) {
        setIsPasswordVerified(true);
        setMessage({ type: 'success', text: 'Current password verified. You may now set a new password.' });
      } else {
        setMessage({ type: 'error', text: res.data.message || 'Invalid current password.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Invalid current password.' });
      setIsPasswordVerified(false);
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!isPasswordVerified) {
      setMessage({ type: 'error', text: 'Please verify your current password first.' });
      return;
    }
    if (!PASSWORD_REGEX.test(passwords.new)) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&).' });
      return;
    }
    if(passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setLoading(true);
    try {
      await api.put('/branch-managers/profile', {
        currentPassword: passwords.old,
        newPassword: passwords.new
      });
      setMessage({ type: 'success', text: 'Password changed successfully.' });
      setPasswords({ old: '', new: '', confirm: '' });
      setIsPasswordVerified(false);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update password.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  // Toggles component
  const Toggle = ({ enabled, onChange }) => (
    <div 
      onClick={onChange}
      className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${enabled ? 'bg-sky-500' : 'bg-gray-300'}`}
    >
      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${enabled ? 'translate-x-6' : ''}`} />
    </div>
  );

  return (
    <div className="w-full space-y-6">
      
      {message.text && (
        <div className={`p-4 rounded-xl font-medium flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Column: Profile Summary Card */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
          <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center transition-all hover:shadow-md">
            
            <div className="relative group mb-5">
              <div className="w-32 h-32 rounded-full border-4 border-gray-50 shadow-sm overflow-hidden bg-gray-100 flex items-center justify-center relative">
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-gray-400">{personalInfo.name.charAt(0) || 'U'}</span>
                )}
              </div>
              <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="text-white w-8 h-8" />
                <input type="file" onChange={handleImageChange} accept="image/*" className="hidden" />
              </label>
            </div>

            <h2 className="text-xl font-bold text-gray-900">{personalInfo.name || 'Manager Name'}</h2>
            <p className="text-sm text-gray-500 mb-3">{personalInfo.managerId}</p>
            
            <span className="px-4 py-1.5 bg-sky-100 text-blue-900 text-xs font-bold rounded-full tracking-wide">
              BRANCH MANAGER
            </span>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <button 
              onClick={() => setActiveTab('personal')}
              className={`flex items-center gap-3 px-6 py-4 transition-colors font-medium border-l-4 ${activeTab === 'personal' ? 'bg-sky-50 text-sky-600 border-sky-500' : 'bg-white text-gray-500 border-transparent hover:bg-gray-50'}`}
            >
              <User className="w-5 h-5" /> Personal Information
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-3 px-6 py-4 transition-colors font-medium border-l-4 ${activeTab === 'security' ? 'bg-sky-50 text-sky-600 border-sky-500' : 'bg-white text-gray-500 border-transparent hover:bg-gray-50'}`}
            >
              <Shield className="w-5 h-5" /> Security
            </button>
            <button 
              onClick={() => setActiveTab('preferences')}
              className={`flex items-center gap-3 px-6 py-4 transition-colors font-medium border-l-4 ${activeTab === 'preferences' ? 'bg-sky-50 text-sky-600 border-sky-500' : 'bg-white text-gray-500 border-transparent hover:bg-gray-50'}`}
            >
              <Settings className="w-5 h-5" /> Preferences
            </button>
          </div>
        </div>

        {/* Right Column: Main Content Area */}
        <div className="flex-1 w-full bg-white rounded-[20px] shadow-sm border border-gray-100 p-8 min-h-[600px] transition-all hover:shadow-md">
          
          {/* TAB 1: PERSONAL INFORMATION */}
          {activeTab === 'personal' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
                <p className="text-gray-500 mt-1">Manage your branch manager identity and contact details.</p>
              </div>

              <form onSubmit={handleSavePersonalInfo} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><User className="w-4 h-4 text-gray-400"/> Full Name</label>
                    <input type="text" name="name" value={personalInfo.name} onChange={handlePersonalChange} required 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400"/> Email Address</label>
                    <input type="email" name="email" value={personalInfo.email} disabled 
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-200 text-gray-500 rounded-xl outline-none cursor-not-allowed" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400"/> Phone Number</label>
                    <input type="text" name="mobile" value={personalInfo.mobile} onChange={handlePersonalChange} required 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400"/> Location / Address</label>
                    <input type="text" name="address" value={personalInfo.address} onChange={handlePersonalChange} required 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-400"/> Manager ID</label>
                    <input type="text" name="managerId" value={personalInfo.managerId} disabled 
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-200 text-gray-500 rounded-xl outline-none cursor-not-allowed" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400"/> Joining Date</label>
                    <input type="text" name="joiningDate" value={personalInfo.joiningDate} disabled 
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-200 text-gray-500 rounded-xl outline-none cursor-not-allowed" />
                  </div>

                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" disabled={loading}
                    className="bg-black hover:bg-gray-900 text-white px-8 py-3 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2">
                    {loading ? 'Saving...' : <><Save className="w-5 h-5"/> Save Changes</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: SECURITY */}
          {activeTab === 'security' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Security Settings</h2>
                <p className="text-gray-500 mt-1">Manage account password and security options.</p>
              </div>

              {/* Section 1: Change Password */}
              <section className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Key className="w-5 h-5 text-sky-500"/> Change Password</h3>
                <form onSubmit={handleSavePassword} className="space-y-5 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Current Password</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type={showOldPassword ? "text" : "password"} 
                          name="old" 
                          value={passwords.old} 
                          onChange={e => {
                            handlePasswordChange(e);
                            setIsPasswordVerified(false);
                          }} 
                          required 
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all pr-12" 
                        />
                        <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <button 
                        type="button" 
                        onClick={handleVerifyPassword} 
                        disabled={verifyingPassword || !passwords.old}
                        className={`px-4 py-3 rounded-xl font-bold text-xs transition-colors shadow-sm shrink-0 ${isPasswordVerified ? 'bg-emerald-600 text-white' : 'bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50'}`}
                      >
                        {verifyingPassword ? 'Verifying...' : isPasswordVerified ? '✓ Verified' : 'Verify'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">New Password</label>
                    <div className="relative">
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        name="new" 
                        disabled={!isPasswordVerified}
                        value={passwords.new} 
                        onChange={handlePasswordChange} 
                        required 
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all pr-12 disabled:opacity-50 disabled:cursor-not-allowed" 
                        placeholder={!isPasswordVerified ? "Verify current password first" : "Min 8 chars, 1 upper, 1 lower, 1 num, 1 special"}
                      />
                      <button type="button" disabled={!isPasswordVerified} onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50">
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        name="confirm" 
                        disabled={!isPasswordVerified}
                        value={passwords.confirm} 
                        onChange={handlePasswordChange} 
                        required 
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all pr-12 disabled:opacity-50 disabled:cursor-not-allowed" 
                        placeholder={!isPasswordVerified ? "Verify current password first" : "Re-enter new password"}
                      />
                      <button type="button" disabled={!isPasswordVerified} onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50">
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading || !isPasswordVerified}
                    className="bg-black hover:bg-gray-900 text-white px-6 py-2.5 rounded-xl font-medium shadow-sm transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Save Password'}
                  </button>
                </form>
              </section>



              {/* Section 3: Recent Login Activity */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-sky-500"/> Recent Login Activity</h3>
                <div className="bg-transparent md:bg-white border-0 md:border md:border-gray-200 overflow-hidden rounded-xl">
                  <table className="w-full text-left text-sm text-gray-600 block md:table">
                    <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 hidden md:table-header-group">
                      <tr>
                        <th className="px-6 py-4">Date & Time</th>
                        <th className="px-6 py-4">Device & Browser</th>
                        <th className="px-6 py-4">IP Address</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="block md:table-row-group w-full divide-y divide-gray-100">
                      <tr className="flex flex-col md:table-row w-full bg-white md:bg-transparent border border-gray-100 md:border-b md:border-x-0 md:border-t-0 md:border-gray-100 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none hover:bg-gray-50 transition-colors">
                        <td className="p-4 md:px-6 md:py-4 block md:table-cell border-b border-gray-50 md:border-none">
                          <div className="flex justify-between items-start md:hidden mb-2">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded">Today, 10:23 AM</span>
                            <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-[10px] font-bold uppercase tracking-wider border border-green-200">Active</span>
                          </div>
                          <div className="hidden md:block">Today, 10:23 AM</div>
                          <div className="md:hidden mt-2 font-medium text-gray-900 text-base">Windows • Chrome</div>
                          <div className="md:hidden mt-1 text-sm text-gray-500">IP: 192.168.1.1</div>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4">
                          Windows • Chrome
                        </td>
                        <td className="hidden md:table-cell px-6 py-4">
                          192.168.1.1
                        </td>
                        <td className="hidden md:table-cell px-6 py-4">
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span>
                        </td>
                      </tr>
                      <tr className="flex flex-col md:table-row w-full bg-white md:bg-transparent border border-gray-100 md:border-b md:border-x-0 md:border-t-0 md:border-gray-100 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none hover:bg-gray-50 transition-colors">
                        <td className="p-4 md:px-6 md:py-4 block md:table-cell border-b border-gray-50 md:border-none">
                          <div className="flex justify-between items-start md:hidden mb-2">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded">Yesterday, 04:15 PM</span>
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-gray-200">Logged out</span>
                          </div>
                          <div className="hidden md:block">Yesterday, 04:15 PM</div>
                          <div className="md:hidden mt-2 font-medium text-gray-900 text-base">MacBook • Safari</div>
                          <div className="md:hidden mt-1 text-sm text-gray-500">IP: 10.0.0.45</div>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4">
                          MacBook • Safari
                        </td>
                        <td className="hidden md:table-cell px-6 py-4">
                          10.0.0.45
                        </td>
                        <td className="hidden md:table-cell px-6 py-4">
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Logged out</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

            </div>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-6 mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Preferences</h2>
                  <p className="text-gray-500 mt-1">Customize your dashboard experience.</p>
                </div>
                <button 
                  onClick={() => {
                    let lngCode = 'en';
                    if (preferences.language === 'Hindi') lngCode = 'hi';
                    if (preferences.language === 'Marathi') lngCode = 'mr';
                    
                    i18n.changeLanguage(lngCode);
                    document.cookie = `googtrans=/en/${lngCode}; path=/;`;
                    document.cookie = `googtrans=/en/${lngCode}; path=/; domain=${window.location.hostname};`;
                    
                    setMessage({ type: 'success', text: 'Preferences saved successfully.' });
                    setTimeout(() => {
                      setMessage({ type: '', text: '' });
                      window.location.reload();
                    }, 1000);
                  }}
                  className="w-full md:w-auto justify-center bg-white border border-sky-500 text-sky-600 hover:bg-sky-50 px-6 py-2.5 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2">
                  <Save className="w-4 h-4"/> Save Preferences
                </button>
              </div>

              {/* Grid for Preferences to make it look compact and dashboard-like */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Section 1: Dashboard Preferences */}
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

                {/* Section 2 & 3: Language and Theme */}
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

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Profile;



import React, { useState, useEffect } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from 'react-i18next';
import api from "../../utils/api";
import { 
  User, Shield, Settings, Camera, Mail, Phone, Calendar, CreditCard,
  Key, Eye, EyeOff, Smartphone, Monitor, Clock, Bell, Globe, 
  Activity, Map, ChevronDown, Check, Save
} from 'lucide-react';

const Profile = () => {
  const { user, login } = useAuth();
  const { i18n } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('personal');
  
  const [personalInfo, setPersonalInfo] = useState({
    name: '', email: '', mobile: '', trusteeId: '', joiningDate: '', aadhaar: '', profilePhoto: ''
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [recentLogins, setRecentLogins] = useState([]);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  // Tab 2: Security Settings
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [securitySettings, setSecuritySettings] = useState({
    twoFactor: false, sessionTimeout: true, deviceVerification: true
  });
  
  // Tab 3: Preferences
  const [preferences, setPreferences] = useState({
    notifyEmail: true, notifySms: false, notifyDonation: true, notifyEvent: true, notifyAnnadan: false,
    language: 'English',
    showActivities: true, showBranches: true, showDonations: true, showEvents: true
  });

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

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setPersonalInfo({
        name: user.displayName || user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
        trusteeId: user.trusteeId || user._id?.substring(0, 10).toUpperCase() || 'TRST-2023-001',
        joiningDate: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : 'Not Available',
        aadhaar: user.aadhaar || 'Not Provided',
        profilePhoto: user.profilePhoto || ''
      });
      if (user.profilePhoto) {
        const photoUrl = user.profilePhoto.startsWith('http') 
          ? user.profilePhoto 
          : `${API_URL.replace(/\/api$/, '')}${user.profilePhoto.startsWith('/') ? '' : '/'}${user.profilePhoto}`;
        setImagePreview(photoUrl);
      }
      
      const fetchLogins = async () => {
        try {
          const res = await api.get('/trustees/profile/logins');
          if (res.data.success) {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const recent24hLogins = res.data.logins.filter(login => new Date(login.timestamp) >= twentyFourHoursAgo);
            setRecentLogins(recent24hLogins);
          }
        } catch (error) {
          console.error("Failed to fetch recent logins", error);
        }
      };
      fetchLogins();
    }
  }, [user]);

  const handlePersonalChange = (e) => setPersonalInfo({ ...personalInfo, [e.target.name]: e.target.value });
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handlePasswordChange = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });
  
  const handleToggleSecurity = (key) => setSecuritySettings(prev => ({ ...prev, [key]: !prev[key] }));
  
  const handleTogglePref = (key) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('adminPreferences', JSON.stringify(updated));
      window.dispatchEvent(new Event('preferencesUpdated'));
      return updated;
    });
  };


  const handleSavePersonalInfo = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const dataToUpdate = new FormData();
      dataToUpdate.append('name', personalInfo.name);
      dataToUpdate.append('email', personalInfo.email);
      dataToUpdate.append('mobile', personalInfo.mobile);
      if (profileImageFile) {
        dataToUpdate.append('profileImage', profileImageFile);
      }
      
      const res = await api.put('/trustees/profile', dataToUpdate, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        login(sessionStorage.getItem('token') || localStorage.getItem('token'), res.data.data);
      }
      setMessage({ type: 'success', text: 'Personal information updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if(passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(passwords.new)) {
      setMessage({ type: 'error', text: 'Password must contain only alphanumeric characters.' });
      return;
    }
    setLoading(true);
    try {
      await api.put('/trustees/profile', {
        currentPassword: passwords.old,
        newPassword: passwords.new
      });
      setMessage({ type: 'success', text: 'Password changed successfully.' });
      setPasswords({ old: '', new: '', confirm: '' });
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

            <h2 className="text-xl font-bold text-gray-900">{personalInfo.name || 'Trustee Name'}</h2>
            <p className="text-sm text-gray-500 mb-3">{personalInfo.trusteeId}</p>
            
            <span className="px-4 py-1.5 bg-sky-100 text-blue-900 text-xs font-bold rounded-full tracking-wide">
              MAIN TRUSTEE
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
                <p className="text-gray-500 mt-1">Manage your trustee identity and contact details.</p>
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
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-400"/> Aadhaar Number</label>
                    <input type="text" name="aadhaar" value={personalInfo.aadhaar} disabled 
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-200 text-gray-500 rounded-xl outline-none cursor-not-allowed" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400"/> Joining Date</label>
                    <input type="date" name="joiningDate" value={personalInfo.joiningDate} disabled 
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-200 text-gray-500 rounded-xl outline-none cursor-not-allowed" />
                  </div>
                  
                  {/* Hidden Profile Photo URL input since we use file upload now */}
                  <div className="space-y-2 hidden">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><User className="w-4 h-4 text-gray-400"/> Profile Photo URL</label>
                    <input type="text" name="profilePhoto" value={personalInfo.profilePhoto} onChange={handlePersonalChange} 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all" placeholder="https://..." />
                  </div>

                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" disabled={loading}
                    className="bg-[#070B23] hover:bg-[#1E3A8A] text-white px-8 py-3 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2">
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
                    <label className="text-sm font-medium text-gray-700">Old Password</label>
                    <input type="password" name="old" value={passwords.old} onChange={handlePasswordChange} required 
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-2 relative">
                    <label className="text-sm font-medium text-gray-700">New Password</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} name="new" value={passwords.new} onChange={handlePasswordChange} required 
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all pr-12" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                    <input type="password" name="confirm" value={passwords.confirm} onChange={handlePasswordChange} required 
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="bg-[#070B23] hover:bg-[#1E3A8A] text-white px-6 py-2.5 rounded-xl font-medium shadow-sm transition-colors mt-2">
                    Save Password
                  </button>
                </form>
              </section>

              {/* Section 2: Account Security (Removed as per request) */}

              {/* Section 3: Recent Login Activity */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-sky-500"/> Recent Login Activity</h3>
                <div className="overflow-hidden rounded-xl border-0 md:border border-gray-200 bg-transparent md:bg-white">
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
                      {recentLogins.length > 0 ? recentLogins.map((login, idx) => (
                        <tr key={idx} className="flex flex-col md:table-row w-full bg-white md:bg-transparent border border-gray-100 md:border-b md:border-x-0 md:border-t-0 md:border-gray-50 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none hover:bg-gray-50">
                          <td className="p-4 md:px-6 md:py-4 block md:table-cell border-b border-gray-50 md:border-none">
                            <div className="flex md:hidden justify-between items-start mb-3">
                              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded">Login Activity</span>
                              <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-200">Success</span>
                            </div>
                            <div>
                              <div className="font-bold text-gray-800 text-base">{new Date(login.timestamp).toLocaleString()}</div>
                              <div className="md:hidden mt-2 text-sm text-gray-600 flex flex-col gap-1">
                                <div className="text-xs">Device: <span className="font-semibold">{login.details?.method || 'N/A'}</span></div>
                                <div className="text-xs">IP: <span className="font-semibold">{login.ipAddress || 'Unknown'}</span></div>
                              </div>
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4">
                            {login.details?.method || 'N/A'}
                          </td>
                          <td className="hidden md:table-cell px-6 py-4">
                            {login.ipAddress || 'Unknown'}
                          </td>
                          <td className="hidden md:table-cell px-6 py-4">
                            <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Success</span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No recent logins found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

            </div>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
                  className="w-full md:w-auto bg-white border border-sky-500 text-sky-600 hover:bg-sky-50 px-6 py-2.5 rounded-xl font-medium shadow-sm transition-colors flex items-center justify-center gap-2">
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
                          <option value="Hindi">Hindi (à¤¹à¤¿à¤‚à¤¦à¥€)</option>
                          <option value="Marathi">Marathi (à¤®à¤°à¤¾à¤ à¥€)</option>
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



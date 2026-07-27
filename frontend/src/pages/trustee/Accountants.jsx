import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Edit, Trash2, Eye, ShieldCheck, Mail, Phone, Calendar, User, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';
import { validateName, getMobileError, getPasswordError } from '../../utils/validationUtils';

const Accountants = () => {
  const [accountants, setAccountants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
  const [selectedAccountant, setSelectedAccountant] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { hasManage } = usePermissions('Accountants');

  // Add Accountant State
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState("");
  const [otp, setOtp] = useState("");
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    joiningDate: new Date().toISOString().split('T')[0],
    password: '',
    confirmPassword: ''
  });

  const fetchAccountants = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accountants');
      setAccountants(res.data.accountants || []);
    } catch (err) {
      toast.error('Failed to fetch accountants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountants();
  }, []);

  const handleSendOtp = async () => {
    if (!formData.email || !formData.fullName) {
      toast.error("Name and Email are required to send OTP");
      return;
    }
    try {
      await api.post('/accountants/send-otp', { email: formData.email, name: formData.fullName });
      setOtpSent(true);
      toast.success("OTP sent to email");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await api.post('/accountants/verify-otp', { email: formData.email, otp });
      setVerifiedToken(res.data.verifiedToken);
      setOtpVerified(true);
      toast.success("Email verified successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (modalMode === 'add') {
      if (!formData.fullName || !formData.email || !formData.phone || !formData.address || !formData.password) {
        toast.error("Please fill out all required fields");
        return;
      }
      if (!otpVerified) {
        toast.error("Please verify email first");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      if (!validateName(formData.fullName)) {
        toast.error("Name must contain only alphabets and spaces.");
        return;
      }
      const mobileError = getMobileError(formData.phone);
      if (mobileError) {
        toast.error(mobileError);
        return;
      }
      const pwdError = getPasswordError(formData.password);
      if (pwdError) {
        toast.error(pwdError);
        return;
      }
      try {
        await api.post('/accountants', { ...formData, verifiedToken });
        toast.success("Accountant created successfully");
        setShowModal(false);
        resetForm();
        fetchAccountants();
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to create accountant");
      }
    } else if (modalMode === 'edit') {
      if (!formData.fullName || !formData.phone || !formData.address) {
        toast.error("Please fill out all required fields");
        return;
      }
      if (!validateName(formData.fullName)) {
        toast.error("Name must contain only alphabets and spaces.");
        return;
      }
      const mobileError = getMobileError(formData.phone);
      if (mobileError) {
        toast.error(mobileError);
        return;
      }
      try {
        await api.put(`/accountants/${selectedAccountant._id}`, formData);
        toast.success("Accountant updated successfully");
        setShowModal(false);
        resetForm();
        fetchAccountants();
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to update accountant");
      }
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/accountants/${selectedAccountant._id}`);
      toast.success("Accountant deleted successfully");
      setShowDeleteModal(false);
      fetchAccountants();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete accountant");
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '', email: '', phone: '', address: '',
      joiningDate: new Date().toISOString().split('T')[0],
      password: '', confirmPassword: ''
    });
    setOtpSent(false);
    setOtpVerified(false);
    setOtp("");
    setSelectedAccountant(null);
  };

  const openAddModal = () => {
    setModalMode('add');
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (acc) => {
    setModalMode('edit');
    setFormData({ ...acc, password: '', confirmPassword: '' });
    setSelectedAccountant(acc);
    setShowModal(true);
  };

  const openViewModal = (acc) => {
    setModalMode('view');
    setFormData({ ...acc });
    setSelectedAccountant(acc);
    setShowModal(true);
  };

  const openDeleteModal = (acc) => {
    setSelectedAccountant(acc);
    setShowDeleteModal(true);
  };

  return (
    <div className="w-full space-y-6 text-gray-800 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2 tracking-tight">
          Accountant Management
          {!hasManage && <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm ml-2 font-sans inline-block align-middle">View Only Access</span>}
        </h1>
        {hasManage && (
          <div className="w-full md:w-auto">
            <button 
              onClick={openAddModal}
              className="w-full md:w-auto justify-center bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-lg"
            >
              <Plus size={20} /> Add Accountant
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading accountants...</div>
        ) : accountants.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No accountants found.</div>
        ) : (
          <div className="w-full">
            <table className="w-full text-left border-collapse block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-600">
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">Phone</th>
                  <th className="p-4 font-semibold">Joining Date</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accountants.map(acc => (
                  <tr key={acc._id} className="flex flex-col md:table-row w-full bg-white md:bg-transparent border border-gray-100 md:border-b md:border-x-0 md:border-t-0 md:border-gray-50 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none hover:bg-gray-50/50">
                    <td className="p-3 md:p-4 flex flex-col md:table-cell w-full border-b border-gray-50 md:border-none">
                      <div className="flex md:hidden justify-between items-start mb-3">
                        <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded">Joined: {new Date(acc.joiningDate).toLocaleDateString()}</span>
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold border border-green-200">Active</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm md:text-xs shrink-0">
                          {acc.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-lg md:text-base">{acc.fullName}</div>
                          <div className="md:hidden text-xs text-gray-500 mt-0.5">{acc.email} • {acc.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell p-4 text-gray-600">
                      {acc.email}
                    </td>
                    <td className="hidden md:table-cell p-4 text-gray-600">
                      {acc.phone}
                    </td>
                    <td className="hidden md:table-cell p-4 text-gray-600">
                      {new Date(acc.joiningDate).toLocaleDateString()}
                    </td>
                    <td className="hidden md:table-cell p-4">
                      <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span>
                    </td>
                    <td className="p-3 md:p-4 md:text-right flex flex-col md:table-cell w-full bg-gray-50 md:bg-transparent rounded-b-xl md:rounded-none">
                      <div className="flex justify-between items-center w-full">
                        <span className="md:hidden text-xs text-gray-500 uppercase tracking-wider font-semibold px-1">Actions</span>
                        {hasManage ? (
                          <div className="flex flex-wrap md:justify-end gap-2 w-full md:w-auto justify-end">
                            <button onClick={() => openViewModal(acc)} className="p-2 w-10 h-10 md:w-auto md:h-auto flex-1 md:flex-none flex items-center justify-center bg-white md:bg-transparent border border-gray-200 md:border-none text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shadow-sm md:shadow-none"><Eye size={16} /></button>
                            <button onClick={() => openEditModal(acc)} className="p-2 w-10 h-10 md:w-auto md:h-auto flex-1 md:flex-none flex items-center justify-center bg-white md:bg-transparent border border-gray-200 md:border-none text-orange-600 hover:bg-orange-50 rounded-lg transition-colors shadow-sm md:shadow-none"><Edit size={16} /></button>
                            <button onClick={() => openDeleteModal(acc)} className="p-2 w-10 h-10 md:w-auto md:h-auto flex-1 md:flex-none flex items-center justify-center bg-white md:bg-transparent border border-gray-200 md:border-none text-red-600 hover:bg-red-50 rounded-lg transition-colors shadow-sm md:shadow-none"><Trash2 size={16} /></button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap md:justify-end gap-2 w-full md:w-auto justify-end">
                            <button onClick={() => openViewModal(acc)} className="p-2 w-10 h-10 md:w-auto md:h-auto flex-1 md:flex-none flex items-center justify-center bg-white md:bg-transparent border border-gray-200 md:border-none text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shadow-sm md:shadow-none"><Eye size={16} /></button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Modal (Add/Edit/View) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-800 capitalize">{modalMode} Accountant</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-800">✕</button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                    <input 
                      required
                      type="text" 
                      autoComplete="name"
                      pattern="[A-Za-z\s]+"
                      title="Name must contain only alphabets and spaces"
                      value={formData.fullName} 
                      onChange={e => setFormData({...formData, fullName: e.target.value.replace(/[^A-Za-z\s]/g, '')})}
                      disabled={modalMode === 'view'}
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-50" 
                    />
                  </div>

                  {/* Email & OTP Logic for ADD mode */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address *</label>
                    <div className="flex gap-2">
                      <input 
                        type="email" 
                        autoComplete="username"
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        disabled={modalMode !== 'add' || otpVerified}
                        className="flex-1 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-50" 
                      />
                      {modalMode === 'add' && !otpVerified && (
                        <button 
                          type="button" 
                          onClick={handleSendOtp} 
                          className="bg-gray-800 text-white px-4 rounded-lg text-sm hover:bg-blue-900 hover:bg-blue-800 transition whitespace-nowrap"
                        >
                          {otpSent ? 'Resend OTP' : 'Send OTP'}
                        </button>
                      )}
                    </div>
                    {modalMode === 'add' && otpVerified && (
                      <p className="text-green-600 text-xs font-bold mt-1 flex items-center gap-1"><CheckCircle size={14}/> Email Verified</p>
                    )}
                  </div>

                  {/* OTP Input Field */}
                  {modalMode === 'add' && otpSent && !otpVerified && (
                    <div className="col-span-1 md:col-span-2 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                      <label className="block text-sm font-semibold text-indigo-900 mb-1">Enter Verification Code</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={otp} 
                          onChange={e => setOtp(e.target.value)}
                          placeholder="Enter OTP sent to email"
                          className="flex-1 border border-indigo-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                        />
                        <button 
                          type="button" 
                          onClick={handleVerifyOtp} 
                          className="bg-blue-900 hover:bg-blue-800 text-white px-4 rounded-lg text-sm transition"
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Other Fields */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Number *</label>
                    <input 
                      required
                      type="tel" 
                      autoComplete="tel"
                      pattern="\d{10}"
                      title="Mobile number must be exactly 10 digits"
                      maxLength={10}
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
                      disabled={modalMode === 'view'}
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-50" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Joining Date *</label>
                    <input 
                      type="date" 
                      value={formData.joiningDate} 
                      onChange={e => setFormData({...formData, joiningDate: e.target.value})}
                      disabled={modalMode === 'view'}
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-50" 
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Residential Address *</label>
                    <textarea 
                      rows="2"
                      value={formData.address} 
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      disabled={modalMode === 'view'}
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-50" 
                    />
                  </div>

                  {modalMode === 'add' && (
                    <>
                      <div className="col-span-1 md:col-span-2 pt-4 border-t border-gray-100">
                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><ShieldCheck size={18}/> Account Credentials</h3>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Password *</label>
                        <input 
                          required
                          type="password" 
                          autoComplete="new-password"
                          pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}"
                          title="Password must be at least 8 chars long with 1 uppercase, 1 lowercase, 1 number, and 1 special character"
                          value={formData.password} 
                          onChange={e => setFormData({...formData, password: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password *</label>
                        <input 
                          type="password" 
                          autoComplete="new-password"
                          value={formData.confirmPassword} 
                          onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" 
                        />
                      </div>
                    </>
                  )}
                </div>

                {modalMode !== 'view' && (
                  <div className="flex justify-end pt-4 pb-4 border-t border-gray-100 sticky bottom-0 bg-white z-10 mt-6 -mx-6 px-6 -mb-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button type="submit" className="w-full md:w-auto bg-blue-900 hover:bg-blue-800 text-white px-6 py-2.5 rounded-lg font-semibold transition shadow-sm">
                      {modalMode === 'add' ? 'Create Accountant' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Remove Accountant?</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to remove <span className="font-bold">{selectedAccountant?.fullName}</span>? This action can be reversed by an admin later, but they will immediately lose access.</p>
            <div className="flex flex-col md:flex-row gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition order-2 md:order-1">Cancel</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 transition order-1 md:order-2">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accountants;


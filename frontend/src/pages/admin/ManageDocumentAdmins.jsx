import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import { FaUserShield, FaPlus, FaTrash, FaTimes, FaSave } from 'react-icons/fa';
import { FiSearch, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { useTableFeatures } from '../../hooks/useTableFeatures';
import TablePagination from '../../components/TablePagination';

const ManageDocumentAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({ email: '', password: '', contactNo: '', status: 'Active' });
  const [submitting, setSubmitting] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState('');
  const [otp, setOtp] = useState('');

  const {
    searchTerm, setSearchTerm, sortConfig, handleSort,
    currentPage, setCurrentPage, itemsPerPage, setItemsPerPage,
    totalPages, paginatedData, totalItems
  } = useTableFeatures(admins, ['email', 'contactNo', 'status']);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const adminRes = await api.get('/document-admin');
      setAdmins(adminRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setCurrentAdmin(null);
    setFormData({ email: '', password: '', contactNo: '', status: 'Active' });
    setOtpSent(false);
    setOtpVerified(false);
    setVerifiedToken('');
    setOtp('');
    setIsModalOpen(true);
  };

  const handleEditModal = (admin) => {
    setCurrentAdmin(admin);
    setFormData({ email: admin.email, password: '', contactNo: admin.contactNo, status: admin.status });
    setOtpSent(false);
    setOtpVerified(true); // Skip OTP for editing
    setVerifiedToken('');
    setOtp('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentAdmin(null);
    setFormData({ email: '', password: '', contactNo: '', status: 'Active' });
    setOtpSent(false);
    setOtpVerified(false);
    setVerifiedToken('');
    setOtp('');
  };

  const handleSendOtp = async () => {
    if (!formData.email) {
      alert("Email is required to send OTP");
      return;
    }
    try {
      await api.post('/document-admin/send-otp', { email: formData.email });
      setOtpSent(true);
      alert("OTP sent to email");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send OTP");
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await api.post('/document-admin/verify-otp', { email: formData.email, otp });
      setVerifiedToken(res.data.verifiedToken);
      setOtpVerified(true);
      alert("Email verified successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Invalid OTP");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otpVerified && !currentAdmin) {
      alert("Please verify email first");
      return;
    }
    setSubmitting(true);
    try {
      if (currentAdmin) {
        await api.put(`/document-admin/${currentAdmin._id}`, formData);
      } else {
        await api.post('/document-admin', { ...formData, verifiedToken });
      }
      fetchAdmins();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving admin:', error);
      alert(error.response?.data?.message || 'Error saving Document Admin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to revoke access for this Document Admin?')) {
      try {
        await api.delete(`/document-admin/${id}`);
        fetchAdmins();
      } catch (error) {
        console.error('Error deleting admin:', error);
        alert('Error deleting admin.');
      }
    }
  };

  return (
    <div className="h-full flex flex-col relative z-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-2 font-serif flex items-center tracking-tight">Document Admins</h1>
          <p className="text-gray-500">Manage admins, their contact information, and active status.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
          <div className="relative w-full sm:w-auto">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search admins..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 w-full sm:w-full sm:w-full sm:w-64 shadow-sm transition-all"
            />
          </div>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl shadow-lg transition-colors font-black whitespace-nowrap"
          >
            <FaPlus /> Add Document Admin
          </button>
        </div>
      </div>

      <div className="md:bg-white md:rounded-2xl md:shadow-xl md:border md:border-gray-100 flex-1 overflow-hidden flex flex-col relative z-20">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left block md:table">
            <thead className="hidden md:table-header-group">
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm uppercase tracking-wider">
                <th className="p-6 font-semibold cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('email')}>
                  <div className="flex items-center gap-1">Admin Email {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? <FiChevronUp/> : <FiChevronDown/>)}</div>
                </th>
                <th className="p-6 font-semibold cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('contactNo')}>
                  <div className="flex items-center gap-1">Contact No {sortConfig.key === 'contactNo' && (sortConfig.direction === 'asc' ? <FiChevronUp/> : <FiChevronDown/>)}</div>
                </th>
                <th className="p-6 font-semibold cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <FiChevronUp/> : <FiChevronDown/>)}</div>
                </th>
                <th className="p-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group w-full divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="3" className="text-center py-12 text-gray-500">Loading admins...</td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center py-12 text-gray-500">No document admins found.</td>
                </tr>
              ) : (
                paginatedData.map((admin) => (
                  <tr key={admin._id} className="flex flex-col md:table-row w-full bg-white md:bg-transparent border border-gray-100 md:border-b md:border-x-0 md:border-t-0 md:border-gray-50 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none hover:bg-gray-50/50">
                    {/* Mobile Card Top & Desktop Info */}
                    <td className="p-3 md:p-6 flex flex-col md:table-cell w-full border-b border-gray-50 md:border-none">
                      <div className="flex md:hidden justify-between items-start mb-3">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contact: {admin.contactNo || 'N/A'}</span>
                        <span className={`px-2.5 py-1 font-bold rounded-lg border text-[11px] ${admin.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {admin.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <FaUserShield />
                        </div>
                        <span className="font-bold text-slate-900 truncate">{admin.email}</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell p-6 text-gray-600 font-medium">
                      {admin.contactNo || 'N/A'}
                    </td>
                    <td className="hidden md:table-cell p-6 text-gray-600">
                      <span className={`px-3 py-1 font-bold rounded-full text-sm inline-block ${admin.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {admin.status}
                      </span>
                    </td>
                    <td className="p-3 md:p-6 md:text-right flex flex-col md:table-cell w-full bg-gray-50 md:bg-transparent rounded-b-xl md:rounded-none">
                      <div className="flex justify-between items-center w-full">
                        <span className="md:hidden text-xs text-gray-500 uppercase tracking-wider font-semibold px-1">Actions</span>
                        <div className="flex flex-wrap md:justify-end gap-2 w-full md:w-auto justify-end">
                          <button
                            onClick={() => handleEditModal(admin)}
                            className="w-10 h-10 flex-1 md:flex-none inline-flex rounded-lg bg-white md:bg-indigo-50 text-indigo-600 border border-gray-200 md:border-none items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors shadow-sm md:shadow-none"
                            title="Edit"
                          >
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                          <button
                            onClick={() => handleDelete(admin._id)}
                            className="w-10 h-10 flex-1 md:flex-none inline-flex rounded-lg bg-white md:bg-red-50 text-red-600 border border-gray-200 md:border-none items-center justify-center hover:bg-red-600 hover:text-white transition-colors shadow-sm md:shadow-none"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && totalItems > 0 && (
          <TablePagination 
            currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage}
            totalItems={totalItems} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage}
          />
        )}
      </div>

      {/* Modal for Add Admin */}
      <AnimatePresence>
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={handleCloseModal}
            ></motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-gradient-to-r from-saffron-600 to-saffron-500 p-6 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold font-serif">{currentAdmin ? 'Edit Document Admin' : 'Create Document Admin'}</h3>
                <button onClick={handleCloseModal} className="text-white/80 hover:text-white transition-colors">
                  <FaTimes className="text-xl" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Admin Email</label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        autoComplete="username"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-saffron-500 focus:ring-2 focus:ring-saffron-200 outline-none transition-all disabled:bg-gray-100"
                        placeholder="e.g. docs@branch.com"
                        required
                        disabled={otpVerified || currentAdmin !== null}
                      />
                      {!otpVerified && !currentAdmin && (
                        <button 
                          type="button" 
                          onClick={handleSendOtp} 
                          className="bg-gray-800 text-white px-4 rounded-xl text-sm hover:bg-blue-900 hover:bg-blue-800 transition whitespace-nowrap font-bold"
                        >
                          {otpSent ? 'Resend OTP' : 'Send OTP'}
                        </button>
                      )}
                    </div>
                    {otpVerified && !currentAdmin && (
                      <p className="text-green-600 text-xs font-bold mt-2">Email Verified Successfully</p>
                    )}
                  </div>

                  {otpSent && !otpVerified && !currentAdmin && (
                    <div className="bg-saffron-50 p-4 rounded-xl border border-saffron-100">
                      <label className="block text-sm font-semibold text-saffron-900 mb-2">Enter Verification Code</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={otp} 
                          onChange={e => setOtp(e.target.value)}
                          placeholder="Enter OTP sent to email"
                          className="w-full px-4 py-2 rounded-xl border border-saffron-200 focus:border-saffron-500 focus:ring-2 focus:ring-saffron-200 outline-none transition-all bg-white" 
                        />
                        <button 
                          type="button" 
                          onClick={handleVerifyOtp} 
                          className="bg-blue-900 hover:bg-blue-800 text-white px-6 rounded-xl text-sm transition font-bold"
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password {currentAdmin && <span className="text-xs text-gray-400 font-normal">(Leave blank to keep current)</span>}</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      autoComplete="new-password"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-saffron-500 focus:ring-2 focus:ring-saffron-200 outline-none transition-all"
                      placeholder={currentAdmin ? "Enter new password (optional)" : "Enter a secure password"}
                      required={!currentAdmin}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contact No</label>
                    <input
                      type="text"
                      value={formData.contactNo}
                      onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })}
                      autoComplete="tel"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-saffron-500 focus:ring-2 focus:ring-saffron-200 outline-none transition-all"
                      placeholder="Enter contact number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-saffron-500 focus:ring-2 focus:ring-saffron-200 outline-none transition-all"
                      required
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-8 flex flex-col md:flex-row justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full md:w-auto px-6 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors order-2 md:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full md:w-auto justify-center px-6 py-3 rounded-xl font-semibold bg-blue-900 hover:bg-blue-800 text-white transition-colors flex items-center gap-2 order-1 md:order-2"
                  >
                    <FaSave /> {submitting ? 'Saving...' : currentAdmin ? 'Update Admin' : 'Create Admin'}
                  </button>
                </div>
              </form>
            </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageDocumentAdmins;





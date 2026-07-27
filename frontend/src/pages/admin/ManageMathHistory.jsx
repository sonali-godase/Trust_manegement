import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiClock, FiX, FiCheck, FiSearch, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import api from "../../utils/api";
import { useTableFeatures } from '../../hooks/useTableFeatures';
import TablePagination from '../../components/TablePagination';
import { usePermissions } from '../../hooks/usePermissions';

const ManageMathHistory = () => {
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '', era: '', content: '', category: 'Origin', status: 'Draft', order: 0
  });
  const [mediaFiles, setMediaFiles] = useState([]);

  const {
    searchTerm, setSearchTerm, sortConfig, handleSort,
    currentPage, setCurrentPage, itemsPerPage, setItemsPerPage,
    totalPages, paginatedData, totalItems
  } = useTableFeatures(historyRecords, ['title', 'era', 'category', 'status']);
  const { hasManage } = usePermissions('Monastery History');

  const fetchHistory = async () => {
    try {
      const res = await api.get('/math-history');
      setHistoryRecords(res.data.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const form = new FormData();
      Object.keys(formData).forEach(key => form.append(key, formData[key]));
      
      if (mediaFiles && mediaFiles.length > 0) {
        Array.from(mediaFiles).forEach(file => {
          form.append('media', file);
        });
      }

      if (editingId) {
        await api.put(`/math-history/${editingId}`, form);
      } else {
        await api.post('/math-history', form);
      }
      setIsModalOpen(false);
      resetForm();
      fetchHistory();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error saving history record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this Monastery History record?")) {
      try {
        await api.delete(`/math-history/${id}`);
        fetchHistory();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const openEdit = (record) => {
    setFormData({
      title: record.title,
      era: record.era,
      content: record.content,
      category: record.category || 'Origin',
      status: record.status || 'Draft',
      order: record.order || 0
    });
    setMediaFiles([]);
    setEditingId(record._id);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '', era: '', content: '', category: 'Origin', status: 'Draft', order: 0
    });
    setMediaFiles([]);
    setEditingId(null);
  };

  const toggleStatus = async (id, currentStatus) => {
      const newStatus = currentStatus === 'Published' ? 'Draft' : 'Published';
      try {
          await api.patch(`/math-history/${id}/status`, { status: newStatus });
          fetchHistory();
      } catch (err) {
          alert('Error updating status');
      }
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-4 border-saffron-500 rounded-full border-t-transparent animate-spin"></div></div>;

  return (
    <div className="w-full space-y-6 text-gray-800 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 text-slate-900 tracking-tight">
            <FiClock className="text-saffron-500" /> Monastery History Management
            {!hasManage && <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm ml-2 font-sans inline-block align-middle">View Only Access</span>}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage timeline events, history, and sacred origins.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-auto">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search records..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-64 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 shadow-sm transition-all"
            />
          </div>
          {hasManage && (
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-xl font-black transition-colors shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <FiPlus /> Add Record
            </button>
          )}
        </div>
      </div>

      <div className="md:bg-white md:border md:border-gray-100 md:shadow-sm md:rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse block md:table">
            <thead className="hidden md:table-header-group">
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <th className="p-4 font-bold cursor-pointer" onClick={() => handleSort('title')}>Title</th>
                <th className="p-4 font-bold cursor-pointer" onClick={() => handleSort('era')}>Era</th>
                <th className="p-4 font-bold cursor-pointer" onClick={() => handleSort('category')}>Category</th>
                <th className="p-4 font-bold cursor-pointer" onClick={() => handleSort('status')}>Status</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group w-full divide-y divide-gray-100 text-sm">
              {paginatedData.map(record => (
                <tr key={record._id} className="flex flex-col md:table-row w-full bg-white md:bg-transparent border border-gray-100 md:border-b md:border-x-0 md:border-t-0 md:border-gray-50 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none hover:bg-gray-50/50">
                  <td className="p-3 md:p-4 flex flex-col md:table-cell w-full border-b border-gray-50 md:border-none">
                    <div className="flex md:hidden justify-between items-start mb-3">
                      <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded">{record.category}</span>
                      <button 
                         onClick={() => hasManage && toggleStatus(record._id, record.status)}
                         disabled={!hasManage}
                         className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${record.status === 'Published' ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' : record.status === 'Pending' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'} ${!hasManage && 'cursor-not-allowed opacity-80'}`}>
                        {record.status}
                      </button>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-lg md:text-base">{record.title}</div>
                      <div className="md:hidden text-xs text-gray-500 mt-1 font-medium">Era: {record.era}</div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell p-4 text-gray-600">
                    {record.era}
                  </td>
                  <td className="hidden md:table-cell p-4 text-gray-600">
                    {record.category}
                  </td>
                  <td className="hidden md:table-cell p-4">
                    <button 
                       onClick={() => hasManage && toggleStatus(record._id, record.status)}
                       disabled={!hasManage}
                       className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors inline-block ${record.status === 'Published' ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' : record.status === 'Pending' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'} ${!hasManage && 'cursor-not-allowed opacity-80'}`}>
                      {record.status}
                    </button>
                  </td>
                  <td className="p-3 md:p-4 md:text-right flex flex-col md:table-cell w-full bg-gray-50 md:bg-transparent rounded-b-xl md:rounded-none">
                    <div className="flex justify-between items-center w-full">
                      <span className="md:hidden text-xs text-gray-500 uppercase tracking-wider font-semibold px-1">Actions</span>
                      {hasManage ? (
                        <div className="flex flex-wrap md:justify-end gap-2 w-full md:w-auto justify-end">
                          <button onClick={() => openEdit(record)} className="p-2 w-10 h-10 md:w-auto md:h-auto flex-1 md:flex-none flex items-center justify-center bg-white md:bg-transparent border border-gray-200 md:border-none text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shadow-sm md:shadow-none"><FiEdit2 /></button>
                          <button onClick={() => handleDelete(record._id)} className="p-2 w-10 h-10 md:w-auto md:h-auto flex-1 md:flex-none flex items-center justify-center bg-white md:bg-transparent border border-gray-200 md:border-none text-red-500 hover:bg-red-50 rounded-lg transition-colors shadow-sm md:shadow-none"><FiTrash2 /></button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 font-bold inline-block w-full text-right md:w-auto">View Only Access</div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination 
          currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage}
          totalItems={totalItems} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage}
        />
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative z-10 custom-scrollbar border border-gray-100">
              <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex justify-between items-center z-20">
                <h2 className="text-xl font-bold text-slate-900">{editingId ? 'Edit Record' : 'Add Record'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-full"><FiX size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Title</label>
                    <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Era</label>
                    <input required type="text" value={formData.era} onChange={e => setFormData({...formData, era: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800" placeholder="e.g. 19th Century, Ancient" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 appearance-none">
                      <option value="Origin">Origin</option>
                      <option value="Philosophy">Philosophy</option>
                      <option value="Miracles">Miracles</option>
                      <option value="Social Work">Social Work</option>
                      <option value="Architecture">Architecture</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 appearance-none">
                      <option value="Draft">Draft</option>
                      <option value="Pending">Pending Approval</option>
                      <option value="Published">Published</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Timeline Order</label>
                    <input type="number" value={formData.order} onChange={e => setFormData({...formData, order: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Content</label>
                  <textarea required rows="6" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 resize-none"></textarea>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Upload Media (Images/Docs)</label>
                  <input type="file" multiple onChange={e => setMediaFiles(e.target.files)} className="w-full" />
                </div>

                <div className="pt-6 flex flex-col md:flex-row justify-end gap-3 border-t border-gray-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-auto px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 font-bold transition-colors order-2 md:order-1">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="order-1 md:order-2 bg-blue-900 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto justify-center text-white px-8 py-2.5 rounded-xl font-black transition-colors shadow-lg">
                    {isSubmitting ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Record')}
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

export default ManageMathHistory;





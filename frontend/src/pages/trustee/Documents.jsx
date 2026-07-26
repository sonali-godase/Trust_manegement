import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFileText, FiDownload, FiSearch, FiEye, FiCheckCircle, FiCheck, FiX, FiFilter, FiAlertCircle } from 'react-icons/fi';
import api from "../../utils/api";
import { usePermissions } from '../../hooks/usePermissions';
import { useTableFeatures } from '../../hooks/useTableFeatures';
import TablePagination from '../../components/TablePagination';

const getDocUrl = (url) => {
  if (!url) return "#";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const cleanUrl = url.replace(/\\/g, "/");
  const assetsUrl = import.meta.env.VITE_ASSETS_URL || "http://localhost:5000";
  return `${assetsUrl}${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
};

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [documentRequests, setDocumentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'approval-requests', 'requests'
  const { hasManage } = usePermissions('Documents');

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [trusteeRemarks, setTrusteeRemarks] = useState("");
  const [reviewAction, setReviewAction] = useState(null);

  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBranch, setFilterBranch] = useState('');

  const filteredByCustom = documents.filter(doc => {
    let match = true;
    if (filterCategory && doc.category !== filterCategory) match = false;
    if (filterBranch && doc.branch?.name !== filterBranch) match = false;
    return match;
  });

  const {
    searchTerm, setSearchTerm, sortConfig, handleSort,
    currentPage, setCurrentPage, itemsPerPage, setItemsPerPage,
    totalPages, paginatedData, totalItems
  } = useTableFeatures(filteredByCustom, ['title', 'category']);

  // Extract unique categories and branches for filters
  const categories = [...new Set(documents.map(d => d.category))].filter(Boolean);
  const branches = [...new Set(documents.map(d => d.branch?.name))].filter(Boolean);

  useEffect(() => {
    fetchData();
    fetchDocumentRequests();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docsRes, reqsRes] = await Promise.all([
        api.get('/trustees/documents'),
        api.get('/trustees/documents/deletion-requests')
      ]);
      setDocuments(docsRes.data.documents || docsRes.data.data || []);
      setDeletionRequests(reqsRes.data.data || []);
    } catch (error) {
      console.error("Failed to fetch documents data", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentRequests = async () => {
    try {
      const res = await api.get('/trustees/documents/requests');
      if (res.data.success) {
        setDocumentRequests(res.data.requests || []);
      }
    } catch (err) {
      console.error("Failed to fetch document requests", err);
    }
  };

  const handleProcessAction = async () => {
    if (!selectedRequest || !reviewAction) return;
    try {
      await api.put(`/trustees/documents/requests/${selectedRequest._id}/action`, {
        action: reviewAction,
        remarks: trusteeRemarks
      });
      alert(`Document request ${reviewAction.toLowerCase()}d successfully.`);
      setSelectedRequest(null);
      setTrusteeRemarks("");
      setReviewAction(null);
      fetchData();
      fetchDocumentRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Error processing request");
    }
  };

  const handleReviewDeletion = async (id, status) => {
    if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this deletion request?`)) return;
    
    try {
      await api.put(`/trustees/documents/${id}/review-deletion`, { status });
      fetchData();
    } catch (error) {
      alert("Error reviewing request.");
    }
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-4 border-saffron-500 rounded-full border-t-transparent animate-spin"></div></div>;

  const pendingApprovalCount = documentRequests.filter(r => r.status === 'Pending').length;

  return (
    <div className="w-full space-y-6 text-gray-800 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 tracking-tight">
            <FiFileText className="text-saffron-500" /> Document Management
            {!hasManage && <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm ml-4 font-sans inline-block align-middle">View Only Access</span>}
          </h1>
          <p className="text-gray-500 mt-1">Review pending CRUD requests, approve document changes, and manage deletion requests.</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto flex-wrap sm:flex-nowrap gap-1">
          <button 
            onClick={() => setActiveTab('all')} 
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md font-bold text-xs md:text-sm transition-all ${activeTab === 'all' ? 'bg-white shadow-sm text-deepblue-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            All Documents
          </button>
          <button 
            onClick={() => setActiveTab('approval-requests')} 
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md font-bold text-xs md:text-sm transition-all relative ${activeTab === 'approval-requests' ? 'bg-white shadow-sm text-deepblue-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Approval Requests
            {pendingApprovalCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                {pendingApprovalCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('requests')} 
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md font-bold text-xs md:text-sm transition-all relative ${activeTab === 'requests' ? 'bg-white shadow-sm text-deepblue-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Deletion Requests
            {deletionRequests.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                {deletionRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="w-full">
        {activeTab === 'all' && (
          <div className="space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative w-full md:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400" />
                </div>
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search documents by title or category..." 
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 shadow-sm transition-all"
                />
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center justify-center gap-2 px-5 py-3 md:py-2.5 bg-white border ${showFilters ? 'border-saffron-500 text-saffron-600' : 'border-gray-200 text-gray-700'} hover:bg-gray-50 rounded-xl text-sm font-black shadow-sm transition-colors w-full md:w-auto`}>
                <FiFilter /> Filters
              </button>
            </div>

            {showFilters && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-saffron-500">
                      <option value="">All Categories</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Branch</label>
                    <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-saffron-500">
                      <option value="">All Branches</option>
                      {branches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button onClick={() => { setFilterCategory(''); setFilterBranch(''); }} className="text-sm font-bold text-gray-500 hover:text-gray-700">Clear Filters</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedData.map((doc) => (
                <div key={doc._id} className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all rounded-2xl p-6 group relative overflow-hidden flex flex-col h-full">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-full group-hover:bg-saffron-50 transition-colors"></div>
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-saffron-500 transition-colors">
                      <FiFileText size={24} />
                    </div>
                    <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md ${doc.status === 'Approved' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                      {doc.status || doc.category}
                    </span>
                  </div>

                  <div className="relative z-10 mb-6 flex-1">
                    <h3 className="font-bold text-lg text-slate-900 mb-1 truncate" title={doc.title}>{doc.title}</h3>
                    <p className="text-xs text-gray-500 font-medium">Category: <span className="text-slate-600">{doc.category}</span></p>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1"><FiCheckCircle className="text-gray-400" /> Branch: {doc.branch?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400 mt-1">Uploaded: {new Date(doc.createdAt || doc.uploadDate || Date.now()).toLocaleDateString()}</p>
                  </div>

                  <div className="flex gap-2 relative z-10 pt-4 border-t border-gray-100">
                    <a 
                      href={getDocUrl(doc.pdfUrl)}
                      target="_blank" rel="noopener noreferrer"
                      download
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-black border border-black text-white hover:bg-gray-900 hover:border-gray-900 rounded-xl transition-all text-sm font-black shadow-md hover:shadow-lg"
                    >
                      <FiDownload /> Download
                    </a>
                    <a 
                      href={getDocUrl(doc.pdfUrl)}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-900 text-black hover:bg-gray-100 rounded-xl transition-all text-sm font-black shadow-md hover:shadow-lg"
                    >
                      <FiEye /> Preview
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {paginatedData.length > 0 && (
              <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white">
                <TablePagination 
                  currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage}
                  totalItems={totalItems} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage}
                />
              </div>
            )}

            {paginatedData.length === 0 && (
              <div className="text-center py-20 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <FiFileText className="mx-auto text-4xl text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">No documents found matching your criteria.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'approval-requests' && (
          <div className="md:bg-white md:rounded-2xl md:shadow-sm md:border border-gray-100 overflow-hidden relative z-10">
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Document Approval Requests</h3>
                <p className="text-xs text-gray-500 mt-0.5">Review CRUD requests submitted by Document Handlers before changes take effect.</p>
              </div>
              <button 
                onClick={fetchDocumentRequests} 
                className="text-xs font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 block md:table">
                <thead className="text-xs text-gray-400 uppercase bg-gray-50 hidden md:table-header-group border-b border-gray-100">
                  <tr>
                    <th className="p-4 md:p-6 font-semibold">Request Type</th>
                    <th className="p-4 md:p-6 font-semibold">Document Details</th>
                    <th className="p-4 md:p-6 font-semibold">Requested By</th>
                    <th className="p-4 md:p-6 font-semibold">Requested Date</th>
                    <th className="p-4 md:p-6 font-semibold text-center">Status</th>
                    <th className="p-4 md:p-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group w-full divide-y divide-gray-100">
                  {documentRequests.map((req) => (
                    <tr key={req._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 md:p-6 font-bold">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider ${
                          req.requestType === 'Create' ? 'bg-blue-100 text-blue-800' :
                          req.requestType === 'Update' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {req.requestType}
                        </span>
                      </td>
                      <td className="p-4 md:p-6">
                        <p className="font-bold text-gray-900">{req.documentData?.title || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{req.documentData?.category} • {req.documentData?.pdfName || ''}</p>
                        {req.documentData?.description && (
                          <p className="text-xs text-gray-600 italic mt-1 line-clamp-1">{req.documentData.description}</p>
                        )}
                      </td>
                      <td className="p-4 md:p-6 text-xs text-gray-700">
                        <p className="font-bold">{req.requestedBy?.fullName || req.requestedBy?.name || 'Document Handler'}</p>
                        <p className="text-[10px] text-gray-400">{req.requestedBy?.email || ''}</p>
                      </td>
                      <td className="p-4 md:p-6 text-xs text-gray-500 font-medium">
                        {new Date(req.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="p-4 md:p-6 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 ${
                          req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          req.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-4 md:p-6 text-right">
                        {req.status === 'Pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            {req.documentData?.pdfUrl && (
                              <a 
                                href={getDocUrl(req.documentData.pdfUrl)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold"
                                title="Preview PDF"
                              >
                                <FiEye />
                              </a>
                            )}
                            <button 
                              onClick={() => { setSelectedRequest(req); setReviewAction('Approve'); setTrusteeRemarks(''); }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                            >
                              <FiCheck /> Approve
                            </button>
                            <button 
                              onClick={() => { setSelectedRequest(req); setReviewAction('Reject'); setTrusteeRemarks(''); }}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                            >
                              <FiX /> Reject
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">
                            {req.trusteeRemarks ? (
                              <p className="italic">"{req.trusteeRemarks}"</p>
                            ) : (
                              <span>No remarks</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {documentRequests.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-gray-400">
                        No pending document approval requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {reviewAction} Document {selectedRequest.requestType} Request
              </h3>
              <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm text-gray-700 border border-gray-100">
              <p><span className="font-bold text-gray-900">Document:</span> {selectedRequest.documentData?.title || 'N/A'}</p>
              <p><span className="font-bold text-gray-900">Requested By:</span> {selectedRequest.requestedBy?.fullName || selectedRequest.requestedBy?.name || 'Document Handler'}</p>
              <p><span className="font-bold text-gray-900">Category:</span> {selectedRequest.documentData?.category || 'N/A'}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Trustee Remarks {reviewAction === 'Reject' && '*'}
              </label>
              <textarea 
                rows="3" 
                value={trusteeRemarks} 
                onChange={(e) => setTrusteeRemarks(e.target.value)}
                placeholder={reviewAction === 'Approve' ? "Optional approval remarks..." : "Specify reason for rejection..."}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-saffron-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setSelectedRequest(null)} 
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 font-bold rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleProcessAction} 
                className={`px-6 py-2 text-white font-bold rounded-xl text-sm transition-colors ${
                  reviewAction === 'Approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {reviewAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;

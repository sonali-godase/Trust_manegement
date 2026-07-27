import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiPlus, FiFileText, FiEye, FiEdit2, FiTrash2, FiDownload, FiX, FiUploadCloud, FiClock, FiActivity, FiShield } from "react-icons/fi";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import AnimatedCounter from '../../components/dashboard/AnimatedCounter';

const ASSETS_URL = import.meta.env.VITE_ASSETS_URL || "http://localhost:5000";

const getDocUrl = (url) => {
  if (!url) return "#";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${ASSETS_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const DocumentAdminDashboard = () => {
  const [allDocuments, setAllDocuments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activities, setActivities] = useState([]);
  const { user } = useAuth();

  const [preferences, setPreferences] = useState({
    showActivities: true, showBranches: true, showDonations: true, showEvents: true
  });

  const loadPreferences = () => {
    const saved = localStorage.getItem('adminPreferences');
    if (saved) {
      try {
        setPreferences(prev => ({...prev, ...JSON.parse(saved)}));
      } catch (e) {}
    }
  };

  useEffect(() => {
    loadPreferences();
    window.addEventListener('preferencesUpdated', loadPreferences);
    return () => window.removeEventListener('preferencesUpdated', loadPreferences);
  }, []);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("All");
  
  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  // Selected document state
  const [currentDocument, setCurrentDocument] = useState(null);
  const [deletionReason, setDeletionReason] = useState("");
  
  // Form states
  const [formData, setFormData] = useState({ title: "", description: "", category: "Reports", branchId: "" });
  const [file, setFile] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [viewTab, setViewTab] = useState("library"); // "library" or "requests"
  const [myRequests, setMyRequests] = useState([]);

  const location = useLocation();
  const isDashboard = location.pathname.includes('/dashboard');

  const categories = ["All", "Reports", "Policies", "Financial", "Meeting Minutes", "Other"];

  useEffect(() => {
    fetchBranches();
    fetchAllDocuments();
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      const res = await api.get('/documents/requests');
      if (res.data.success) {
        setMyRequests(res.data.requests || []);
      }
    } catch (err) {
      console.error("Error fetching my requests:", err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [searchTerm, selectedCategory, selectedBranch]);

  useEffect(() => {
    const fetchActivities = async () => {
      if (user && user._id) {
        try {
          const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
          const logsRes = await api.get(`/audit-logs?userId=${user._id}&startDate=${threeHoursAgo}`);
          if (logsRes.data && logsRes.data.logs) {
            setActivities(logsRes.data.logs);
          }
        } catch (err) {
          console.error("Error fetching activities", err);
        }
      }
    };
    fetchActivities();
  }, [user]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data.success) setBranches(res.data.branches);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllDocuments = async () => {
    try {
      const res = await api.get('/documents');
      if (res.data.success) setAllDocuments(res.data.documents);
    } catch (err) {
      console.error("Error fetching all documents:", err);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/documents', {
        params: { search: searchTerm, category: selectedCategory, branchId: selectedBranch }
      });
      setDocuments(res.data.documents);
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        alert("Please upload a PDF or an Image file only.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB.");
        return;
      }
      setFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentDocument && !file) {
      alert("Please select a document file to upload");
      return;
    }

    const data = new FormData();
    data.append("requestType", currentDocument ? "Update" : "Create");
    if (currentDocument) {
      data.append("targetDocumentId", currentDocument._id);
    }
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("category", formData.category);
    if (formData.branchId) {
      data.append("branchId", formData.branchId);
    }
    if (file) {
      data.append("pdf", file);
    }

    try {
      setFormLoading(true);
      const res = await api.post(`/documents/requests`, data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      alert(res.data.message || "Document request submitted to Trustee for approval.");
      setIsUploadModalOpen(false);
      resetForm();
      fetchMyRequests();
      fetchDocuments();
      fetchAllDocuments();
    } catch (err) {
      alert(err.response?.data?.message || "An error occurred");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentDocument) return;
    try {
      const data = {
        requestType: "Delete",
        targetDocumentId: currentDocument._id,
        deletionReason: deletionReason
      };
      const res = await api.post('/documents/requests', data);
      alert(res.data.message || "Deletion request submitted to Trustee for approval.");
      setIsDeleteModalOpen(false);
      fetchMyRequests();
      fetchDocuments();
      fetchAllDocuments();
    } catch (err) {
      alert(err.response?.data?.message || "Error requesting deletion");
    }
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", category: "Reports" });
    setFile(null);
    setCurrentDocument(null);
  };

  const openEditModal = (doc) => {
    setCurrentDocument(doc);
    setFormData({ 
      title: doc.title, 
      description: doc.description, 
      category: doc.category,
      branchId: doc.branch?._id || ""
    });
    setFile(null);
    setIsUploadModalOpen(true);
  };

  const openDeleteModal = (doc) => {
    setCurrentDocument(doc);
    setDeletionReason("");
    setIsDeleteModalOpen(true);
  };

  const openViewModal = (doc) => {
    setCurrentDocument(doc);
    setIsViewModalOpen(true);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-hidden">
      <div className="mb-6 md:mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Document Hub</h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Manage all institutional documents</p>
        </div>
      </div>

      <main className="w-full">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
            <div>
              <p className="text-sm text-slate-500 mb-1">Total Documents</p>
              <h3 className="text-3xl font-bold text-slate-800"><AnimatedCounter value={allDocuments.length} /></h3>
            </div>
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
              <FiFileText className="text-xl" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
            <div>
              <p className="text-sm text-slate-500 mb-1">Approval Requests</p>
              <h3 className="text-3xl font-bold text-amber-600">
                <AnimatedCounter value={myRequests.filter(r => r.status === 'Pending').length} />
              </h3>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
              <FiClock className="text-xl" />
            </div>
          </div>
        </div>

        {isDashboard ? (
          <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 gap-2">
              <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                <FiClock className="text-indigo-500" /> Recent Document Activity
              </h3>
              <Link to="/document-handler/documents" className="text-xs md:text-sm font-semibold text-indigo-600 hover:text-indigo-700">View All Documents &rarr;</Link>
            </div>
            
            <div className="space-y-4">
              {allDocuments
                .filter(doc => new Date(doc.createdAt) >= new Date(Date.now() - 36 * 60 * 60 * 1000))
                .slice(0, 10)
                .map(doc => (
                <div key={doc._id} className="flex items-start gap-4 p-4 rounded-xl border border-slate-50 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-white border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                    <FiFileText />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">
                      New document <span className="text-indigo-600">"{doc.title}"</span> was uploaded.
                    </p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Category: {doc.category} • {new Date(doc.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  {doc.deleteStatus === 'Pending' && (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md uppercase shrink-0">Deletion Pending</span>
                  )}
                </div>
              ))}
              {allDocuments.filter(doc => new Date(doc.createdAt) >= new Date(Date.now() - 36 * 60 * 60 * 1000)).length === 0 && (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 text-2xl">
                    <FiClock />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">No recent activity found.</p>
                </div>
              )}
            </div>
          </div>

          {/* New System Activity Section */}
          {preferences.showActivities && activities.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 mt-6">
              <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 md:mb-6">
                <FiActivity className="text-emerald-500" /> My System Activity (Last 3 Hours)
              </h3>
              <div className="space-y-4 max-h-64 md:max-h-96 overflow-y-auto pr-2">
                {activities.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 rounded-xl border border-slate-50 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-100 text-slate-500 flex items-center justify-center shrink-0 shadow-sm">
                      <FiShield />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-800 font-medium">
                        <span className="font-bold">{log.role}</span> performed action: <span className="font-bold text-sky-600">{log.action}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">IP: {log.ipAddress} {log.details && log.details.method ? `| Method: ${log.details.method}` : ''}</p>
                    </div>
                    <div className="text-xs text-slate-400 font-medium shrink-0 flex items-center gap-1.5">
                      <FiClock /> {new Date(log.timestamp || log.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {preferences.showActivities && activities.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-6 text-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2 mb-2">
                <FiActivity className="text-emerald-500" /> My System Activity (Last 3 Hours)
              </h3>
              <p className="text-slate-500 text-sm font-medium">You have no system activity in the last 3 hours.</p>
            </div>
          )}
          </>
        ) : (
          <>
            {/* View Tabs */}
            <div className="flex bg-slate-200/60 p-1.5 rounded-2xl mb-6 w-full md:w-fit gap-1">
              <button 
                onClick={() => setViewTab('library')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${viewTab === 'library' ? 'bg-white shadow-md text-indigo-900' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <FiFileText /> Document Library
              </button>
              <button 
                onClick={() => setViewTab('requests')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 relative ${viewTab === 'requests' ? 'bg-white shadow-md text-indigo-900' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <FiClock /> My Approval Requests
                {myRequests.filter(r => r.status === 'Pending').length > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                    {myRequests.filter(r => r.status === 'Pending').length}
                  </span>
                )}
              </button>
            </div>

            {viewTab === 'requests' ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Submitted Approval Requests</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Track real-time status of document CRUD requests submitted for Trustee approval.</p>
                  </div>
                  <button 
                    onClick={fetchMyRequests} 
                    className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50"
                  >
                    Refresh
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider border-b border-slate-100">
                        <th className="px-6 py-4">Request Type</th>
                        <th className="px-6 py-4">Document Info</th>
                        <th className="px-6 py-4">Submitted On</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Trustee Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {myRequests.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                            No approval requests submitted yet.
                          </td>
                        </tr>
                      ) : (
                        myRequests.map((req) => (
                          <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider ${
                                req.requestType === 'Create' ? 'bg-blue-100 text-blue-800' :
                                req.requestType === 'Update' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {req.requestType}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-800">{req.documentData?.title || 'N/A'}</p>
                              <p className="text-xs text-slate-500">{req.documentData?.category} • {req.documentData?.pdfName || ''}</p>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                              {new Date(req.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 ${
                                req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                req.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                              }`}>
                                <span className={`w-2 h-2 rounded-full ${
                                  req.status === 'Approved' ? 'bg-emerald-500' :
                                  req.status === 'Rejected' ? 'bg-rose-500' :
                                  'bg-amber-500'
                                }`} />
                                {req.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-600 max-w-xs">
                              {req.trusteeRemarks ? (
                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  <p className="font-medium text-slate-800">{req.trusteeRemarks}</p>
                                  {req.reviewedBy && (
                                    <p className="text-[10px] text-slate-400 mt-1">Reviewed by: {req.reviewedBy.name || req.reviewedBy.fullName || 'Trustee'}</p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">No remarks yet</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
            {/* Action Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search documents..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white w-full md:w-64 transition-all"
              />
            </div>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all text-slate-700"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select 
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all text-slate-700"
            >
              <option value="All">All Branches</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => { resetForm(); setIsUploadModalOpen(true); }}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            <FiPlus /> Submit Document Request
          </button>
        </div>

        {/* Documents Table */}
        <div className="bg-transparent md:bg-white rounded-2xl md:shadow-sm border-0 md:border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                  <th className="px-6 py-4 font-medium">Document Info</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Branch</th>
                  <th className="px-6 py-4 font-medium">Size</th>
                  <th className="px-6 py-4 font-medium">Uploaded</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500 block md:table-cell">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                        Loading documents...
                      </div>
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500 block md:table-cell">
                      <div className="flex flex-col items-center justify-center">
                        <FiFileText className="text-4xl text-slate-300 mb-3" />
                        <p>No documents found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  documents.map((doc, idx) => (
                    <tr 
                      key={doc._id} 
                      className="flex flex-col md:table-row w-full bg-white md:bg-transparent border border-slate-100 md:border-b md:border-x-0 md:border-t-0 md:border-slate-50 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="p-4 md:px-6 md:py-4 block md:table-cell border-b border-slate-50 md:border-none">
                        <div className="flex justify-between items-start md:hidden mb-2">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                            {doc.category}
                          </span>
                          <div className="flex gap-1">
                            {doc.deleteStatus === "Pending" && (
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md uppercase border border-amber-200">Pending</span>
                            )}
                            {doc.deleteStatus === "Rejected" && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-md uppercase border border-red-200" title="Deletion Rejected">Rejected</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold">PDF</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-800 line-clamp-1 text-lg md:text-base">{doc.title}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-slate-500 line-clamp-1">{doc.pdfName}</p>
                              <div className="hidden md:flex gap-1">
                                {doc.deleteStatus === "Pending" && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md uppercase">Deletion Pending</span>
                                )}
                                {doc.deleteStatus === "Rejected" && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-md uppercase" title="Deletion Rejected">Rejected</span>
                                )}
                              </div>
                            </div>
                            <div className="md:hidden mt-2 text-xs text-slate-600 flex flex-wrap gap-2 items-center">
                                {doc.branch ? (
                                   <span className="font-semibold">Branch: <span className="text-indigo-600">{doc.branch.name}</span></span>
                                ) : (
                                   <span className="font-semibold">Branch: <span className="text-slate-500">Global</span></span>
                                )}
                                <span className="text-slate-300">•</span>
                                <span>{formatFileSize(doc.fileSize)}</span>
                                <span className="text-slate-300">•</span>
                                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                          {doc.category}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 text-sm text-slate-600">
                        {doc.branch ? (
                           <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-xs font-semibold flex items-center w-max gap-1">
                             {doc.branch.name}
                           </span>
                        ) : (
                           <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs font-semibold w-max">
                             Global
                           </span>
                        )}
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 text-sm text-slate-600">
                        {formatFileSize(doc.fileSize)}
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 text-sm text-slate-600">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 md:px-6 md:py-4 md:text-right block md:table-cell bg-slate-50 md:bg-transparent rounded-b-xl md:rounded-none">
                        <div className="flex justify-between items-center w-full">
                          <span className="md:hidden text-xs text-slate-500 uppercase font-semibold px-1">Actions</span>
                          <div className="flex items-center justify-end w-full md:w-auto gap-2 opacity-100">
                            <button onClick={() => openViewModal(doc)} className="p-2 w-10 h-10 md:w-auto md:h-auto flex items-center justify-center bg-white md:bg-transparent border border-slate-200 md:border-none text-indigo-600 hover:bg-indigo-50 rounded-lg tooltip transition-colors shadow-sm md:shadow-none" title="View">
                              <FiEye />
                            </button>
                            <a href={getDocUrl(doc.pdfUrl)} target="_blank" rel="noopener noreferrer" className="p-2 w-10 h-10 md:w-auto md:h-auto flex items-center justify-center bg-white md:bg-transparent border border-slate-200 md:border-none text-emerald-600 hover:bg-emerald-50 rounded-lg tooltip transition-colors shadow-sm md:shadow-none" title="Download">
                              <FiDownload />
                            </a>
                            <button onClick={() => openEditModal(doc)} className="p-2 w-10 h-10 md:w-auto md:h-auto flex items-center justify-center bg-white md:bg-transparent border border-slate-200 md:border-none text-amber-600 hover:bg-amber-50 rounded-lg tooltip transition-colors shadow-sm md:shadow-none" title="Edit">
                              <FiEdit2 />
                            </button>
                            {doc.deleteStatus !== "Pending" ? (
                              <button onClick={() => openDeleteModal(doc)} className="p-2 w-10 h-10 md:w-auto md:h-auto flex items-center justify-center bg-white md:bg-transparent border border-slate-200 md:border-none text-red-600 hover:bg-red-50 rounded-lg tooltip transition-colors shadow-sm md:shadow-none" title="Request Deletion">
                                <FiTrash2 />
                              </button>
                            ) : (
                              <span className="p-2 w-10 h-10 md:w-auto md:h-auto flex items-center justify-center bg-white md:bg-transparent border border-slate-200 md:border-none text-slate-400 cursor-not-allowed tooltip shadow-sm md:shadow-none" title="Deletion requested">
                                <FiTrash2 />
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
        </>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-lg text-slate-800">{currentDocument ? "Edit Document" : "Upload Document"}</h3>
                <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <FiX className="text-xl" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:outline-none" placeholder="Enter document title" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:outline-none">
                    {categories.filter(c => c !== "All").map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                  <select value={formData.branchId} onChange={(e) => setFormData({...formData, branchId: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:outline-none">
                    <option value="">Global (All Branches)</option>
                    {branches.map(b => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows="3" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:outline-none resize-none" placeholder="Brief description..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Document File {currentDocument && "(Leave empty to keep existing)"}</label>
                  <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => document.getElementById('file-upload').click()}>
                    <input id="file-upload" type="file" accept=".pdf,image/*" onChange={handleFileChange} className="hidden" />
                    <FiUploadCloud className="mx-auto text-3xl text-indigo-400 mb-2" />
                    <p className="text-sm text-slate-600 font-medium">
                      {file ? file.name : "Click to select or drag and drop PDF/Image"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">PDF or Image up to 10MB</p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setIsUploadModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 order-2 md:order-1">Cancel</button>
                  <button type="submit" disabled={formLoading} className="flex-1 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-medium disabled:opacity-70 flex items-center justify-center gap-2 order-1 md:order-2">
                    {formLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {currentDocument ? "Update Document" : "Upload Document"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiTrash2 className="text-2xl" />
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-2">Request Deletion?</h3>
              <p className="text-slate-500 text-sm mb-4">Are you sure you want to delete "{currentDocument?.title}"? You must provide a reason for the Trustee to review.</p>
              <textarea 
                placeholder="Reason for deletion..." 
                value={deletionReason} 
                onChange={(e) => setDeletionReason(e.target.value)} 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none h-24 mb-6 text-sm"
              />
              <div className="flex flex-col md:flex-row gap-3">
                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 order-2 md:order-1">Cancel</button>
                <button onClick={handleDelete} disabled={!deletionReason.trim()} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 order-1 md:order-2">Submit Request</button>
              </div>
            </motion.div>
          </div>
        )}

        {isViewModalOpen && currentDocument && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col p-4 md:p-10">
            <div className="flex justify-between items-center mb-4 text-white">
              <h3 className="font-bold text-xl">{currentDocument.title}</h3>
              <div className="flex gap-4">
                <a href={getDocUrl(currentDocument.pdfUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors">
                  <FiDownload /> Download
                </a>
                <button onClick={() => setIsViewModalOpen(false)} className="text-white hover:text-slate-300 bg-white/10 p-2 rounded-lg">
                  <FiX className="text-2xl" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white rounded-2xl overflow-hidden">
              {currentDocument.pdfUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                <img src={getDocUrl(currentDocument.pdfUrl)} alt={currentDocument.title} className="w-full h-full object-contain" />
              ) : (
                <iframe 
                  src={getDocUrl(currentDocument.pdfUrl)} 
                  className="w-full h-full border-0"
                  title={currentDocument.title}
                />
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentAdminDashboard;


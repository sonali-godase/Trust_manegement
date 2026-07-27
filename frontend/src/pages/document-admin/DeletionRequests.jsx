import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiEye, FiDownload, FiX, FiTrash2, FiCheckCircle } from "react-icons/fi";
import api from "../../utils/api";

const ASSETS_URL = import.meta.env.VITE_ASSETS_URL || "http://localhost:5000";

const getDocUrl = (url) => {
  if (!url) return "#";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${ASSETS_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const DocumentAdminDeletionRequests = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, [searchTerm]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/documents', {
        params: { search: searchTerm }
      });
      // Filter only pending deletion requests
      const pendingDocs = res.data.documents.filter(doc => doc.deleteStatus === "Pending");
      setDocuments(pendingDocs);
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDeletion = async (doc) => {
    if (!window.confirm(`Are you sure you want to approve deletion for "${doc.title}"?`)) return;
    try {
      const res = await api.put(`/documents/${doc._id}/approve-deletion`);
      alert(res.data.message || "Deletion approved");
      fetchDocuments();
    } catch (err) {
      alert(err.response?.data?.message || "Error approving deletion");
    }
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Deletion Requests</h1>
          <p className="text-slate-500 mt-1">Review and manage pending document deletion requests</p>
        </div>
      </div>

      <main className="w-full">
        {/* Action Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search requests..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white w-full md:w-64 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-transparent md:bg-white rounded-2xl md:shadow-sm border-0 md:border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                  <th className="px-6 py-4 font-medium">Document Info</th>
                  <th className="px-6 py-4 font-medium">Reason for Deletion</th>
                  <th className="px-6 py-4 font-medium">Branch</th>
                  <th className="px-6 py-4 font-medium">Requested On</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500 block md:table-cell">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                        Loading requests...
                      </div>
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500 block md:table-cell">
                      <div className="flex flex-col items-center justify-center">
                        <FiTrash2 className="text-4xl text-slate-300 mb-3" />
                        <p>No pending deletion requests found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr 
                      key={doc._id} 
                      className="flex flex-col md:table-row w-full bg-white md:bg-transparent border border-slate-100 md:border-b md:border-x-0 md:border-t-0 md:border-slate-50 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="p-4 md:px-6 md:py-4 block md:table-cell border-b border-slate-50 md:border-none">
                        <div className="flex justify-between items-start md:hidden mb-2">
                           <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md uppercase border border-amber-200">Pending Deletion</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold">DOC</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-800 line-clamp-1 text-lg md:text-base">{doc.title}</p>
                            <p className="text-xs text-slate-500 line-clamp-1">{doc.pdfName} ({formatFileSize(doc.fileSize)})</p>
                            <div className="md:hidden mt-2 text-xs text-slate-600 flex flex-wrap gap-2 items-center">
                                {doc.branch ? (
                                   <span className="font-semibold">Branch: <span className="text-indigo-600">{doc.branch.name}</span></span>
                                ) : (
                                   <span className="font-semibold">Branch: <span className="text-slate-500">Global</span></span>
                                )}
                                <span className="text-slate-300">•</span>
                                <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="md:hidden mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Reason</span>
                                <p className="text-sm text-slate-700">{doc.deleteReason || "No reason provided"}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4">
                        <p className="text-sm text-slate-600 max-w-xs truncate" title={doc.deleteReason || "No reason provided"}>
                          {doc.deleteReason || "No reason provided"}
                        </p>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 text-sm text-slate-600">
                        {doc.branch ? (
                           <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-xs font-semibold w-max flex items-center gap-1">
                             {doc.branch.name}
                           </span>
                        ) : (
                           <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs font-semibold w-max">
                             Global
                           </span>
                        )}
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 text-sm text-slate-600">
                        {new Date(doc.updatedAt).toLocaleDateString()}
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
                            <button onClick={() => handleApproveDeletion(doc)} className="p-2 flex-1 md:flex-none flex justify-center items-center gap-2 bg-white md:bg-transparent border border-red-200 md:border-none text-red-600 hover:bg-red-50 rounded-lg tooltip transition-colors shadow-sm md:shadow-none" title="Approve Deletion Request">
                              <FiCheckCircle /> <span className="font-bold text-xs uppercase tracking-wider">Approve</span>
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
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
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

export default DocumentAdminDeletionRequests;


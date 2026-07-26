import React, { useState, useEffect } from 'react';
import { FiFileText, FiDownload, FiSearch, FiEye, FiCheckCircle, FiFilter } from 'react-icons/fi';
import api from "../../utils/api";
import { useTableFeatures } from '../../hooks/useTableFeatures';
import TablePagination from '../../components/TablePagination';

const getDocUrl = (url) => {
  if (!url) return "#";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const cleanUrl = url.replace(/\\/g, "/");
  const assetsUrl = import.meta.env.VITE_ASSETS_URL || "http://localhost:5000";
  return `${assetsUrl}${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
};

const AdminDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/admins/documents');
      // Our new backend endpoint returns data inside `res.data.data` or `res.data.documents`
      setDocuments(res.data.data || res.data.documents || []);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);



  if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-4 border-saffron-500 rounded-full border-t-transparent animate-spin"></div></div>;

  return (
    <div className="w-full space-y-6 text-gray-800 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 text-slate-900 tracking-tight"><FiFileText className="text-gray-400" /> Read-Only Documents</h1>
          <p className="text-gray-500 text-sm mt-1">View and download branch documents. Uploading is restricted to Document Admins.</p>
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-5 py-2.5 bg-white border ${showFilters ? 'border-saffron-500 text-saffron-600' : 'border-gray-200 text-gray-700'} hover:bg-gray-50 rounded-xl text-sm font-black shadow-sm transition-colors`}>
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

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <FiSearch className="text-gray-400" />
        </div>
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search documents by title or category..." 
          className="w-full md:max-w-md pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 shadow-sm transition-all"
        />
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedData.map((doc) => (
          <div key={doc._id} className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all rounded-2xl p-6 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-full group-hover:bg-saffron-50 transition-colors"></div>
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-saffron-500 transition-colors">
                <FiFileText size={24} />
              </div>
              <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md ${doc.status === 'Approved' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                {doc.status}
              </span>
            </div>

            <div className="relative z-10 mb-6">
              <h3 className="font-bold text-lg text-slate-900 mb-1 truncate" title={doc.title}>{doc.title}</h3>
              <p className="text-xs text-gray-500 font-medium">Category: <span className="text-slate-600">{doc.category}</span></p>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1"><FiCheckCircle className="text-gray-400" /> Branch: {doc.branch?.name || 'Unknown'}</p>
              <p className="text-xs text-gray-400 mt-1">Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</p>
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
  );
};

export default AdminDocuments;

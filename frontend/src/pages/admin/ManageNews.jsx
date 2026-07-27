import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPlus, FaTrash, FaSpinner, FaImage, FaEdit, FaSearch, FaFilter, 
  FaEye, FaTimes, FaCheck, FaGlobe, FaBuilding, FaChevronLeft, FaChevronRight 
} from 'react-icons/fa';
import api from "../../utils/api";
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useTableFeatures } from '../../hooks/useTableFeatures';
import TablePagination from '../../components/TablePagination';

const ASSETS_URL = import.meta.env.VITE_ASSETS_URL || "http://localhost:5000";

const getImageUrl = (url) => {
  if (!url) return "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000";
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${ASSETS_URL}${url}`;
  return `${ASSETS_URL}/${url}`;
};

const ManageNews = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  
  // Filters
  const [filterBranch, setFilterBranch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Reusable Role Auth Checks
  const { hasManage: newsManage } = usePermissions('News');
  const { hasManage: galleryManage } = usePermissions('Gallery');
  const hasManage = (user?.role !== 'Admin') && (user?.role === 'BranchManager' || newsManage || galleryManage);

  const canEditItem = (item) => {
    if (user?.role === 'Admin') return false;
    if (user?.role === 'BranchManager') {
      const itemBranchId = item.branch?._id || item.branch;
      const userBranchId = user.branch?._id || user.branch;
      return item.branchSelection === 'Specific Branch' && String(itemBranchId) === String(userBranchId);
    }
    if (newsManage || galleryManage) return true;
    return false;
  };

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    fullDescription: '',
    category: 'News',
    priority: 'Medium',
    branchSelection: 'All Branches',
    branch: '',
    showOnSlider: false,
    status: 'Active',
    displayOrder: 0,
    publishDate: new Date().toISOString().substring(0, 16),
    expiryDate: ''
  });

  const [coverImageFile, setCoverImageFile] = useState(null);
  const [galleryImageFiles, setGalleryImageFiles] = useState([]);
  const [existingCoverUrl, setExistingCoverUrl] = useState('');
  const [retainedGalleryUrls, setRetainedGalleryUrls] = useState([]);

  // Live Preview Settings
  const [previewMode, setPreviewMode] = useState(false);
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);

  // Detailed Modal Settings
  const [selectedNews, setSelectedNews] = useState(null);
  const [selectedNewsSlideIdx, setSelectedNewsSlideIdx] = useState(0);

  const categories = ["News", "Announcement", "Event", "Featured"];
  const priorities = ["High", "Medium", "Low"];

  // Custom filter logic
  const filteredByCustom = items.filter(i => {
    let match = true;
    if (user?.role !== 'BranchManager') {
      if (filterBranch) {
        if (filterBranch === 'Global' || filterBranch === 'All') {
          if (i.branchSelection !== 'All Branches') match = false;
        } else {
          if (i.branch?._id !== filterBranch && i.branch !== filterBranch) match = false;
        }
      }
    }
    return match;
  });

  const {
    searchTerm, setSearchTerm, sortConfig, handleSort,
    currentPage, setCurrentPage, itemsPerPage, setItemsPerPage,
    totalPages, paginatedData, totalItems
  } = useTableFeatures(filteredByCustom, ['title', 'shortDescription', 'category']);

  useEffect(() => {
    fetchNews();
    fetchBranches();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const res = await api.get('/news/admin/list');
      setItems(res.data.data || []);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to fetch news items.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data.branches || []);
    } catch (err) {
      console.error("Failed to load branches", err);
    }
  };

  const handleOpenModal = (item = null) => {
    setError("");
    setPreviewMode(false);
    setCoverImageFile(null);
    setGalleryImageFiles([]);

    if (item) {
      setEditId(item._id);
      setFormData({
        title: item.title,
        shortDescription: item.shortDescription,
        fullDescription: item.fullDescription,
        category: item.category,
        priority: item.priority || 'Medium',
        branchSelection: item.branchSelection || 'All Branches',
        branch: item.branch?._id || item.branch || '',
        showOnSlider: item.showOnSlider || false,
        status: item.status || 'Active',
        displayOrder: item.displayOrder || 0,
        publishDate: new Date(item.publishDate).toISOString().substring(0, 16),
        expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().substring(0, 16) : ''
      });
      setExistingCoverUrl(item.coverImage || '');
      setRetainedGalleryUrls(item.galleryImages || []);
    } else {
      setEditId(null);
      setFormData({
        title: '',
        shortDescription: '',
        fullDescription: '',
        category: 'News',
        priority: 'Medium',
        branchSelection: user?.role === 'BranchManager' ? 'Specific Branch' : 'All Branches',
        branch: user?.role === 'BranchManager' ? (user.branch?._id || user.branch || '') : '',
        showOnSlider: false,
        status: 'Active',
        displayOrder: 0,
        publishDate: new Date().toISOString().substring(0, 16),
        expiryDate: ''
      });
      setExistingCoverUrl('');
      setRetainedGalleryUrls([]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setCoverImageFile(null);
    setGalleryImageFiles([]);
  };

  const handleCoverChange = (e) => {
    setCoverImageFile(e.target.files[0]);
  };

  const handleGalleryFilesChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setGalleryImageFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeNewGalleryFile = (indexToRemove) => {
    setGalleryImageFiles(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const removeRetainedImage = (url) => {
    setRetainedGalleryUrls(prev => prev.filter(u => u !== url));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");

      if (!editId && !coverImageFile) {
        setError("Cover image is required.");
        setSubmitting(false);
        return;
      }

      const data = new FormData();
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
      });

      if (coverImageFile) {
        data.append('coverImage', coverImageFile);
      } else if (existingCoverUrl) {
        data.append('coverImage', existingCoverUrl);
      }

      // Send retained gallery images as JSON
      data.append('retainedGalleryImages', JSON.stringify(retainedGalleryUrls));

      if (galleryImageFiles.length > 0) {
        galleryImageFiles.forEach(file => {
          data.append('galleryImages', file);
        });
      }

      if (editId) {
        await api.put(`/news/${editId}`, data);
      } else {
        await api.post('/news', data);
      }

      handleCloseModal();
      fetchNews();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to save news item.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this news item?")) {
      try {
        await api.delete(`/news/${id}`);
        fetchNews();
      } catch (err) {
        console.error(err);
        setError("Failed to delete news item.");
      }
    }
  };

  // Helper to format date
  const formatDateString = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Form Preview computations
  const getPreviewImages = () => {
    const images = [];
    if (coverImageFile) {
      images.push(URL.createObjectURL(coverImageFile));
    } else if (existingCoverUrl) {
      images.push(getImageUrl(existingCoverUrl));
    }

    retainedGalleryUrls.forEach(url => {
      images.push(getImageUrl(url));
    });

    galleryImageFiles.forEach(file => {
      images.push(URL.createObjectURL(file));
    });

    return images.length > 0 ? images : ["https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000"];
  };

  return (
    <div className="min-h-screen bg-transparent text-gray-900 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black mb-2 text-slate-900 flex items-center gap-2 tracking-tight">
            News & Announcements Management
            {!hasManage && <span className="bg-yellow-100 text-yellow-800 text-xs md:text-sm font-bold px-3 py-1 rounded-full shadow-sm font-sans inline-block align-middle">View Only Access</span>}
          </h1>
          <p className="text-gray-500">Add, edit and manage articles for the public Gallery News tab and Homepage Slider.</p>
        </div>
        {hasManage && (
          <button onClick={() => handleOpenModal()} className="bg-slate-900 hover:bg-black transition-colors px-6 py-3 rounded-xl text-white font-black flex items-center gap-2 shadow-lg">
            <FaPlus /> Add News
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold mb-6">{error}</div>}

      {/* FILTERS */}
      <div className="flex flex-wrap items-center gap-4 mb-10">
        <div className="relative flex-1 min-w-[250px]">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search news..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-saffron-500 shadow-sm" 
          />
        </div>
        
        <select 
          onChange={(e) => {
            if(e.target.value) handleSort(e.target.value);
          }} 
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-saffron-500 shadow-sm cursor-pointer text-sm"
        >
          <option value="">Sort By...</option>
          <option value="title">Title</option>
          <option value="publishDate">Publish Date</option>
          <option value="category">Category</option>
        </select>

        <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-6 py-3 bg-white border ${showFilters ? 'border-saffron-500 text-saffron-600' : 'border-gray-200 text-gray-700'} hover:bg-gray-50 rounded-xl text-sm font-bold shadow-sm transition-colors`}>
          <FaFilter /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user?.role !== 'BranchManager' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Filter by Branch</label>
                <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-saffron-500 font-medium">
                  <option value="">All News (Global & All Branches)</option>
                  <option value="Global">Global News Only</option>
                  {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={() => setFilterBranch('')} className="text-sm font-bold text-gray-500 hover:text-gray-700">Clear Filter</button>
          </div>
        </div>
      )}

      {/* GRID */}
      {loading ? (
        <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-5xl text-saffron-500" /></div>
      ) : paginatedData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {paginatedData.map((item, index) => (
            <motion.div 
              key={item._id} 
              initial={{ opacity: 0, y: 40 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.4, delay: index * 0.05 }} 
              className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl transition-all group flex flex-col"
            >
              <div 
                onClick={() => {
                  setSelectedNews(item);
                  setSelectedNewsSlideIdx(0);
                }}
                className="relative h-52 overflow-hidden shrink-0 bg-gray-100 cursor-pointer"
              >
                <img src={getImageUrl(item.coverImage)} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>
                
                {/* Category & Status badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <span className="px-2.5 py-1 bg-saffron-500 text-white rounded-md text-[10px] font-bold uppercase tracking-wider shadow">
                    {item.category}
                  </span>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow ${item.status === 'Active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                    {item.status}
                  </span>
                </div>

                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  {item.showOnSlider && (
                    <span className="px-2 py-1 bg-blue-500 text-white rounded-md text-[8px] font-bold uppercase tracking-widest shadow">
                      Slider ON
                    </span>
                  )}
                  {item.priority === 'High' && (
                    <span className="px-2 py-1 bg-red-500 text-white rounded-md text-[8px] font-bold uppercase tracking-widest shadow">
                      High Priority
                    </span>
                  )}
                </div>

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF8C00] mb-0.5">
                    {item.branchSelection === 'All Branches' ? <><FaGlobe className="inline mr-1" /> All Branches</> : <><FaBuilding className="inline mr-1" /> {item.branch?.name || "Specific Branch"}</>}
                  </p>
                  <h2 className="text-xl font-bold line-clamp-1">{item.title}</h2>
                </div>
              </div>

              <div className="p-6 flex flex-col flex-1">
                <p className="text-gray-500 text-xs font-semibold mb-2">Publish Date: {formatDateString(item.publishDate)}</p>
                <p className="text-gray-600 text-sm line-clamp-3 mb-6 flex-1 font-light leading-relaxed">{item.shortDescription}</p>
                
                {canEditItem(item) && (
                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button onClick={() => handleOpenModal(item)} className="flex-1 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-sm"><FaEdit /> Edit</button>
                    <button onClick={() => handleDelete(item._id)} className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-sm"><FaTrash /> Delete</button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-3xl">
          <FaImage className="mx-auto text-4xl text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-400 mb-2">No News Found</h2>
          <p className="text-gray-500">Create articles to display them in the slider and gallery.</p>
        </div>
      )}

      {!loading && paginatedData.length > 0 && (
        <div className="mt-10 rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white">
          <TablePagination 
            currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage}
            totalItems={totalItems} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage}
          />
        </div>
      )}

      {/* FORM MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-10 custom-scrollbar border border-gray-100"
            >
              {/* MODAL HEADER */}
              <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex justify-between items-center z-20">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{editId ? "Update News Item" : "Create News Item"}</h2>
                  <p className="text-sm text-gray-500 hidden sm:block mt-1">Fill in the fields below to publish a news update.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setPreviewMode(!previewMode)} 
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shadow-sm ${previewMode ? 'bg-saffron-600 text-white border border-saffron-600' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                  >
                    <FaEye /> {previewMode ? "Edit Form" : "Live Preview"}
                  </button>
                  <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors">
                    <FaTimes size={20} />
                  </button>
                </div>
              </div>

              {/* MODAL CONTENT */}
              <div className="p-6">
                {previewMode ? (
                  /* LIVE PREVIEW SYSTEM */
                  <div className="space-y-10 py-4 max-w-3xl mx-auto">
                    {/* slider card preview */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">1. Homepage Slider Card Preview</h4>
                      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-lg flex flex-col md:flex-row h-auto md:h-72">
                        <div className="md:w-2/5 relative h-48 md:h-full bg-stone-900">
                          <img src={getPreviewImages()[0]} alt="Preview" className="w-full h-full object-contain" />
                        </div>
                        <div className="md:w-3/5 p-6 flex flex-col justify-center bg-[#FAF9F5] border-l border-stone-200">
                          <div className="text-[#FF8C00] font-bold text-[10px] tracking-widest uppercase mb-2 flex items-center gap-1">
                            <span>{formData.category}</span>
                            <span>•</span>
                            <span>{formatDateString(formData.publishDate)}</span>
                          </div>
                          <h3 className="text-2xl font-serif font-bold text-[#4A0E0E] line-clamp-1 mb-2">{formData.title || "Untiled News Post"}</h3>
                          <p className="text-stone-600 text-sm font-light leading-relaxed line-clamp-3 mb-4">{formData.shortDescription || "No short description provided yet. Enter one in the form to see it here."}</p>
                          <button type="button" className="self-start px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-xs font-bold shadow hover:shadow-lg transition-all uppercase tracking-widest">
                            Read More
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* gallery card preview */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">2. Gallery tab News Card Preview</h4>
                      <div className="max-w-sm bg-white rounded-2xl overflow-hidden shadow-md border border-stone-200">
                        <div className="relative h-48 overflow-hidden bg-stone-100">
                          <img src={getPreviewImages()[0]} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute top-3 left-3 bg-orange-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">{formData.category}</div>
                        </div>
                        <div className="p-5">
                          <span className="text-[10px] text-stone-500 font-bold block mb-1">{formatDateString(formData.publishDate)}</span>
                          <h4 className="text-lg font-serif font-bold text-[#4A0E0E] mb-2 line-clamp-1">{formData.title || "Untitled News Post"}</h4>
                          <p className="text-stone-600 text-xs font-light line-clamp-2 leading-relaxed mb-4">{formData.shortDescription || "Write a brief description to summarize this article."}</p>
                          <button type="button" className="text-orange-600 font-bold text-xs uppercase tracking-wider flex items-center gap-1 hover:text-[#4A0E0E]">
                            Read More →
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* details modal preview */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">3. Detailed News Modal Preview</h4>
                      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-w-xl mx-auto">
                        <div className="relative h-64 bg-stone-900 flex items-center justify-center overflow-hidden">
                          <img src={getPreviewImages()[previewSlideIdx % getPreviewImages().length]} alt="Preview Slider" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/40"></div>
                          {getPreviewImages().length > 1 && (
                            <>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setPreviewSlideIdx(prev => (prev - 1 + getPreviewImages().length) % getPreviewImages().length); }} 
                                className="absolute left-2 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center text-xs"
                              >
                                <FaChevronLeft />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setPreviewSlideIdx(prev => (prev + 1) % getPreviewImages().length); }} 
                                className="absolute right-2 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center text-xs"
                              >
                                <FaChevronRight />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{formData.category}</span>
                            <span className="text-[10px] text-stone-400">{formatDateString(formData.publishDate)}</span>
                          </div>
                          <h3 className="text-2xl font-serif font-bold text-[#4A0E0E] mb-4">{formData.title || "Untitled News Post"}</h3>
                          <div className="border-t border-stone-100 pt-4 text-stone-700 text-sm font-light leading-relaxed space-y-3 whitespace-pre-line">
                            {formData.fullDescription || "Write a detailed description. This field supports multiline paragraphs."}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* FORM FIELDS */
                  <form id="news-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                      <input 
                        type="text" 
                        required 
                        maxLength={150}
                        value={formData.title} 
                        onChange={(e) => setFormData({...formData, title: e.target.value})} 
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500" 
                        placeholder="Enter catchy headline"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Short Description</label>
                      <textarea 
                        required 
                        maxLength={300}
                        rows={2}
                        value={formData.shortDescription} 
                        onChange={(e) => setFormData({...formData, shortDescription: e.target.value})} 
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 text-sm" 
                        placeholder="Brief summary shown on cards (max 300 chars)"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Full Description</label>
                      <textarea 
                        required 
                        rows={6}
                        value={formData.fullDescription} 
                        onChange={(e) => setFormData({...formData, fullDescription: e.target.value})} 
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 text-sm leading-relaxed" 
                        placeholder="Complete article contents. You can paste paragraphs here."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                      <select 
                        required 
                        value={formData.category} 
                        onChange={(e) => setFormData({...formData, category: e.target.value})} 
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 text-sm cursor-pointer"
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Priority</label>
                      <select 
                        required 
                        value={formData.priority} 
                        onChange={(e) => setFormData({...formData, priority: e.target.value})} 
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 text-sm cursor-pointer"
                      >
                        {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Branch Selection</label>
                      <select 
                        required 
                        disabled={user?.role === 'BranchManager'}
                        value={formData.branchSelection} 
                        onChange={(e) => setFormData({...formData, branchSelection: e.target.value, branch: e.target.value === 'All Branches' ? '' : formData.branch})} 
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                      >
                        <option value="All Branches">All Branches (Global News)</option>
                        <option value="Specific Branch">Specific Branch</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Specific Branch</label>
                      <select 
                        required={formData.branchSelection === 'Specific Branch'}
                        disabled={formData.branchSelection === 'All Branches' || user?.role === 'BranchManager'}
                        value={formData.branch} 
                        onChange={(e) => setFormData({...formData, branch: e.target.value})} 
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 text-sm disabled:bg-gray-100 disabled:text-gray-500 cursor-pointer"
                      >
                        <option value="">Select Branch...</option>
                        {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Publish Date</label>
                      <input 
                        type="datetime-local" 
                        required 
                        value={formData.publishDate} 
                        onChange={(e) => setFormData({...formData, publishDate: e.target.value})} 
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 text-sm" 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Expiry Date (Optional)</label>
                      <input 
                        type="datetime-local" 
                        value={formData.expiryDate} 
                        onChange={(e) => setFormData({...formData, expiryDate: e.target.value})} 
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 text-sm" 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Display Order</label>
                      <input 
                        type="number" 
                        value={formData.displayOrder} 
                        onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})} 
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 text-sm" 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                      <select 
                        required 
                        value={formData.status} 
                        onChange={(e) => setFormData({...formData, status: e.target.value})} 
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 text-sm cursor-pointer"
                      >
                        <option value="Active">Active (Visible)</option>
                        <option value="Inactive">Inactive (Hidden/Draft)</option>
                      </select>
                    </div>

                    {/* toggles */}
                    <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                      <input 
                        type="checkbox" 
                        id="showOnSlider"
                        checked={formData.showOnSlider} 
                        onChange={(e) => setFormData({...formData, showOnSlider: e.target.checked})} 
                        className="w-5 h-5 text-saffron-600 border-gray-300 rounded focus:ring-saffron-500 cursor-pointer" 
                      />
                      <label htmlFor="showOnSlider" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                        Show on Homepage Slider
                      </label>
                    </div>

                    {/* Cover image upload */}
                    <div className="md:col-span-2 border-t border-gray-100 pt-5">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Cover Image</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleCoverChange} 
                        className="w-full border border-gray-300 rounded-xl px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-[#f27415] hover:file:bg-orange-100 outline-none text-sm" 
                      />
                      {existingCoverUrl && !coverImageFile && (
                        <div className="mt-3 flex items-center gap-3 bg-stone-50 border border-stone-100 rounded-lg p-2 max-w-xs">
                          <img src={getImageUrl(existingCoverUrl)} className="w-12 h-12 object-cover rounded" alt="Cover" />
                          <span className="text-xs text-gray-500 truncate">Current cover image</span>
                        </div>
                      )}
                    </div>

                    {/* Multiple images upload */}
                    <div className="md:col-span-2 border-t border-gray-100 pt-5">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Upload Gallery Images (Optional)</label>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={handleGalleryFilesChange} 
                        className="w-full border border-gray-300 rounded-xl px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-[#f27415] hover:file:bg-orange-100 outline-none text-sm" 
                      />
                      <p className="text-xs text-gray-400 mt-1">Upload multiple images to show a slider when devotees read the full post.</p>
                      
                      {retainedGalleryUrls.length > 0 && (
                        <div className="mt-4">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Retained Gallery Images</label>
                          <div className="flex flex-wrap gap-3">
                            {retainedGalleryUrls.map((url, i) => (
                              <div key={i} className="relative group w-16 h-16 border border-stone-200 rounded overflow-hidden">
                                <img src={getImageUrl(url)} className="w-full h-full object-cover" alt="Gallery item" />
                                <button 
                                  type="button" 
                                  onClick={() => removeRetainedImage(url)} 
                                  className="absolute top-0 right-0 w-4 h-4 bg-red-500 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-[8px]"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {galleryImageFiles.length > 0 && (
                        <div className="mt-4">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">New Uploads ({galleryImageFiles.length})</label>
                          <div className="flex flex-wrap gap-3">
                            {galleryImageFiles.map((file, i) => (
                              <div key={i} className="relative group w-16 h-16 border border-stone-200 rounded overflow-hidden bg-stone-50 flex items-center justify-center">
                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="New Gallery item" />
                                <button 
                                  type="button" 
                                  onClick={() => removeNewGalleryFile(i)} 
                                  className="absolute top-0 right-0 w-4 h-4 bg-red-500 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-[8px]"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2 pt-6 flex flex-col md:flex-row justify-end gap-3 border-t border-gray-100 mt-4">
                      <button type="button" onClick={handleCloseModal} className="w-full md:w-auto px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 font-bold transition-colors order-2 md:order-1">Cancel</button>
                      {!previewMode && (
                        <button 
                          type="submit" 
                          disabled={submitting} 
                          className="order-1 md:order-2 bg-blue-900 hover:bg-slate-900 w-full md:w-auto justify-center text-white px-8 py-2.5 rounded-xl font-black transition-colors shadow-lg flex items-center gap-2"
                        >
                          {submitting ? <FaSpinner className="animate-spin" /> : (editId ? "Save Changes" : "Publish Article")}
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detailed News Modal Popup */}
      <AnimatePresence>
        {selectedNews && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            onClick={() => setSelectedNews(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-5xl w-full flex flex-col md:flex-row relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left Side: Image Slider / Carousel */}
              <div className="relative w-full md:w-[50%] h-[300px] md:h-[480px] bg-stone-900 flex items-center justify-center overflow-hidden group/modal shrink-0">
                {(() => {
                  const mediaList = [selectedNews.coverImage, ...(selectedNews.galleryImages || [])];
                  const currentImgUrl = mediaList[selectedNewsSlideIdx % mediaList.length];
                  
                  return (
                    <>
                      <img src={getImageUrl(currentImgUrl)} alt={selectedNews.title} className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
                      
                      {/* Nav Arrows inside modal carousel */}
                      {mediaList.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNewsSlideIdx(prev => (prev - 1 + mediaList.length) % mediaList.length);
                            }}
                            className="absolute left-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all opacity-0 group-hover/modal:opacity-100 shadow cursor-pointer"
                          >
                            <FaChevronLeft className="text-sm" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNewsSlideIdx(prev => (prev + 1) % mediaList.length);
                            }}
                            className="absolute right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all opacity-0 group-hover/modal:opacity-100 shadow cursor-pointer"
                          >
                            <FaChevronRight className="text-sm" />
                          </button>

                          {/* Slide Indicator */}
                          <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 rounded-full text-white text-[10px] font-mono">
                            { (selectedNewsSlideIdx % mediaList.length) + 1 } / { mediaList.length }
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Right Side: News Information */}
              <div className="w-full md:w-[50%] p-6 md:p-10 flex flex-col justify-between max-h-[400px] md:max-h-[480px] overflow-y-auto bg-[#FAF9F5]">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2.5 py-1 bg-saffron-500 text-white rounded-md text-[10px] font-bold uppercase tracking-wider shadow">
                      {selectedNews.category}
                    </span>
                    {selectedNews.priority === 'High' && (
                      <span className="px-2.5 py-1 bg-red-500 text-white rounded-md text-[10px] font-bold uppercase tracking-wider shadow">
                        High Priority
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 leading-tight mb-4">
                    {selectedNews.title}
                  </h3>

                  <div className="text-xs text-stone-400 font-semibold mb-6 flex flex-wrap items-center gap-2 border-b border-stone-200/40 pb-4">
                    <span>{formatDateString(selectedNews.publishDate)}</span>
                    {selectedNews.branch?.name && (
                      <>
                        <span>•</span>
                        <span>Branch: {selectedNews.branch.name}</span>
                      </>
                    )}
                  </div>

                  <div className="text-stone-600 text-sm sm:text-base leading-relaxed font-light whitespace-pre-wrap">
                    {selectedNews.fullDescription || selectedNews.shortDescription}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-stone-200/40 flex justify-end">
                  <button
                    onClick={() => setSelectedNews(null)}
                    className="px-6 py-2.5 bg-stone-900 hover:bg-black text-white font-bold rounded-xl transition-colors text-xs uppercase tracking-wider shadow-md hover:shadow-lg cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Close Button Top-Right */}
              <button
                onClick={() => setSelectedNews(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/95 hover:bg-red-600 hover:text-white text-stone-500 rounded-full flex items-center justify-center transition-all border border-stone-200 shadow z-50 cursor-pointer"
              >
                <FaTimes />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageNews;

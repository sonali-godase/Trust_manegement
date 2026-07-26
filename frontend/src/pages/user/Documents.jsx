import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFilePdf, FaDownload, FaSpinner, FaSearch, FaFilter, FaHeart } from 'react-icons/fa';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../utils/api';

const UserDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [likes, setLikes] = useState({});

  const handleLike = (id, e) => {
    e.preventDefault();
    setLikes(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchDocuments(selectedBranch);
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data.branches || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDocuments = async (branchId) => {
    try {
      setLoading(true);
      let url = '/documents/public';
      if (branchId !== 'All') {
        url += `?branchId=${branchId}`;
      }
      const res = await api.get(url);
      if (res.data && res.data.documents) {
        setDocuments(res.data.documents);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error("Could not fetch documents from API", error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', 'Reports', 'Plans', 'Publications', 'Financials'];

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || doc.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || doc.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-smoke flex flex-col font-sans">
      <Navbar />

      {/* Hero Header */}
      <div className="relative pt-40 pb-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-cream/5 -z-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] -z-10" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto relative z-10"
        >
          <span className="text-primary uppercase tracking-[0.2em] font-bold text-sm mb-4 block">Transparency & Knowledge</span>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-caramel-deep mb-6">Trust Documents</h1>
          <p className="text-xl text-caramel-dark max-w-2xl mx-auto leading-relaxed">
            Access our official reports, publications, and financial summaries. We believe in complete transparency with our devotees.
          </p>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mb-24 flex-1 w-full">
        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-caramel-dark">
              <FaSearch />
            </div>
            <input 
              type="text" 
              placeholder="Search documents..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-full bg-white border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
            />
          </div>

          {/* Filters and Branch Selection */}
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            {/* Branch Filter */}
            <select 
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-4 py-2 rounded-full border border-gray-200 bg-white text-caramel-dark outline-none focus:border-primary shadow-sm"
            >
              <option value="All">All Branches</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              <FaFilter className="text-caramel-dark mr-2 shrink-0 hidden md:block" />
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                    filterCategory === cat 
                      ? 'bg-primary text-white shadow-[0_0_15px_rgba(255,122,0,0.4)]' 
                      : 'bg-white text-caramel-dark border border-gray-200 hover:border-primary/50 hover:text-primary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Document Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <FaSpinner className="animate-spin text-5xl text-primary" />
          </div>
        ) : filteredDocs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
              {filteredDocs.map((doc, idx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  key={doc._id}
                  className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:shadow-primary/10 border border-gray-100 transition-all duration-300 group flex flex-col relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-10 group-hover:scale-150 transition-transform duration-500" />
                  
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-caramel-deep transition-colors duration-300">
                      <FaFilePdf size={24} />
                    </div>
                    {doc.category && (
                      <span className="px-3 py-1 bg-gray-50 text-caramel-dark border border-gray-100 rounded-full text-xs font-bold uppercase tracking-widest">
                        {doc.category}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-caramel-deep mb-3 group-hover:text-primary transition-colors font-serif leading-snug">
                    {doc.title}
                  </h3>
                  <p className="text-caramel-dark text-sm leading-relaxed mb-8 flex-1">
                    {doc.description}
                  </p>
                  
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={(e) => handleLike(doc._id, e)} 
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-smoke border border-gray-200 rounded-xl hover:bg-red-50 hover:border-red-200 transition-all duration-300"
                    >
                      <FaHeart className={likes[doc._id] ? "text-red-500" : "text-caramel-dark"} />
                      {likes[doc._id] > 0 && <span className="text-sm font-bold text-red-500">{likes[doc._id]}</span>}
                    </button>
                    <a 
                      href={doc.fileUrl && doc.fileUrl !== '#' ? (doc.fileUrl.startsWith('http') ? doc.fileUrl : `${import.meta.env.VITE_ASSETS_URL || 'http://localhost:5000'}${doc.fileUrl.startsWith('/') ? '' : '/'}${doc.fileUrl}`) : '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-2 py-3 bg-smoke border border-gray-200 rounded-xl text-caramel-deep font-bold hover:bg-primary hover:text-caramel-deep hover:border-primary transition-all duration-300"
                      onClick={(e) => {
                        if(doc.fileUrl === '#') {
                          e.preventDefault();
                          alert("This is a preview document. Real downloads will be available once the backend API is updated.");
                        }
                      }}
                    >
                      <FaDownload /> Download PDF
                    </a>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <FaFilePdf className="text-6xl text-caramel-dark mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-caramel-dark mb-2 font-serif">No Documents Found</h3>
            <p className="text-caramel-dark">We couldn't find any documents matching your criteria.</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default UserDocuments;

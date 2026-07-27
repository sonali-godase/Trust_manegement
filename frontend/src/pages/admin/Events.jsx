import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiMapPin, FiClock, FiCalendar, FiX, FiFilter } from "react-icons/fi";
import { io } from "socket.io-client";
import api from "../../utils/api";
import { useTableFeatures } from '../../hooks/useTableFeatures';
import TablePagination from '../../components/TablePagination';
import EventMedia from "../../components/EventMedia";

const BACKEND_URL = import.meta.env.VITE_ASSETS_URL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : "http://localhost:5000");
const ASSETS_URL = BACKEND_URL;

const getImageUrl = (url) => {
  if (!url) return "https://images.unsplash.com/photo-1514222709107-a180c68d72b4?q=80&w=2000";
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${ASSETS_URL}${url}`;
  return `${ASSETS_URL}/${url}`;
};

const EventMediaCard = ({ event }) => {
  const allMedia = [];
  if (event.featuredImage) allMedia.push({ type: 'image', url: event.featuredImage, label: 'Featured' });
  if (event.galleryImages && Array.isArray(event.galleryImages)) {
    event.galleryImages.forEach((img, i) => {
      if (img) allMedia.push({ type: 'image', url: img, label: `Gallery ${i+1}` });
    });
  }
  if (event.videoFile) allMedia.push({ type: 'video', url: event.videoFile, label: 'Video' });

  const [activeIdx, setActiveIdx] = useState(0);
  const currentMedia = allMedia[activeIdx] || { type: 'image', url: event.featuredImage || event.videoFile };

  return (
    <div className="flex flex-col w-full">
      <EventMedia 
        src={currentMedia.url} 
        alt={event.title}
        aspectRatio="aspect-video"
        objectFit="cover"
        allowLightbox={true}
      />
      {allMedia.length > 1 && (
        <div className="flex items-center gap-2 p-2 bg-stone-900 overflow-x-auto custom-scrollbar">
          {allMedia.map((m, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setActiveIdx(idx);
              }}
              className={`relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${activeIdx === idx ? 'border-amber-400 scale-105 shadow-md' : 'border-white/20 opacity-60 hover:opacity-100'}`}
              title={m.label}
            >
              {m.type === 'video' ? (
                <div className="w-full h-full bg-slate-900 text-white flex flex-col items-center justify-center text-[8px] font-bold">
                  <span>PLAY</span>
                </div>
              ) : (
                <img src={getImageUrl(m.url)} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
          <span className="text-[10px] text-stone-300 font-bold px-1 shrink-0">
            {activeIdx + 1}/{allMedia.length}
          </span>
        </div>
      )}
    </div>
  );
};

const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branches, setBranches] = useState([]);
  const [filterBranch, setFilterBranch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filteredByCustom = events.filter((e) => {
    let match = true;
    if (filterBranch && (typeof e.branch === 'object' ? e.branch?._id : e.branch) !== filterBranch) match = false;
    if (filterDate && e.eventDate && new Date(e.eventDate).toISOString().split('T')[0] !== filterDate) match = false;
    return match;
  });

  const {
    searchTerm, setSearchTerm, sortConfig, handleSort,
    currentPage, setCurrentPage, itemsPerPage, setItemsPerPage,
    totalPages, paginatedData, totalItems
  } = useTableFeatures(filteredByCustom, ['title', 'shortDescription', 'location']);

  useEffect(() => {
    fetchBranches();
    fetchEvents();

    const socket = io(BACKEND_URL);

    socket.on("event_created", (newEvent) => setEvents((prev) => [newEvent, ...prev]));
    socket.on("event_updated", (updatedEvent) => setEvents((prev) => prev.map((e) => (e._id === updatedEvent._id ? updatedEvent : e))));
    socket.on("event_deleted", (deletedId) => setEvents((prev) => prev.filter((e) => e._id !== deletedId)));

    return () => socket.disconnect();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data.branches || []);
    } catch (err) {
      console.error("Failed to fetch branches", err);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get("/events/admin");
      setEvents(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-4 border-saffron-500 rounded-full border-t-transparent animate-spin"></div></div>;

  return (
    <div className="w-full space-y-6 text-gray-800 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 text-gray-900 tracking-tight"><FiCalendar className="text-saffron-500" /> Event Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage spiritual events, schedules, and publications.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-auto">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search events..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 w-full sm:w-full sm:w-full sm:w-64 shadow-sm transition-all" 
            />
          </div>
          <select 
            onChange={(e) => {
              if(e.target.value) handleSort(e.target.value);
            }} 
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-saffron-500 shadow-sm"
          >
            <option value="">Sort By...</option>
            <option value="title">Title</option>
            <option value="eventDate">Date</option>
          </select>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2 bg-white border ${showFilters ? 'border-saffron-500 text-saffron-600' : 'border-gray-200 text-gray-700'} hover:bg-gray-50 rounded-xl text-sm font-bold shadow-sm transition-colors`}>
            <FiFilter /> Filter
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Branch</label>
              <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-saffron-500">
                <option value="">All Branches</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date</label>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-saffron-500" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={() => { setFilterBranch(''); setFilterDate(''); }} className="text-sm font-bold text-gray-500 hover:text-gray-700">Clear Filters</button>
          </div>
        </div>
      )}

      {/* EVENTS GRID */}
      {paginatedData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedData.map((event, index) => (
            <motion.div key={event._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.05 }} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col relative">
              
              <div className="relative bg-stone-100 overflow-hidden rounded-t-2xl">
                <EventMediaCard event={event} />
                
                {/* Status Badge */}
                <div className="absolute top-3 left-3 z-20 pointer-events-none">
                  <span className={`px-2.5 py-1 backdrop-blur-md rounded-md text-[10px] uppercase font-bold tracking-wider shadow-sm border border-white/20 ${event.status === 'upcoming' ? 'bg-saffron-500/90 text-white' : event.status === 'ongoing' ? 'bg-blue-500/90 text-white' : 'bg-gray-700/90 text-gray-100'}`}>
                    {event.status}
                  </span>
                </div>
                
                {/* Date Badge */}
                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md border border-gray-200 rounded-lg text-center overflow-hidden min-w-[3.5rem] shadow-sm pointer-events-none">
                  <div className="bg-saffron-500 text-white text-[10px] font-bold uppercase tracking-wider py-0.5">{new Date(event.eventDate).toLocaleDateString("en-US", { month: "short" })}</div>
                  <div className="text-lg font-black text-gray-900 py-0.5">{new Date(event.eventDate).getDate()}</div>
                </div>
              </div>

              <div className="p-3 md:p-5 flex flex-col flex-1 z-10 relative">
                <p className="text-saffron-600 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] mb-1">{event.branch?.name || "Global"}</p>
                <h2 className="text-slate-900 text-base md:text-lg font-bold line-clamp-1 mb-1 md:mb-2">{event.title}</h2>
                <p className="text-gray-500 text-xs md:text-sm line-clamp-2 mb-3 md:mb-4 flex-1">{event.shortDescription || event.fullDescription}</p>
                
                <div className="space-y-1 md:space-y-1.5 mb-3 md:mb-5">
                  <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-600 font-medium">
                    <FiMapPin className="text-saffron-500 shrink-0" /> <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-600 font-medium">
                    <FiClock className="text-saffron-500 shrink-0" /> <span>{event.eventTime}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className={`px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-bold ${event.isPublished ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>
                    {event.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <FiCalendar className="mx-auto text-4xl text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No events found matching your criteria.</p>
        </div>
      )}

      {paginatedData.length > 0 && (
        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white">
          <TablePagination 
            currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage}
            totalItems={totalItems} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage}
          />
        </div>
      )}


    </div>
  );
};

export default AdminEvents;

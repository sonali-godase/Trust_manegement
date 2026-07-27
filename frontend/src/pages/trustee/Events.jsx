import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaEdit, FaTrash, FaSpinner, FaCalendarAlt, FaSearch, FaMapMarkerAlt, FaClock, FaBullhorn } from "react-icons/fa";
import { io } from "socket.io-client";
import api from "../../utils/api";
import { usePermissions } from '../../hooks/usePermissions';
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
    <div className="flex flex-col w-full relative">
      <EventMedia 
        src={currentMedia.url} 
        alt={event.title}
        aspectRatio="aspect-video"
        objectFit="cover"
        allowLightbox={true}
      />
      {allMedia.length > 1 && (
        <div className="flex items-center gap-1.5 p-1.5 bg-stone-900 overflow-x-auto custom-scrollbar">
          {allMedia.map((m, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setActiveIdx(idx);
              }}
              className={`relative w-8 h-8 md:w-9 md:h-9 rounded-md overflow-hidden shrink-0 border-2 transition-all ${activeIdx === idx ? 'border-amber-400 scale-105 shadow-md' : 'border-white/20 opacity-60 hover:opacity-100'}`}
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
          <span className="text-[9px] text-stone-300 font-bold px-1 shrink-0">
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
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [branches, setBranches] = useState([]);
  const { hasManage } = usePermissions('Events');

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState('upcoming'); // upcoming, live, past
  const [liveStream, setLiveStream] = useState(null);
  const [pastVideos, setPastVideos] = useState([]);
  
  const [liveFormData, setLiveFormData] = useState({ title: '', description: '', streamUrl: '', scheduledAt: '' });
  const [liveVideoFile, setLiveVideoFile] = useState(null);
  const [liveThumbnailFile, setLiveThumbnailFile] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    eventDate: "",
    eventTime: "12:00 AM",
    status: "upcoming",
    branch: "",
    isPublished: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleFileChange = (e) => setImageFile(e.target.files[0]);
  const handleVideoChange = (e) => setVideoFile(e.target.files[0]);

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
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to fetch events.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveStreams = async () => {
    try {
      const [currentRes, historyRes] = await Promise.all([
        api.get('/live/current'),
        api.get('/live/history')
      ]);
      setLiveStream(currentRes.data.data);
      setPastVideos(historyRes.data.history || []);
    } catch (err) {
      console.error("Failed to fetch live streams", err);
    }
  };

  useEffect(() => {
    fetchLiveStreams();
  }, [activeTab]);

  const handleLiveSubmit = async (e, isLive) => {
    e.preventDefault();
    try {
      if (isLive) {
        if (liveStream) {
          await api.put(`/live/${liveStream._id}`, { ...liveFormData, isLive });
        } else {
          await api.post('/live', { ...liveFormData, isLive });
        }
      } else {
        const formDataPayload = new FormData();
        Object.keys(liveFormData).forEach(key => {
          if (liveFormData[key] !== undefined && liveFormData[key] !== null) {
            formDataPayload.append(key, liveFormData[key]);
          }
        });
        formDataPayload.append('isLive', 'false');
        if (liveVideoFile) formDataPayload.append('videoFile', liveVideoFile);
        if (liveThumbnailFile) formDataPayload.append('thumbnail', liveThumbnailFile);
        
        await api.post('/live', formDataPayload, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      
      fetchLiveStreams();
      if (!isLive) {
        setLiveFormData({ title: '', description: '', streamUrl: '', scheduledAt: '' });
        setLiveVideoFile(null);
        setLiveThumbnailFile(null);
      }
      alert(isLive ? "Live Aarati Started!" : "Past Video Added!");
    } catch (err) {
      console.error(err);
      alert("Error saving live stream.");
    }
  };
  
  const handleStopLive = async () => {
    if (!liveStream) return;
    try {
      await api.put(`/live/${liveStream._id}`, { isLive: false, title: liveStream.title, streamUrl: liveStream.streamUrl });
      fetchLiveStreams();
      alert("Live Aarati Stopped.");
    } catch (err) {
      alert("Error stopping live stream.");
    }
  };
  
  const handleDeleteLive = async (id) => {
    if(!window.confirm("Delete this video?")) return;
    try {
      await api.delete(`/live/${id}`);
      fetchLiveStreams();
    } catch(err) {
      alert("Error deleting");
    }
  };

  const openModal = (event = null) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title || "",
        description: event.fullDescription || event.description || "",
        location: event.location || "",
        eventDate: event.eventDate ? new Date(event.eventDate).toISOString().split('T')[0] : "",
        eventTime: event.eventTime || "12:00 AM",
        status: event.status || "upcoming",
        branch: event.branch ? (event.branch._id || event.branch) : "",
        isPublished: event.isPublished !== undefined ? event.isPublished : true
      });
    } else {
      setEditingEvent(null);
      setFormData({
        title: "", description: "", location: "", eventDate: "", eventTime: "12:00 AM", status: "upcoming", branch: "", isPublished: true
      });
    }
    setImageFile(null);
    setVideoFile(null);
    setGalleryFiles([]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingEvent && !imageFile) {
      alert("Featured Image is required for new events.");
      return;
    }
    setFormLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'description') {
          data.append('shortDescription', formData[key].substring(0, 195));
          data.append('fullDescription', formData[key]);
        } else if (key === 'isPublished') {
          data.append('isPublished', formData.isPublished);
        } else {
          data.append(key, formData[key]);
        }
      });
      if (imageFile) data.append("featuredImage", imageFile);
      if (videoFile) data.append("videoFile", videoFile);
      if (galleryFiles && galleryFiles.length > 0) {
        galleryFiles.forEach(file => {
          data.append("galleryImages", file);
        });
      }

      if (editingEvent) {
        await api.put(`/events/admin/${editingEvent._id}`, data);
      } else {
        await api.post("/events/admin", data);
      }
      
      closeModal();
      fetchEvents();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || "Failed to save event.");
    } finally {
      setFormLoading(false);
    }
  };

  const togglePublish = async (id) => {
    try {
      await api.patch(`/events/admin/${id}/publish`);
      fetchEvents();
    } catch (err) {
      console.error(err);
      alert("Failed to toggle publish status");
    }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await api.delete(`/events/admin/${id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const [branchFilter, setBranchFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const filteredEvents = events.filter((e) => {
    let match = true;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) match = false;
    if (branchFilter && (typeof e.branch === 'object' ? e.branch?._id : e.branch) !== branchFilter) match = false;
    if (dateFilter && e.eventDate && new Date(e.eventDate).toISOString().split('T')[0] !== dateFilter) match = false;
    return match;
  });

  return (
    <div className="min-h-screen bg-transparent text-gray-900 pb-12 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 md:gap-3 tracking-tight">
            <div className="flex items-center gap-2 md:gap-3">
              <FaCalendarAlt className="text-gray-700" /> Event Management
            </div>
            {!hasManage && <span className="w-max bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm mt-1 md:mt-0">View Only Access</span>}
          </h1>
          <p className="text-sm text-gray-500 mt-2">Manage all temple spiritual events, live aarati, and past videos.</p>
        </div>
        {activeTab === 'upcoming' && hasManage && (
        <button onClick={() => openModal()} className="bg-slate-900 hover:bg-black transition-colors px-6 py-3 rounded-xl text-white font-bold flex justify-center items-center gap-2 shadow-lg w-full md:w-auto">
            <FaPlus /> Add Event
          </button>
        )}
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-2 mb-8 bg-white border border-gray-100 p-1.5 rounded-2xl w-full sm:w-fit shadow-sm">
        <button onClick={() => setActiveTab('upcoming')} className={`flex-1 sm:flex-none justify-center px-4 sm:px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'upcoming' ? 'bg-[#05051F] text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>Upcoming Events</button>
        <button onClick={() => setActiveTab('live')} className={`flex-1 sm:flex-none justify-center px-4 sm:px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'live' ? 'bg-[#05051F] text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
          {liveStream?.isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
          Live Aarati
        </button>
        <button onClick={() => setActiveTab('past')} className={`flex-1 sm:flex-none justify-center px-4 sm:px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'past' ? 'bg-[#05051F] text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>Past Videos</button>
      </div>

      {activeTab === 'upcoming' && (
        <>
          <div className="flex flex-col md:flex-row gap-4 mb-10">
            <div className="relative flex-1">
              <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input type="text" placeholder="Search events by title..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white border border-gray-100 rounded-3xl pl-14 pr-6 py-4 outline-none focus:border-gray-300 shadow-sm transition-all text-gray-900 font-medium" />
            </div>
            <div className="w-full md:w-64">
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="w-full bg-white border border-gray-100 rounded-3xl px-6 py-4 outline-none focus:border-gray-300 shadow-sm transition-all text-gray-900 font-medium">
                <option value="">All Branches</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div className="w-full md:w-48">
              <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full bg-white border border-gray-100 rounded-3xl px-6 py-4 outline-none focus:border-gray-300 shadow-sm transition-all text-gray-900 font-medium" />
            </div>
            {(search || branchFilter || dateFilter) && (
              <button onClick={() => { setSearch(""); setBranchFilter(""); setDateFilter(""); }} className="px-6 py-4 rounded-3xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold transition-colors">Clear</button>
            )}
          </div>

          {/* EVENTS GRID */}
          {loading ? (
            <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-5xl text-gray-400" /></div>
          ) : filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {filteredEvents.map((event, index) => (
                <motion.div key={event._id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.04 }} className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-md transition-all group flex flex-col">
                  
                  {/* MEDIA BANNER */}
                  <div className="relative bg-stone-900 overflow-hidden rounded-t-2xl">
                    <EventMediaCard event={event} />
                    
                    {/* Status Badge */}
                    <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
                      <span className="px-2.5 py-0.5 backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-wider text-slate-900 shadow-sm bg-white/90">
                        {event.status}
                      </span>
                    </div>
                    
                    {/* Date Badge */}
                    <div className="absolute top-2.5 right-2.5 z-20 bg-white/95 backdrop-blur-md rounded-lg text-center overflow-hidden shadow border border-white/60 pointer-events-none min-w-[2.75rem]">
                      <div className="bg-stone-100 text-stone-600 text-[8px] font-bold uppercase tracking-wider py-0.5 px-1.5 border-b border-stone-200">{new Date(event.eventDate).toLocaleDateString("en-US", { month: "short" })}</div>
                      <div className="text-xs md:text-sm font-black text-stone-900 py-0.5">{new Date(event.eventDate).getDate()}</div>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold uppercase tracking-wider border border-blue-200/60">
                        {event.branch?.name || "Global"}
                      </span>
                    </div>
                    
                    <h2 className="text-slate-900 text-base md:text-lg font-bold line-clamp-1 mb-1 group-hover:text-blue-600 transition-colors">{event.title}</h2>
                    <p className="text-slate-500 text-xs line-clamp-2 mb-3 flex-1">{event.shortDescription || event.fullDescription}</p>
                    
                    <div className="flex flex-row items-center justify-between gap-2 mb-3 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 text-xs text-slate-700 font-medium overflow-hidden">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <FaMapMarkerAlt className="text-slate-400 shrink-0 text-xs" />
                        <span className="truncate">{event.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <FaClock className="text-slate-400 shrink-0 text-xs" />
                        <span>{event.eventTime}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-auto">
                      {hasManage ? (
                        <>
                          <button onClick={() => togglePublish(event._id)} className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors text-xs ${event.isPublished ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' : 'bg-slate-500 hover:bg-slate-600 text-white shadow-sm'}`}>
                            {event.isPublished ? 'Live' : 'Draft'}
                          </button>
                          <button onClick={() => openModal(event)} className="py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold flex items-center justify-center gap-1 transition-colors text-xs shadow-sm"><FaEdit size={12} /> Edit</button>
                          <button onClick={() => deleteEvent(event._id)} className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center justify-center gap-1 transition-colors text-xs shadow-sm"><FaTrash size={12} /></button>
                        </>
                      ) : (
                        <div className="w-full text-center text-xs text-slate-400 py-1">View Only Access</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-3xl"><h2 className="text-2xl font-bold text-gray-400 mb-2">No Events Found</h2><p className="text-gray-500">Create your first spiritual event.</p></div>
          )}
        </>
      )}

      {activeTab === 'live' && (
        <div className="bg-white rounded-2xl p-8 border border-red-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/2"></div>
          <h2 className="text-2xl font-bold text-deepblue-900 mb-6 flex items-center gap-3">
            <span className="relative flex h-4 w-4">
              {liveStream?.isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-4 w-4 ${liveStream?.isLive ? 'bg-red-500' : 'bg-gray-400'}`}></span>
            </span>
            Live Aarati Control Panel
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <form onSubmit={(e) => handleLiveSubmit(e, true)} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Live Stream Title</label>
                <input type="text" required value={liveFormData.title || liveStream?.title || ''} onChange={(e) => setLiveFormData({...liveFormData, title: e.target.value})} disabled={!hasManage} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500 disabled:bg-gray-50" placeholder="e.g. Evening Kakad Aarati" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">YouTube Live URL / ID</label>
                <input type="text" required value={liveFormData.streamUrl || liveStream?.streamUrl || ''} onChange={(e) => setLiveFormData({...liveFormData, streamUrl: e.target.value})} disabled={!hasManage} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500 disabled:bg-gray-50" placeholder="https://youtube.com/..." />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                {hasManage && (
                  <>
                    <button type="submit" className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-red-500/30 text-lg flex items-center justify-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shrink-0"></span> START LIVE STREAM
                    </button>
                    {liveStream && liveStream.isLive && (
                      <button type="button" onClick={handleStopLive} className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2">
                        Stop Streaming
                      </button>
                    )}
                  </>
                )}
              </div>
            </form>
            
            <div className="bg-gray-100 rounded-xl border border-gray-200 flex flex-col items-center justify-center p-6 text-center">
              {liveStream?.isLive ? (
                <>
                  <div className="text-red-500 text-6xl mb-4 animate-pulse"><FaBullhorn /></div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Aarati is currently LIVE!</h3>
                  <p className="text-gray-500 text-sm">Devotees can see the live feed on the home page.</p>
                </>
              ) : (
                <>
                  <div className="text-gray-400 text-6xl mb-4"><FaCalendarAlt /></div>
                  <h3 className="text-xl font-bold text-gray-500 mb-2">No active live stream.</h3>
                  <p className="text-gray-400 text-sm">Start a live stream to notify devotees.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'past' && (
        <div className="space-y-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold text-deepblue-900 mb-4">Add Past Video</h2>
            <form onSubmit={(e) => handleLiveSubmit(e, false)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div className="col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                <input type="text" required value={liveFormData.title} onChange={(e) => setLiveFormData({...liveFormData, title: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-deepblue-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">Video File (Upload)</label>
                <input type="file" accept="video/*" onChange={(e) => setLiveVideoFile(e.target.files[0])} className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-deepblue-500 text-sm" />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">OR Video URL</label>
                <input type="text" value={liveFormData.streamUrl} onChange={(e) => setLiveFormData({...liveFormData, streamUrl: e.target.value})} placeholder="https://..." className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-deepblue-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                <input type="date" required value={liveFormData.scheduledAt} onChange={(e) => setLiveFormData({...liveFormData, scheduledAt: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-deepblue-500" />
              </div>
              <div className="col-span-1">
                <button type="submit" disabled={!liveVideoFile && !liveFormData.streamUrl} className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-gray-400 text-white font-bold py-2.5 rounded-xl transition-colors shadow-md shadow-gray-900/10">Add Video</button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pastVideos.map(video => (
              <div key={video._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="aspect-video bg-gray-900 flex items-center justify-center">
                  {video.videoFile ? (
                    <video src={getImageUrl(video.videoFile)} className="w-full h-full object-contain" controls preload="none" />
                  ) : video.streamUrl ? (
                    <iframe src={video.streamUrl.replace("watch?v=", "embed/")} className="w-full h-full" allowFullScreen></iframe>
                  ) : (
                    <span className="text-gray-500 text-sm">No video</span>
                  )}
                </div>
                <div className="p-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-900 line-clamp-1">{video.title}</h4>
                    <p className="text-xs text-gray-500">{new Date(video.scheduledAt).toLocaleDateString()}</p>
                  </div>
                  {hasManage && (
                    <button onClick={() => handleDeleteLive(video._id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><FaTrash /></button>
                  )}
                </div>
              </div>
            ))}
            {pastVideos.length === 0 && <p className="text-gray-500 col-span-3 text-center py-10">No past videos found.</p>}
          </div>
        </div>
      )}

      {/* MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{editingEvent ? "Update Event" : "Create Event"}</h2>
                  <p className="text-sm text-gray-500">Manage temple spiritual events.</p>
                </div>
                <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-red-500 hover:text-white transition-colors">✕</button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                <form id="event-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Event Title</label>
                    <input type="text" name="title" required value={formData.title} onChange={handleInputChange} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500" />
                  </div>


                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Branch *</label>
                    <select name="branch" required value={formData.branch} onChange={handleInputChange} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500">
                      <option value="">Select Branch</option>
                      {branches.map(b => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                    <input type="text" name="location" required value={formData.location} onChange={handleInputChange} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Event Date</label>
                    <input type="date" name="eventDate" required value={formData.eventDate} onChange={handleInputChange} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Event Time</label>
                    <div className="flex gap-2">
                      <select required value={(formData.eventTime || "12:00 AM").split(':')[0] || '12'} onChange={(e) => {
                         const [, minAmpm] = (formData.eventTime || "12:00 AM").split(':');
                         const min = minAmpm ? minAmpm.split(' ')[0] : '00';
                         const ampm = minAmpm ? minAmpm.split(' ')[1] : 'AM';
                         setFormData({...formData, eventTime: `${e.target.value}:${min} ${ampm}`});
                      }} className="w-full bg-white border border-gray-300 rounded-xl px-2 py-3 outline-none focus:border-saffron-500 text-center">
                         {Array.from({length: 12}, (_, i) => String(i+1).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="self-center font-bold text-gray-500">:</span>
                      <select required value={(formData.eventTime || "12:00 AM").split(':')[1]?.split(' ')[0] || '00'} onChange={(e) => {
                         const [h, minAmpm] = (formData.eventTime || "12:00 AM").split(':');
                         const hour = h || '12';
                         const ampm = minAmpm ? minAmpm.split(' ')[1] : 'AM';
                         setFormData({...formData, eventTime: `${hour}:${e.target.value} ${ampm}`});
                      }} className="w-full bg-white border border-gray-300 rounded-xl px-2 py-3 outline-none focus:border-saffron-500 text-center">
                         {Array.from({length: 60}, (_, i) => String(i).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select required value={(formData.eventTime || "12:00 AM").split(' ')[1] || 'AM'} onChange={(e) => {
                         const [timeStr] = (formData.eventTime || "12:00 AM").split(' ');
                         const time = timeStr || '12:00';
                         setFormData({...formData, eventTime: `${time} ${e.target.value}`});
                      }} className="w-full bg-white border border-gray-300 rounded-xl px-2 py-3 outline-none focus:border-saffron-500 font-bold text-center">
                         <option value="AM">AM</option>
                         <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                    <select name="status" required value={formData.status} onChange={handleInputChange} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500">
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <input type="checkbox" id="isPublished" checked={formData.isPublished} onChange={(e) => setFormData({...formData, isPublished: e.target.checked})} className="w-5 h-5 text-saffron-500 rounded focus:ring-saffron-500 border-gray-300" />
                    <div>
                      <label htmlFor="isPublished" className="block text-sm font-bold text-gray-900 cursor-pointer">Publish to User Side</label>
                      <p className="text-xs text-gray-500">If checked, this event will immediately be visible to the public.</p>
                    </div>
                  </div>

                  <div className="md:col-span-2 border-t border-gray-100 pt-5">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Upload Featured Image</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-[#f27415] hover:file:bg-orange-100 outline-none" />
                    <p className="text-xs text-gray-400 mt-2">Select a high-quality image from your device.</p>
                  </div>

                  <div className="md:col-span-2 border-t border-gray-100 pt-5">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Upload Additional Gallery Photos (Multiple Dynamic Images)</label>
                    <input type="file" accept="image/*" multiple onChange={(e) => setGalleryFiles(Array.from(e.target.files))} className="w-full border border-gray-300 rounded-xl px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 outline-none" />
                    <p className="text-xs text-gray-400 mt-2">Select multiple photos to create an event gallery.</p>
                    {galleryFiles.length > 0 && (
                      <p className="text-xs text-indigo-600 font-bold mt-1.5">{galleryFiles.length} gallery images selected for upload.</p>
                    )}
                    {editingEvent?.galleryImages && editingEvent.galleryImages.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-gray-600 mb-2">Existing Gallery Images ({editingEvent.galleryImages.length}):</p>
                        <div className="flex flex-wrap gap-2">
                          {editingEvent.galleryImages.map((img, idx) => (
                            <img key={idx} src={getImageUrl(img)} alt={`Gallery ${idx}`} className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2 border-t border-gray-100 pt-5">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Upload Event Video File (Dynamic Video)</label>
                    <input type="file" accept="video/mp4,video/webm,video/ogg,video/*" onChange={handleVideoChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 outline-none" />
                    <p className="text-xs text-gray-400 mt-2">Upload event video to display dynamically in event banner & archives (Max 100MB).</p>
                    {editingEvent?.videoFile && <p className="text-xs text-green-600 font-bold mt-1">✓ Current Video Uploaded: Yes</p>}
                  </div>

                  <div className="md:col-span-2 mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                    <textarea name="description" rows="4" required value={formData.description} onChange={handleInputChange} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500"></textarea>
                  </div>
                </form>
              </div>
              
              <div className="p-6 md:p-8 border-t border-gray-100 bg-white sticky bottom-0 flex flex-col md:flex-row justify-end gap-4 rounded-b-2xl z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button type="button" onClick={closeModal} className="w-full md:w-auto px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm order-2 md:order-1">Cancel</button>
                <button type="submit" form="event-form" disabled={formLoading} className="w-full md:w-auto px-8 py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold shadow-[0_4px_14px_0_rgba(255,122,47,0.39)] transition-colors flex items-center justify-center gap-2 order-1 md:order-2">
                  {formLoading ? <FaSpinner className="animate-spin" /> : <FaPlus />} {editingEvent ? "Save Changes" : "Create Event"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminEvents;

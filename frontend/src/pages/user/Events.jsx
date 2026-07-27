import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Loader2, ArrowRight, Clock, Sparkles, Filter, ChevronRight, Search, ChevronDown } from "lucide-react";
import { FaVideo, FaVolumeMute, FaClock, FaCalendarAlt, FaHistory, FaPlay, FaTimes, FaChevronRight } from 'react-icons/fa';
import { io } from "socket.io-client";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import api from "../../utils/api";
import { getCurrentLiveStream, getLiveStreamsHistory } from "../../services/liveService";
import EventMedia from "../../components/EventMedia";

const BACKEND_URL = import.meta.env.VITE_ASSETS_URL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : "http://localhost:5000");
const ASSETS_URL = BACKEND_URL;

const getImageUrl = (url) => {
  if (!url) return "/about_images/kolekar_real_1.jpg";
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${ASSETS_URL}${url}`;
  return `${ASSETS_URL}/${url}`;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const UserEvents = () => {
  const [events, setEvents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [activeTab, setActiveTab] = useState("live");
  const [loading, setLoading] = useState(true);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  
  const [currentStream, setCurrentStream] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [liveHistory, setLiveHistory] = useState([]);
  const [liveUpcoming, setLiveUpcoming] = useState([]);
  const [activeModalVideo, setActiveModalVideo] = useState(null);
  
  // Historical Filters
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchBranches();

    const fetchLiveData = async () => {
      try {
        const liveRes = await getCurrentLiveStream();
        if (liveRes.success) {
          setIsLive(liveRes.isLive);
          setCurrentStream(liveRes.data);
        }

        const historyRes = await getLiveStreamsHistory();
        if (historyRes.success) {
          setLiveHistory(historyRes.history || []);
          setLiveUpcoming(historyRes.upcoming || []);
        }
      } catch (err) {
        console.error("Error fetching live data:", err);
      }
    };

    fetchLiveData();
    const interval = setInterval(fetchLiveData, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchEvents(selectedBranch, activeTab);
    
    // Reset filters when tab changes
    setSelectedYear("all");
    setSelectedMonth("all");
    setSearchQuery("");

    const socket = io(BACKEND_URL);

    socket.on("event_created", (newEvent) => {
      if (newEvent.isPublished) {
        if (selectedBranch === "all" || newEvent.branch === selectedBranch || (newEvent.branch && newEvent.branch._id === selectedBranch)) {
          setEvents((prev) => [newEvent, ...prev]);
        }
      }
    });

    socket.on("event_updated", (updatedEvent) => {
      if (updatedEvent.isPublished) {
        setEvents((prev) =>
          prev.map((e) => (e._id === updatedEvent._id ? updatedEvent : e))
        );
      }
    });

    socket.on("event_deleted", (deletedId) => {
      setEvents((prev) => prev.filter((e) => e._id !== deletedId));
    });

    return () => socket.disconnect();
  }, [selectedBranch, activeTab]);

  const fetchBranches = async () => {
    try {
      const res = await api.get("/branches");
      setBranches(res.data.branches || []);
    } catch (error) {
      console.error("Failed to fetch branches", error);
    }
  };

  const fetchEvents = async (branchId, tab) => {
    try {
      setLoading(true);
      let url = `/events/public?filterStatus=${tab}`;
      if (branchId !== "all") {
        url += `&branchId=${branchId}`;
      }
      const res = await api.get(url);
      
      // Sort upcoming ascending, past descending
      let fetchedEvents = res.data.data || [];
      if (tab === 'upcoming') {
        fetchedEvents.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
      } else {
        fetchedEvents.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
      }
      
      setEvents(fetchedEvents);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Derived state for Historical Filters
  const availableYears = useMemo(() => {
    if (activeTab !== "past") return [];
    const years = events.map(e => new Date(e.eventDate).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  }, [events, activeTab]);

  const filteredEvents = useMemo(() => {
    let result = events;

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const lowerCaseQuery = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(lowerCaseQuery) ||
          e.category.toLowerCase().includes(lowerCaseQuery) ||
          (e.shortDescription && e.shortDescription.toLowerCase().includes(lowerCaseQuery))
      );
    }

    if (activeTab === "upcoming") return result;
    
    return result.filter(e => {
      const date = new Date(e.eventDate);
      const yearMatch = selectedYear === "all" || date.getFullYear().toString() === selectedYear;
      const monthMatch = selectedMonth === "all" || date.getMonth().toString() === selectedMonth;
      return yearMatch && monthMatch;
    });
  }, [events, activeTab, selectedYear, selectedMonth, searchQuery]);

  const getPlayerDetails = (url, isModal = false, autoplay = true) => {
    if (!url) return { type: 'unknown', src: '' };
    const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const ytMatch = url.match(ytRegex);
    if (ytMatch) {
      let params = ['modestbranding=1', 'rel=0', 'showinfo=0', 'controls=1'];
      if (autoplay) params.push('autoplay=1');
      if (!isModal) params.push('mute=1');
      return { type: 'youtube', src: `https://www.youtube.com/embed/${ytMatch[1]}?${params.join('&')}` };
    }

    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch) {
      let params = [];
      if (autoplay) params.push('autoplay=1');
      if (!isModal) params.push('muted=1');
      return { type: 'vimeo', src: `https://player.vimeo.com/video/${vimeoMatch[1]}?${params.join('&')}` };
    }

    // Since our backend sets video file paths like `/uploads/...`, we need to wrap them with ASSETS_URL
    if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg') || url.includes('/video/') || url.includes('/uploads/')) {
      return { type: 'raw', src: getImageUrl(url) };
    }
    return { type: 'iframe', src: url };
  };

  const getThumbnailUrl = (event) => {
    if (event.thumbnail) return event.thumbnail;
    if (event.streamUrl) {
      const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = event.streamUrl.match(ytRegex);
      if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }
    return '/event_card.png';
  };

  const currentDetails = getPlayerDetails(currentStream?.streamUrl, false);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-[#FCFBF7] font-sans text-stone-800 flex flex-col relative overflow-x-hidden pt-24">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 mt-12 mb-24 flex-1 w-full relative z-20">
        
        {/* Modern Header */}
        <div className="text-center mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 mb-4 tracking-tight">
              Spiritual Gatherings
            </h1>
            <p className="text-stone-500 max-w-2xl mx-auto text-lg font-light leading-relaxed">
              Join our divine journey from anywhere in the world. Seamlessly participate in live festivals and explore our historical archives.
            </p>
          </motion.div>
        </div>

        <div className="flex flex-col items-center mb-16">
          <div className="w-full max-w-xl relative mb-10 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-amber-500/70 group-focus-within:text-amber-600 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search spiritual gatherings, festivals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-11 pr-4 py-3.5 bg-white border border-stone-200 rounded-2xl text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all text-sm font-medium"
            />
          </div>

          {/* Modern Realistic Tab Bar */}
          <div className="flex flex-col sm:flex-row p-1.5 bg-white/70 backdrop-blur-xl sm:rounded-full rounded-2xl border border-stone-200/80 mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full sm:w-auto sm:max-w-fit mx-auto gap-2 sm:gap-0">
            <button 
              onClick={() => setActiveTab('live')}
              className={`px-8 py-3 rounded-full font-bold transition-all duration-300 text-sm tracking-wide flex items-center justify-center gap-2 relative overflow-hidden
                ${activeTab === 'live' ? 'bg-red-50 text-red-700 shadow-sm border border-red-100/50' : 'text-stone-500 hover:text-red-600 hover:bg-stone-50/80'}
                ${isLive ? 'shadow-[0_0_20px_rgba(239,68,68,0.4)] border border-red-300 ring-1 ring-red-400/50 bg-red-50/30' : ''}
              `}
            >
              {isLive && activeTab !== 'live' && (
                <div className="absolute inset-0 bg-red-400/10 animate-pulse rounded-full pointer-events-none"></div>
              )}
              {isLive ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                </span>
              ) : (
                <FaVideo className="text-stone-400" />
              )}
              {isLive ? 'Live Now' : 'Watch Live'}
            </button>
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={`px-8 py-3 rounded-full font-bold transition-all duration-300 text-sm tracking-wide text-center
                ${activeTab === 'upcoming' ? 'bg-amber-50/80 text-amber-700 shadow-sm border border-amber-100/50' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50/80'}`}
            >
              Upcoming Events
            </button>
            <button 
              onClick={() => setActiveTab('past')}
              className={`px-8 py-3 rounded-full font-bold transition-all duration-300 text-sm tracking-wide text-center
                ${activeTab === 'past' ? 'bg-amber-50/80 text-amber-700 shadow-sm border border-amber-100/50' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50/80'}`}
            >
              Historical Archives
            </button>
          </div>
          
          {/* Branch Selection Listbox */}
          <div className="relative w-full max-w-[200px] mx-auto z-30 mb-8">
            <button 
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              className="w-full flex items-center justify-between px-6 py-3 bg-white border border-stone-200 rounded-2xl shadow-sm text-stone-700 font-bold text-sm hover:border-amber-400 transition-colors focus:outline-none"
            >
              <span className="truncate uppercase tracking-wider text-xs">
                {selectedBranch === "all" ? "All Centers" : branches.find(b => b._id === selectedBranch)?.name || "All Centers"}
              </span>
              <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform duration-300 ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isBranchDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scaleY: 0.95 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -10, scaleY: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute top-full left-0 w-full mt-2 bg-white border border-stone-100 rounded-2xl shadow-xl overflow-hidden origin-top z-40 max-h-60 overflow-y-auto"
                >
                  <button 
                    onClick={() => { setSelectedBranch("all"); setIsBranchDropdownOpen(false); }}
                    className={`w-full text-left px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${selectedBranch === "all" ? 'bg-amber-50 text-amber-700' : 'text-stone-600 hover:bg-stone-50'}`}
                  >
                    All Centers
                  </button>
                  {branches.map(b => (
                    <button 
                      key={b._id}
                      onClick={() => { setSelectedBranch(b._id); setIsBranchDropdownOpen(false); }}
                      className={`w-full text-left px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-t border-stone-50 ${selectedBranch === b._id ? 'bg-amber-50 text-amber-700' : 'text-stone-600 hover:bg-stone-50'}`}
                    >
                      {b.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Historical Filters (Only show if past tab) */}
          <AnimatePresence>
            {activeTab === "past" && availableYears.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                animate={{ opacity: 1, height: 'auto', marginTop: 32 }} 
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="w-full max-w-4xl bg-white p-6 rounded-3xl border border-amber-100 shadow-lg shadow-amber-50/50"
              >
                <div className="flex items-center gap-2 mb-4 text-amber-700 font-bold text-sm tracking-widest uppercase">
                  <Filter className="w-4 h-4" /> Filter Archives
                </div>
                
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Year Selection */}
                  <div className="flex-1">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Select Year</p>
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => setSelectedYear("all")}
                        className={`px-4 py-1.5 rounded-full font-bold text-sm transition-colors ${selectedYear === "all" ? 'bg-amber-100 text-amber-800' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
                      >
                        All Years
                      </button>
                      {availableYears.map(year => (
                        <button 
                          key={year}
                          onClick={() => setSelectedYear(year.toString())}
                          className={`px-4 py-1.5 rounded-full font-bold text-sm transition-colors ${selectedYear === year.toString() ? 'bg-amber-100 text-amber-800' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Month Selection */}
                  <div className="flex-1">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Select Month</p>
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 text-stone-700 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                    >
                      <option value="all">All Months</option>
                      {MONTHS.map((month, index) => (
                        <option key={index} value={index.toString()}>{month}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {activeTab === 'live' ? (
          <div className="w-full max-w-5xl mx-auto mb-16">
            {isLive && currentStream ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-[#D4AF37]/30 relative"
              >
                {/* Live Indicator Header */}
                <div className="bg-gradient-to-r from-red-700 to-red-600 px-6 py-4 flex justify-between items-center text-white border-b border-red-800 shadow-sm relative z-10">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                    <span className="font-bold text-sm tracking-[0.2em] uppercase">Stream Active</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-red-100/80 bg-black/20 px-3 py-1 rounded-full">
                    <FaVolumeMute />
                    <span>Muted by default</span>
                  </div>
                </div>

                <div className="grid lg:grid-cols-12 relative z-10">
                  {/* Player element */}
                  <div className="lg:col-span-8 bg-stone-900 aspect-video relative flex items-center justify-center overflow-hidden">
                    {/* Dark gradient overlay behind video for premium feel */}
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-stone-900/30 z-0"></div>
                    {currentDetails.type === 'youtube' || currentDetails.type === 'vimeo' || currentDetails.type === 'iframe' ? (
                      <iframe
                        title={currentStream.title}
                        src={currentDetails.src}
                        className="absolute inset-0 w-full h-full z-10"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : currentDetails.type === 'raw' ? (
                      <video
                        src={currentDetails.src}
                        controls
                        autoPlay
                        muted
                        className="w-full h-full object-contain z-10 relative"
                      />
                    ) : (
                      <div className="text-white text-center p-8 z-10 relative">
                        <p className="text-lg font-light">Unable to play video in this format.</p>
                        <a href={currentStream.streamUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block px-6 py-2.5 bg-[#D4AF37] text-white hover:bg-white hover:text-[#D4AF37] rounded-full font-bold text-sm tracking-wide transition-colors">
                          Open Stream Directly
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Broadcast metadata */}
                  <div className="lg:col-span-4 p-8 flex flex-col justify-between bg-white relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-stone-50 to-transparent z-0"></div>
                    <div className="relative z-10">
                      <div className="px-3 py-1.5 bg-[#D4AF37]/10 text-[#8D5B2F] text-[10px] font-bold rounded-full w-fit mb-5 uppercase tracking-[0.2em] border border-[#D4AF37]/20">
                        Daily Devotional
                      </div>
                      <h2 className="text-3xl font-bold text-stone-900 font-serif mb-4 leading-tight">
                        {currentStream.title}
                      </h2>
                      <p className="text-stone-500 text-sm leading-relaxed mb-6 font-medium">
                        {currentStream.description || "Join our live devotional broadcast to experience spiritual peace and blessings from wherever you are."}
                      </p>
                    </div>
                    
                    <div className="pt-6 border-t border-stone-100 relative z-10">
                      <p className="text-[10px] text-stone-400 uppercase tracking-[0.2em] font-bold mb-3">Started At</p>
                      <div className="flex items-center gap-3 text-sm text-stone-700 font-bold bg-stone-50 p-3 rounded-xl border border-stone-100 w-fit">
                        <FaClock className="text-[#D4AF37] text-lg" />
                        <span>{formatDate(currentStream.createdAt)} <span className="mx-2 text-stone-300">|</span> {formatTime(currentStream.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-stone-100 flex flex-col items-center justify-center py-20 px-6 text-center relative"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-[#D4AF37]/5 to-transparent rounded-full blur-[100px] -z-10 pointer-events-none" />
                <div className="w-24 h-24 bg-stone-50 rounded-full flex items-center justify-center text-stone-300 mb-8 border border-stone-100 shadow-inner">
                  <FaVideo size={36} className="opacity-50" />
                </div>
                
                <h2 className="text-4xl font-serif font-bold text-stone-900 mb-4">
                  No Active Broadcast
                </h2>
                <p className="text-stone-500 text-lg max-w-lg mb-10 leading-relaxed font-light">
                  There are no live streams running at this moment. Please stay tuned for our upcoming spiritual programs.
                </p>


              </motion.div>
            )}

            {/* Dynamic Scheduled Sections from Live Migration */}
            <div className="mt-24">
              {/* Upcoming Schedule List */}
              <div className="max-w-3xl mx-auto flex flex-col gap-6">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-200">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-[#D4AF37] border border-stone-200 shadow-sm">
                    <FaCalendarAlt size={18} />
                  </div>
                  <h3 className="text-2xl font-bold font-serif text-stone-900 tracking-wide">Upcoming Broadcasts</h3>
                </div>

                {liveUpcoming.length > 0 ? (
                  <div className="space-y-5">
                    {liveUpcoming.map((event) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: false, amount: 0.1 }}
                        key={event._id}
                        className="group relative bg-white rounded-3xl p-6 shadow-sm border border-stone-100 hover:border-[#D4AF37]/40 hover:shadow-[0_15px_30px_-10px_rgba(212,175,55,0.15)] hover:-translate-y-1 transition-all duration-500 overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-stone-50 to-transparent -z-10 group-hover:from-[#D4AF37]/5 transition-colors duration-500 rounded-bl-full"></div>
                        
                        <div className="mb-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-50 text-[#D4AF37] border border-stone-100 text-[10px] font-bold rounded-full uppercase tracking-widest group-hover:bg-[#D4AF37] group-hover:text-white group-hover:border-[#D4AF37] transition-colors duration-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            Scheduled
                          </span>
                          <h4 className="text-lg font-bold text-stone-900 mt-3 font-serif leading-snug group-hover:text-[#8D5B2F] transition-colors">{event.title}</h4>
                          {event.description && <p className="text-stone-500 text-xs mt-2 line-clamp-2 leading-relaxed font-medium">{event.description}</p>}
                        </div>

                        <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-bold tracking-wide">
                          <div className="flex items-center gap-2">
                            <FaCalendarAlt className="text-[#D4AF37]/80 text-sm" />
                            <span>{formatDate(event.scheduledAt)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[#8D5B2F] bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-100">
                            <FaClock className="text-[#D4AF37]" />
                            <span>{formatTime(event.scheduledAt)}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-stone-50/50 rounded-3xl p-10 text-center border border-dashed border-stone-200 flex flex-col items-center">
                    <FaCalendarAlt className="text-stone-300 text-3xl mb-3" />
                    <p className="text-stone-500 text-sm italic font-medium">No upcoming broadcasts scheduled.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="animate-spin w-12 h-12 text-amber-500 mb-4" />
            <p className="text-stone-500 font-serif italic text-lg">Loading gatherings...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-16">
            {/* Insert Recent Broadcasts inside Historical Archives Tab only */}
            {activeTab === 'past' && liveHistory.length > 0 && (
              <div>
                <div className="flex items-center gap-3 pb-4 border-b border-stone-200 mb-8">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-[#D4AF37] border border-stone-200 shadow-sm">
                    <FaHistory size={18} />
                  </div>
                  <h3 className="text-2xl font-bold font-serif text-stone-900 tracking-wide">Recent Broadcasts</h3>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {liveHistory.map((event, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: false, amount: 0.1 }}
                      transition={{ delay: idx * 0.1 }}
                      key={event._id}
                      className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-stone-100 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:border-[#D4AF37]/30 hover:-translate-y-1.5 transition-all duration-500 flex flex-col"
                    >
                      <div className="h-56 relative bg-stone-900 flex items-center justify-center overflow-hidden">
                        {(() => {
                          const details = getPlayerDetails(event.videoFile || event.streamUrl, true, false);
                          if (details.type === 'youtube' || details.type === 'vimeo' || details.type === 'iframe') {
                            return (
                              <iframe
                                title={event.title}
                                src={details.src}
                                className="absolute inset-0 w-full h-full z-10"
                                allowFullScreen
                              />
                            );
                          } else if (details.type === 'raw') {
                            return (
                              <video
                                src={details.src}
                                controls
                                preload="metadata"
                                className="absolute inset-0 w-full h-full object-cover z-10 bg-stone-900"
                              />
                            );
                          }
                          return (
                            <div className="text-stone-500 text-sm italic z-10">
                              Video format unavailable
                            </div>
                          );
                        })()}
                      </div>
                      
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-base font-bold text-stone-900 font-serif leading-snug line-clamp-2 mb-2">
                            {event.title}
                          </h4>
                        </div>
                        <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Past Event</span>
                          <div className="text-xs text-[#D4AF37] font-bold flex items-center gap-1.5">
                            <FaCalendarAlt /> {formatDate(event.scheduledAt)}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div>
              {activeTab === 'past' && filteredEvents.length > 0 && (
                <div className="flex items-center gap-3 pb-4 border-b border-stone-200 mb-8">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-amber-600 border border-stone-200 shadow-sm">
                    <Calendar size={18} />
                  </div>
                  <h3 className="text-2xl font-bold font-serif text-stone-900 tracking-wide">Historical Events</h3>
                </div>
              )}

              {filteredEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <AnimatePresence mode="popLayout">
                    {filteredEvents.map((event, idx) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, amount: 0.1 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  key={event._id}
                  className="group bg-white rounded-3xl overflow-hidden shadow-lg shadow-stone-200/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border border-stone-100 flex flex-col"
                >
                  <div className="relative overflow-hidden bg-stone-100 rounded-t-3xl">
                    <EventMedia 
                      src={event.featuredImage || event.videoFile} 
                      alt={event.title}
                      aspectRatio="aspect-video"
                      objectFit="cover"
                      allowLightbox={true}
                    />
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3 flex gap-2 z-20 pointer-events-none">
                      <span className={`px-3 py-1 backdrop-blur-md text-[9px] font-black rounded-full uppercase tracking-widest shadow-md flex items-center gap-2 ${
                        event.status === 'ongoing' ? 'bg-green-500/90 text-white' : 
                        event.status === 'upcoming' ? 'bg-amber-500/90 text-white' : 'bg-stone-900/80 text-white'
                      }`}>
                        {event.status === 'ongoing' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                        {event.status}
                      </span>
                    </div>

                    {/* Date Badge */}
                    <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md rounded-xl shadow-xl overflow-hidden z-20 border border-white/60 text-center min-w-[3rem] pointer-events-none">
                      <div className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-widest py-0.5 px-2">
                        {new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div className="text-base font-black text-stone-900 py-0.5 bg-white">
                        {new Date(event.eventDate).getDate()}
                      </div>
                      {activeTab === 'past' && (
                        <div className="text-[8px] font-bold text-stone-500 py-0.5 bg-stone-50 border-t border-stone-100">
                          {new Date(event.eventDate).getFullYear()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1 relative">
                    <span className="inline-block px-2 py-0.5 bg-stone-100 rounded text-stone-500 text-[9px] font-black uppercase tracking-widest mb-2 w-fit">
                      {event.branch?.name || "Global"}
                    </span>
                    
                    <h3 className="text-lg font-serif font-bold text-stone-900 line-clamp-1 leading-tight mb-2 group-hover:text-amber-700 transition-colors">
                      {event.title}
                    </h3>
                    
                    <p className="text-stone-500 text-xs font-light mb-4 line-clamp-2 leading-relaxed flex-1">
                      {event.shortDescription || event.fullDescription || "Join our divine celebration filled with devotion, positivity, blessings, and spiritual peace."}
                    </p>
                     
                    <div className="space-y-2 mb-4 pt-4 border-t border-stone-100">
                      <div className="flex items-center gap-2 text-stone-600 text-xs font-medium">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        <span className="truncate">{event.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-stone-600 text-xs font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{event.eventTime}</span>
                      </div>
                    </div>

                    <Link 
                      to={`/events/${event.slug}`}
                      className="inline-flex items-center justify-between w-full text-stone-900 font-bold text-[10px] tracking-widest uppercase hover:text-amber-600 transition-colors group/link"
                    >
                      {event.videoFile && activeTab === 'past' ? 'Watch Recording' : 'View Details'}
                      <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center group-hover/link:bg-amber-50 group-hover/link:text-amber-600 transition-colors">
                        {event.videoFile && activeTab === 'past' ? <FaVideo className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                      </div>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-24 bg-white rounded-[3rem] border border-stone-200 shadow-sm">
                  <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <h3 className="text-2xl font-serif font-bold text-stone-900 mb-2">No Gatherings Found</h3>
                  <p className="text-stone-500">
                    {activeTab === 'upcoming' 
                      ? 'Check back later for new spiritual festivals.' 
                      : 'No historical archives found for the selected filters.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Video Modal Player for Past Live Streams */}
      <AnimatePresence>
        {activeModalVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-4xl w-full relative"
            >
              {/* Close Button */}
              <button 
                onClick={() => setActiveModalVideo(null)}
                className="absolute right-4 top-4 text-stone-500 hover:text-red-500 bg-white/90 backdrop-blur-sm p-2 rounded-full z-10 transition-colors shadow-sm"
              >
                <FaTimes />
              </button>

              {/* Video Stream Iframe */}
              <div className="bg-stone-900 aspect-video">
                {(() => {
                  const modalDetails = getPlayerDetails(activeModalVideo.videoFile || activeModalVideo.streamUrl, true);
                  if (modalDetails.type === 'youtube' || modalDetails.type === 'vimeo' || modalDetails.type === 'iframe') {
                    return (
                      <iframe
                        title={activeModalVideo.title}
                        src={modalDetails.src}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    );
                  } else if (modalDetails.type === 'raw') {
                    return (
                      <video
                        src={modalDetails.src}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                      />
                    );
                  }
                  return (
                    <div className="text-white flex items-center justify-center h-full p-8 text-center">
                      <p>Unable to play video format in modal.</p>
                    </div>
                  );
                })()}
              </div>

              {/* Video Info */}
              <div className="p-6 bg-white">
                <h3 className="text-xl font-bold text-stone-900 font-serif mb-2">{activeModalVideo.title}</h3>
                <p className="text-stone-500 text-xs mb-3">Broadcasted: {formatDate(activeModalVideo.scheduledAt)}</p>
                <p className="text-stone-600 text-sm leading-relaxed">{activeModalVideo.description || "Historical recording of a past live broadcast."}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default UserEvents;

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaEdit, FaTrash, FaSpinner, FaCalendarAlt, FaSearch, FaMapMarkerAlt, FaClock, FaTimes, FaCloudUploadAlt, FaFilter } from "react-icons/fa";
import { io } from "socket.io-client";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
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

const BranchEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    shortDescription: "",
    fullDescription: "",
    location: "",
    eventDate: "",
    eventTime: "10:00 AM",
    status: "upcoming",
    isPublished: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const userBranchId = (user?.branch?._id || user?.branch || '').toString();

  const canModifyEvent = (event) => {
    if (!userBranchId || !event) return false;
    const eventBranchId = (event.branch?._id || event.branch || '').toString();
    return eventBranchId === userBranchId;
  };

  const filteredEvents = events.filter((e) => {
    let match = true;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) match = false;
    if (branchFilter && (typeof e.branch === 'object' ? e.branch?._id : e.branch) !== branchFilter) match = false;
    if (dateFilter && e.eventDate && new Date(e.eventDate).toISOString().split('T')[0] !== dateFilter) match = false;
    return match;
  });

  const {
    searchTerm, setSearchTerm, sortConfig, handleSort,
    currentPage, setCurrentPage, itemsPerPage, setItemsPerPage,
    totalPages, paginatedData, totalItems
  } = useTableFeatures(filteredEvents, ['title', 'shortDescription', 'location']);

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

  const openModal = (event = null) => {
    if (event) {
      if (!canModifyEvent(event)) {
        alert("You are only authorized to edit events belonging to your branch.");
        return;
      }
      setEditingEvent(event);
      setFormData({
        title: event.title || "",
        shortDescription: event.shortDescription || "",
        fullDescription: event.fullDescription || "",
        location: event.location || "",
        eventDate: event.eventDate ? new Date(event.eventDate).toISOString().split('T')[0] : "",
        eventTime: event.eventTime || "10:00 AM",
        status: event.status || "upcoming",
        isPublished: event.isPublished !== undefined ? event.isPublished : true
      });
      setPreviewUrl(getImageUrl(event.featuredImage));
    } else {
      setEditingEvent(null);
      setFormData({
        title: "",
        shortDescription: "",
        fullDescription: "",
        location: "",
        eventDate: new Date().toISOString().split('T')[0],
        eventTime: "10:00 AM",
        status: "upcoming",
        isPublished: true
      });
      setPreviewUrl(null);
    }
    setImageFile(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
    setImageFile(null);
    setPreviewUrl(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingEvent && !imageFile) {
      alert("Featured Image is required when creating a new event.");
      return;
    }

    setFormLoading(true);
    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("shortDescription", formData.shortDescription || formData.fullDescription.substring(0, 195));
      data.append("fullDescription", formData.fullDescription);
      data.append("location", formData.location);
      data.append("eventDate", formData.eventDate);
      data.append("eventTime", formData.eventTime);
      data.append("status", formData.status);
      data.append("isPublished", formData.isPublished);
      data.append("branch", userBranchId);

      if (imageFile) {
        data.append("featuredImage", imageFile);
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
      alert(err.response?.data?.message || "Failed to save event.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const targetEvent = events.find(e => e._id === id);
    if (!canModifyEvent(targetEvent)) {
      alert("You are only authorized to delete events belonging to your branch.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this event?")) return;

    try {
      await api.delete(`/events/admin/${id}`);
      fetchEvents();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to delete event.");
    }
  };

  const assignedBranchObj = branches.find(b => b._id === userBranchId);

  return (
    <div className="min-h-screen bg-transparent text-gray-900 pb-12 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 md:gap-3 tracking-tight">
            <div className="flex items-center gap-2 md:gap-3">
              <FaCalendarAlt className="text-gray-700" /> Event Management
            </div>
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Manage spiritual events for <span className="font-semibold text-gray-800">{assignedBranchObj?.name || 'your assigned branch'}</span> and view events across all branches.
          </p>
        </div>
        <button 
          onClick={() => openModal()} 
          className="bg-slate-900 hover:bg-black transition-colors px-6 py-3 rounded-xl text-white font-bold flex justify-center items-center gap-2 shadow-lg w-full md:w-auto"
        >
          <FaPlus /> Add Event
        </button>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="relative flex-1">
          <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
          <input 
            type="text" 
            placeholder="Search events by title..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full bg-white border border-gray-100 rounded-3xl pl-14 pr-6 py-4 outline-none focus:border-gray-300 shadow-sm transition-all text-gray-900 font-medium" 
          />
        </div>
        <div className="w-full md:w-64">
          <select 
            value={branchFilter} 
            onChange={(e) => setBranchFilter(e.target.value)} 
            className="w-full bg-white border border-gray-100 rounded-3xl px-6 py-4 outline-none focus:border-gray-300 shadow-sm transition-all text-gray-900 font-medium"
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="w-full md:w-48">
          <input 
            type="date" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)} 
            className="w-full bg-white border border-gray-100 rounded-3xl px-6 py-4 outline-none focus:border-gray-300 shadow-sm transition-all text-gray-900 font-medium" 
          />
        </div>
        {(search || branchFilter || dateFilter) && (
          <button 
            onClick={() => { setSearch(""); setBranchFilter(""); setDateFilter(""); }} 
            className="px-6 py-4 rounded-3xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* EVENTS GRID */}
      {loading ? (
        <div className="flex justify-center py-20">
          <FaSpinner className="animate-spin text-5xl text-gray-400" />
        </div>
      ) : paginatedData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {paginatedData.map((event, index) => {
            const isMine = canModifyEvent(event);
            return (
              <motion.div 
                key={event._id} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.4, delay: index * 0.05 }} 
                className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all group flex flex-col"
              >
                {/* MEDIA BANNER */}
                <div className="relative bg-stone-100 overflow-hidden rounded-t-3xl">
                  <EventMedia 
                    src={event.featuredImage || event.videoFile} 
                    alt={event.title}
                    aspectRatio="aspect-video"
                    objectFit="cover"
                    allowLightbox={true}
                  />
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3 z-20 pointer-events-none">
                    <span className="px-3 py-1 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest text-stone-900 shadow-sm bg-white/90">
                      {event.status}
                    </span>
                  </div>
                  
                  {/* Date Badge */}
                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md rounded-xl text-center overflow-hidden shadow-md min-w-[3rem] border border-white/60 pointer-events-none">
                    <div className="bg-stone-100 text-stone-600 text-[8px] font-bold uppercase tracking-widest py-0.5 px-2 border-b border-stone-200">
                      {new Date(event.eventDate).toLocaleDateString("en-US", { month: "short" })}
                    </div>
                    <div className="text-base font-black text-stone-900 py-0.5">
                      {new Date(event.eventDate).getDate()}
                    </div>
                  </div>
                </div>

                {/* CARD CONTENT */}
                <div className="p-5 md:p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-blue-200/60">
                      {event.branch?.name || "Global"}
                    </span>
                    {isMine && (
                      <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-200/60">
                        My Branch
                      </span>
                    )}
                  </div>
                  
                  <h2 className="text-stone-900 text-lg md:text-xl font-bold font-serif line-clamp-1 mb-2 group-hover:text-blue-600 transition-colors">{event.title}</h2>
                  <p className="text-gray-500 text-xs md:text-sm line-clamp-2 mb-3 md:mb-6 flex-1">
                    {event.shortDescription || event.fullDescription}
                  </p>
                  
                  {/* Location & Time bar */}
                  <div className="flex flex-row items-center justify-between gap-2 mb-3 md:mb-6 bg-gray-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm text-gray-700 font-medium overflow-hidden">
                      <div className="w-5 h-5 md:w-8 md:h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 text-[10px] md:text-xs shrink-0">
                        <FaMapMarkerAlt />
                      </div>
                      <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm text-gray-700 font-medium shrink-0">
                      <div className="w-5 h-5 md:w-8 md:h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 text-[10px] md:text-xs shrink-0">
                        <FaClock />
                      </div>
                      <span>{event.eventTime}</span>
                    </div>
                  </div>

                  {/* Actions & Status Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${event.isPublished ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                      {event.isPublished ? 'Published' : 'Draft'}
                    </span>

                    {isMine ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => openModal(event)} 
                          className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-gray-100 hover:bg-slate-900 hover:text-white flex items-center justify-center text-gray-600 transition-colors shadow-sm"
                          title="Edit Event"
                        >
                          <FaEdit className="text-sm" />
                        </button>
                        <button 
                          onClick={() => handleDelete(event._id)} 
                          className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-red-50 hover:bg-red-600 hover:text-white flex items-center justify-center text-red-600 transition-colors shadow-sm"
                          title="Delete Event"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                        View Only
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-gray-100 shadow-sm rounded-3xl">
          <FaCalendarAlt className="mx-auto text-5xl text-gray-300 mb-4" />
          <p className="text-gray-500 font-bold text-lg">No events found matching your search.</p>
        </div>
      )}

      {paginatedData.length > 0 && (
        <div className="rounded-3xl overflow-hidden shadow-sm border border-gray-100 bg-white mt-8">
          <TablePagination 
            currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage}
            totalItems={totalItems} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage}
          />
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl my-8 relative border border-gray-100"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingEvent ? "Edit Branch Event" : "Create New Branch Event"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Assigning event to <span className="font-semibold text-gray-900">{assignedBranchObj?.name || 'Assigned Branch'}</span>
                  </p>
                </div>
                <button 
                  onClick={closeModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Event Title *
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={formData.title} 
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                    className="w-full px-5 py-3.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-slate-900 transition-all font-medium"
                    placeholder="e.g. Mahashivratri Mahotsav 2026"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Event Date *
                    </label>
                    <input 
                      type="date" 
                      required 
                      value={formData.eventDate} 
                      onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })} 
                      className="w-full px-5 py-3.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-slate-900 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Event Time *
                    </label>
                    <input 
                      type="text" 
                      required 
                      value={formData.eventTime} 
                      onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })} 
                      className="w-full px-5 py-3.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-slate-900 transition-all font-medium"
                      placeholder="e.g. 06:00 PM - 09:00 PM"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Location *
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={formData.location} 
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                    className="w-full px-5 py-3.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-slate-900 transition-all font-medium"
                    placeholder="e.g. Main Ashram Ground, Branch Premises"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Short Description
                  </label>
                  <input 
                    type="text" 
                    value={formData.shortDescription} 
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })} 
                    className="w-full px-5 py-3.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-slate-900 transition-all font-medium"
                    placeholder="Brief summary for list view cards..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Full Description *
                  </label>
                  <textarea 
                    required 
                    rows={4} 
                    value={formData.fullDescription} 
                    onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })} 
                    className="w-full px-5 py-3.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-slate-900 transition-all font-medium resize-none"
                    placeholder="Provide full schedule, details, and guidelines for devotees..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Status
                    </label>
                    <select 
                      value={formData.status} 
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })} 
                      className="w-full px-5 py-3.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-slate-900 transition-all bg-white font-medium"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Branch (Locked)
                    </label>
                    <input 
                      type="text" 
                      readOnly 
                      disabled 
                      value={assignedBranchObj?.name || "Your Branch"} 
                      className="w-full px-5 py-3.5 rounded-xl border border-gray-200 text-sm bg-gray-100 font-bold text-gray-700 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Featured Banner Image {!editingEvent && "*"}
                  </label>
                  <div className="flex items-center gap-4">
                    {previewUrl && (
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border border-gray-200 shrink-0 bg-gray-50">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <label className="flex-1 flex flex-col items-center justify-center p-5 border-2 border-dashed border-gray-200 hover:border-slate-900 rounded-2xl cursor-pointer bg-gray-50/50 hover:bg-gray-100/50 transition-all">
                      <FaCloudUploadAlt className="w-7 h-7 text-gray-500 mb-1" />
                      <span className="text-xs text-gray-600 font-bold">
                        {imageFile ? imageFile.name : "Click to select banner image"}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={closeModal} 
                    className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={formLoading} 
                    className="bg-slate-900 hover:bg-black text-white font-bold py-3.5 px-8 rounded-xl shadow-lg transition-all disabled:opacity-50"
                  >
                    {formLoading ? "Saving..." : editingEvent ? "Update Event" : "Create Event"}
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

export default BranchEvents;

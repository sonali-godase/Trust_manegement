import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, ZoomIn, ChevronRight, ChevronLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../utils/api';

const ASSETS_URL = import.meta.env.VITE_ASSETS_URL || "http://localhost:5000";

const getImageUrl = (url) => {
  if (!url) return "https://images.unsplash.com/photo-1514222709107-a180c68d72b4?q=80&w=2000";
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${ASSETS_URL}${url}`;
  return `${ASSETS_URL}/${url}`;
};

// Use the existing hero background for the header
import heroBg from "../../assets/hero_bg.jpeg";

const GALLERY_CATEGORIES = ["All", "Blessings", "Festivals", "Pooja", "Pravachan", "Monastery", "Maharaj", "News"];

const GALLERY_DATA = [
  { id: 1, src: "/about_images/kolekar_real_1.jpg", category: "Blessings", title: "Morning Darshan", aspect: "aspect-square" },
  { id: 2, src: "/about_images/WhatsApp Image 2026-04-19 at 6.33.28 AM (1).jpeg", category: "Festivals", title: "Maha Shivaratri", aspect: "aspect-[3/4]" },
  { id: 3, src: "/about_images/kolekar_real_2.jpg", category: "Monastery", title: "Temple Architecture", aspect: "aspect-[4/3]" },
  { id: 4, src: "/about_images/WhatsApp Image 2026-04-19 at 6.33.15 AM.jpeg", category: "Pooja", title: "Maha Aarti", aspect: "aspect-[3/4]" },
  { id: 5, src: "/about_images/kolekar_real_3.jpg", category: "Pravachan", title: "Spiritual Discourse", aspect: "aspect-video" },
  { id: 6, src: "/about_images/WhatsApp Image 2026-04-19 at 6.33.16 AM (2).jpeg", category: "Monastery", title: "Ancient Scriptures", aspect: "aspect-[3/4]" },
  { id: 7, src: "/about_images/kolekar_real_4.jpg", category: "Festivals", title: "Diwali Deepotsav", aspect: "aspect-square" },
  { id: 8, src: "/about_images/WhatsApp Image 2026-04-19 at 6.33.17 AM (1).jpeg", category: "Blessings", title: "Holy Sanctum", aspect: "aspect-[4/3]" },
  { id: 9, src: "/about_images/kolekar_real_5.jpg", category: "Maharaj", title: "Guru Parampara", aspect: "aspect-[3/4]" },
  { id: 10, src: "/about_images/WhatsApp Image 2026-04-19 at 6.33.18 AM.jpeg", category: "Pooja", title: "Rudrabhishek", aspect: "aspect-video" },
  { id: 11, src: "/about_images/kolekar_real_6.jpg", category: "Maharaj", title: "Maharaj's Vani", aspect: "aspect-[3/4]" },
  { id: 12, src: "/about_images/WhatsApp Image 2026-04-19 at 6.33.20 AM.jpeg", category: "Blessings", title: "Devotees Gathering", aspect: "aspect-square" },
  { id: 13, src: "/about_images/kolekar_real_7.jpg", category: "Pooja", title: "Special Homam", aspect: "aspect-[4/3]" },
  { id: 14, src: "/about_images/WhatsApp Image 2026-04-19 at 6.33.26 AM.jpeg", category: "Monastery", title: "Sacred Texts", aspect: "aspect-[3/4]" },
  { id: 15, src: "/about_images/kolekar_real_8.jpg", category: "Pravachan", title: "Satsang", aspect: "aspect-video" },
  { id: 16, src: "/about_images/WhatsApp Image 2026-04-19 at 6.33.29 AM (2).jpeg", category: "Blessings", title: "Divine Procession", aspect: "aspect-[3/4]" },
];

const Gallery = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [displayImages, setDisplayImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const categoryParam = searchParams.get('category');

  useEffect(() => {
    if (categoryParam && GALLERY_CATEGORIES.includes(categoryParam)) {
      setActiveCategory(categoryParam);
    } else {
      setActiveCategory("All");
    }
  }, [categoryParam]);

  // News states
  const [newsItems, setNewsItems] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);

  useEffect(() => {
    if (activeCategory === "News" && newsItems.length === 0) {
      fetchNews();
    }
  }, [activeCategory]);

  const fetchNews = async () => {
    try {
      setLoadingNews(true);
      const res = await api.get('/news');
      setNewsItems(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch news items", err);
    } finally {
      setLoadingNews(false);
    }
  };

  const formatDateString = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  
  useEffect(() => {
    document.title = "Gallery | Shri Rudrapashupati Kolekar Maharaj Sansthan";
    
    const fetchGallery = async () => {
      try {
        const res = await api.get('/gallery');
        // Shuffle images so the sequence is different every time the page loads
        const shuffled = [...res.data.data].sort(() => 0.5 - Math.random());
        setDisplayImages(shuffled);
      } catch (error) {
        console.error("Failed to fetch gallery items", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGallery();
  }, []);

  const filteredImages = displayImages.filter(img => 
    activeCategory === "All" ? true : (img.category && img.category.trim().toLowerCase() === activeCategory.trim().toLowerCase())
  );

  const imagesToDisplay = activeCategory === "News" 
    ? newsItems.map((item) => ({
        id: item._id,
        url: item.coverImage,
        title: item.title,
        category: "News",
        type: "image"
      }))
    : filteredImages;

  const openLightbox = (index) => setSelectedImageIndex(index);
  const closeLightbox = () => setSelectedImageIndex(null);
  
  const showNext = (e) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev + 1) % imagesToDisplay.length);
  };
  
  const showPrev = (e) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev - 1 + imagesToDisplay.length) % imagesToDisplay.length);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans text-caramel-deep selection:bg-gold selection:text-white overflow-x-hidden">
      <Navbar />

      {/* Modern Editorial Hero Section */}
      <section className="relative w-full min-h-[60vh] md:min-h-[70vh] flex flex-col justify-end overflow-hidden bg-[#FDFBF7]">
        {/* Parallax Background Fading into Cream */}
        <div className="absolute top-0 left-0 w-full h-[80%] md:h-[85%] z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-[#FDFBF7] z-10"></div>
          <img src={heroBg} alt="Temple Heritage" className="w-full h-full object-cover object-top opacity-90" />
        </div>
        
        <div className="relative z-20 w-full max-w-7xl mx-auto px-4 md:px-8 pb-12 md:pb-20 mt-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="w-full md:w-3/4 lg:w-2/3"
          >
            <div className="flex items-center gap-4 mb-6">
               <span className="w-12 h-px bg-gold"></span>
               <h4 className="text-gold font-bold tracking-[0.3em] uppercase text-xs md:text-sm">Visual Archive</h4>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold text-caramel-deep mb-8 tracking-tight leading-[1.1] drop-shadow-sm">
              Sacred <br /> <span className="text-[#4A0E0E]">Memories</span>
            </h1>
            
            <p className="text-base md:text-xl lg:text-2xl text-caramel-dark max-w-xl font-light leading-relaxed">
              A timeless journey through divine ceremonies, ancient heritage, and the boundless grace of the Guru-Shishya parampara.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Gallery Area */}
      <section className="relative z-30 pt-8 pb-32 bg-[#FDFBF7]">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          
          {/* Category Filter Pills (All 7 Categories + All) */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
            {GALLERY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
                  activeCategory === cat
                    ? "bg-[#4A0E0E] text-white shadow-lg scale-105"
                    : "bg-white text-gray-700 hover:bg-orange-50 border border-stone-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {((activeCategory === "News" && loadingNews) || (activeCategory !== "News" && loading)) ? (
             <div className="text-center py-32">
                <p className="text-caramel-dark text-2xl font-light">Loading Divine Memories...</p>
             </div>
          ) : imagesToDisplay.length === 0 ? (
             <div className="text-center py-32">
                <p className="text-caramel-dark text-2xl font-light">No media found for this category.</p>
             </div>
          ) : (
            <motion.div 
              layout
              className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6"
            >
              <AnimatePresence>
                {imagesToDisplay.map((image, index) => (
                  <motion.div
                    key={image._id || image.id || `gallery-img-${index}`}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                    className="break-inside-avoid relative group overflow-hidden cursor-pointer bg-white rounded-lg shadow-sm hover:shadow-2xl transition-all duration-500"
                    onClick={() => openLightbox(index)}
                  >
                    {image.type === 'video' ? (
                      <iframe 
                        src={image.url?.includes('youtube.com') || image.url?.includes('youtu.be') ? image.url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/") : getImageUrl(image.url)} 
                        title={image.title} 
                        className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-[1.5s] ease-out pointer-events-none"
                        loading="lazy"
                      />
                    ) : (
                      <img 
                        src={getImageUrl(image.url)} 
                        alt={image.title} 
                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-[1.5s] ease-out"
                        loading="lazy"
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {selectedImageIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl"
            onClick={closeLightbox}
          >
            {/* Close Button */}
            <button 
              className="absolute top-6 right-6 md:top-10 md:right-10 w-12 h-12 bg-white/10 hover:bg-gold hover:text-[#4A0E0E] text-white rounded-full flex items-center justify-center transition-colors border border-white/20 z-[110]"
              onClick={closeLightbox}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation Arrows */}
            <button 
              className="absolute left-4 md:left-10 w-12 h-12 md:w-16 md:h-16 bg-white/5 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors border border-white/10 z-[110] backdrop-blur-md"
              onClick={showPrev}
            >
              <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
            </button>
            <button 
              className="absolute right-4 md:right-10 w-12 h-12 md:w-16 md:h-16 bg-white/5 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors border border-white/10 z-[110] backdrop-blur-md"
              onClick={showNext}
            >
              <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
            </button>

            {/* Image Container */}
            <div 
              className="relative w-full h-full flex flex-col items-center justify-center p-4 md:p-20"
              onClick={(e) => e.stopPropagation()} // Prevent clicking image from closing
            >
              {imagesToDisplay[selectedImageIndex].type === 'video' ? (
                <iframe
                  src={imagesToDisplay[selectedImageIndex].url?.includes('youtube.com') || imagesToDisplay[selectedImageIndex].url?.includes('youtu.be') ? imagesToDisplay[selectedImageIndex].url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/") : getImageUrl(imagesToDisplay[selectedImageIndex].url)}
                  title={imagesToDisplay[selectedImageIndex].title}
                  className="w-full md:w-[80vw] h-[50vh] md:h-[80vh] object-contain rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10 bg-black"
                  allowFullScreen
                />
              ) : (
                <motion.img
                  key={selectedImageIndex} // forces re-animation on change
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  src={getImageUrl(imagesToDisplay[selectedImageIndex].url)}
                  alt={imagesToDisplay[selectedImageIndex].title}
                  className="max-w-full max-h-[85vh] object-contain rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default Gallery;


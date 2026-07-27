import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BookOpen, PlayCircle } from 'lucide-react';
import { FaOm } from 'react-icons/fa';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../utils/api';

const getMediaUrl = (url) => {
  if (!url || typeof url !== 'string' || url.includes('undefined')) return null;
  let cleanUrl = url.trim();
  if (cleanUrl.startsWith('http://')) {
    cleanUrl = cleanUrl.replace('http://', 'https://');
  }
  if (cleanUrl.startsWith('https://')) return cleanUrl;
  const backendUrl = import.meta.env.VITE_ASSETS_URL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : "http://localhost:5000");
  return `${backendUrl}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
};

const MathHistory = () => {
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Monastery Importance & History | Kolekar Maharaj Sansthan";
    window.scrollTo(0, 0);
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/math-history/public');
      setHistoryRecords(res.data.data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF6] font-sans text-mahakal-burgundy selection:bg-mahakal-saffron selection:text-white overflow-x-hidden">
      <Navbar />

      {/* ADVANCED LIGHT THEME HERO SECTION (SIDE-BY-SIDE) */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-24 pb-12 border-b border-stone-200 bg-white">
        {/* Dynamic Soft Background Elements */}
        <div className="absolute inset-0 z-0 bg-white">
           <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-50 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3"></div>
           <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-amber-50 rounded-full blur-[100px] -translate-x-1/4 translate-y-1/4"></div>
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full flex flex-col md:flex-row items-center justify-between gap-12 lg:gap-20">
          
          {/* Text Content (Left) */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="flex-1 text-center md:text-left"
          >
            <div className="mb-6 flex items-center justify-center md:justify-start gap-4">
              <span className="w-12 h-[2px] bg-mahakal-saffron/40"></span>
              <span className="text-mahakal-saffron font-bold tracking-[0.3em] text-xs uppercase">
                Spiritual Epicenter & Heritage
              </span>
            </div>
            
            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-[5.5rem] font-serif font-bold text-mahakal-burgundy mb-8 leading-[1.1] tracking-tight drop-shadow-sm">
              Monastery Importance <br />
              <span className="text-mahakal-saffron drop-shadow-sm">Sacred History</span>
            </h1>

            <p className="text-lg lg:text-xl text-stone-600 max-w-2xl leading-relaxed font-medium italic border-l-4 border-mahakal-saffron/30 pl-6">
              "A sanctuary where the divine descends into the earthly realm. Explore the unbroken timeline of our profound heritage."
            </p>
          </motion.div>

          {/* Visual/Logo (Right) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
            className="flex-shrink-0 relative flex justify-center"
          >
            <div className="absolute inset-0 bg-mahakal-saffron/10 blur-[60px] rounded-full scale-150"></div>
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="w-48 h-48 lg:w-64 lg:h-64 relative flex items-center justify-center"
            >
               <div className="absolute inset-0 border-[2px] border-mahakal-saffron/30 rounded-full scale-[1.3] border-dashed animate-[spin_40s_linear_infinite_reverse]"></div>
               <div className="absolute inset-0 border-[4px] border-orange-100 rounded-full scale-[1.1]"></div>
               <div className="w-full h-full bg-white rounded-full border border-orange-200 flex items-center justify-center shadow-2xl relative z-10 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-orange-50 to-transparent"></div>
                  <FaOm className="text-[6rem] lg:text-[8rem] text-mahakal-saffron relative z-10 drop-shadow-md" />
               </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* DYNAMIC SPLIT TIMELINE SECTION (LIGHT THEME) */}
      <section className="py-32 relative z-20 bg-[#FFFDF6] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          {loading ? (
             <div className="flex justify-center py-32">
                <div className="w-16 h-16 border-4 border-mahakal-saffron border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : historyRecords.length === 0 ? (
             <div className="text-center py-32 bg-white rounded-[3rem] border border-stone-200 shadow-sm">
                <FaOm className="w-20 h-20 text-stone-300 mx-auto mb-6" />
                <h3 className="text-3xl font-serif font-bold text-stone-500">The archives are awaiting revelation.</h3>
             </div>
          ) : (
             <div className="relative">
                {/* Central Sacred Axis */}
                <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-mahakal-saffron/30 to-transparent -translate-x-1/2"></div>
                
                <div className="space-y-32">
                  {historyRecords.map((record, index) => {
                    const isEven = index % 2 === 0;
                    const mediaArray = record.media || [];
                    const mainMedia = mediaArray.length > 0 ? mediaArray[0] : null;
                    const mediaUrl = mainMedia ? getMediaUrl(mainMedia.url) : null;

                    return (
                      <motion.div 
                        key={record._id}
                        initial={{ opacity: 0, y: 100 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false, amount: 0.1 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`relative flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-24 ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}
                      >
                         {/* Axis Node */}
                         <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-mahakal-saffron rounded-full z-20 shadow-md items-center justify-center">
                            <div className="w-2 h-2 bg-mahakal-saffron rounded-full animate-pulse"></div>
                         </div>
                         
                         {/* Text Content Half */}
                         <div className={`w-full lg:w-1/2 flex flex-col ${isEven ? 'lg:pr-16 lg:text-right lg:items-end' : 'lg:pl-16 lg:text-left lg:items-start'} text-center items-center`}>
                            <div className="mb-6 flex flex-wrap gap-3 justify-center lg:justify-start">
                              <span className="px-5 py-2 bg-orange-50 border border-orange-100 text-mahakal-saffron rounded-full text-xs font-bold uppercase tracking-[0.2em]">
                                 {record.era}
                              </span>
                              <span className="px-5 py-2 bg-stone-50 border border-stone-200 text-stone-600 rounded-full text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                                 <Sparkles className="w-3 h-3 text-mahakal-saffron" /> {record.category}
                              </span>
                            </div>
                            
                            <h3 className="text-4xl lg:text-6xl font-serif font-bold text-mahakal-burgundy mb-6 leading-tight">
                               {record.title}
                            </h3>
                            
                            <p className="text-stone-600 text-lg lg:text-xl font-medium leading-relaxed whitespace-pre-wrap">
                              {record.content}
                            </p>
                         </div>
                         
                         {/* Visual / Media Half */}
                         <div className="w-full lg:w-1/2 group">
                            {mediaUrl ? (
                               <div className={`relative h-[400px] lg:h-[600px] w-full rounded-[2.5rem] overflow-hidden shadow-lg border border-stone-200 bg-white transition-all duration-700 hover:shadow-2xl hover:border-mahakal-saffron/30 p-2`}>
                                 <div className="w-full h-full rounded-[2rem] overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    {mainMedia.type === 'image' ? (
                                        <img 
                                          src={mediaUrl} 
                                          alt={record.title} 
                                          onError={(e) => { e.target.onerror = null; e.target.src = '/about_images/kolekar_real_3.jpg'; }}
                                          className="w-full h-full object-cover object-[50%_20%] group-hover:scale-105 transition-transform duration-[2s] ease-out" 
                                        />
                                    ) : mainMedia.type === 'video' ? (
                                        <div className="relative w-full h-full">
                                          <video 
                                            src={mediaUrl} 
                                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-[2s] ease-out"
                                            autoPlay muted loop playsInline
                                          />
                                          <div className="absolute inset-0 flex items-center justify-center z-20">
                                            <PlayCircle className="w-20 h-20 text-white/80 group-hover:text-mahakal-saffron transition-colors duration-500 drop-shadow-md" />
                                          </div>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-stone-50 group-hover:bg-orange-50 transition-colors duration-500">
                                          <BookOpen className="w-24 h-24 text-stone-300 mb-6 group-hover:text-mahakal-saffron transition-colors duration-500" />
                                          <span className="text-stone-500 uppercase tracking-widest font-bold text-sm">View Document</span>
                                        </div>
                                    )}
                                 </div>
                               </div>
                            ) : (
                               <div className="relative h-[300px] w-full rounded-[2.5rem] overflow-hidden border border-stone-200 bg-stone-50 flex items-center justify-center">
                                  <FaOm className="w-32 h-32 text-stone-200" />
                               </div>
                            )}
                         </div>
                      </motion.div>
                    );
                  })}
                </div>
             </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MathHistory;

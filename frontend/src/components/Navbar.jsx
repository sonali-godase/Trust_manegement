import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiX, FiGlobe, FiChevronDown, FiLogOut } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { getCurrentLiveStream } from '../services/liveService';
import api from '../utils/api';

const getProfilePhoto = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/api$/, "");
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isDevoteeMenuOpen, setIsDevoteeMenuOpen] = useState(false);
  const [bulletins, setBulletins] = useState([]);
  const langMenuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    
    const handleClickOutside = (event) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchBulletins = async () => {
      try {
        const res = await api.get('/bulletins/public');
        if (res.data && res.data.success) {
          setBulletins(res.data.bulletins);
        }
      } catch (err) {
        console.error("Error fetching bulletins:", err);
      }
    };
    fetchBulletins();
  }, []);

  useEffect(() => {
    const checkLiveStatus = async () => {
      try {
        const response = await getCurrentLiveStream();
        if (response && response.success) {
          setIsLive(response.isLive);
        }
      } catch (err) {
        console.error("Error checking live status:", err);
      }
    };
    checkLiveStatus();
    const interval = setInterval(checkLiveStatus, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    document.cookie = `googtrans=/en/${lng}; path=/;`;
    document.cookie = `googtrans=/en/${lng}; path=/; domain=${window.location.hostname};`;
    setIsLangMenuOpen(false);
    
    // Slight delay to ensure cookies are set before reload
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const navLinks = [
    { name: t('navbar.home') || 'Home', path: '/' },
    {
      name: t('navbar.about') || 'About Sansthan',
      dropdown: [
        { name: 'About Trust', path: '/about' },
        { name: 'Monastrey Importance & History', path: '/math-history' },
        { name: 'Lineage', path: '/lineage' }
      ]
    },
    { name: t('navbar.events') || 'Events', path: '/events' },
    {
      name: t('navbar.gallery') || 'Gallery',
      dropdown: [
        { name: 'All Photos', path: '/gallery' },
        { name: 'Blessings', path: '/gallery?category=Blessings' },
        { name: 'Festivals', path: '/gallery?category=Festivals' },
        { name: 'Pooja', path: '/gallery?category=Pooja' },
        { name: 'Pravachan', path: '/gallery?category=Pravachan' },
        { name: 'Monastery', path: '/gallery?category=Monastery' },
        { name: 'Maharaj', path: '/gallery?category=Maharaj' },
        { name: 'News', path: '/gallery?category=News' }
      ]
    },
    {
      name: t('navbar.donations') || 'Donation & Seva',
      dropdown: [
        { name: 'Online Donation', path: '/donate' },
        { name: 'Annadaan Seva', path: '/annadaan' }
      ]
    },
    { name: t('navbar.contact') || 'Contact', path: '/contact' },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col shadow-soft">
      {/* Global Solid Burgundy Marquee */}
      {bulletins.length > 0 && (
      <div className="w-full bg-mahakal-burgundy py-2 overflow-hidden flex items-center relative z-[60]">
        <motion.div 
          className="whitespace-nowrap flex items-center font-medium text-[11px] sm:text-[13px] tracking-wide text-white px-2 sm:px-4"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 40 }}
        >
          <div className="flex items-center gap-12 pr-12">
            {bulletins.map((b, idx) => (
               <React.Fragment key={idx}>
                 <span className="flex items-center gap-3 text-gold font-bold">✨ {b.headline}</span>
                 <span className="text-mahakal-saffron/80">•</span>
                 {b.messages.map((m, mIdx) => (
                   <React.Fragment key={`${idx}-${mIdx}`}>
                     <span className="flex items-center gap-3">{m}</span>
                     <span className="text-mahakal-saffron/80">•</span>
                   </React.Fragment>
                 ))}
               </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-12 pr-12">
            {bulletins.map((b, idx) => (
               <React.Fragment key={`dup-${idx}`}>
                 <span className="flex items-center gap-3 text-gold font-bold">✨ {b.headline}</span>
                 <span className="text-mahakal-saffron/80">•</span>
                 {b.messages.map((m, mIdx) => (
                   <React.Fragment key={`dup-${idx}-${mIdx}`}>
                     <span className="flex items-center gap-3">{m}</span>
                     <span className="text-mahakal-saffron/80">•</span>
                   </React.Fragment>
                 ))}
               </React.Fragment>
            ))}
          </div>
        </motion.div>
      </div>
      )}

      <nav
        className={`transition-all duration-500 ease-in-out border-b ${
          isScrolled
            ? 'bg-gradient-to-r from-mahakal-cream via-white to-mahakal-cream border-amber-200/50 py-3 shadow-md'
            : 'bg-gradient-to-r from-mahakal-cream via-white to-mahakal-cream border-transparent py-4'
        }`}
      >
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex justify-between items-center w-full">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-4 group">
          <img 
            src="/logo.png" 
            alt="Kolekar Maharaj Logo" 
            className="w-14 h-14 object-contain group-hover:scale-105 transition-all duration-300 drop-shadow-md rounded-full bg-white" 
          />
          <div className="flex flex-col hidden md:flex">
            <span className="font-serif text-xl font-bold tracking-wide text-mahakal-burgundy leading-tight">
              {t('global.logo_title') || 'Kolekar Maharaj'}
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navLinks.map((link, idx) => {
            const isActive = location.pathname === link.path || link.dropdown?.some(d => location.pathname === d.path);
            
            if (link.dropdown) {
              return (
                <div key={idx} className="relative group">
                  <div
                    className={`cursor-pointer flex items-center gap-1 font-serif font-bold text-[14px] tracking-widest px-4 py-2 rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'text-mahakal-saffron bg-mahakal-saffron/10 border border-mahakal-saffron/20'
                        : 'text-mahakal-burgundy hover:text-mahakal-saffron hover:bg-mahakal-saffron/10 border border-transparent'
                    }`}
                  >
                    {link.name}
                    <FiChevronDown className="text-xs transition-transform duration-300 group-hover:rotate-180" />
                  </div>
                  {/* Dropdown Box */}
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-stone-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 flex flex-col py-2 z-50">
                    {link.dropdown.map(dLink => (
                      <Link
                        key={dLink.name}
                        to={dLink.path}
                        className="px-4 py-2 text-sm font-semibold text-mahakal-burgundy hover:bg-mahakal-saffron/10 hover:text-mahakal-saffron transition-colors"
                      >
                        {dLink.name}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={idx}
                to={link.path}
                className={`font-serif font-bold text-[14px] tracking-widest px-4 py-2 rounded-xl transition-all duration-300 relative group ${
                  isActive
                    ? 'text-mahakal-saffron bg-mahakal-saffron/10 border border-mahakal-saffron/20'
                    : 'text-mahakal-burgundy hover:text-mahakal-saffron hover:bg-mahakal-saffron/10 border border-transparent'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Action Buttons & Profile */}
        <div className="hidden md:flex gap-4 items-center">
          
          {/* LIVE Button */}
          {isLive && (
            <Link
              to="/events"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 border border-red-700 text-white font-bold text-[13px] shadow-sm hover:bg-red-700 transition-all animate-pulse"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              {t('navbar.live') || 'LIVE'}
            </Link>
          )}

          {/* Language Switcher */}
          <div className="relative z-50" ref={langMenuRef}>
            <button 
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-mahakal-burgundy bg-white border border-mahakal-burgundy/20 transition-all duration-300 hover:border-mahakal-saffron hover:text-mahakal-saffron"
            >
              <FiGlobe className="text-lg" />
              <span className="text-sm font-bold tracking-wider">
                {i18n.language?.startsWith('hi') ? 'हिन्दी' : i18n.language?.startsWith('mr') ? 'मराठी' : i18n.language?.startsWith('kn') ? 'ಕನ್ನಡ' : 'EN'}
              </span>
              <FiChevronDown className="text-xs opacity-70" />
            </button>
            
            <AnimatePresence>
              {isLangMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-3 w-40 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/50 border border-white overflow-hidden text-caramel-deep p-2"
                >
                  <button onClick={() => changeLanguage('en')} className="w-full text-left px-4 py-2.5 text-sm font-medium tracking-wide rounded-xl hover:bg-glass-20 hover:text-primary transition-colors">English</button>
                  <button onClick={() => changeLanguage('hi')} className="w-full text-left px-4 py-2.5 text-sm font-medium tracking-wide rounded-xl hover:bg-glass-20 hover:text-primary transition-colors">हिन्दी</button>
                  <button onClick={() => changeLanguage('mr')} className="w-full text-left px-4 py-2.5 text-sm font-medium tracking-wide rounded-xl hover:bg-glass-20 hover:text-primary transition-colors">मराठी</button>
                  <button onClick={() => changeLanguage('kn')} className="w-full text-left px-4 py-2.5 text-sm font-medium tracking-wide rounded-xl hover:bg-glass-20 hover:text-primary transition-colors">ಕನ್ನಡ</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {user ? (
            <div className={`relative cursor-pointer flex items-center gap-2 ${user.role !== 'Devotee' ? 'group' : ''}`}>
              <div 
                onClick={() => {
                   if(user.role === 'Devotee') setIsDevoteeMenuOpen(true);
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-soft bg-primary/10 text-primary border border-primary/30 transition-all overflow-hidden"
              >
                {user?.profilePhoto ? (
                  <img src={getProfilePhoto(user.profilePhoto)} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.name ? user.name.charAt(0).toUpperCase() : 'U'
                )}
              </div>
              
              {/* Dropdown Menu for non-devotees */}
              {user.role !== 'Devotee' && (
                <div className="absolute top-full right-0 mt-3 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-[70]">
                  <div className="p-3 border-b border-white mb-2">
                    <p className="text-sm font-bold text-caramel-deep truncate">{user.name || user.email}</p>
                    <p className="text-xs text-primary capitalize mt-0.5">{user.role}</p>
                  </div>
                  <Link
                    to={user.role === 'BranchManager' ? '/branch/dashboard' : (user.role === 'DocumentHandler' || user.role === 'document_admin') ? '/document-handler/dashboard' : `/${user.role.toLowerCase()}/dashboard`}
                    className="block w-full text-left px-4 py-2.5 text-sm font-medium text-caramel-deep hover:bg-primary/10 hover:text-primary rounded-xl transition-colors mb-1"
                  >
                    Go to Dashboard
                  </Link>
                  <button 
                    onClick={logout}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors"
                  >
                    {t('navbar.logout') || 'Logout'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="font-semibold text-sm tracking-wider text-caramel-dark hover:text-caramel-deep transition-colors"
              >
                {t('navbar.login') || 'Login'}
              </Link>
              <Link
                to="/register"
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-gold text-caramel-deep font-bold text-sm tracking-wider uppercase rounded-xl shadow-soft hover:shadow-soft hover:-translate-y-0.5 transition-all duration-300"
              >
                {t('navbar.register') || 'Register'}
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="lg:hidden flex items-center gap-3">
          <button
            className="text-2xl p-2 rounded-xl text-caramel-deep hover:bg-glass-20 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
             {isMobileMenuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={{ height: isMobileMenuOpen ? 'auto' : 0, opacity: isMobileMenuOpen ? 1 : 0 }}
        className="lg:hidden bg-cream/95 backdrop-blur-2xl overflow-y-auto max-h-[85vh] shadow-2xl absolute top-full left-0 right-0 border-t border-white rounded-b-3xl"
      >
        <div className="px-6 py-6 flex flex-col gap-2">
          {navLinks.map((link) => {
            if (link.dropdown) {
              return (
                <div key={link.name} className="flex flex-col gap-1 mb-2">
                  <div className="font-bold text-xs tracking-widest uppercase text-stone-400 px-4 pt-2">
                    {link.name}
                  </div>
                  {link.dropdown.map(dLink => {
                    const isActive = location.pathname === dLink.path;
                    return (
                      <Link
                        key={dLink.name}
                        to={dLink.path}
                        className={`font-semibold text-sm tracking-widest uppercase px-6 py-2 rounded-xl transition-colors ${
                          isActive ? 'bg-mahakal-saffron/10 text-mahakal-saffron border border-mahakal-saffron/20' : 'text-mahakal-burgundy hover:bg-stone-50'
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {dLink.name}
                      </Link>
                    )
                  })}
                </div>
              );
            }
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`font-semibold text-sm tracking-widest uppercase px-4 py-3 rounded-xl transition-colors ${
                  isActive ? 'bg-mahakal-saffron/10 text-mahakal-saffron border border-mahakal-saffron/20' : 'text-mahakal-burgundy hover:bg-stone-50'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            );
          })}
          
          <div className="my-4 border-t border-white pt-4">
            <span className="text-xs font-bold text-caramel-dark uppercase tracking-wider ml-4 mb-3 block">Language</span>
            <div className="grid grid-cols-2 gap-3 px-2">
              <button onClick={() => changeLanguage('en')} className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-sm font-semibold rounded-xl text-caramel-deep border border-white hover:border-primary/30 transition-colors">English</button>
              <button onClick={() => changeLanguage('hi')} className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-sm font-semibold rounded-xl text-caramel-deep border border-white hover:border-primary/30 transition-colors">हिन्दी</button>
              <button onClick={() => changeLanguage('mr')} className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-sm font-semibold rounded-xl text-caramel-deep border border-white hover:border-primary/30 transition-colors">मराठी</button>
              <button onClick={() => changeLanguage('kn')} className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-sm font-semibold rounded-xl text-caramel-deep border border-white hover:border-primary/30 transition-colors">ಕನ್ನಡ</button>
            </div>
          </div>

          {user ? (
            <div className="mt-4 pt-4 border-t border-white">
              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-soft bg-primary/10 text-primary border border-primary/30 overflow-hidden">
                  {user?.profilePhoto ? (
                    <img src={getProfilePhoto(user.profilePhoto)} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user?.name ? user.name.charAt(0).toUpperCase() : 'U'
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-caramel-deep truncate">{user.name || user.email}</p>
                  <p className="text-xs text-primary capitalize">{user.role}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 px-2">
                {user.role === 'Devotee' ? (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsDevoteeMenuOpen(true);
                    }}
                    className="w-full text-center py-3 bg-gradient-to-r from-primary to-gold text-caramel-deep rounded-xl font-bold text-sm tracking-wider shadow-soft uppercase"
                  >
                    Open Dashboard
                  </button>
                ) : (
                  <Link
                    to={user.role === 'BranchManager' ? '/branch/dashboard' : (user.role === 'DocumentHandler' || user.role === 'document_admin') ? '/document-handler/dashboard' : `/${user.role.toLowerCase()}/dashboard`}
                    className="w-full text-center py-3 bg-gradient-to-r from-primary to-gold text-caramel-deep rounded-xl font-bold text-sm tracking-wider shadow-soft block uppercase"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Go to Dashboard
                  </Link>
                )}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold text-sm tracking-wider uppercase transition-colors"
                >
                  <FiLogOut className="text-lg" /> {t('navbar.logout') || 'Logout'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 mt-2 px-2">
              <Link
                to="/login"
                className="flex-1 text-center py-3 bg-glass-20 text-caramel-deep border border-glass-30 rounded-xl font-bold text-sm tracking-wider uppercase"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('navbar.login') || 'Login'}
              </Link>
              <Link
                to="/register"
                className="flex-1 text-center py-3 bg-gradient-to-r from-primary to-gold text-caramel-deep rounded-xl font-bold text-sm tracking-wider uppercase shadow-soft"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('navbar.register') || 'Register'}
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </nav>
      {/* Devotee Slide Navigation */}
      <AnimatePresence>
        {isDevoteeMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsDevoteeMenuOpen(false)}
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[80]"
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-80 bg-[#FFFDF9] shadow-2xl z-[90] flex flex-col border-l border-amber-100"
            >
              <div className="p-6 border-b border-amber-100/50 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md border-2 border-white overflow-hidden">
                    {user?.profilePhoto ? (
                      <img src={getProfilePhoto(user.profilePhoto)} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      user?.name ? user.name.charAt(0).toUpperCase() : 'U'
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-serif text-[#8D5B2F] truncate">{user?.name || 'Devotee'}</h3>
                    <p className="text-xs text-[#8D5B2F]/70 font-semibold uppercase tracking-wider">{user?.role || 'Devotee'}</p>
                  </div>
                </div>
                <button onClick={() => setIsDevoteeMenuOpen(false)} className="text-orange-900/40 hover:text-orange-900 p-2 bg-white rounded-full shadow-sm border border-amber-100 transition-all">
                  <FiX size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 py-6 space-y-2">
                <Link to="/devotee/dashboard" onClick={() => setIsDevoteeMenuOpen(false)} className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-[#8D5B2F] hover:bg-orange-50 hover:text-orange-600 transition-all font-semibold shadow-sm border border-transparent hover:border-orange-100">
                  <span className="text-lg text-orange-400">🏠</span> Dashboard Home
                </Link>
                <Link to="/devotee/vanshawal" onClick={() => setIsDevoteeMenuOpen(false)} className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-[#8D5B2F] hover:bg-orange-50 hover:text-orange-600 transition-all font-semibold shadow-sm border border-transparent hover:border-orange-100">
                  <span className="text-lg text-orange-400">🌳</span> My Vanshawal (Family Tree)
                </Link>
                <Link to="/devotee/donations" onClick={() => setIsDevoteeMenuOpen(false)} className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-[#8D5B2F] hover:bg-orange-50 hover:text-orange-600 transition-all font-semibold shadow-sm border border-transparent hover:border-orange-100">
                  <span className="text-lg text-yellow-500">💝</span> My Donations
                </Link>
                <Link to="/devotee/annadaan" onClick={() => setIsDevoteeMenuOpen(false)} className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-[#8D5B2F] hover:bg-orange-50 hover:text-orange-600 transition-all font-semibold shadow-sm border border-transparent hover:border-orange-100">
                  <span className="text-lg text-red-400">🍚</span> Annadaan Seva
                </Link>
                <Link to="/devotee/settings" onClick={() => setIsDevoteeMenuOpen(false)} className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-[#8D5B2F] hover:bg-orange-50 hover:text-orange-600 transition-all font-semibold shadow-sm border border-transparent hover:border-orange-100">
                  <span className="text-lg text-stone-500">⚙️</span> Profile Settings
                </Link>
              </div>
              <div className="p-6 border-t border-amber-100/50 bg-[#FFFDF9]">
                <button 
                  onClick={() => { setIsDevoteeMenuOpen(false); logout(); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors font-bold shadow-sm border border-red-100"
                >
                  <FiLogOut className="text-lg" /> {t('navbar.logout') || 'Logout'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Navbar;
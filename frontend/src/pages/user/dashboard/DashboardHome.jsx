import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getDashboardStats, getMyDonations, getMyAnnadaan } from '../../../services/userDashboardService';
import { CardSkeleton, RowSkeleton } from '../../../components/dashboard/LoadingSkeleton';
import { FaClipboardList, FaDonate, FaUtensils, FaUserCheck, FaCalendarAlt, FaHistory } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedCounter from '../../../components/dashboard/AnimatedCounter';
import VanshawalPrompt from '../../../components/family/VanshawalPrompt';

export const DashboardHome = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalDonations: 0,
    totalDonationAmount: 0,
    totalAnnadaan: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch stats and actual items to construct recent activity
        const [statsRes, donationsRes, annadaanRes] = await Promise.all([
          getDashboardStats(),
          getMyDonations({ page: 1, limit: 5 }),
          getMyAnnadaan()
        ]);

        if (statsRes.data?.success) {
          const fetchedStats = statsRes.data.data || {};
          setStats({
            totalOrders: Number(fetchedStats.totalOrders) || 0,
            totalDonations: Number(fetchedStats.totalDonations) || 0,
            totalDonationAmount: Number(fetchedStats.totalDonationAmount) || 0,
            totalAnnadaan: Number(fetchedStats.totalAnnadaan) || 0
          });
        }

        const activities = [];

        if (donationsRes.data?.success && donationsRes.data.data) {
          donationsRes.data.data.forEach(d => {
            activities.push({
              id: d._id,
              type: 'donation',
              title: `Donated ₹${d.amount}`,
              subtitle: `Purpose: ${d.purpose} | txn: ${d.transactionId || 'N/A'}`,
              date: new Date(d.date || d.createdAt),
              status: d.status,
              link: '/devotee/donations'
            });
          });
        }

        if (annadaanRes.data?.success && annadaanRes.data.data) {
          const upcomingReminders = [];
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          annadaanRes.data.data.forEach(a => {
            const annadaanDate = new Date(a.date);
            annadaanDate.setHours(0, 0, 0, 0);
            
            if (a.status === 'approved' && annadaanDate >= today) {
              const diffTime = Math.abs(annadaanDate - today);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays <= 30) {
                upcomingReminders.push({
                  id: a._id,
                  type: 'annadaan',
                  title: `Upcoming Annadaan: ${a.annadaanType}`,
                  daysRemaining: diffDays,
                  date: annadaanDate
                });
              }
            }

            activities.push({
              id: a._id,
              type: 'annadaan',
              title: `Annadaan: ${a.annadaanType}`,
              subtitle: `Scheduled for: ${new Date(a.date).toLocaleDateString()} at ${a.time}`,
              date: new Date(a.createdAt || a.date),
              status: a.status,
              link: '/devotee/annadaan'
            });
          });

          // Sort reminders by closest date
          upcomingReminders.sort((a, b) => a.daysRemaining - b.daysRemaining);
          setReminders(upcomingReminders);
        }

        // Sort: newest first
        activities.sort((a, b) => b.date - a.date);
        setRecentActivity(activities.slice(0, 5));

      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-10 w-64 bg-cream-dark/30 animate-pulse rounded-lg" />
        <CardSkeleton count={4} />
        <div className="h-6 w-48 bg-cream-dark/30 animate-pulse rounded-lg mt-8" />
        <RowSkeleton count={3} />
      </div>
    );
  }

  const statCards = [
    {
      title: "Donations Made",
      value: <AnimatedCounter value={stats.totalDonations} />,
      icon: <FaDonate className="text-2xl text-amber-500" />,
      bg: "bg-amber-50",
      border: "border-amber-100",
      link: null
    },
    {
      title: "Annadaan Participation",
      value: <AnimatedCounter value={stats.totalAnnadaan} />,
      icon: <FaUtensils className="text-2xl text-red-500" />,
      bg: "bg-red-50",
      border: "border-red-100",
      link: "/devotee/annadaan"
    },
    {
      title: "Account Status",
      value: "Active",
      icon: <FaUserCheck className="text-2xl text-emerald-500" />,
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      link: "/devotee/settings"
    }
  ];

  return (
    <div className="space-y-8">
      <VanshawalPrompt user={user} onSetupComplete={(updatedUser) => setUser(updatedUser)} />
      {/* Welcome Panel */}
      <div 
        className="bg-slate-50 border border-slate-200 p-6 md:p-8 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">
            Welcome back, {user?.name || 'Devotee'} 🙏
          </h1>
          <p className="text-sm font-medium text-slate-600">
            Manage your annadaan registrations and track your generous contributions.
          </p>
        </div>
        <button
          onClick={() => navigate('/devotee/settings')}
          className="px-5 py-2.5 bg-slate-900 text-white border border-transparent rounded-lg font-black shadow-md hover:bg-slate-800 transition-all duration-300"
        >
          View Profile
        </button>
      </div>

      {/* Reminders & Alerts Section */}
      <AnimatePresence>
        {reminders.length > 0 && (
          <div
            className="space-y-4"
          >
            {reminders.map((reminder, idx) => (
              <div
                key={reminder.id}
                className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                    <FaCalendarAlt className="text-xl" />
                  </div>
                  <div>
                    <h3 className="text-amber-900 font-bold">{reminder.title}</h3>
                    <p className="text-amber-700 text-sm font-medium">
                      Scheduled for {reminder.date.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="bg-amber-500 text-white px-4 py-2 rounded-lg font-black shadow-sm text-sm whitespace-nowrap">
                  {reminder.daysRemaining === 0 ? "Today!" : `In ${reminder.daysRemaining} Day${reminder.daysRemaining > 1 ? 's' : ''}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Grid of Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <div
            key={card.title}
            onClick={() => card.link ? navigate(card.link) : null}
            className={`bg-white border border-slate-200 p-6 rounded-xl shadow-sm ${card.link ? 'hover:shadow-md cursor-pointer' : ''} transition-all duration-300 flex items-center justify-between`}
          >
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{card.title}</p>
              <h3 className="text-2xl font-black text-slate-900">{card.value}</h3>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg shadow-sm border border-slate-100">
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Feed */}
        <div 
          className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center gap-2.5 mb-6">
            <FaHistory className="text-slate-700 text-xl" />
            <h3 className="text-lg font-bold text-slate-900">Recent Activities</h3>
          </div>

          {recentActivity.length === 0 ? (
            <div className="text-center py-10">
              <span className="text-4xl text-slate-300">📁</span>
              <p className="text-slate-500 font-medium text-sm mt-3">No recent activities found.</p>
            </div>
          ) : (
            <div className="flow-root">
              <ul className="-mb-8">
                {recentActivity.map((activity, idx) => (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {idx !== recentActivity.length - 1 && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-cream-dark/30" aria-hidden="true" />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8.5 w-8.5 rounded-full flex items-center justify-center ring-8 ring-white ${
                            activity.type === 'booking' ? 'bg-orange-100 text-orange-600' :
                            activity.type === 'donation' ? 'bg-amber-100 text-amber-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {activity.type === 'booking' ? <FaClipboardList size={13} /> :
                             activity.type === 'donation' ? <FaDonate size={13} /> :
                             <FaUtensils size={13} />}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5 flex justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-slate-900 hover:text-slate-700 cursor-pointer" onClick={() => navigate(activity.link)}>
                              {activity.title}
                            </p>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">
                              {activity.subtitle}
                            </p>
                          </div>
                          <div className="text-right text-xs font-bold whitespace-nowrap text-slate-400">
                            <time dateTime={activity.date.toISOString()}>
                              {activity.date.toLocaleDateString()}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Quick actions/links */}
        <div 
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between"
        >
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">

              <button 
                onClick={() => navigate('/donate')} 
                className="w-full text-left p-3.5 rounded-lg border border-transparent bg-slate-900 hover:bg-slate-800 transition-all text-sm font-black text-white flex items-center justify-between shadow-md"
              >
                <span>Make a Donation</span>
                <span className="text-white/70">→</span>
              </button>
              <button 
                onClick={() => navigate('/annadaan')} 
                className="w-full text-left p-3.5 rounded-lg border border-transparent bg-slate-900 hover:bg-slate-800 transition-all text-sm font-black text-white flex items-center justify-between shadow-md"
              >
                <span>Register for Annadaan</span>
                <span className="text-white/70">→</span>
              </button>
            </div>
          </div>
          <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <span className="text-xl">🌟</span>
            <p className="text-xs text-slate-600 font-bold mt-2">
              "Giving is not just about making a donation. It is about making a difference."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;

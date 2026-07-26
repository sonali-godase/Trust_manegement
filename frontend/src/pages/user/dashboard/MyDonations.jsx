import React, { useEffect, useState } from 'react';
import { getMyDonations, downloadDonationReceipt } from '../../../services/userDashboardService';
import { TableSkeleton } from '../../../components/dashboard/LoadingSkeleton';
import EmptyState from '../../../components/dashboard/EmptyState';
import StatusBadge from '../../../components/dashboard/StatusBadge';
import { FaDonate, FaDownload, FaCalendarAlt, FaReceipt, FaCoins, FaInfoCircle } from 'react-icons/fa';
import { FiFilter, FiDownload } from 'react-icons/fi';
import { toast, Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { generateFinancialReport } from '../../../utils/reportGenerator';

export const MyDonations = () => {
  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [downloadingId, setDownloadingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const res = await getMyDonations({ page: 1, limit: 100 });
      if (res.data?.success) {
        setDonations(res.data.data);
        setTotalAmount(res.data.totalAmount || 0);
      }
    } catch (err) {
      console.error("Failed to load donations:", err);
      toast.error("Failed to load donation history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const filteredDonations = donations.filter(d => {
    let match = true;
    const dDate = new Date(d.date || d.createdAt);
    if (filterYear && dDate.getFullYear() !== parseInt(filterYear)) match = false;
    if (filterMonth && dDate.getMonth() !== parseInt(filterMonth)) match = false;
    
    if (filterCategory) {
      const type = d.donationType || 'dengi_pavti';
      if (type !== filterCategory) match = false;
    }

    return match;
  });

  const approvedDonations = filteredDonations.filter(d => d.status === 'APPROVED');
  const pendingDonations = filteredDonations.filter(d => d.status === 'PENDING_VERIFICATION');
  const rejectedDonations = filteredDonations.filter(d => d.status === 'REJECTED');
  const totalApprovedAmount = approvedDonations.reduce((sum, d) => sum + d.amount, 0);

  const handleGenerateReport = () => {
    generateFinancialReport(filteredDonations, {
      year: filterYear,
      month: filterMonth,
      status: 'All'
    });
  };

  const renderDonationRow = (d) => (
    <tr key={d._id} className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">
        {d.donationReference || d._id.substring(0,8)}
      </td>
      <td className="px-6 py-4 text-base font-bold text-slate-900">
        ₹{d.amount.toLocaleString('en-IN')}
      </td>
      <td className="px-6 py-4 font-black text-slate-700">
        {d.donationType === 'jama_pavti' ? 'Jama Pavati' : 
         d.donationType === 'shakha_pavti' ? 'Shakha Pavati' : 'Donation Receipt'}
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={d?.status || 'Completed'} />
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-0.5 text-xs text-slate-600">
          <span className="font-black">{d.paymentApp || d.paymentMethod || 'Manual'}</span>
          <span className="flex items-center gap-1 text-[11px] font-black opacity-75">
            <FaCalendarAlt size={10} />
            {new Date(d.date || d.createdAt).toLocaleDateString('en-IN')}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        {d.status === 'APPROVED' ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDownloadReceipt(d._id, d.donationReference);
            }}
            disabled={downloadingId === d._id}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait"
          >
            <FaDownload size={12} className={downloadingId === d._id ? 'animate-bounce' : ''} />
            <span>{downloadingId === d._id ? 'Downloading...' : 'Download Receipt'}</span>
          </button>
        ) : d.status === 'REJECTED' ? (
          <div className="text-xs font-bold text-red-600 max-w-[150px] mx-auto break-words" title={d.rejectionReason}>
            Reason: {d.rejectionReason || 'Contact support'}
          </div>
        ) : (
          <span className="text-xs font-medium text-stone-400">N/A</span>
        )}
      </td>
    </tr>
  );

  const handleDownloadReceipt = async (id, donationRef) => {
    try {
      setDownloadingId(id);
      const res = await downloadDonationReceipt(id);
      
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      const filename = donationRef ? `Donation_Receipt_${donationRef}.pdf` : `Donation_Receipt_${id}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Receipt downloaded successfully!");
    } catch (err) {
      console.error("Receipt download error:", err);
      toast.error("Failed to download receipt.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <Toaster position="top-center" />

      {/* Title and Filters Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex flex-wrap items-center gap-2 text-slate-900"><FaDonate className="text-blue-500" /> My Donations</h1>
          <p className="text-slate-600 font-medium text-sm mt-1">Track your contributions and generate reports.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-bold shadow-sm transition-all hover:shadow`}>
            <FiFilter /> Filter
          </button>
          <button onClick={handleGenerateReport} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 w-full md:w-auto justify-center text-white rounded-xl text-sm font-bold shadow-sm transition-all hover:shadow-md">
            <FiDownload /> Report
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Year</label>
                <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500">
                  <option value="">All Years</option>
                  {Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Month</label>
                <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500">
                  <option value="">All Months</option>
                  <option value="0">January</option>
                  <option value="1">February</option>
                  <option value="2">March</option>
                  <option value="3">April</option>
                  <option value="4">May</option>
                  <option value="5">June</option>
                  <option value="6">July</option>
                  <option value="7">August</option>
                  <option value="8">September</option>
                  <option value="9">October</option>
                  <option value="10">November</option>
                  <option value="11">December</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500">
                  <option value="">All Categories</option>
                  <option value="jama_pavti">Jama Pavati</option>
                  <option value="dengi_pavti">Dengi Pavati</option>
                  <option value="shakha_pavti">Shakha Pavati</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => { setFilterYear(''); setFilterMonth(''); setFilterCategory(''); }} className="text-sm font-bold text-gray-500 hover:text-gray-700">Clear Filters</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Header Card */}
      {!loading && donations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 p-6 md:p-8 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-emerald-400 text-2xl backdrop-blur-sm">
              <FaCoins />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Approved Contribution</p>
              <h2 className="text-4xl font-black text-white tracking-tight">₹{totalApprovedAmount.toLocaleString('en-IN')}</h2>
            </div>
          </div>
          <div className="text-sm bg-white/5 backdrop-blur-md px-5 py-4 rounded-xl border border-white/10 max-w-sm relative z-10">
            <p className="font-medium text-slate-300 leading-relaxed">
              "Your offerings support our sacred ashram maintenance, daily prasad distribution, and social service projects."
            </p>
          </div>
        </motion.div>
      )}

      {loading ? (
        <TableSkeleton cols={5} rows={5} />
      ) : (
        <div className="space-y-8">
          
          {/* Approved Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm sm:text-base text-slate-900 font-black flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-black shrink-0">✓</div>
                <span>Approved Donations</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max border-collapse text-left">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-700">
                    <th className="px-6 py-4">Reference ID</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Method / Date</th>
                    <th className="px-6 py-4 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {approvedDonations.length > 0 ? (
                    approvedDonations.map(renderDonationRow)
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-slate-500 font-bold">
                        No approved donations yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm sm:text-base text-slate-900 font-black flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 shrink-0"><FaInfoCircle size={12}/></div>
                <span>Pending Verification</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max border-collapse text-left">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-700">
                    <th className="px-6 py-4">Reference ID</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Method / Date</th>
                    <th className="px-6 py-4 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {pendingDonations.length > 0 ? (
                    pendingDonations.map(renderDonationRow)
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-slate-500 font-bold">
                        No pending donations.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rejected Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm sm:text-base text-slate-900 font-black flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-black shrink-0">✕</div>
                <span>Rejected Transactions</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max border-collapse text-left">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-700">
                    <th className="px-6 py-4">Reference ID</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Method / Date</th>
                    <th className="px-6 py-4 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {rejectedDonations.length > 0 ? (
                    rejectedDonations.map(renderDonationRow)
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-slate-500 font-bold">
                        No rejected transactions.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );

};

export default MyDonations;



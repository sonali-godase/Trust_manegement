import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Search, Download, Share2, Printer, Eye, Info, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ReceiptHistory = ({ defaultCategory = 'All', hideTitle = false, hideCategoryFilter = false }) => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: defaultCategory,
    branchId: 'All',
    search: '',
    month: '',
    year: new Date().getFullYear().toString()
  });
  const [selectedInfo, setSelectedInfo] = useState(null);
  const { user } = useAuth();

  const [showFilters, setShowFilters] = useState(false);

  let categories = ['All', 'Notice', 'Jama Pavti', 'Branch Pavti', 'Dengi Pavti', 'Donation', 'Branch Donation', 'Annadan', 'Prasad', 'Payment', 'Expense'];
  if (user?.role === 'Accountant') {
    categories = ['All', 'Jama Pavti', 'Branch Pavti', 'Dengi Pavti'];
  } else if (user?.role === 'BranchManager') {
    categories = ['All', 'Branch Donation', 'Annadan', 'Prasad'];
  }
  
  const months = [
    { value: '', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];
  const years = Array.from({length: 5}, (_, i) => (new Date().getFullYear() - i).toString());

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams(filters).toString();
      const res = await api.get(`/receipts?${queryParams}`);
      if (res.data.success) {
        setReceipts(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to load receipts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [filters.category, filters.branchId, filters.year, filters.month]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchReceipts();
  };

  const handleDownload = async (receipt) => {
    const toastId = toast.loading("Downloading document...");
    try {
      let fetchUrl;
      if (receipt.pdfUrl && receipt.pdfUrl.startsWith('/api')) {
        fetchUrl = receipt.pdfUrl.replace('/api', '');
      } else {
        const targetId = receipt.donationId || receipt._id;
        fetchUrl = `/donations/${targetId}/receipt`;
      }

      const response = await api.get(fetchUrl, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${receipt.category.replace(/\s+/g, '_')}_${receipt.receiptNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Downloaded successfully!", { id: toastId });
    } catch (error) {
      console.error("Failed to download PDF:", error);
      toast.error("Failed to download PDF.", { id: toastId });
    }
  };

  const handleView = async (receipt) => {
    const toastId = toast.loading("Loading document...");
    try {
      let fetchUrl;
      if (receipt.pdfUrl && receipt.pdfUrl.startsWith('/api')) {
        fetchUrl = receipt.pdfUrl.replace('/api', '');
      } else {
        const targetId = receipt.donationId || receipt._id;
        fetchUrl = `/donations/${targetId}/receipt`;
      }

      const response = await api.get(fetchUrl, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.dismiss(toastId);
    } catch (error) {
      console.error("Failed to load PDF:", error);
      toast.error("Failed to load PDF.", { id: toastId });
    }
  };

  const handleShare = (receipt) => {
    const fullUrl = receipt.pdfUrl.startsWith('/api') 
        ? window.location.origin + receipt.pdfUrl 
        : receipt.pdfUrl;
        
    const title = `Document: ${receipt.category}`;
    const text = `View ${receipt.category} document (No: ${receipt.receiptNumber}).`;
    
    if (navigator.share) {
      navigator.share({ title, text, url: fullUrl })
        .catch(err => console.log('Error sharing', err));
    } else {
      // Fallback
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + fullUrl)}`, '_blank');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {!hideTitle && <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Document & Receipt History</h1>}

        {/* Filter Toggle Button */}
        <div className="flex justify-end mb-4">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-red-700 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Filter
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm mb-6 flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-end border border-gray-100">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Search Document No.</label>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search REC-..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
              <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            </form>
          </div>
          
          {!hideCategoryFilter && (
            <div className="min-w-[150px]">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
              <select
                className="w-full p-2 border rounded-lg bg-gray-50"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          )}
          
          <div className="min-w-[120px]">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Year</label>
            <select
              className="w-full p-2 border rounded-lg bg-gray-50"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            >
              <option value="">All Time</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              className="w-full p-2 border rounded-lg bg-gray-50"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              disabled={!filters.year}
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          
          </div>
        )}

        {/* Table */}
        <div className="md:bg-white md:rounded-xl md:shadow-sm overflow-hidden relative z-10">
          <div className="w-full overflow-hidden">
            <table className="w-full text-left text-sm block md:table">
              <thead className="bg-gray-50 hidden md:table-header-group border-b border-gray-100">
                <tr>
                  <th className="p-4 md:p-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Document No</th>
                  <th className="p-4 md:p-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="p-4 md:p-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="p-4 md:p-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th className="p-4 md:p-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Branch</th>
                  <th className="p-4 md:p-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Generated By</th>
                  <th className="p-4 md:p-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group w-full divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="6" className="text-center p-8 text-gray-500">Loading documents...</td></tr>
                ) : receipts.length === 0 ? (
                  <tr><td colSpan="6" className="text-center p-8 text-gray-500">No documents found matching filters</td></tr>
                ) : (
                  receipts.map(receipt => (
                    <tr key={receipt._id} className="flex flex-col md:table-row w-full bg-white md:bg-transparent border border-gray-100 md:border-b md:border-x-0 md:border-t-0 md:border-gray-200 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none hover:bg-gray-50 overflow-hidden transition">
                      {/* Mobile Card Top & Desktop ID */}
                      <td className="p-3 md:p-6 flex flex-col md:table-cell w-full border-b border-gray-50 md:border-none">
                        <div className="flex md:hidden justify-between items-start mb-3">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">No: {receipt.receiptNumber}</span>
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold">
                            {receipt.category}
                          </span>
                        </div>
                        <div className="md:hidden mb-2">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Recipient</span>
                          <span className="font-bold text-gray-900 text-sm break-words whitespace-normal">{receipt.dynamicData?.donorName || receipt.dynamicData?.name || receipt.dynamicData?.subject || 'N/A'}</span>
                        </div>
                        <div className="md:hidden mb-1 break-words whitespace-normal">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">Branch:</span>
                          <span className="text-sm font-semibold text-gray-700">{receipt.branchId?.name || 'Main Trust'}</span>
                        </div>
                        {/* Desktop view Content */}
                        <span className="hidden md:inline text-sm font-bold text-gray-900 break-words whitespace-normal">{receipt.receiptNumber}</span>
                      </td>
                      <td className="hidden md:table-cell p-4 md:p-6 text-sm text-gray-700">
                        {new Date(receipt.createdAt).toLocaleDateString()}
                      </td>
                      <td className="hidden md:table-cell p-4 md:p-6">
                        <span className="px-2.5 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-xs font-bold inline-block">
                          {receipt.category}
                        </span>
                      </td>
                      <td className="hidden md:table-cell p-4 md:p-6 text-sm text-gray-900 font-bold break-words whitespace-normal">
                        {receipt.dynamicData?.donorName || receipt.dynamicData?.name || receipt.dynamicData?.subject || 'N/A'}
                      </td>
                      <td className="hidden md:table-cell p-4 md:p-6 text-sm text-gray-700 break-words whitespace-normal">
                        {receipt.branchId?.name || 'Main Trust'}
                      </td>
                      <td className="hidden md:table-cell p-4 md:p-6 text-sm text-gray-700 break-words whitespace-normal">
                        {receipt.generatedBy?.name || receipt.generatedBy?.fullName || receipt.generatedBy?.displayName || 'System'}
                      </td>
                      {/* Mobile Footer & Desktop Actions */}
                      <td className="p-3 md:p-6 block md:table-cell bg-gray-50 md:bg-transparent rounded-b-xl md:rounded-none">
                        <div className="flex md:hidden justify-between items-center mb-3 px-1">
                          <span className="text-[11px] text-gray-500 font-medium bg-white px-2 py-1 rounded border border-gray-200">{new Date(receipt.createdAt).toLocaleDateString()}</span>
                          <span className="text-[11px] text-gray-500 truncate max-w-[120px]">By: {receipt.generatedBy?.name || receipt.generatedBy?.fullName || receipt.generatedBy?.displayName || 'System'}</span>
                        </div>
                        <div className="flex justify-between md:justify-end gap-2 border-t border-gray-200 md:border-none pt-3 md:pt-0">
                          {receipt.pdfUrl ? (
                            <>
                              <button onClick={() => handleView(receipt)} className="flex-1 md:flex-none p-2 flex items-center justify-center bg-white md:bg-transparent text-gray-600 border md:border-none border-gray-200 hover:bg-gray-100 rounded-lg shadow-sm md:shadow-none" title="View PDF">
                                <Eye className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                              <button onClick={() => handleDownload(receipt)} className="flex-1 md:flex-none p-2 flex items-center justify-center bg-white md:bg-transparent text-gray-600 border md:border-none border-gray-200 hover:bg-gray-100 rounded-lg shadow-sm md:shadow-none" title="Download">
                                <Download className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                              <button className="flex-1 md:flex-none p-2 flex items-center justify-center bg-white md:bg-transparent text-gray-600 border md:border-none border-gray-200 hover:bg-gray-100 rounded-lg shadow-sm md:shadow-none" title="Share" onClick={() => handleShare(receipt)}>
                                <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                              <button className="flex-1 md:flex-none p-2 flex items-center justify-center bg-indigo-50 md:bg-transparent text-indigo-600 border md:border-none border-indigo-200 hover:bg-indigo-100 rounded-lg shadow-sm md:shadow-none" title="More Info" onClick={() => setSelectedInfo(receipt)}>
                                <Info className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 w-full text-center md:text-right py-2 md:py-0">PDF Pending</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {selectedInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-800">Document Metadata</h2>
              <button onClick={() => setSelectedInfo(null)} className="text-gray-400 hover:text-gray-800 p-2 transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-sm text-gray-700">
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-gray-500">Document No:</span>
                <span className="font-medium">{selectedInfo.receiptNumber}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-gray-500">Category:</span>
                <span className="font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{selectedInfo.category}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-gray-500">Recipient Name:</span>
                <span className="font-medium text-right">{selectedInfo.dynamicData?.donorName || selectedInfo.dynamicData?.name || selectedInfo.dynamicData?.subject || 'N/A'}</span>
              </div>
              {selectedInfo.dynamicData?.amount && (
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold text-gray-500">Amount:</span>
                  <span className="font-medium text-green-600">₹{selectedInfo.dynamicData.amount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-gray-500">Submitted Date:</span>
                <span className="font-medium">{selectedInfo.createdAt ? new Date(selectedInfo.createdAt).toLocaleString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-gray-500">Approved Date:</span>
                <span className="font-medium">{selectedInfo.approvalDate ? new Date(selectedInfo.approvalDate).toLocaleString() : (selectedInfo.createdAt ? new Date(selectedInfo.createdAt).toLocaleString() : 'N/A')}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-gray-500">Last Downloaded:</span>
                <span className="font-medium text-indigo-600">{selectedInfo.lastReceiptDownloadedAt ? new Date(selectedInfo.lastReceiptDownloadedAt).toLocaleString() : 'Never'}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="font-semibold text-gray-500">Generated By:</span>
                <span className="font-medium">{selectedInfo.generatedBy?.name || selectedInfo.generatedBy?.fullName || selectedInfo.generatedBy?.displayName || 'System'}</span>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-b-2xl flex justify-end">
              <button onClick={() => setSelectedInfo(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-semibold transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptHistory;




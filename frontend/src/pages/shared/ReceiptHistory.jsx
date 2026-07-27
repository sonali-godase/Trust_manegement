import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Search, Download, Share2, Printer, Eye, Info, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Receipt from '../../components/Receipt';

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
  const [viewReceiptModal, setViewReceiptModal] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState('');
  const [loadingPdfBlob, setLoadingPdfBlob] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const { user } = useAuth();

  const [showFilters, setShowFilters] = useState(false);

  let categories = ['All', 'Notice', 'Jama Pavti', 'Branch Pavti', 'Dengi Pavti', 'Donation', 'Branch Donation', 'Annadan', 'Prasad', 'Payment', 'Expense'];
  if (user?.role === 'Accountant') {
    categories = ['All', 'Jama Pavti', 'Branch Pavti', 'Dengi Pavti'];
  } else if (user?.role === 'BranchManager') {
    categories = ['All', 'Branch Donation', 'Annadan', 'Prasad'];
  }

  const formatReceiptForComponent = (receipt) => {
    if (!receipt) return null;
    return {
      _id: receipt.donationId || receipt._id,
      receiptNumber: receipt.receiptNumber,
      donationReference: receipt.receiptNumber,
      donorName: receipt.dynamicData?.donorName || receipt.dynamicData?.name || receipt.dynamicData?.subject || 'Devotee',
      amount: receipt.dynamicData?.amount || 0,
      date: receipt.createdAt || receipt.date,
      category: receipt.category,
      type: receipt.category,
      donationType: receipt.dynamicData?.donationType || (receipt.category?.toLowerCase().includes('jama') ? 'jama_pavti' : (receipt.category?.toLowerCase().includes('shakha') ? 'shakha_pavti' : 'dengi_pavti')),
      message: receipt.dynamicData?.message || receipt.dynamicData?.purpose || receipt.category,
      branchId: receipt.branchId
    };
  };

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

  const getPdfUrl = (receipt) => {
    if (!receipt) return '';
    if (receipt.pdfUrl && (receipt.pdfUrl.startsWith('http://') || receipt.pdfUrl.startsWith('https://'))) {
      return receipt.pdfUrl;
    }
    const targetId = receipt.donationId || receipt._id;
    const token = sessionStorage.getItem("token") || localStorage.getItem("token") || sessionStorage.getItem("documentAdminToken") || localStorage.getItem("documentAdminToken");
    let baseUrl = api.defaults.baseURL || import.meta.env.VITE_API_URL || '';
    if (!baseUrl) {
      baseUrl = `${window.location.origin}/api`;
    }
    if (!baseUrl.endsWith('/api') && !baseUrl.endsWith('/api/')) {
      baseUrl = `${baseUrl.replace(/\/$/, '')}/api`;
    }
    return `${baseUrl}/donations/${targetId}/receipt?token=${token || ''}`;
  };

  const getReceiptPdfBlob = async (receipt) => {
    // Fast-path: If Cloudinary URL is directly stored on receipt, try fetching it directly
    if (receipt.pdfUrl && (receipt.pdfUrl.startsWith('http://') || receipt.pdfUrl.startsWith('https://'))) {
      try {
        const cloudRes = await fetch(receipt.pdfUrl);
        if (cloudRes.ok) {
          const blob = await cloudRes.blob();
          if (blob.size > 0 && (blob.type === 'application/pdf' || blob.type === '')) {
            return new Blob([blob], { type: 'application/pdf' });
          }
        }
      } catch (e) {
        console.warn("Direct Cloudinary URL fetch skipped, using API endpoint:", e.message);
      }
    }

    // Secondary path: Call authenticated backend API endpoint with 30s timeout
    const targetId = receipt.donationId || receipt._id;
    const response = await api.get(`/donations/${targetId}/receipt`, { responseType: 'blob', timeout: 30000 });
    if (response.data.type === 'text/html' || (typeof response.data.type === 'string' && response.data.type.includes('html'))) {
      throw new Error("Invalid response format: Received HTML page instead of PDF document.");
    }
    return new Blob([response.data], { type: 'application/pdf' });
  };

  const handleView = async (receipt) => {
    setViewReceiptModal(receipt);
    if (pdfBlobUrl) {
      window.URL.revokeObjectURL(pdfBlobUrl);
    }
    setPdfBlobUrl('');
    setPdfError(false);
    setLoadingPdfBlob(true);
    try {
      const blob = await getReceiptPdfBlob(receipt);
      const objUrl = window.URL.createObjectURL(blob);
      setPdfBlobUrl(objUrl);
    } catch (err) {
      console.error("Failed to load PDF preview:", err);
      setPdfError(true);
      toast.error("Failed to load receipt PDF preview.");
    } finally {
      setLoadingPdfBlob(false);
    }
  };

  const handleCloseModal = () => {
    if (pdfBlobUrl) {
      window.URL.revokeObjectURL(pdfBlobUrl);
    }
    setPdfBlobUrl('');
    setViewReceiptModal(null);
  };

  const handleDownload = async (receipt) => {
    const toastId = toast.loading("Downloading receipt...");
    try {
      const blob = await getReceiptPdfBlob(receipt);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `${(receipt.category || 'Receipt').replace(/\s+/g, '_')}_${receipt.receiptNumber || 'REC'}.pdf`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Downloaded successfully!", { id: toastId });
    } catch (error) {
      console.error("Failed to download PDF:", error);
      toast.error("Failed to download document.", { id: toastId });
    }
  };

  const handlePrint = async (receipt) => {
    const toastId = toast.loading("Preparing print...");
    try {
      const blob = await getReceiptPdfBlob(receipt);
      const url = window.URL.createObjectURL(blob);
      const printWin = window.open(url, '_blank');
      if (printWin) printWin.focus();
      toast.dismiss(toastId);
    } catch (error) {
      console.error("Failed to print PDF:", error);
      toast.error("Failed to print document.", { id: toastId });
    }
  };

  const handleShare = async (receipt) => {
    const toastId = toast.loading("Preparing link to share...");
    try {
      const shareUrl = getPdfUrl(receipt);
      const title = `Receipt: ${receipt.category || 'Receipt'}`;
      const text = `View ${receipt.category || 'Receipt'} document (No: ${receipt.receiptNumber}).`;

      toast.dismiss(toastId);

      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + shareUrl)}`, '_blank');
      }
    } catch (error) {
      toast.dismiss(toastId);
      if (error.name !== 'AbortError') {
        const text = `Receipt No: ${receipt.receiptNumber || ''}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
      }
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
                  <tr><td colSpan="7" className="text-center p-8 text-gray-500">Loading documents...</td></tr>
                ) : receipts.length === 0 ? (
                  <tr><td colSpan="7" className="text-center p-8 text-gray-500">No documents found matching filters</td></tr>
                ) : (
                  receipts.map(receipt => (
                    <tr key={receipt._id} className="flex flex-col md:table-row w-full bg-white md:bg-transparent border border-gray-100 md:border-b md:border-x-0 md:border-t-0 md:border-gray-200 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none hover:bg-gray-50/80 overflow-hidden transition cursor-pointer" onClick={() => handleView(receipt)}>
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
                      <td className="p-3 md:p-6 block md:table-cell bg-gray-50 md:bg-transparent rounded-b-xl md:rounded-none" onClick={(e) => e.stopPropagation()}>
                        <div className="flex md:hidden justify-between items-center mb-3 px-1">
                          <span className="text-[11px] text-gray-500 font-medium bg-white px-2 py-1 rounded border border-gray-200">{new Date(receipt.createdAt).toLocaleDateString()}</span>
                          <span className="text-[11px] text-gray-500 truncate max-w-[120px]">By: {receipt.generatedBy?.name || receipt.generatedBy?.fullName || receipt.generatedBy?.displayName || 'System'}</span>
                        </div>
                        <div className="flex justify-between md:justify-end gap-2 border-t border-gray-200 md:border-none pt-3 md:pt-0">
                          <button onClick={() => handleView(receipt)} className="flex-1 md:flex-none p-2 flex items-center justify-center bg-white md:bg-transparent text-gray-600 border md:border-none border-gray-200 hover:bg-gray-100 rounded-lg shadow-sm md:shadow-none transition-colors" title="View PDF">
                            <Eye className="w-4 h-4 md:w-5 md:h-5 text-sky-600" />
                          </button>
                          <button onClick={() => handleDownload(receipt)} className="flex-1 md:flex-none p-2 flex items-center justify-center bg-white md:bg-transparent text-gray-600 border md:border-none border-gray-200 hover:bg-gray-100 rounded-lg shadow-sm md:shadow-none transition-colors" title="Download PDF">
                            <Download className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                          </button>
                          <button onClick={() => handlePrint(receipt)} className="flex-1 md:flex-none p-2 flex items-center justify-center bg-white md:bg-transparent text-gray-600 border md:border-none border-gray-200 hover:bg-gray-100 rounded-lg shadow-sm md:shadow-none transition-colors" title="Print PDF">
                            <Printer className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                          </button>
                          <button onClick={() => handleShare(receipt)} className="flex-1 md:flex-none p-2 flex items-center justify-center bg-white md:bg-transparent text-gray-600 border md:border-none border-gray-200 hover:bg-gray-100 rounded-lg shadow-sm md:shadow-none transition-colors" title="Share Document">
                            <Share2 className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
                          </button>
                          <button onClick={() => setSelectedInfo(receipt)} className="flex-1 md:flex-none p-2 flex items-center justify-center bg-indigo-50 md:bg-transparent text-indigo-600 border md:border-none border-indigo-200 hover:bg-indigo-100 rounded-lg shadow-sm md:shadow-none transition-colors" title="More Info">
                            <Info className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
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

      {/* Receipt View Modal */}
      {viewReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50/80 gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 flex flex-wrap items-center gap-2">
                  <span>Receipt Preview</span>
                  <span className="text-xs bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full font-bold">{viewReceiptModal.receiptNumber}</span>
                </h2>
                <p className="text-xs text-gray-500 font-medium">Category: {viewReceiptModal.category}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                <button onClick={() => handleDownload(viewReceiptModal)} className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                  <Download size={15} /> Download PDF
                </button>
                <button onClick={() => handlePrint(viewReceiptModal)} className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                  <Printer size={15} /> Print
                </button>
                <button onClick={handleCloseModal} className="p-2 text-gray-400 hover:text-gray-800 rounded-full hover:bg-gray-200 transition ml-auto sm:ml-0">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-6 overflow-y-auto flex justify-center items-center bg-gray-100/50 min-h-[550px]">
              {loadingPdfBlob ? (
                <div className="flex flex-col items-center justify-center h-[580px] w-full bg-white rounded-xl shadow-sm border border-gray-100">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                  <p className="text-sm font-bold text-gray-700">Connecting to server & loading PDF receipt...</p>
                  <p className="text-xs text-gray-400 mt-1">Please wait a moment while the PDF is fetched.</p>
                </div>
              ) : pdfError ? (
                <div className="flex flex-col items-center justify-center h-[580px] w-full bg-white rounded-xl shadow-sm border border-red-100 p-6 text-center">
                  <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <X size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Receipt PDF Unavailable</h3>
                  <p className="text-xs text-gray-500 max-w-md mb-6">
                    The backend server on Render may be waking up or experiencing temporary connection latency. You can retry loading or download the PDF directly.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => handleView(viewReceiptModal)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      Retry Loading PDF
                    </button>
                    <button
                      onClick={() => handleDownload(viewReceiptModal)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      Download PDF Document
                    </button>
                  </div>
                </div>
              ) : (
                <iframe
                  src={pdfBlobUrl || getPdfUrl(viewReceiptModal)}
                  className="w-full h-[580px] rounded-xl border border-gray-200 shadow-sm bg-white"
                  title={`Receipt-${viewReceiptModal.receiptNumber}`}
                />
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
              <span>Date: {new Date(viewReceiptModal.createdAt || Date.now()).toLocaleDateString()}</span>
              <button onClick={handleCloseModal} className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold transition">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

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




import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ScrollToTop from "./components/ScrollToTop";

// Public Pages
import Home from "./pages/user/Home";
import About from "./pages/user/About";
import UserDonation from "./pages/user/Donations";
import UserEvents from "./pages/user/Events";
import EventDetails from "./pages/user/EventDetails";
import Annadaan from "./pages/user/Annadaan";

import LiveAarti from "./pages/user/LiveAarti";
import Gallery from "./pages/user/Gallery";
import Branches from "./pages/user/Branches";
import BranchDetails from "./pages/user/BranchDetails";
import Services from "./pages/user/Services";
import TrusteeBoard from "./pages/user/TrusteeBoard";

import MathHistory from "./pages/user/MathHistory";
import Lineage from "./pages/user/Lineage";
import LineageDetail from "./pages/user/LineageDetail";
import TrusteeAudioTracks from './pages/trustee/AudioTracks';
import ContactUs from "./pages/user/ContactUs";
import VerifyReceipt from "./pages/public/VerifyReceipt";

// Auth Pages (New "Select Role" screens to be built)
import LoginSelection from "./pages/auth/LoginSelection";
import RegisterDevotee from "./pages/auth/RegisterDevotee";
import ForgotPassword from "./pages/user/ForgotPassword";

// Navbar for Devotee Layout
import Navbar from "./components/Navbar";

// Dashboard Pages & Layout
import Layout from "./layouts/Layout";
import AdminDashboard from "./pages/admin/Dashboard";
import TrusteeDashboard from "./pages/trustee/Dashboard";
import TrusteeProfile from "./pages/trustee/Profile";
import TrusteeAnnouncements from "./pages/trustee/Announcements";
import TrusteeDevotees from "./pages/trustee/Devotees";
import TrusteeDonations from "./pages/trustee/Donations";
import TrusteeEvents from "./pages/trustee/Events";
import TrusteeBranches from "./pages/trustee/Branches";
import TrusteeAnnadaan from "./pages/trustee/Annadaan";
import TrusteeGallery from "./pages/trustee/Gallery";
import TrusteeDocuments from "./pages/trustee/Documents";
import TrusteeBulletins from "./pages/trustee/Bulletins";
import TrusteeContactEnquiries from "./pages/trustee/ContactEnquiries";
import AccountantDonationVerification from "./pages/accountant/DonationVerification";
import BranchDashboard from "./pages/branch/Dashboard";
import BranchProfile from "./pages/branch/Profile";
import BranchEvents from "./pages/branch/Events";
import BranchDevotees from "./pages/branch/Devotees";
import BranchDonations from "./pages/branch/Donations";
import BranchAnnouncements from "./pages/branch/Announcements";
import BranchBranches from "./pages/branch/Branches";
import BranchDocuments from "./pages/branch/Documents";
import DevoteeDashboardHome from "./pages/user/dashboard/DashboardHome";
import DevoteeOrders from "./pages/user/dashboard/MyOrders";
import DevoteeDonations from "./pages/user/dashboard/MyDonations";
import DevoteeAnnadaan from "./pages/user/dashboard/MyAnnadaan";
import DevoteeSettings from "./pages/user/dashboard/Settings";
import Donations from "./pages/admin/Donations";
import Events from "./pages/admin/Events";
import Devotees from "./pages/admin/Devotees";
import Announcements from "./pages/admin/Announcements";
import ManageGallery from "./pages/admin/ManageGallery";
import ManageBranches from "./pages/admin/ManageBranches";
import ManageBranchManagers from "./pages/admin/ManageBranchManagers";
import ManageDocumentAdmins from "./pages/admin/ManageDocumentAdmins";
import ManageAnnadan from "./pages/admin/ManageAnnadan";
import ManageTrustees from "./pages/admin/ManageTrustees";
import AdminProfile from "./pages/admin/Profile";
import AdminDocuments from "./pages/admin/AdminDocuments";

// Document Handler Pages
import DocumentAdminDashboard from "./pages/document-admin/Dashboard";
import DocumentAdminProfile from "./pages/document-admin/Profile";
import DocumentAdminDeletionRequests from "./pages/document-admin/DeletionRequests";
import DocumentAdminAnnouncements from "./pages/document-admin/Announcements";

// Accountant Pages
import TrusteeAccountants from "./pages/trustee/Accountants";
import AccountantDashboard from "./pages/accountant/Dashboard";
import AccountantProfile from "./pages/accountant/Profile";
import AccountantDonations from "./pages/accountant/Donations";
import AccountantReceipts from "./pages/accountant/Receipts";
import AccountantAnnouncements from "./pages/accountant/Announcements";

// CMS Pages for Monastery History and Lineage
import ManageMathHistory from "./pages/admin/ManageMathHistory";
import ManageLineage from "./pages/admin/ManageLineage";
import ManageNews from "./pages/admin/ManageNews";
import TrusteeManageNews from "./pages/trustee/ManageNews";
import BranchManageNews from "./pages/branch/ManageNews";

// Shared Pages
import ReceiptHistory from "./pages/shared/ReceiptHistory";
import NoticeGenerator from "./pages/admin/NoticeGenerator";

// Vanshawal Family Tree Pages
import DevoteeVanshawal from "./pages/family/DevoteeVanshawal";
import FamilyDashboard from "./pages/family/FamilyDashboard";
import FamilyReports from "./pages/family/FamilyReports";

// New RBAC Route Wrapper
const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-saffron-600 font-bold text-xl">
      <div className="w-16 h-16 border-4 border-saffron-200 border-t-saffron-500 rounded-full animate-spin mb-4"></div>
      Loading Divine Data...
    </div>
  );

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect based on their role
    if (user.role === 'Admin') return <Navigate to="/admin/dashboard" />;
    if (user.role === 'Trustee') return <Navigate to="/trustee/dashboard" />;
    if (user.role === 'Devotee') return <Navigate to="/devotee/dashboard" />;
    if (user.role === 'BranchManager') return <Navigate to="/branch/dashboard" />;
    if (user.role === 'Accountant') return <Navigate to="/accountant/dashboard" />;
    if (user.role === 'DocumentHandler' || user.role === 'document_admin') return <Navigate to="/document-handler/dashboard" />;
    return <Navigate to="/" />;
  }

  return <Layout user={user}>{children}</Layout>;
};

// Smart Profile Redirect Helper
const ProfileRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-indigo-600 font-bold">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
      Loading Profile...
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'Admin') return <Navigate to="/admin/profile" />;
  if (user.role === 'Trustee') return <Navigate to="/trustee/profile" />;
  if (user.role === 'BranchManager') return <Navigate to="/branch/profile" />;
  if (user.role === 'Accountant') return <Navigate to="/accountant/profile" />;
  if (user.role === 'DocumentHandler' || user.role === 'document_admin') return <Navigate to="/document-handler/profile" />;
  return <Navigate to="/devotee/settings" />;
};

// Full screen dashboard wrapper for non-sidebar roles if needed
const FullScreenProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

// Devotee wrapper that uses Navbar instead of Sidebar
const DevoteeLayout = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FFFDF9] text-orange-600 font-bold text-xl">
      <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-4"></div>
      Loading Divine Data...
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  
  return (
    <div className="min-h-screen bg-[#FFFDF9] text-deepblue-900 font-sans selection:bg-orange-200 selection:text-orange-900 overflow-x-hidden">
      <Navbar />
      <div className="pt-28 pb-12 max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        {children}
      </div>
    </div>
  );
};

import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";

function AppRoutes() {
  const location = useLocation();
  
  return (
    <div className="h-full w-full">
      <Routes location={location}>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/events" element={<UserEvents />} />
          <Route path="/events/:slug" element={<EventDetails />} />
          <Route path="/donate" element={<UserDonation />} />
          <Route path="/annadaan" element={<Annadaan />} />

          <Route path="/live-aarti" element={<LiveAarti />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/branches/:id" element={<BranchDetails />} />
          <Route path="/services" element={<Services />} />
          <Route path="/trustee-board" element={<TrusteeBoard />} />

          <Route path="/math-history" element={<MathHistory />} />
          <Route path="/lineage" element={<Lineage />} />
          <Route path="/lineage/:id" element={<LineageDetail />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/verify-receipt/:receiptNumber?" element={<VerifyReceipt />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<LoginSelection />} />
          <Route path="/register" element={<RegisterDevotee />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Admin Protected Routes */}
          <Route path="/admin/dashboard" element={<RoleProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></RoleProtectedRoute>} />
          <Route path="/admin/donations" element={<RoleProtectedRoute allowedRoles={['Admin']}><Donations /></RoleProtectedRoute>} />
          <Route path="/admin/events" element={<RoleProtectedRoute allowedRoles={['Admin']}><Events /></RoleProtectedRoute>} />
          <Route path="/admin/devotees" element={<RoleProtectedRoute allowedRoles={['Admin']}><Devotees /></RoleProtectedRoute>} />
          <Route path="/admin/announcements" element={<RoleProtectedRoute allowedRoles={['Admin']}><Announcements /></RoleProtectedRoute>} />
          <Route path="/admin/gallery" element={<RoleProtectedRoute allowedRoles={['Admin']}><ManageGallery /></RoleProtectedRoute>} />
          <Route path="/admin/branches" element={<RoleProtectedRoute allowedRoles={['Admin']}><ManageBranches /></RoleProtectedRoute>} />
          <Route path="/admin/branch-managers" element={<RoleProtectedRoute allowedRoles={['Admin']}><ManageBranchManagers /></RoleProtectedRoute>} />
          <Route path="/admin/document-admins" element={<RoleProtectedRoute allowedRoles={['Admin']}><ManageDocumentAdmins /></RoleProtectedRoute>} />
          <Route path="/admin/annadaan" element={<RoleProtectedRoute allowedRoles={['Admin']}><ManageAnnadan /></RoleProtectedRoute>} />
          <Route path="/admin/trustees" element={<RoleProtectedRoute allowedRoles={['Admin']}><ManageTrustees /></RoleProtectedRoute>} />
          <Route path="/admin/profile" element={<RoleProtectedRoute allowedRoles={['Admin']}><AdminProfile /></RoleProtectedRoute>} />
          <Route path="/admin/documents" element={<RoleProtectedRoute allowedRoles={['Admin']}><AdminDocuments /></RoleProtectedRoute>} />
          <Route path="/admin/math-history" element={<RoleProtectedRoute allowedRoles={['Admin']}><ManageMathHistory /></RoleProtectedRoute>} />
          <Route path="/admin/lineage" element={<RoleProtectedRoute allowedRoles={['Admin']}><ManageLineage /></RoleProtectedRoute>} />
          <Route path="/admin/news" element={<RoleProtectedRoute allowedRoles={['Admin']}><ManageNews /></RoleProtectedRoute>} />
          <Route path="/admin/vanshawal" element={<RoleProtectedRoute allowedRoles={['Admin']}><DevoteeVanshawal /></RoleProtectedRoute>} />
          <Route path="/admin/vanshawal/dashboard" element={<RoleProtectedRoute allowedRoles={['Admin']}><FamilyDashboard /></RoleProtectedRoute>} />
          <Route path="/admin/vanshawal/reports" element={<RoleProtectedRoute allowedRoles={['Admin']}><FamilyReports /></RoleProtectedRoute>} />

          {/* Trustee Protected Routes */}
          <Route path="/trustee/dashboard" element={<RoleProtectedRoute allowedRoles={['Trustee']}><TrusteeDashboard /></RoleProtectedRoute>} />
          <Route path="/trustee/profile" element={<RoleProtectedRoute allowedRoles={['Trustee']}><TrusteeProfile /></RoleProtectedRoute>} />
          <Route path="/trustee/announcements" element={<RoleProtectedRoute allowedRoles={['Trustee']}><TrusteeAnnouncements /></RoleProtectedRoute>} />
          <Route path="/trustee/devotees" element={<RoleProtectedRoute allowedRoles={['Trustee']}><TrusteeDevotees /></RoleProtectedRoute>} />
          <Route path="/trustee/donations" element={<RoleProtectedRoute allowedRoles={['Trustee']}><TrusteeDonations /></RoleProtectedRoute>} />
          <Route path="/trustee/events" element={<RoleProtectedRoute allowedRoles={['Trustee']}><TrusteeEvents /></RoleProtectedRoute>} />
          <Route path="/trustee/branches" element={<RoleProtectedRoute allowedRoles={['Trustee']}><TrusteeBranches /></RoleProtectedRoute>} />
          <Route path="/trustee/annadaan" element={<RoleProtectedRoute allowedRoles={['Trustee']}><TrusteeAnnadaan /></RoleProtectedRoute>} />
          <Route path="/trustee/gallery" element={<RoleProtectedRoute allowedRoles={['Trustee']}><TrusteeGallery /></RoleProtectedRoute>} />
          <Route path="/trustee/documents" element={<RoleProtectedRoute allowedRoles={['Trustee']}><TrusteeDocuments /></RoleProtectedRoute>} />
          <Route path="/trustee/bulletins" element={<RoleProtectedRoute allowedRoles={['Trustee', 'Admin']}><TrusteeBulletins /></RoleProtectedRoute>} />
          <Route path="/trustee/math-history" element={<RoleProtectedRoute allowedRoles={['Trustee']}><ManageMathHistory /></RoleProtectedRoute>} />
          <Route path="/trustee/lineage" element={<RoleProtectedRoute allowedRoles={['Trustee']}><ManageLineage /></RoleProtectedRoute>} />
          <Route path="/trustee/accountants" element={<RoleProtectedRoute allowedRoles={['Trustee']}><TrusteeAccountants /></RoleProtectedRoute>} />
          <Route path="/trustee/audio" element={<RoleProtectedRoute allowedRoles={['Trustee']}><TrusteeAudioTracks /></RoleProtectedRoute>} />
          <Route path="/trustee/news" element={<RoleProtectedRoute allowedRoles={['Trustee']}><TrusteeManageNews /></RoleProtectedRoute>} />
          <Route path="/trustee/vanshawal" element={<RoleProtectedRoute allowedRoles={['Trustee']}><DevoteeVanshawal /></RoleProtectedRoute>} />
          <Route path="/trustee/vanshawal/dashboard" element={<RoleProtectedRoute allowedRoles={['Trustee']}><FamilyDashboard /></RoleProtectedRoute>} />
          <Route path="/trustee/vanshawal/reports" element={<RoleProtectedRoute allowedRoles={['Trustee']}><FamilyReports /></RoleProtectedRoute>} />
          <Route path="/trustee/contact-enquiries" element={<RoleProtectedRoute allowedRoles={['Trustee', 'Admin']}><TrusteeContactEnquiries /></RoleProtectedRoute>} />
          <Route path="/trustee/notice-generator" element={<RoleProtectedRoute allowedRoles={['Trustee', 'Admin', 'BranchManager']}><NoticeGenerator /></RoleProtectedRoute>} />
          <Route path="/trustee/issue-notice" element={<RoleProtectedRoute allowedRoles={['Trustee', 'Admin', 'BranchManager']}><NoticeGenerator /></RoleProtectedRoute>} />
          <Route path="/trustee/receipts" element={<RoleProtectedRoute allowedRoles={['Trustee', 'Admin']}><ReceiptHistory /></RoleProtectedRoute>} />

          {/* Branch Manager Protected Routes */}
          <Route path="/branch/dashboard" element={<RoleProtectedRoute allowedRoles={['BranchManager']}><BranchDashboard /></RoleProtectedRoute>} />
          <Route path="/branch/profile" element={<RoleProtectedRoute allowedRoles={['BranchManager']}><BranchProfile /></RoleProtectedRoute>} />
          <Route path="/branch/events" element={<RoleProtectedRoute allowedRoles={['BranchManager']}><BranchEvents /></RoleProtectedRoute>} />
          <Route path="/branch/devotees" element={<RoleProtectedRoute allowedRoles={['BranchManager']}><BranchDevotees /></RoleProtectedRoute>} />
          <Route path="/branch/donations" element={<RoleProtectedRoute allowedRoles={['BranchManager']}><BranchDonations /></RoleProtectedRoute>} />
          <Route path="/branch/announcements" element={<RoleProtectedRoute allowedRoles={['BranchManager']}><BranchAnnouncements /></RoleProtectedRoute>} />
          <Route path="/branch/branches" element={<RoleProtectedRoute allowedRoles={['BranchManager']}><BranchBranches /></RoleProtectedRoute>} />
          <Route path="/branch/documents" element={<RoleProtectedRoute allowedRoles={['BranchManager']}><BranchDocuments /></RoleProtectedRoute>} />
          <Route path="/branch/news" element={<RoleProtectedRoute allowedRoles={['BranchManager']}><BranchManageNews /></RoleProtectedRoute>} />
          <Route path="/branch/vanshawal" element={<RoleProtectedRoute allowedRoles={['BranchManager']}><DevoteeVanshawal /></RoleProtectedRoute>} />
          <Route path="/branch/vanshawal/dashboard" element={<RoleProtectedRoute allowedRoles={['BranchManager']}><FamilyDashboard /></RoleProtectedRoute>} />
          <Route path="/branch/vanshawal/reports" element={<RoleProtectedRoute allowedRoles={['BranchManager']}><FamilyReports /></RoleProtectedRoute>} />
          <Route path="/branch/notice-generator" element={<RoleProtectedRoute allowedRoles={['BranchManager', 'Trustee', 'Admin']}><NoticeGenerator /></RoleProtectedRoute>} />
          <Route path="/branch/issue-notice" element={<RoleProtectedRoute allowedRoles={['BranchManager', 'Trustee', 'Admin']}><NoticeGenerator /></RoleProtectedRoute>} />

          {/* Devotee Protected Routes */}
          <Route path="/devotee/dashboard" element={<DevoteeLayout allowedRoles={['Devotee']}><DevoteeDashboardHome /></DevoteeLayout>} />
          <Route path="/devotee/orders" element={<DevoteeLayout allowedRoles={['Devotee']}><DevoteeOrders /></DevoteeLayout>} />
          <Route path="/devotee/donations" element={<DevoteeLayout allowedRoles={['Devotee']}><DevoteeDonations /></DevoteeLayout>} />
          <Route path="/devotee/annadaan" element={<DevoteeLayout allowedRoles={['Devotee']}><DevoteeAnnadaan /></DevoteeLayout>} />
          <Route path="/devotee/settings" element={<DevoteeLayout allowedRoles={['Devotee']}><DevoteeSettings /></DevoteeLayout>} />
          <Route path="/devotee/profile" element={<DevoteeLayout allowedRoles={['Devotee']}><DevoteeSettings /></DevoteeLayout>} />
          <Route path="/devotee/vanshawal" element={<DevoteeLayout allowedRoles={['Devotee']}><DevoteeVanshawal /></DevoteeLayout>} />

          {/* Generic Profile Redirect Routes */}
          <Route path="/profile" element={<ProfileRedirect />} />
          <Route path="/user/profile" element={<ProfileRedirect />} />

          {/* Accountant Protected Routes */}
          <Route path="/accountant/dashboard" element={<RoleProtectedRoute allowedRoles={['Accountant']}><AccountantDashboard /></RoleProtectedRoute>} />
          <Route path="/accountant/profile" element={<RoleProtectedRoute allowedRoles={['Accountant']}><AccountantProfile /></RoleProtectedRoute>} />
          <Route path="/accountant/donations" element={<RoleProtectedRoute allowedRoles={['Accountant']}><AccountantDonations /></RoleProtectedRoute>} />
          <Route path="/accountant/verify-donations" element={<RoleProtectedRoute allowedRoles={['Accountant']}><AccountantDonationVerification /></RoleProtectedRoute>} />
          <Route path="/accountant/receipts" element={<RoleProtectedRoute allowedRoles={['Accountant']}><AccountantReceipts /></RoleProtectedRoute>} />
          <Route path="/accountant/announcements" element={<RoleProtectedRoute allowedRoles={['Accountant']}><AccountantAnnouncements /></RoleProtectedRoute>} />

          {/* Document Handler Routes */}
          <Route path="/document-handler/dashboard" element={<RoleProtectedRoute allowedRoles={['DocumentHandler', 'document_admin']}><DocumentAdminDashboard /></RoleProtectedRoute>} />
          <Route path="/document-handler/profile" element={<RoleProtectedRoute allowedRoles={['DocumentHandler', 'document_admin']}><DocumentAdminProfile /></RoleProtectedRoute>} />
          <Route path="/document-handler/deletion-requests" element={<RoleProtectedRoute allowedRoles={['DocumentHandler', 'document_admin']}><DocumentAdminDeletionRequests /></RoleProtectedRoute>} />
          <Route path="/document-handler/documents" element={<RoleProtectedRoute allowedRoles={['DocumentHandler', 'document_admin']}><DocumentAdminDashboard /></RoleProtectedRoute>} />
          <Route path="/document-handler/announcements" element={<RoleProtectedRoute allowedRoles={['DocumentHandler', 'document_admin']}><DocumentAdminAnnouncements /></RoleProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
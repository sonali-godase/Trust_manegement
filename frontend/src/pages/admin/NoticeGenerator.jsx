import React, { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FileText, Send, Eye, Share2, Mail, List } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ReceiptHistory from '../shared/ReceiptHistory';

const NoticeGenerator = () => {
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'history'
  
  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    noticeContent: '',
    outwardNo: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [generating, setGenerating] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState(null);

  const handleEditorChange = (value) => {
    setFormData(prev => ({ ...prev, noticeContent: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.noticeContent) {
      toast.error("Subject and Content are required.");
      return;
    }
    setGenerating(true);
    try {
      const payload = {
        ...formData,
        date: new Date(formData.date).toLocaleDateString('en-IN')
      };
      const res = await api.post('/receipts/notice', payload);
      if (res.data.success) {
        toast.success("Notice generated successfully!");
        setGeneratedPdf(res.data.data.pdfUrl);
        setFormData({ to: '', subject: '', noticeContent: '', outwardNo: '', date: new Date().toISOString().split('T')[0] });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to generate notice");
    } finally {
      setGenerating(false);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['clean']
    ]
  };

  return (
    <div className="p-4 md:p-8 lg:h-[calc(100vh-80px)] lg:overflow-hidden flex flex-col bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 shrink-0 max-w-7xl mx-auto w-full gap-4">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FileText className="text-[#be1e4d]" /> Official Notice Generator
        </h1>
        
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200 w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('create')} 
            className={`flex-1 md:flex-none px-6 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'create' ? 'bg-[#be1e4d] text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Create New Notice
          </button>
          <button 
            onClick={() => setActiveTab('history')} 
            className={`flex-1 md:flex-none justify-center px-6 py-2 rounded-md font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'bg-[#be1e4d] text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <List size={16} /> Old Notices
          </button>
        </div>
      </div>

      {activeTab === 'history' ? (
        <div className="flex-1 overflow-y-auto w-full">
           <ReceiptHistory defaultCategory="Notice" hideTitle={true} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:min-h-0 max-w-7xl mx-auto w-full">
          
          {/* Left Panel: Form */}
          <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 lg:overflow-y-auto flex flex-col gap-6">
            
            {generatedPdf ? (
              <div className="bg-green-50 rounded-2xl border border-green-200 p-6 text-center animate-[fadeIn_0.3s_ease-out]">
                <h3 className="text-xl font-bold text-green-800 mb-2">Notice Generated Successfully!</h3>
                <p className="text-green-600 mb-6 text-sm">The official letterhead PDF has been created.</p>
                <div className="flex flex-col gap-3 justify-center items-center">
                  <a href={generatedPdf} target="_blank" rel="noopener noreferrer" className="w-full max-w-xs flex justify-center items-center gap-2 px-6 py-3 bg-white text-green-700 font-bold rounded-xl border border-green-300 hover:bg-green-100 transition shadow-sm">
                    <Eye className="w-5 h-5" /> View Final PDF
                  </a>
                  <button onClick={() => window.open(`https://api.whatsapp.com/send?text=Please review this official notice: ${generatedPdf}`, '_blank')} className="w-full max-w-xs flex justify-center items-center gap-2 px-6 py-3 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#20bd5a] transition shadow-sm">
                    <Share2 className="w-5 h-5" /> Share via WhatsApp
                  </button>
                  <a href={`mailto:?subject=Official Notice&body=Please review the official notice here: ${generatedPdf}`} className="w-full max-w-xs flex justify-center items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-sm">
                    <Mail className="w-5 h-5" /> Share via Email
                  </a>
                </div>
                <button onClick={() => setGeneratedPdf(null)} className="mt-6 text-sm text-gray-500 hover:text-gray-700 underline font-semibold">
                  Create Another Notice
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Outward No. (जावक क्र.)</label>
                    <input type="text" value={formData.outwardNo} onChange={(e) => setFormData({...formData, outwardNo: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-[#be1e4d] focus:outline-none" placeholder="Leave empty to auto-generate" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Date (दिनांक)</label>
                    <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-[#be1e4d] focus:outline-none" />
                  </div>
                </div>

                <div className="shrink-0">
                  <label className="block text-sm font-bold text-gray-700 mb-1">To (For Whom) - प्रति,</label>
                  <input type="text" required value={formData.to} onChange={(e) => setFormData({...formData, to: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-[#be1e4d] focus:outline-none" placeholder="e.g. सर्व विश्वस्त / शाखा व्यवस्थापक" />
                </div>

                <div className="shrink-0">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Subject (विषय)</label>
                  <input type="text" required value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-[#be1e4d] focus:outline-none" placeholder="Enter notice subject" />
                </div>

                <div className="flex flex-col">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Notice Body *</label>
                  <ReactQuill theme="snow" value={formData.noticeContent} onChange={handleEditorChange} modules={modules} className="h-64 mb-16 bg-white rounded-lg" />
                </div>

                <div className="shrink-0 pt-4 border-t">
                  <button type="submit" disabled={generating} className="w-full py-3.5 bg-[#be1e4d] text-white font-bold rounded-xl hover:bg-[#a01640] transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-md">
                    {generating ? 'Generating PDF...' : 'Generate on Letterhead'}
                    {!generating && <Send className="w-5 h-5" />}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Panel: Live Preview */}
          <div className="w-full lg:w-1/2 bg-gray-200 rounded-2xl border border-gray-300 p-4 overflow-auto flex justify-start shadow-inner">
            <div className="bg-white shadow-lg shrink-0 overflow-hidden relative mx-auto lg:mx-0" style={{ width: '210mm', minHeight: '297mm', padding: '10mm' }}>
              
               {/* Letterhead Header matches physical image precisely */}
               <div className="flex justify-between items-stretch mb-2">
                 
                 {/* Top Left */}
                 <div className="w-[25%] text-center flex flex-col items-center justify-end">
                    <div className="text-[11pt] text-[#002366] font-bold mb-1">२९ वे पिठाधिपती</div>
                    <div className="w-[80px] h-[80px] rounded-full border-2 border-[#be1e4d] bg-gray-100 flex items-center justify-center overflow-hidden">
                       <img src="/swami29.jpg" alt="Swami 29" className="w-full h-full object-cover" />
                    </div>
                 </div>

                 {/* Top Center */}
                 <div className="w-[50%] text-center">
                    <div className="text-[11pt] text-[#be1e4d] font-bold mb-[2px]">।। ॐ श्री गुरुनिर्वाण रुद्रपशुपती प्रसन्न ।।</div>
                    <div className="text-[11pt] text-[#be1e4d] font-bold mb-[2px]">।। मुळ पुरुष उपासकलिंग बडदेकरु प्रसन्न ।।</div>
                    <h1 className="text-[19pt] text-[#7b1fa2] font-black my-1 leading-tight tracking-tight">श्री गुरुमुर्ती रुद्रपशुपती लिंगायत मठ, मिरज</h1>
                    <div className="text-[11pt] text-[#002366] font-bold leading-tight">मिरज पंढरपूर रोड, शासकीय मेडिकल कॉलेज समोर, मिरज जि.सांगली</div>
                    <div className="text-[9pt] text-[#002366] font-medium leading-tight mt-1">पत्रव्यवहार पत्ता : श्री गुरुमुर्ती रुद्रपशुपती मठ, मु.पो. कोळे ता.सांगोला, जि.सोलापूर ४१३३१४</div>
                 </div>

                 {/* Top Right */}
                 <div className="w-[25%] text-center flex flex-col items-center justify-end">
                    <div className="text-[9pt] text-[#be1e4d] font-bold mb-1">ट्रस्ट नं. ए/१७५० - सांगली</div>
                    <div className="text-[11pt] text-[#002366] font-bold mb-1">३० वे पिठाधिपती</div>
                    <div className="w-[80px] h-[80px] rounded-full border-2 border-[#be1e4d] bg-gray-100 flex items-center justify-center overflow-hidden">
                       <img src="/swami30.jpg" alt="Swami 30" className="w-full h-full object-cover" />
                    </div>
                 </div>

               </div>

               {/* Full width red line */}
               <div className="w-full border-t-[1.5px] border-[#be1e4d] my-0"></div>

               {/* Body Section with Sidebar */}
               <div className="flex mt-0 h-[calc(100%-160px)] relative">
                 
                 {/* Left Sidebar (Red Dotted Line) */}
                 <div className="w-[45mm] border-r border-dotted border-[#be1e4d] pr-[3mm] pt-[5mm]">
                   <div className="text-[9pt] text-[#002366] font-bold mb-[2px]">अध्यक्ष</div>
                   <div className="text-[11pt] text-[#be1e4d] font-black leading-snug">
                     <div>श्रीश्रीश्री १०८</div>
                     <div>गुरुमुर्ती रुद्रपशुपती</div>
                     <div>कोळेकर महास्वामीजी</div>
                     <div>( राजाराम स्वामीजी )</div>
                   </div>
                 </div>
                 
                 {/* Main Content Area */}
                 <div className="flex-1 pl-[15mm] pr-[15mm] pt-[5mm] pb-[8mm] flex flex-col relative overflow-hidden font-['Mukta']">
                    
                    <div className="flex justify-between text-[11.5pt] text-[#002366] font-bold mb-5 shrink-0">
                      <div>जावक क्र. : {formData.outwardNo || 'Draft'}</div>
                      <div>दिनांक : {new Date(formData.date).toLocaleDateString('en-IN')}</div>
                    </div>

                    {formData.to && (
                      <div className="text-[12.5pt] text-gray-900 font-bold mb-4 leading-snug shrink-0">
                        प्रति,<br/>
                        {formData.to}
                      </div>
                    )}

                    {formData.subject && (
                      <div className="text-[13.5pt] text-center text-gray-900 font-bold mb-6 shrink-0">
                        विषय: {formData.subject}
                      </div>
                    )}

                    <div className="text-[12.5pt] text-gray-900 leading-[1.85] text-justify flex-1 notice-content max-w-none break-words overflow-wrap-break-word min-h-[300px]" dangerouslySetInnerHTML={{ __html: formData.noticeContent }} />

                    <div className="mt-10 text-right self-end text-[#002366] text-[12pt] font-bold leading-snug shrink-0 pr-4">
                      <div>सचिव</div>
                      <div>श्री गुरुमुर्ती रुद्रपशुपती</div>
                      <div>लिंगायत मठ</div>
                    </div>

                 </div>

               </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default NoticeGenerator;

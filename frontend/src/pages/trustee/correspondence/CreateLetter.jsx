import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { FaSave, FaFilePdf, FaArrowLeft } from 'react-icons/fa';
import api from '../../../utils/api';

const CreateLetter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const letterId = searchParams.get('id');

  const [formData, setFormData] = useState({
    letterDate: new Date().toISOString().split('T')[0],
    subject: '',
    recipient: { name: '', organization: '', address: '', city: '', state: '', country: '', email: '', mobile: '' },
    content: { body: '' }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (letterId) {
      const fetchLetter = async () => {
        try {
          const res = await api.get(`/correspondence/${letterId}`);
          if (res.data?.success) {
            const l = res.data.data;
            setFormData({
              letterDate: new Date(l.letterDate).toISOString().split('T')[0],
              subject: l.subject,
              recipient: l.recipient,
              content: l.content
            });
          }
        } catch (err) {
          setError('Failed to load letter draft.');
        }
      };
      fetchLetter();
    }
  }, [letterId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEditorChange = (value) => {
    setFormData(prev => ({ ...prev, content: { ...prev.content, body: value } }));
  };

  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      if (letterId) {
        await api.put(`/correspondence/${letterId}`, formData);
        alert('Draft updated successfully');
      } else {
        const res = await api.post('/correspondence', formData);
        navigate(`/trustee/correspondence/create?id=${res.data.data._id}`, { replace: true });
        alert('Draft saved successfully');
      }
    } catch (err) {
      setError('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!formData.subject || !formData.recipient.name || !formData.content.body) {
      alert("Please fill required fields (Subject, Recipient Name, Body)");
      return;
    }
    try {
      setIsGenerating(true);
      let idToGenerate = letterId;
      
      // Save as draft first if new
      if (!idToGenerate) {
        const res = await api.post('/correspondence', formData);
        idToGenerate = res.data.data._id;
      } else {
        await api.put(`/correspondence/${idToGenerate}`, formData);
      }

      // Generate PDF
      await api.post(`/correspondence/${idToGenerate}/generate`);
      alert('Official PDF Generated Successfully!');
      navigate('/trustee/correspondence/history');
      
    } catch (err) {
      setError('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
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
    <div className="p-4 md:p-8 lg:h-[calc(100vh-80px)] lg:overflow-hidden flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 shrink-0 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/trustee/correspondence')} className="text-gray-500 hover:text-gray-900 bg-gray-100 p-3 rounded-full transition-colors"><FaArrowLeft /></button>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 flex items-center tracking-tight">{letterId ? 'Edit Draft' : 'Create New Letter'}</h1>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button onClick={handleSaveDraft} disabled={isSaving || isGenerating} className="flex-1 md:flex-none justify-center px-6 py-2 bg-yellow-100 text-yellow-700 font-bold rounded-lg hover:bg-yellow-200 transition flex items-center gap-2">
            <FaSave /> {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button onClick={handleGeneratePdf} disabled={isSaving || isGenerating} className="flex-1 md:flex-none justify-center px-6 py-2 bg-[#FF7A2F] text-white font-bold rounded-lg hover:bg-[#e86a24] transition shadow-lg shadow-[#FF7A2F]/20 flex items-center gap-2">
            <FaFilePdf /> {isGenerating ? 'Generating...' : 'Generate PDF'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-4 font-bold shrink-0">{error}</div>}

      <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:min-h-0">
        {/* Left Panel: Form */}
        <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 lg:overflow-y-auto flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
              <input type="date" name="letterDate" value={formData.letterDate} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-[#FF7A2F] focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Subject *</label>
              <input type="text" name="subject" value={formData.subject} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-[#FF7A2F] focus:outline-none" />
            </div>
          </div>

          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">Recipient Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><input type="text" name="recipient.name" value={formData.recipient.name} onChange={handleChange} placeholder="Name *" className="w-full border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#FF7A2F]" /></div>
              <div><input type="text" name="recipient.organization" value={formData.recipient.organization} onChange={handleChange} placeholder="Organization" className="w-full border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#FF7A2F]" /></div>
              <div className="md:col-span-2"><input type="text" name="recipient.address" value={formData.recipient.address} onChange={handleChange} placeholder="Address" className="w-full border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#FF7A2F]" /></div>
              <div><input type="text" name="recipient.city" value={formData.recipient.city} onChange={handleChange} placeholder="City" className="w-full border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#FF7A2F]" /></div>
              <div><input type="text" name="recipient.state" value={formData.recipient.state} onChange={handleChange} placeholder="State" className="w-full border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#FF7A2F]" /></div>
              <div><input type="email" name="recipient.email" value={formData.recipient.email} onChange={handleChange} placeholder="Email" className="w-full border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#FF7A2F]" /></div>
              <div><input type="text" name="recipient.mobile" value={formData.recipient.mobile} onChange={handleChange} placeholder="Mobile" className="w-full border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#FF7A2F]" /></div>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="block text-sm font-bold text-gray-700 mb-1">Letter Body *</label>
            <ReactQuill theme="snow" value={formData.content.body} onChange={handleEditorChange} modules={modules} className="h-[300px] mb-12 bg-white rounded-lg" />
          </div>

        </div>

        {/* Right Panel: Live Preview */}
        <div className="w-full lg:w-1/2 bg-gray-100 rounded-2xl border border-gray-200 p-4 overflow-auto flex justify-start">
          <div className="bg-white shadow-lg shrink-0 overflow-hidden mx-auto lg:mx-0" style={{ width: '210mm', minHeight: '297mm', padding: '10mm 15mm' }}>
             
             {/* Preview Header matching template */}
             <div className="flex justify-between items-stretch border-b-2 border-[#be1e4d] pb-2 mb-4">
                <div className="w-1/5 text-center flex flex-col items-center justify-end">
                   <div className="text-[10pt] text-[#1e3a8a] font-bold mb-1">२९ वे पिठाधिपती</div>
                   <div className="w-[80px] h-[80px] rounded-full border border-[#be1e4d] mx-auto bg-gray-100 flex items-center justify-center text-xs text-gray-400 overflow-hidden">
                      <img src="/swami29.jpg" alt="Swami 29" className="w-full h-full object-cover" />
                   </div>
                </div>
                <div className="w-3/5 text-center">
                   <div className="text-[12pt] text-[#be1e4d] font-bold">॥ ॐ श्री गुरुनिर्वाण रुद्रपशुपति प्रसन्न ॥</div>
                   <div className="text-[12pt] text-[#be1e4d] font-bold">॥ मुळ पुरुष उपासकलिंग बडदेकरु प्रसन्न ॥</div>
                   <h1 className="text-xl sm:text-2xl md:text-3xl text-[24pt] text-[#be1e4d] font-black my-1 leading-none flex items-center tracking-tight">श्री गुरुमुर्ती रुद्रपशुपति लिंगायत मठ, मिरज</h1>
                   <div className="text-[12pt] text-[#1e3a8a] font-bold">मिरज पंढरपूर रोड, शासकीय मेडिकल कॉलेज समोर, मिरज जि.सांगली</div>
                   <div className="text-[10pt] text-[#1e3a8a]">पत्रव्यवहार पत्ता : श्री गुरुमुर्ती रुद्रपशुपति मठ, मु.पो. कोळे ता.सांगोला, जि.सोलापूर ४१३३१४</div>
                </div>
                <div className="w-1/5 text-center flex flex-col items-center justify-end">
                   <div className="text-[10pt] text-[#be1e4d] font-bold mb-1">ट्रस्ट नं. ए/१७५० - सांगली</div>
                   <div className="text-[10pt] text-[#1e3a8a] font-bold mb-1">३० वे पिठाधिपती</div>
                   <div className="w-[80px] h-[80px] rounded-full border border-[#be1e4d] mx-auto bg-gray-100 flex items-center justify-center text-xs text-gray-400 overflow-hidden">
                      <img src="/swami30.jpg" alt="Swami 30" className="w-full h-full object-cover" />
                   </div>
                </div>
             </div>

             <div className="flex h-[calc(100%-150px)]">
               <div className="w-1/4 border-r border-dashed border-[#be1e4d] pr-2 pt-2">
                 <div className="text-[#be1e4d] text-[13pt] font-bold leading-relaxed">
                   <div>अध्यक्ष</div>
                   <div>श्रीश्रीश्री १०८</div>
                   <div>गुरुमुर्ती रुद्रपशुपति</div>
                   <div>कोळेकर महास्वामीजी</div>
                   <div>(राजाराम स्वामीजी)</div>
                 </div>
               </div>
               
               <div className="w-3/4 pl-5 pt-2 flex flex-col">
                  <div className="flex justify-between text-[12pt] mb-5">
                    <div><span className="text-[#be1e4d] font-bold">जावक क्र. :</span> <strong>Draft</strong></div>
                    <div><span className="text-[#be1e4d] font-bold">दिनांक :</span> <strong>{new Date(formData.letterDate).toLocaleDateString('en-IN')}</strong></div>
                  </div>

                  <div className="text-[12pt] leading-snug mb-5">
                    <strong>प्रति,</strong><br/>
                    {formData.recipient.name && <>{formData.recipient.name}<br/></>}
                    {formData.recipient.organization && <>{formData.recipient.organization}<br/></>}
                    {formData.recipient.address && <>{formData.recipient.address}<br/></>}
                    {[formData.recipient.city, formData.recipient.state, formData.recipient.country].filter(Boolean).join(', ')}
                  </div>

                  {formData.subject && (
                    <div className="text-[13pt] font-bold mb-5">
                      <span className="text-[#be1e4d]">विषय : </span> {formData.subject}
                    </div>
                  )}

                  <div className="text-[12pt] leading-relaxed text-justify flex-1 prose" dangerouslySetInnerHTML={{ __html: formData.content.body }} />

                  <div className="text-right text-[#1e3a8a] text-[14pt] font-bold mt-10 mb-8">
                    <div className="mb-14">सचिव</div>
                    <div>श्री गुरुमुर्ती रुद्रपशुपति</div>
                    <div>लिंगायत मठ</div>
                  </div>
               </div>
             </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateLetter;

import React, { useState } from 'react';

// Helper to convert number to Marathi words
function convertNumberToMarathiWords(amount) {
  if (amount === 0) return "शून्य";
  
  const marathiNums = [
    "", "एक", "दोन", "तीन", "चार", "पाच", "सहा", "सात", "आठ", "नऊ", "दहा",
    "अकरा", "बारा", "तेरा", "चौदा", "पंधरा", "सोळा", "सतरा", "अठरा", "एकोणीस", "वीस",
    "एकवीस", "बावीस", "तेवीस", "चोवीस", "पंचवीस", "सव्वीस", "सत्तावीस", "अठ्ठावीस", "एकोणतीस", "तीस",
    "एकतीस", "बत्तीस", "तेहतीस", "चौतीस", "पस्तीस", "छत्तीस", "सडतीस", "अडतीस", "एकोणचाळीस", "चाळीस",
    "एकचाळीस", "बेचाळीस", "तेचाळीस", "चोवेचाळीस", "पंचेचाळीस", "सचेचाळीस", "सत्तेचाळीस", "अठ्ठेचाळीस", "एकोणपन्नास", "पन्नास",
    "एकपन्न", "बावन", "त्रिपन्न", "चौपन", "पंचावन", "सप्पन", "सत्तावन", "अठ्ठावन", "एकोणसाठ", "साठ",
    "एकसष्ठ", "बासष्ठ", "त्रेसष्ठ", "चौसष्ठ", "पायसष्ठ", "सहासष्ठ", "सदुसष्ठ", "अडुसष्ठ", "एकोणसत्तर", "सत्तर",
    "एकहत्तर", "बाहत्तर", "त्र्याहत्तर", "चौऱ्याहत्तर", "पंच्याहत्तर", "शहात्तर", "सत्त्याहत्तर", "अठ्ठ्याहत्तर", "एकोणऐंशी", "ऐंशी",
    "एक्याऐंशी", "ब्याऐंशी", "त्र्याऐंशी", "चौऱ्याऐंशी", "पंच्याऐंशी", "शहाऐंशी", "सत्त्याऐंशी", "अठ्ठ्याऐंशी", "एकोणनव्वद", "नव्वद",
    "एक्याण्णव", "ब्याण्णव", "त्र्याण्णव", "चौऱ्याण्णव", "पंच्याण्णव", "शहाण्णव", "सत्त्याण्णव", "अठ्ठ्याण्णव", "नव्याण्णव"
  ];

  let words = "";
  let temp = Math.floor(amount);
  
  const crores = Math.floor(temp / 10000000);
  temp %= 10000000;
  
  const lakhs = Math.floor(temp / 100000);
  temp %= 100000;
  
  const thousands = Math.floor(temp / 1000);
  temp %= 1000;
  
  const hundreds = Math.floor(temp / 100);
  temp %= 100;
  
  const remaining = temp;

  if (crores > 0) {
    words += (crores < 100 ? marathiNums[crores] : convertNumberToMarathiWords(crores)) + " कोटी ";
  }
  if (lakhs > 0) {
    words += marathiNums[lakhs] + " लाख ";
  }
  if (thousands > 0) {
    words += marathiNums[thousands] + " हजार ";
  }
  if (hundreds > 0) {
    words += marathiNums[hundreds] + "शे ";
  }
  if (remaining > 0) {
    words += marathiNums[remaining] + " ";
  }

  return words.trim() + " रुपये फक्त";
}

// Helper to split Marathi amount words across two lines
function splitMarathiWords(words, maxCharLength) {
  if (!words || words.length <= maxCharLength) {
    return [words || "", ""];
  }
  const parts = words.split(" ");
  let line1 = "";
  let line2 = "";
  for (const part of parts) {
    if ((line1 + (line1 ? " " : "") + part).length <= maxCharLength) {
      line1 += (line1 ? " " : "") + part;
    } else {
      line2 += (line2 ? " " : "") + part;
    }
  }
  return [line1, line2];
}

function convertToMarathiScript(name) {
  if (!name) return "";
  const mappings = {
    "akanksha mali": "आकांक्षा माळी",
    "akanksha": "आकांक्षा",
    "amol patil": "अमोल पाटील",
    "amol": "अमोल"
  };
  const key = name.toLowerCase().trim();
  return mappings[key] || name;
}

// Helper to convert number to English words
function convertNumberToEnglishWords(amount) {
  if (amount === 0) return "Zero";
  
  const a = ["", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  
  if ((amount = amount.toString()).length > 9) return "Overflow";
  
  const n = ("000000000" + amount).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";
  
  let str = "";
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + "Crore " : "";
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + "Lakh " : "";
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + "Thousand " : "";
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + "Hundred " : "";
  str += (n[5] != 0) ? ((str != "") ? "and " : "") + (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]]) : "";
  
  return str.trim() + " Rupees Only";
}

const translations = {
  mr: {
    quote: "।। धर्माने विश्वाला शांती मिळते ।।",
    title: "श्री गुरुमूर्ती रुद्रपशुपती लिंगायत मठ संस्थान",
    addressLeft1: "पत्रव्यवहार पत्ता : श्री गुरुमूर्ती रुद्रपशुपती मठ, मु.पो. कोळे",
    addressLeft2: "ता.सांगोला, जि.सोलापूर ४१३३१४",
    addressRight: "पत्रव्यवहार पत्ता : श्री गुरुमूर्ती रुद्रपशुपती मठ, मु.पो. कोळे ता.सांगोला, जि.सोलापूर ४१३३१४",
    trustNo: "ट्रस्ट नं.: ए/१७५०",
    receipt: "पावती",
    branchMath: "शाखा मठ -",
    receiptNo: "पावती क्र.",
    dateLabel: "दिनांक :",
    nameLabel: "श्री/सौ/श्रीमती",
    receivedLabel: "आपणाकडून आज रोजी",
    forLabel: "यासाठी",
    amountWordsLabel: "अक्षरी रुपये",
    receivedCashLabel: "आज रोख मिळाले.",
    receiverSignature: "देणगी स्वीकारणाराची सही",
    thankYou: "धन्यवाद!",
    purposeDefault: "साधारण देणगी",
    branchDefault: "कोळे"
  },
  en: {
    quote: "।। Religion brings peace to the world ।।",
    title: "Shri Gurumurti Rudrapashupati Lingayat Math Sansthan",
    addressLeft1: "Address: Shri Gurumurti Rudrapashupati Math, A/P Kole",
    addressLeft2: "Tal. Sangola, Dist. Solapur 413314",
    addressRight: "Address: Shri Gurumurti Rudrapashupati Math, A/P Kole, Tal. Sangola, Dist. Solapur 413314",
    trustNo: "Trust No.: A/1750",
    receipt: "RECEIPT",
    branchMath: "Branch Math -",
    receiptNo: "Receipt No.",
    dateLabel: "Date :",
    nameLabel: "Mr/Mrs/Ms",
    receivedLabel: "Received from you today",
    forLabel: "for",
    amountWordsLabel: "Amount in words",
    receivedCashLabel: "received in cash today.",
    receiverSignature: "Receiver's Signature",
    thankYou: "Thank You!",
    purposeDefault: "General Donation",
    branchDefault: "Kole"
  }
};

const purposeMapping = {
  "साधारण देणगी": "General Donation",
  "अन्नदान": "Annadaan",
  "बांधकाम निधी": "Construction Fund",
  "General Donation": "साधारण देणगी"
};

const branchMapping = {
  "कोळे": "Kole",
  "Kole": "कोळे"
};

const Receipt = ({ donation, isUserSide = true }) => {
  const [lang, setLang] = useState('mr');
  
  if (!donation) return null;
  const t = translations[lang];
  let donorName = donation.donorName || "";
  if (lang === 'mr') {
    donorName = convertToMarathiScript(donorName);
  }

  const date = new Date(donation.date || Date.now());
  const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  const receiptNo = donation.receiptNumber || donation.donationReference || "901";
  
  let branchName = donation.branchId?.name || (donation.branchId ? (typeof donation.branchId === 'object' ? donation.branchId.name : donation.branchId) : null) || (lang === 'mr' ? "कोळे" : "Kole");
  if (lang === 'en' && branchMapping[branchName]) branchName = branchMapping[branchName];
  if (lang === 'mr' && branchMapping[branchName] === branchName) branchName = "कोळे"; // basic fallback
  
  const amountValue = donation.amount || 0;
  const amountWordsRaw = lang === 'mr' ? convertNumberToMarathiWords(amountValue) : convertNumberToEnglishWords(amountValue);
  
  let purposeTextRaw = donation.message || donation.annadaanType || t.purposeDefault;
  if (lang === 'en' && purposeMapping[purposeTextRaw]) purposeTextRaw = purposeMapping[purposeTextRaw];
  if (lang === 'mr' && purposeMapping[purposeTextRaw]) purposeTextRaw = purposeMapping[purposeTextRaw];

  const receiptCategory = (donation.category || donation.type || donation.receiptType || donation.donationType || '').toLowerCase();
  const showSwamiji = receiptCategory.includes('shakha') || receiptCategory.includes('branch');

  const getCategoryTitle = () => {
    if (receiptCategory.includes('jama')) {
      return lang === 'mr' ? 'जमा पावती' : 'JAMA RECEIPT';
    }
    if (receiptCategory.includes('shakha') || receiptCategory.includes('branch')) {
      return lang === 'mr' ? 'शाखा पावती' : 'BRANCH RECEIPT';
    }
    if (receiptCategory.includes('annadan')) {
      return lang === 'mr' ? 'अन्नदान पावती' : 'ANNADAN RECEIPT';
    }
    if (receiptCategory.includes('prasad')) {
      return lang === 'mr' ? 'प्रसाद पावती' : 'PRASAD RECEIPT';
    }
    if (receiptCategory.includes('expense') || receiptCategory.includes('payment')) {
      return lang === 'mr' ? 'खर्च पावती' : 'PAYMENT RECEIPT';
    }
    return lang === 'mr' ? 'देणगी पावती' : 'DONATION RECEIPT';
  };

  const receiptTitle = getCategoryTitle();

  const toggleLanguage = () => {
    setLang(lang === 'mr' ? 'en' : 'mr');
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Language Toggle Button */}
      <button 
        onClick={toggleLanguage}
        style={{
          position: 'absolute',
          top: '-40px',
          right: '0',
          padding: '6px 12px',
          backgroundColor: '#1A365D',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontFamily: "'Noto Sans Devanagari', sans-serif",
          fontWeight: 'bold',
          zIndex: 10
        }}
      >
        {lang === 'mr' ? 'English Receipt' : 'मराठी पावती'}
      </button>

    <div id="receipt-content" className={`receipt-outer-container ${isUserSide ? 'user-side' : ''}`}>
      {/* --- LEFT CARD (Counterfoil) --- */}
      {!isUserSide && (
        <div className="receipt-card-left">
          {/* Header Block */}
          <div style={{ padding: '12px 10px 0 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
            <div className="header-quote">{t.quote}</div>
            <div className="header-title" style={{ fontSize: '11px', marginTop: '4px', letterSpacing: '-0.3px', lineHeight: '1.2' }}>
              {t.title}
            </div>
            <div className="header-address" style={{ marginTop: '4px', fontSize: '7.8px', lineHeight: '1.2' }}>
              {t.addressLeft1}
            </div>
            <div className="header-address" style={{ marginTop: '4px', fontSize: '7.8px', lineHeight: '1.2' }}>
              {t.addressLeft2}
            </div>
            <div style={{ marginTop: '4px', textAlign: 'center', width: '100%' }}>
              <span className="trust-capsule">{t.trustNo}</span>
            </div>
          </div>

          {/* Ribbon bar */}
          <div className="ribbon-container" style={{ margin: '10px 10px 0 10px', width: '240px' }}>
            <svg width="240" height="28" viewBox="0 0 240 28" preserveAspectRatio="none" style={{ display: 'block' }}>
              <path d="M 0,0 L 80,0 L 68,28 L 0,28 Z" fill="#8B2D3B" />
              <path d="M 83,0 L 240,0 L 240,28 L 71,28 Z" fill="#EEEEEE" stroke="#8B2D3B" strokeWidth="1" />
            </svg>
            <div className="ribbon-label-pavti" style={{ left: '16px' }}>{receiptTitle}</div>
            <div className="ribbon-label-shakha" style={{ left: '88px' }}>
              <span style={{ color: '#8B2D3B' }}>{t.branchMath}</span>
              <span className="handwritten-val-inline">{branchName}</span>
            </div>
          </div>

          {/* Metadata Row */}
          <div className="metadata-row" style={{ marginTop: '20px' }}>
            <div>
              <span className="metadata-label">{t.receiptNo} </span>
              <span className="metadata-value-red">{receiptNo}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <span className="metadata-label">{t.dateLabel} </span>
              <span className="metadata-value-blue" style={{ borderBottom: '0.75px solid #5B7590', minWidth: '70px', display: 'inline-block', textAlign: 'center', lineHeight: '1.2' }}>
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Form Fields Area */}
          <div className="form-fields-container">
            {/* Line 1: Name */}
            <div className="form-row">
              <span className="form-label">{t.nameLabel}</span>
              <div className="form-line" style={{ marginLeft: '14px' }}>
                <span className="handwritten-val" style={{ left: '6px' }}>
                  {donorName}
                </span>
              </div>
            </div>
            
            {/* Line 2: Purpose */}
            <div className="form-row">
              <span className="form-label">{t.receivedLabel}</span>
              <div className="form-line">
                <span className="handwritten-val">
                  {purposeText}
                </span>
              </div>
            </div>

            {/* Line 3: Words (Part 1) */}
            <div className="form-row">
              <span className="form-label">{t.amountWordsLabel}</span>
              <div className="form-line">
                <span className="handwritten-val" style={{ fontSize: '13px' }}>
                  {splitMarathiWords(amountWords, 22)[0]}
                </span>
              </div>
            </div>

            {/* Line 4: Words (Part 2) + today received */}
            <div className="form-row">
              <div className="form-line-prefix-fill">
                <span className="handwritten-val" style={{ left: '0px', fontSize: '13px' }}>
                  {splitMarathiWords(amountWords, 22)[1]}
                </span>
              </div>
              <span className="form-label" style={{ marginLeft: '6px' }}>{t.receivedCashLabel}</span>
            </div>
          </div>

          {/* Bottom Area */}
          <div style={{ padding: '0 14px 10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', boxSizing: 'border-box' }}>
            {/* Amount Box */}
            <div className="amount-box-container">
              <div className="amount-diamond">
                <span className="amount-diamond-symbol">₹</span>
              </div>
              <div className="amount-rect">
                ₹ {donation.amount?.toLocaleString()}
              </div>
            </div>
            
            {/* Signature */}
            <div className="signature-text" style={{ paddingBottom: '2px', fontSize: '9.5px' }}>
              {t.receiverSignature}
            </div>
          </div>
        </div>
      )}

      {/* --- SEPARATOR DOTTED LINE --- */}
      {!isUserSide && (
        <div className="receipt-separator">
          <div className="receipt-dotted-line"></div>
        </div>
      )}

      {/* --- RIGHT CARD (Main Receipt) --- */}
      <div className="receipt-card-right">
        {/* Top Header Row with Swamiji Photos */}
        <div style={{ padding: '8px 14px 0 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
          {/* Left Swamiji */}
          {showSwamiji ? (
            <div className="swamiji-photo-frame">
              <img src="/guru_swamiji.png" alt="Guru Swamiji" className="swamiji-photo" />
            </div>
          ) : (
            <div style={{ width: '52px', height: '65px' }}></div>
          )}

          {/* Middle Header Text */}
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px', width: '320px', boxSizing: 'border-box' }}>
            <div className="header-quote">{t.quote}</div>
            <div className="header-title" style={{ fontSize: '15.5px', marginTop: '4.5px', letterSpacing: '-0.3px', lineHeight: '1.2' }}>
              {t.title}
            </div>
            <div className="header-address" style={{ marginTop: '4.5px', fontSize: '7.8px', lineHeight: '1.2' }}>
              {t.addressRight}
            </div>
            <div style={{ marginTop: '4px', textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span className="trust-capsule">{t.trustNo}</span>
              
              {/* Ribbon bar situated between the 2 Swamiji images - decreased width to 260px */}
              <div className="ribbon-container" style={{ marginTop: '3px', height: '24px', width: '260px', position: 'relative' }}>
                <svg width="260" height="24" viewBox="0 0 260 24" preserveAspectRatio="none" style={{ display: 'block' }}>
                  <path d="M 0,0 L 80,0 L 70,24 L 0,24 Z" fill="#8B2D3B" />
                  <path d="M 83,0 L 260,0 L 260,24 L 73,24 Z" fill="#EEEEEE" stroke="#8B2D3B" strokeWidth="0.75" />
                </svg>
                <div style={{ position: 'absolute', left: '0px', top: '0px', width: '73px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D8B321', fontFamily: "'Noto Sans Devanagari', sans-serif", fontWeight: '900', fontSize: '9px', textTransform: 'uppercase' }}>
                  {receiptTitle}
                </div>
                <div style={{ position: 'absolute', left: '82px', top: '0px', height: '24px', display: 'flex', alignItems: 'center', fontFamily: "'Noto Sans Devanagari', sans-serif", fontWeight: '700', fontSize: '9px', gap: '3px' }}>
                  <span style={{ color: '#8B2D3B' }}>{t.branchMath}</span>
                  <span style={{ color: '#1A365D', fontFamily: "'Kalam', cursive", fontWeight: '700', fontSize: '10.5px', marginTop: '-1px' }}>{branchName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Swamiji */}
          {showSwamiji ? (
            <div className="swamiji-photo-frame">
              <img src="/current_swamiji.png" alt="Current Swamiji" className="swamiji-photo" />
            </div>
          ) : (
            <div style={{ width: '52px', height: '65px' }}></div>
          )}
        </div>

        {/* Metadata Row */}
        <div className="metadata-row" style={{ padding: '0 20px', marginTop: '20px' }}>
          <div>
            <span className="metadata-label">{t.receiptNo} </span>
            <span className="metadata-value-red" style={{ fontSize: '14px' }}>{receiptNo}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <span className="metadata-label">{t.dateLabel} </span>
            <span className="metadata-value-blue" style={{ borderBottom: '0.75px solid #5B7590', minWidth: '80px', display: 'inline-block', textAlign: 'center', lineHeight: '1.2', fontSize: '13px' }}>
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Form Fields Area */}
        <div className="form-fields-container" style={{ padding: '0 20px', gap: '8px' }}>
          {/* Line 1: Name */}
          <div className="form-row">
            <span className="form-label">{t.nameLabel}</span>
            <div className="form-line" style={{ marginLeft: '14px' }}>
              <span className="handwritten-val" style={{ left: '6px' }}>
                {donorName}
              </span>
            </div>
          </div>
          
          {/* Line 2: Purpose */}
          <div className="form-row">
            <span className="form-label">{t.receivedLabel}</span>
            <div className="form-line-double">
              <span className="handwritten-val">
                {purposeText}
              </span>
            </div>
            <span className="form-label">{t.forLabel}</span>
          </div>

          {/* Line 3: Words (Part 1) */}
          <div className="form-row">
            <span className="form-label">{t.amountWordsLabel}</span>
            <div className="form-line">
              <span className="handwritten-val" style={{ fontSize: '13.5px' }}>
                {splitMarathiWords(amountWords, 40)[0]}
              </span>
            </div>
          </div>

          {/* Line 4: Words (Part 2) + today received */}
          <div className="form-row">
            <div className="form-line-prefix-fill">
              <span className="handwritten-val" style={{ left: '0px', fontSize: '13.5px' }}>
                {splitMarathiWords(amountWords, 40)[1]}
              </span>
            </div>
            <span className="form-label" style={{ marginLeft: '6px' }}>{t.receivedCashLabel}</span>
          </div>
        </div>

        {/* Bottom Area */}
        <div style={{ padding: '0 20px 10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', boxSizing: 'border-box' }}>
          {/* Amount Box */}
          <div className="amount-box-container">
            <div className="amount-diamond">
              <span className="amount-diamond-symbol">₹</span>
            </div>
            <div className="amount-rect" style={{ minWidth: '115px', height: '30px', fontSize: '14.5px' }}>
              ₹ {donation.amount?.toLocaleString()}
            </div>
          </div>
          
          {/* Thank You Logo & Text */}
          <div className="thankyou-container">
            <img src="/shiva_linga_logo.png" alt="Shiva Linga" className="thankyou-logo" />
            <span className="thankyou-text">{t.thankYou}</span>
          </div>

          {/* Signature */}
          <div className="signature-text" style={{ paddingBottom: '2px', fontSize: '9.5px' }}>
            {t.receiverSignature}
          </div>
        </div>
      </div>

      {/* Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&family=Noto+Serif+Devanagari:wght@400;500;600;700;800;900&display=swap');
        
        .receipt-outer-container {
          width: 794px;
          height: 420px;
          background-color: #F58220;
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px;
          box-sizing: border-box;
          font-family: 'Noto Sans Devanagari', sans-serif;
          user-select: none;
        }

        .receipt-outer-container.user-side {
          width: 520px;
          background-color: #F58220;
          justify-content: center;
        }

        .receipt-card-left {
          width: 260px;
          height: 392px;
          background-color: #FFFFFF;
          border: 1px solid #8B2D3B;
          border-radius: 4px;
          box-sizing: border-box;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }

        .receipt-card-right {
          width: 492px;
          height: 392px;
          background-color: #FFFFFF;
          border: 1px solid #8B2D3B;
          border-radius: 4px;
          box-sizing: border-box;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }

        .receipt-separator {
          width: 14px;
          height: 392px;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }

        .receipt-dotted-line {
          border-left: 1px dashed #A0A0A0;
          height: 100%;
          width: 1px;
        }

        .header-quote {
          font-family: 'Noto Sans Devanagari', sans-serif;
          font-size: 9.5px;
          font-weight: 700;
          color: #222222;
          text-align: center;
          margin: 0;
          line-height: 1.1;
        }

        .header-title {
          font-family: 'Noto Serif Devanagari', serif;
          font-weight: 800;
          color: #D32F2F;
          text-align: center;
          margin: 0;
        }

        .header-address {
          font-family: 'Noto Sans Devanagari', sans-serif;
          font-size: 8px;
          font-weight: 600;
          color: #333333;
          text-align: center;
          line-height: 1.2;
          margin: 0;
        }

        .trust-capsule {
          background-color: #8B2D3B;
          color: #FFFFFF;
          font-size: 8.5px;
          font-weight: 700;
          border-radius: 50px;
          padding: 4.5px 18px;
          display: inline-block;
          line-height: 1;
        }

        .swamiji-photo-frame {
          width: 70px;
          height: 92px;
          border: 1px solid #8B2D3B;
          border-radius: 4px;
          overflow: hidden;
          background-color: transparent;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .swamiji-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .ribbon-container {
          height: 28px;
          position: relative;
          width: 100%;
        }

        .ribbon-label-pavti {
          position: absolute;
          left: 12px;
          top: 0;
          height: 28px;
          display: flex;
          align-items: center;
          color: #D8B321;
          font-family: 'Noto Sans Devanagari', sans-serif;
          font-weight: 900;
          font-size: 12.5px;
        }

        .ribbon-label-shakha {
          position: absolute;
          left: 92px;
          top: 0;
          height: 28px;
          display: flex;
          align-items: center;
          font-family: 'Noto Sans Devanagari', sans-serif;
          font-weight: 700;
          font-size: 11px;
          gap: 6px;
        }

        .ribbon-label-shakha-right {
          position: absolute;
          left: 148px;
          top: 0;
          height: 28px;
          display: flex;
          align-items: center;
          font-family: 'Noto Sans Devanagari', sans-serif;
          font-weight: 700;
          font-size: 11px;
          gap: 8px;
        }

        .handwritten-val-inline {
          color: #1A365D;
          font-family: 'Kalam', cursive;
          font-weight: 700;
          font-size: 12.5px;
          margin-top: -1px;
        }

        .metadata-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 14px;
          font-size: 12px;
          font-weight: 700;
          margin-top: 4px;
        }

        .metadata-label {
          color: #222222;
          font-family: 'Noto Sans Devanagari', sans-serif;
          font-weight: 700;
        }

        .metadata-value-red {
          color: #D32F2F;
          font-family: 'Noto Sans Devanagari', sans-serif;
          font-weight: 800;
          font-size: 13.5px;
        }

        .metadata-value-blue {
          color: #1A365D;
          font-family: 'Kalam', cursive;
          font-weight: 700;
          font-size: 13px;
        }

        .form-fields-container {
          padding: 0 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 4px;
        }

        .form-row {
          display: flex;
          align-items: flex-end;
          position: relative;
          height: 24px;
          width: 100%;
        }

        .form-label {
          color: #222222;
          font-family: 'Noto Sans Devanagari', sans-serif;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          margin-bottom: 2px;
        }

        .form-line {
          flex-grow: 1;
          border-bottom: 0.75px solid #5B7590;
          margin-left: 6px;
          position: relative;
          height: 100%;
          display: flex;
          align-items: flex-end;
        }

        .form-line-double {
          flex-grow: 1;
          border-bottom: 0.75px solid #5B7590;
          margin-left: 6px;
          margin-right: 6px;
          position: relative;
          height: 100%;
          display: flex;
          align-items: flex-end;
        }

        .form-line-prefix-fill {
          flex-grow: 1;
          border-bottom: 0.75px solid #5B7590;
          position: relative;
          height: 100%;
          display: flex;
          align-items: flex-end;
        }

        .handwritten-val {
          color: #1A365D;
          font-family: 'Kalam', cursive;
          font-weight: 700;
          font-size: 14.5px;
          white-space: nowrap;
          position: absolute;
          left: 4px;
          bottom: -1px;
        }

        .amount-box-container {
          display: flex;
          align-items: center;
        }

        .amount-diamond {
          width: 18px;
          height: 18px;
          background-color: #D32F2F;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(45deg);
          flex-shrink: 0;
        }

        .amount-diamond-symbol {
          transform: rotate(-45deg);
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 0.5px;
          margin-right: 0.5px;
        }

        .amount-rect {
          border: 1px solid #8B2D3B;
          border-radius: 15px;
          background-color: #FFFFFF;
          height: 30px;
          padding: 0 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Kalam', cursive;
          font-weight: 700;
          font-size: 14px;
          color: #1A365D;
          margin-left: 8px;
          min-width: 90px;
          box-sizing: border-box;
        }

        .thankyou-container {
          display: flex;
          align-items: center;
          gap: 6px;
          justify-content: center;
          flex-grow: 1;
          padding-bottom: 2px;
        }

        .thankyou-logo {
          width: 44px;
          height: 28px;
          object-fit: contain;
          border-radius: 50%;
          border: 0.5px solid #E2E8F0;
          background-color: #FFFFFF;
        }

        .thankyou-text {
          font-family: 'Kalam', cursive;
          font-weight: 700;
          font-size: 16px;
          color: #D32F2F;
          font-style: normal;
        }

        .signature-text {
          font-family: 'Noto Sans Devanagari', sans-serif;
          font-size: 9.5px;
          font-weight: 700;
          color: #222222;
          text-align: right;
          flex-shrink: 0;
        }

        @media print {
          @page {
            size: ${isUserSide ? '137mm 111mm' : '210mm 111mm'};
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #receipt-content, #receipt-content * {
            visibility: visible;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: ${isUserSide ? '137mm' : '210mm'} !important;
            height: 111mm !important;
            margin: 0 !important;
            padding: 14px !important;
            box-sizing: border-box;
            display: flex !important;
            justify-content: ${isUserSide ? 'center' : 'space-between'} !important;
            align-items: center !important;
            background-color: #F58220 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .receipt-card-left, .receipt-card-right {
            border: 1px solid #8B2D3B !important;
            background-color: #FFFFFF !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .amount-diamond {
            background-color: #D32F2F !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .trust-capsule {
            background-color: #8B2D3B !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .form-line, .form-line-double, .form-line-prefix-fill {
            border-bottom: 0.75px solid #5B7590 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
    </div>
    </div>
  );
};

export default Receipt;

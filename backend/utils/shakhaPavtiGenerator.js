const { getBrowser } = require('./browserManager');
const fs = require('fs');
const path = require('path');
const { transliterateToMarathi, translateToMarathi } = require('./translationService');

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

function convertNumberToEnglishWords(amount) {
    if (amount === 0) return "Zero";
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (amount < 0) return '';
    let n = ('000000000' + amount).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return ''; 
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim() + " Rupees Only";
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

exports.generateShakhaPavtiPdf = async (rawDonation) => {
  let browser;
  try {
    const donation = typeof rawDonation.toObject === 'function' ? rawDonation.toObject() : { ...rawDonation };

    if (donation.address) {
      donation.address = String(donation.address).replace(/\b\d{10}\b/g, '').trim();
    }

    const receiptDate = donation.approvalDate || donation.date || Date.now();
    const dateStr = new Date(receiptDate).toLocaleDateString("en-IN", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });
    
    const receiptNo = donation.receiptNumber || donation.donationReference || `SP-${Date.now().toString().slice(-6)}`;
    const donorName = donation.donorName || donation.name || '';
    const donorNameMarathi = donorName ? await transliterateToMarathi(donorName) : '';
    const bilingualName = donorName && donorNameMarathi && donorName !== donorNameMarathi ? `${donorNameMarathi} / ${donorName}` : donorName;

    const purpose = donation.message || donation.annadaanType || "साधारण देणगी";
    const purposeMarathi = purpose ? await translateToMarathi(purpose) : '';
    const bilingualPurpose = purpose && purposeMarathi && purpose !== purposeMarathi ? `${purposeMarathi} / ${purpose}` : purpose;

    const amount = donation.amount ? donation.amount.toLocaleString("en-IN") : "0";
    const amountMarathi = convertNumberToMarathiWords(donation.amount || 0);
    const amountEnglish = convertNumberToEnglishWords(donation.amount || 0);
    const bilingualAmountWords = `${amountMarathi} / ${amountEnglish}`;

    const branchName = donation.branchId ? (donation.branchId.name || "कोळे") : "कोळे";
    const [amountInWords1, amountInWords2] = splitMarathiWords(bilingualAmountWords, 45);

    const templatePath = path.join(__dirname, '../templates/shakhaTemplate.html');
    let htmlContent = fs.readFileSync(templatePath, 'utf8');

    // Read and encode images in base64 so Puppeteer renders them reliably
    const encodeImage = (filePath) => {
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).substring(1);
            const base64Data = fs.readFileSync(filePath, 'base64');
            return `data:image/${ext};base64,${base64Data}`;
        }
        return '';
    };

    const logoPath = path.join(__dirname, '../../frontend/src/assets/shivling.jpeg');
    const swamijiPath = path.join(__dirname, '../../frontend/src/assets/kolekar_SP_1.jpeg');
    const swamijiPath2 = path.join(__dirname, '../../frontend/src/assets/kolekar_SP_2.jpeg');
    
    const logoBase64 = encodeImage(logoPath);
    const swamijiBase64 = encodeImage(swamijiPath);
    let swamijiBase64_2 = encodeImage(swamijiPath2);
    if (!swamijiBase64_2) {
        swamijiBase64_2 = swamijiBase64; // fallback
    }

    htmlContent = htmlContent.replace(/{{receiptNumber}}/g, receiptNo);
    htmlContent = htmlContent.replace(/{{date}}/g, dateStr);
    htmlContent = htmlContent.replace(/{{donorName}}/g, bilingualName);
    htmlContent = htmlContent.replace(/{{purpose}}/g, bilingualPurpose);
    htmlContent = htmlContent.replace(/{{amountInWords1}}/g, amountInWords1);
    htmlContent = htmlContent.replace(/{{amountInWords2}}/g, amountInWords2);
    htmlContent = htmlContent.replace(/{{amount}}/g, amount);
    htmlContent = htmlContent.replace(/{{branchName}}/g, branchName);
    htmlContent = htmlContent.replace(/{{logoImage}}/g, logoBase64);
    htmlContent = htmlContent.replace(/{{swamijiImage1}}/g, swamijiBase64);
    htmlContent = htmlContent.replace(/{{swamijiImage2}}/g, swamijiBase64_2);

    const browser = await getBrowser();
    
    const page = await browser.newPage();
    await page.emulateMediaType('print');
    
    // Set viewport to the same size as the PDF layout for accurate rendering
    await page.setViewport({ width: 520, height: 420, deviceScaleFactor: 2 });
    await page.setContent(htmlContent, { waitUntil: 'load' });

    const pdfBuffer = await page.pdf({
      width: '520px',
      height: '420px',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    await page.close();
    return Buffer.from(pdfBuffer);
  } catch (err) {
    console.error("Error generating shakha pavti PDF:", err);
    throw err;
  }
};

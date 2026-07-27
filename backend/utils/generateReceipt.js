const PDFDocument = require("pdfkit");
const fs = require('fs');
const path = require('path');
const { transliterateToMarathi, translateToMarathi } = require('./translationService');
const { drawJamaPavti } = require('./jamaPavtiGenerator');
const { generateShakhaPavtiPdf } = require('./shakhaPavtiGenerator');
const { generateDengiPavtiPdf } = require('./dengiPavtiGenerator');

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

// Helper to convert number to English words
function convertNumberToEnglishWords(amount) {
  if (amount === 0) return "Zero";
  
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
                 "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function helper(num) {
    if (num < 20) return units[num];
    const digit = num % 10;
    return tens[Math.floor(num / 10)] + (digit !== 0 ? " " + units[digit] : "");
  }

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
    words += (crores < 20 ? units[crores] : helper(crores)) + " Crore ";
  }

  if (lakhs > 0) {
    words += helper(lakhs) + " Lakh ";
  }

  if (thousands > 0) {
    words += helper(thousands) + " Thousand ";
  }

  if (hundreds > 0) {
    words += units[hundreds] + " Hundred ";
  }

  if (remaining > 0) {
    words += helper(remaining) + " ";
  }

  return words.trim() + " Rupees Only";
}



/**
 * Generates a beautiful bilingual Marathi/English PDF receipt for a donation or annadaan.
 * Places Devotee Copy at top and Office Copy at bottom on a single A4 sheet.
 * 
 * @param {Object} donation - The donation details.
 * @returns {Promise<Buffer>} A promise that resolves to the PDF buffer.
 */
exports.generateReceiptPdf = (rawDonation) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Clone the object to prevent saving Marathi translated values to the database
      const donation = typeof rawDonation.toObject === 'function' ? rawDonation.toObject() : { ...rawDonation };

      const toBuffer = (buf) => {
        if (!buf) return buf;
        if (Buffer.isBuffer(buf)) return buf;
        if (buf instanceof Uint8Array || ArrayBuffer.isView(buf)) return Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
        if (buf instanceof ArrayBuffer) return Buffer.from(buf);
        if (buf?.buffer) return Buffer.from(buf.buffer);
        return Buffer.from(buf);
      };

      if (donation.donationType === "dengi_pavti" || !donation.donationType) {
        try {
          const rawBuf = await generateDengiPavtiPdf(donation);
          return resolve(toBuffer(rawBuf));
        } catch (e) {
          return reject(e);
        }
      } else if (donation.donationType === "shakha_pavti") {
        try {
          const rawBuf = await generateShakhaPavtiPdf(donation);
          return resolve(toBuffer(rawBuf));
        } catch (e) {
          return reject(e);
        }
      }

      const formatBilingual = async (text) => {
        if (!text) return text;
        const marathiText = await translateToMarathi(text);
        return (marathiText.trim() === text.trim()) ? text : `${marathiText} / ${text}`;
      };

      const formatBilingualTransliterate = async (text) => {
        if (!text) return text;
        const marathiText = await transliterateToMarathi(text);
        return (marathiText.trim() === text.trim()) ? text : `${marathiText} / ${text}`;
      };

      // Async Marathi Conversions
      if (donation.donorName) donation.donorName = await formatBilingualTransliterate(donation.donorName);
      else if (donation.name) donation.name = await formatBilingualTransliterate(donation.name);
      
      if (donation.address) donation.address = await formatBilingual(donation.address);
      if (donation.message) donation.message = await formatBilingual(donation.message);
      if (donation.annadaanType) donation.annadaanType = await formatBilingual(donation.annadaanType);
      
      // Payment methods can remain transliterated to avoid weird translations
      if (donation.paymentApp) donation.paymentApp = await transliterateToMarathi(donation.paymentApp);
      else if (donation.paymentMethod) donation.paymentMethod = await transliterateToMarathi(donation.paymentMethod);

      const isJamaPavti = donation.donationType === "jama_pavti";
      const doc = new PDFDocument({ 
        margin: 20, 
        size: isJamaPavti ? [595.28, 440] : "A4",
        info: { Title: isJamaPavti ? 'Jama Pavati' : 'Receipt' }
      });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const redColor = "#680000";
      const orangeColor = "#b83b1b";
      const lightOrangeColor = "#e67e22";

      // Font Paths
      const fontRegularPath = path.join(__dirname, '../assets/fonts/Mangal-Regular.ttf');
      const fontBoldPath = path.join(__dirname, '../assets/fonts/Mangal-Bold.ttf');

      // Register fonts if available
      if (fs.existsSync(fontRegularPath)) {
        doc.registerFont('Poppins', fontRegularPath);
      }
      if (fs.existsSync(fontBoldPath)) {
        doc.registerFont('Poppins-Bold', fontBoldPath);
      }

      const setRegularFont = (size) => {
        if (fs.existsSync(fontRegularPath)) {
          doc.font('Poppins').fontSize(size);
        } else {
          doc.font('Helvetica').fontSize(size);
        }
      };

      const setBoldFont = (size) => {
        if (fs.existsSync(fontBoldPath)) {
          doc.font('Poppins-Bold').fontSize(size);
        } else {
          doc.font('Helvetica-Bold').fontSize(size);
        }
      };

      const logoPath = path.join(__dirname, '../../frontend/public/logo.png');
      const swamijiPath = path.join(__dirname, '../../frontend/src/assets/kolekar_SP_1.jpeg');

      // Format Date & Receipt No
      const receiptDate = donation.approvalDate || donation.date || Date.now();
      const dateStr = new Date(receiptDate).toLocaleDateString("en-IN", {
        day: "2-digit", month: "2-digit", year: "numeric"
      });
      const receiptNo = donation.receiptNumber || donation.donationReference || `REC-${Date.now().toString().slice(-6)}`;

      // Generate words
      const amountMarathi = convertNumberToMarathiWords(donation.amount || 0);
      const amountEnglish = convertNumberToEnglishWords(donation.amount || 0);

      // Prepare context for the separated template files
      const ctx = {
        doc, donation,
        logoPath, swamijiPath, receiptNo, dateStr,
        amountMarathi, amountEnglish,
        setBoldFont, setRegularFont,
        redColor, orangeColor, lightOrangeColor
      };

      const drawReceiptTemplate = (yOffset, copyTitle) => {
        ctx.yOffset = yOffset;
        ctx.copyTitle = copyTitle;

        if (donation.donationType === "jama_pavti") {
          drawJamaPavti(ctx);
        }
      };

      if (isJamaPavti) {
        // Draw Single Copy
        drawReceiptTemplate(15, ""); // No subtitle needed as per physical copy format
      } else {
        // Draw Top Copy
        drawReceiptTemplate(15, "भाविकाची प्रत / Devotee's Copy");

        // Draw Middle Divider
        doc.save();
        doc.dash(4, { space: 4 }).moveTo(20, 415).lineTo(575, 415).lineWidth(1).strokeColor('gray').stroke();
        doc.restore();

        setRegularFont(6.5);
        doc.fillColor('gray').text("✂ कापण्यासाठी / Cut Here -------------------------------------------------------------", 20, 411, { width: 555, align: 'center' });

        // Draw Bottom Copy
        drawReceiptTemplate(420, "कार्यालयीन प्रत / Office's Copy");
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

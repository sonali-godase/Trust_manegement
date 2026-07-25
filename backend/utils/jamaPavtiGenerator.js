const fs = require('fs');
const path = require('path');

exports.drawJamaPavti = (ctx) => {
  const {
    doc, donation, copyTitle, yOffset,
    logoPath, swamijiPath, receiptNo, dateStr,
    amountMarathi, amountEnglish,
    setBoldFont, setRegularFont
  } = ctx;

  const paddingX = 20;
  const rectW = 555;
  const rectH = 385;
  const pinkRed = "#d81b60"; // Pink/Red colour

  // 1. Borders (Red border)
  doc.rect(paddingX, yOffset + 10, rectW, rectH).lineWidth(2).strokeColor(pinkRed).stroke();
  doc.rect(paddingX + 4, yOffset + 14, rectW - 8, rectH - 8).lineWidth(0.5).strokeColor(pinkRed).stroke();

  // Watermark
  if (fs.existsSync(logoPath)) {
    doc.save();
    doc.fillOpacity(0.03).strokeOpacity(0.03);
    doc.image(logoPath, 217, yOffset + 115, { width: 160 });
    doc.restore();
  }

  // Draw Swamiji Photos on Left & Right Header
  if (swamijiPath && fs.existsSync(swamijiPath)) {
    doc.image(swamijiPath, paddingX + 15, yOffset + 20, { width: 50, height: 65 });
  }
  const swamijiPath2 = path.join(__dirname, '../../frontend/src/assets/kolekar_SP_2.jpeg');
  if (fs.existsSync(swamijiPath2)) {
    doc.image(swamijiPath2, paddingX + rectW - 65, yOffset + 20, { width: 50, height: 65 });
  }

  // 2. Header
  setBoldFont(16);
  doc.fillColor(pinkRed).text("श्री गुरुमूर्ती रुद्रपशुपती लिंगायत मठ निमसोड, मिरज", paddingX, yOffset + 25, { width: rectW, align: 'center' });
  
  setBoldFont(9);
  doc.text("पत्रव्यवहार पत्ता : श्री गुरुमूर्ती रुद्रपशुपती मठ, मु.पो. कोळे ता. सांगोला, जि. सोलापूर ४१३३१४", paddingX, yOffset + 50, { width: rectW, align: 'center' });

  // Left & Right Header Info
  setBoldFont(10);
  doc.fillColor(pinkRed).text("शाखा मठ - जवळा ता. सांगोला", paddingX + 20, yOffset + 75);
  doc.text("ट्रस्ट नं. : ए/ १७५० सांगली", paddingX + 20, yOffset + 75, { width: rectW - 40, align: 'right' });

  // Center: जमा पावती (with rounded rect)
  const boxWidth = 140;
  const boxX = (595 - boxWidth) / 2;
  doc.roundedRect(boxX, yOffset + 85, boxWidth, 24, 12).fill(pinkRed);
  doc.fillColor('white');
  setBoldFont(12);
  doc.text("जमा पावती", boxX, yOffset + 89, { width: boxWidth, align: 'center' });
  
  // Copy Title below
  if (copyTitle) {
    setBoldFont(7.5);
    doc.fillColor(pinkRed).text(`(${copyTitle})`, boxX, yOffset + 110, { width: boxWidth, align: 'center' });
  }

  // Metadata row
  setBoldFont(10);
  doc.fillColor(pinkRed).text("पावती नंबर :", paddingX + 20, yOffset + 130);
  setRegularFont(10);
  doc.fillColor('black').text(receiptNo, paddingX + 85, yOffset + 130);
  doc.moveTo(paddingX + 80, yOffset + 142).lineTo(paddingX + 200, yOffset + 142).lineWidth(0.5).strokeColor(pinkRed).stroke();

  setBoldFont(10);
  doc.fillColor(pinkRed).text("दिनांक :", paddingX + 350, yOffset + 130);
  setRegularFont(10);
  doc.fillColor('black').text(dateStr, paddingX + 395, yOffset + 130);
  doc.moveTo(paddingX + 390, yOffset + 142).lineTo(paddingX + 500, yOffset + 142).lineWidth(0.5).strokeColor(pinkRed).stroke();

  // Body Fields
  const drawField = (y, label, val1, val2 = null, x2 = 0) => {
    setBoldFont(10);
    doc.fillColor(pinkRed).text(label, paddingX + 20, y);
    setRegularFont(10);
    doc.fillColor('black').text(val1 || "N/A", paddingX + 160, y - 2, { width: x2 > 0 ? x2 - (paddingX + 170) : rectW - 190 });
    // Line
    doc.moveTo(paddingX + 155, y + 10).lineTo(x2 > 0 ? x2 - 10 : paddingX + rectW - 30, y + 10).lineWidth(0.5).strokeColor(pinkRed).stroke();

    if (val2 && x2 > 0) {
      setBoldFont(10);
      doc.fillColor(pinkRed).text(val2.label, x2, y);
      setRegularFont(10);
      doc.fillColor('black').text(val2.val || "N/A", x2 + 30, y - 2);
      doc.moveTo(x2 + 25, y + 10).lineTo(paddingX + rectW - 30, y + 10).lineWidth(0.5).strokeColor(pinkRed).stroke();
    }
  };

  const purpose = donation.message || donation.annadaanType || "देणगी / Donation";
  let paymentModeStr = "रोख";
  if (donation.utrNumber) {
    paymentModeStr = `UPI (UTR: ${donation.utrNumber})`;
  } else if (donation.paymentApp) {
    paymentModeStr = donation.paymentApp;
  }

  drawField(yOffset + 165, "श्री. / सौ. / श्रीमती", donation.donorName || donation.name);
  drawField(yOffset + 195, "रा.", donation.address, { label: "मो.", val: donation.phone }, paddingX + 350);
  drawField(yOffset + 225, "आजरोजी आपणाकडून", `${purpose}`);
  drawField(yOffset + 255, "अक्षरी रुपये", `${amountMarathi} / ${amountEnglish}`);
  drawField(yOffset + 285, "रोख / चेक / ड्राफ्ट नं.", paymentModeStr);

  // Signature Row & Box
  const bottomY = yOffset + 325;
  
  // Large ₹ Box (Left)
  doc.rect(paddingX + 20, bottomY, 110, 35).fillAndStroke(pinkRed, pinkRed);
  doc.fillColor('white');
  setBoldFont(18);
  doc.text("₹", paddingX + 30, bottomY + 8);
  doc.rect(paddingX + 50, bottomY, 80, 35).fillAndStroke('white', pinkRed);
  doc.fillColor('black');
  setBoldFont(12);
  doc.text(`${donation.amount ? donation.amount.toLocaleString("en-IN") : "0"}/-`, paddingX + 55, bottomY + 11);

  // Bottom Thanks
  setBoldFont(13);
  doc.fillColor(pinkRed).text("धन्यवाद!", paddingX + 20, bottomY + 45);

  // Center: पैसे देणाऱ्याची सही
  const centerTextX = paddingX + 170;
  setBoldFont(11);
  doc.fillColor(pinkRed).text("पैसे देणाऱ्याची सही", centerTextX, bottomY + 45, { width: 140, align: 'center' });
  setRegularFont(9);
  doc.fillColor('black').text(`(${donation.donorName || donation.name || ''})`, centerTextX, bottomY + 25, { width: 140, align: 'center' });

  // Right: पैसे घेणाऱ्याची सही
  const rightTextX = paddingX + 380;
  setBoldFont(11);
  doc.fillColor(pinkRed).text("पैसे घेणाऱ्याची सही", rightTextX, bottomY + 45, { width: 140, align: 'center' });
  setRegularFont(9);
  doc.fillColor('black').text(`(Authorized Trustee)`, rightTextX, bottomY + 25, { width: 140, align: 'center' });
};

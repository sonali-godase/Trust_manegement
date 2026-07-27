/**
 * mailService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised, reusable email service for the Ashram / Temple Management
 * System. All outbound emails (OTP, welcome, donation receipts, event
 * reminders, announcements) route through this single module so transport
 * configuration only lives in one place.
 *
 * Dependencies  : nodemailer  (already in package.json)
 * Environment   : EMAIL_USER, EMAIL_PASS (or EMAIL_PASSWORD), EMAIL_HOST,
 *                 EMAIL_PORT, EMAIL_SECURE
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use strict";

const nodemailer = require("nodemailer");

// ─── 1. Transporter ──────────────────────────────────────────────────────────

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;

/**
 * Lazily-initialised Nodemailer transporter so the module can be loaded even
 * before the .env file is read (unit-test friendly).
 */
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  const isPort465 = process.env.EMAIL_PORT === "465";
  _transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    host:   process.env.EMAIL_HOST || "smtp.gmail.com",
    port:   parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === "true" || isPort465, // true for 465, false for 587
    requireTLS: !isPort465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: emailPass ? emailPass.replace(/\s+/g, '') : '',
    },
    // Connection timeouts to prevent hanging sockets
    connectionTimeout: 15_000,
    greetingTimeout:   15_000,
    socketTimeout:     15_000,
    tls: {
      rejectUnauthorized: false
    }
  });

  return _transporter;
};

// ─── 2. Startup Verification ─────────────────────────────────────────────────

/**
 * Verify that the SMTP credentials are reachable at startup.
 * Logs warnings without crashing the process so dev mode still works without
 * a real SMTP server configured.
 */
const verifyTransporter = async () => {
  console.log("[mailService] Verifying SMTP connection…");

  if (!emailUser) {
    console.error("[mailService][ERROR] EMAIL_USER environment variable is missing.");
    return;
  }
  if (!emailPass) {
    console.error("[mailService][ERROR] EMAIL_PASS / EMAIL_PASSWORD environment variable is missing.");
    return;
  }

  try {
    await getTransporter().verify();
    console.log("[mailService][INFO] SMTP connection verified successfully.");
  } catch (err) {
    console.error("[mailService][ERROR] SMTP verification failed:", err.message);
    if (emailUser && emailUser.endsWith("@gmail.com")) {
      console.warn(
        "[mailService][HINT] Gmail: use a 16-character App Password " +
        "(Account → Security → 2-Step Verification → App Passwords)."
      );
    }
  }
};

// Run once on module load (non-blocking)
verifyTransporter();

// ─── 3. Core Send Helper ─────────────────────────────────────────────────────

/**
 * Low-level helper — all public functions delegate here.
 *
 * @param {Object} opts
 * @param {string|string[]} opts.to          - Recipient(s)
 * @param {string}          opts.subject     - Email subject
 * @param {string}          [opts.text]      - Plain-text body
 * @param {string}          [opts.html]      - HTML body
 * @param {Object[]}        [opts.attachments] - Nodemailer attachment objects
 * @param {string}          [opts.replyTo]   - Email address for replies
 * @returns {Promise<Object>}  Nodemailer send-result info object
 */
const _send = async ({ to, subject, text, html, attachments = [], senderName, replyTo }) => {
  if (!emailUser || !emailPass) {
    const msg =
      "[mailService][ERROR] Cannot send email — SMTP credentials not configured. " +
      "Set EMAIL_USER and EMAIL_PASS in your .env file.";
    console.error(msg);
    throw new Error(msg);
  }

  const isBulk = Array.isArray(to) && to.length > 1;
  const mailOptions = {
    from:    `"${senderName || 'Ashram Notifications'}" <${emailUser}>`,
    replyTo: replyTo || emailUser,
    to:      isBulk ? emailUser : (Array.isArray(to) ? to[0] : to),
    bcc:     isBulk ? to.join(", ") : undefined,
    subject,
    text:    text || "",
    html:    html || (text ? text.replace(/\n/g, "<br>") : ""),
    attachments,
  };

  console.log(`[mailService][INFO] Sending email → Subject: "${subject}" | To: ${mailOptions.to} | BCC Count: ${isBulk ? to.length : 0}`);

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log(`[mailService][INFO] Email sent. Message ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[mailService][ERROR] Failed to send "${subject}" → ${err.message}`);
    throw err;
  }
};

// ─── 4. Public API ───────────────────────────────────────────────────────────

/**
 * Send a 6-digit OTP verification email.
 *
 * @param {string} to    - Recipient email address
 * @param {string} otp   - Plain-text OTP (never store this value)
 */
const sendOtpEmail = (to, otp) =>
  _send({
    to,
    subject: "Your OTP Verification Code",
    text: [
      "Hello,",
      "",
      `Your OTP is: ${otp}`,
      "This OTP is valid for 5 minutes.",
      "",
      "If you did not request this, please ignore this email.",
      "",
      "— Ashram Team",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#b45309;margin-bottom:8px;">OTP Verification</h2>
        <p style="color:#374151;">Hello,</p>
        <p style="color:#374151;">Your One-Time Password (OTP) is:</p>
        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:16px;text-align:center;margin:16px 0;">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#92400e;">${otp}</span>
        </div>
        <p style="color:#6b7280;font-size:13px;">This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
        <p style="color:#9ca3af;font-size:12px;">— Ashram Team</p>
      </div>
    `,
  });

/**
 * Send a registration-success / welcome email.
 *
 * @param {string} to   - Recipient email address
 * @param {string} name - Devotee's display name
 */
const sendWelcomeEmail = (to, name = "Devotee") =>
  _send({
    to,
    subject: "Welcome to Ashram",
    text: [
      `Hello ${name},`,
      "",
      "Thank you for registering with our Ashram platform.",
      "We are delighted to have you as part of our spiritual community.",
      "",
      "You can now log in and explore our services.",
      "",
      "With blessings,",
      "— Ashram Team",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#b45309;">Welcome to Ashram 🙏</h2>
        <p style="color:#374151;">Hello <strong>${name}</strong>,</p>
        <p style="color:#374151;">Thank you for registering with our Ashram platform.</p>
        <p style="color:#374151;">We are delighted to have you as part of our spiritual community.</p>
        <p style="color:#374151;">You can now log in and explore our services — pooja bookings, events, donations, and more.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
        <p style="color:#9ca3af;font-size:12px;">With blessings, — Ashram Team</p>
      </div>
    `,
  });

/**
 * Send a donation receipt email with an optional PDF attachment.
 *
 * @param {string}   to          - Donor email
 * @param {string}   donorName   - Donor's name
 * @param {number}   amount      - Donation amount (INR)
 * @param {string}   transactionId
 * @param {string}   purpose
 * @param {Buffer}   [pdfBuffer] - Pre-generated PDF as a Buffer
 */
const sendDonationReceiptEmail = (to, donorName, amount, transactionId, purpose, pdfBuffer) => {
  const attachments = [];
  if (pdfBuffer) {
    attachments.push({
      filename:    "Donation_Receipt.pdf",
      content:     pdfBuffer,
      contentType: "application/pdf",
    });
  }

  return _send({
    to,
    subject: "Donation Receipt — Ashram",
    text: [
      `Dear ${donorName},`,
      "",
      "Thank you for your generous donation. Your receipt is attached.",
      "",
      `Amount    : ₹${amount}`,
      `Purpose   : ${purpose || "General"}`,
      `Transaction ID: ${transactionId}`,
      "",
      "Your contribution supports our spiritual and community activities.",
      "",
      "With gratitude,",
      "— Ashram Team",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#b45309;">Donation Receipt 🙏</h2>
        <p>Dear <strong>${donorName}</strong>,</p>
        <p>Thank you for your generous donation. Your receipt is attached.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;color:#6b7280;">Amount</td><td style="padding:8px;font-weight:bold;">₹${amount}</td></tr>
          <tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">Purpose</td><td style="padding:8px;">${purpose || "General"}</td></tr>
          <tr><td style="padding:8px;color:#6b7280;">Transaction ID</td><td style="padding:8px;font-family:monospace;">${transactionId}</td></tr>
        </table>
        <p style="color:#374151;">Your contribution supports our spiritual and community activities.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
        <p style="color:#9ca3af;font-size:12px;">With gratitude, — Ashram Team</p>
      </div>
    `,
    attachments,
  });
};

/**
 * Send an event reminder email (5-day countdown).
 *
 * @param {string} to        - Recipient email
 * @param {string} name      - User's name
 * @param {string} eventTitle
 * @param {string} eventDate - Human-readable date string
 * @param {string} location
 */
const sendEventReminderEmail = (to, name, eventTitle, eventDate, location) =>
  _send({
    to,
    subject: "Upcoming Event Reminder — Ashram",
    text: [
      `Hello ${name},`,
      "",
      "Your registered event will start in 5 days.",
      "",
      `Event  : ${eventTitle}`,
      `Date   : ${eventDate}`,
      `Venue  : ${location}`,
      "",
      "We look forward to seeing you there.",
      "",
      "— Ashram Team",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#b45309;">Event Reminder 📅</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your registered event will start in <strong>5 days</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;color:#6b7280;">Event</td><td style="padding:8px;font-weight:bold;">${eventTitle}</td></tr>
          <tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">Date</td><td style="padding:8px;">${eventDate}</td></tr>
          <tr><td style="padding:8px;color:#6b7280;">Venue</td><td style="padding:8px;">${location}</td></tr>
        </table>
        <p style="color:#374151;">We look forward to seeing you there.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
        <p style="color:#9ca3af;font-size:12px;">— Ashram Team</p>
      </div>
    `,
  });

/**
 * Send a new-announcement notification.
 *
 * @param {string} to      - Recipient email
 * @param {string} name    - User's name
 * @param {string} title   - Announcement title
 * @param {string} content - Announcement body text
 * @param {string} senderName
 * @param {string} senderEmail
 */
const sendAnnouncementEmail = (to, name, title, content, senderName, senderEmail) =>
  _send({
    to,
    subject: "New Announcement — Ashram",
    senderName,
    replyTo: senderEmail,
    text: [
      `Hello ${name},`,
      "",
      "A new announcement has been published.",
      "",
      `Title   : ${title}`,
      `Details : ${content}`,
      "",
      "Visit our platform for more information.",
      "",
      "— Ashram Team",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#b45309;">New Announcement 📢</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>A new announcement has been published.</p>
        <div style="background:#f9fafb;border-left:4px solid #b45309;padding:12px 16px;margin:16px 0;border-radius:4px;">
          <p style="margin:0;font-weight:bold;color:#374151;">${title}</p>
          <p style="margin:8px 0 0;color:#6b7280;">${content}</p>
        </div>
        <p style="color:#374151;">Visit our platform for more information.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
        <p style="color:#9ca3af;font-size:12px;">— Ashram Team</p>
      </div>
    `,
  });

/**
 * Generic notification email — use for any ad-hoc notification.
 *
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {string} [html]
 * @param {Object[]} [attachments]
 */
const sendNotificationEmail = (to, subject, text, html, attachments) =>
  _send({ to, subject, text, html, attachments });

// ─── 5. Exports ──────────────────────────────────────────────────────────────

module.exports = {
  sendOtpEmail,
  sendWelcomeEmail,
  sendDonationReceiptEmail,
  sendEventReminderEmail,
  sendAnnouncementEmail,
  sendNotificationEmail,
};

const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  try {
    console.log("EMAIL_USER =", process.env.EMAIL_USER);
    console.log("EMAIL_PASS =", process.env.EMAIL_PASS ? "Loaded" : "Missing");
    console.log("EMAIL_SERVICE =", process.env.EMAIL_SERVICE);
    const isPort465 = process.env.EMAIL_PORT === "465";
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
      secure: isPort465, // true for 465, false for 587
      requireTLS: !isPort465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : '',
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false
      }
    });

    let sanitizedAttachments = options.attachments;
    if (sanitizedAttachments && Array.isArray(sanitizedAttachments)) {
      sanitizedAttachments = sanitizedAttachments.map(att => {
        if (att.content) {
          let buf = null;
          if (Buffer.isBuffer(att.content)) {
            buf = att.content;
          } else if (att.content instanceof Uint8Array || ArrayBuffer.isView(att.content)) {
            buf = Buffer.from(att.content.buffer, att.content.byteOffset, att.content.byteLength);
          } else if (att.content instanceof ArrayBuffer) {
            buf = Buffer.from(att.content);
          } else if (att.content?.buffer) {
            buf = Buffer.from(att.content.buffer);
          }
          return { ...att, content: buf || att.content };
        }
        return att;
      });
    }

    const mailOptions = {
      from: options.from || `Kolekar Maha Swamiji Monastery, Kole <${process.env.EMAIL_USER}>`,
      to: options.email,
      replyTo: options.replyTo,
      subject: options.subject,
      text: options.message,
      html: options.html,
      attachments: sanitizedAttachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully. Message ID:", info.messageId);
  } catch (error) {
    console.error("Error sending email: ", error);
  }
};

module.exports = sendEmail;

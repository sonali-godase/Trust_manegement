const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  try {
    console.log("EMAIL_USER =", process.env.EMAIL_USER);
    console.log("EMAIL_PASS =", process.env.EMAIL_PASS ? "Loaded" : "Missing");
    console.log("EMAIL_SERVICE =", process.env.EMAIL_SERVICE);
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Force IPv4 to prevent ENETUNREACH on IPv6-deprived networks
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

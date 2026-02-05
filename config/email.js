const nodemailer = require('nodemailer');

let transporter = null;

// Create transporter with Gmail settings (lazy initialization)
const getTransporter = () => {
  if (!transporter) {
    const port = parseInt(process.env.SMTP_PORT) || 465;
    
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: port,
      secure: port === 465, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
};

module.exports = { getTransporter };

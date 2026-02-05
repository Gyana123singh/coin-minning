const { getTransporter } = require('../config/email');

const sendEmail = async (options) => {
  const transporter = getTransporter();
  
  const mailOptions = {
    from: `${process.env.APP_NAME || 'Mining App'} <${process.env.SMTP_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

// OTP Email Template
const sendOTPEmail = async (email, otp, purpose) => {
  let subject, heading, message;

  switch (purpose) {
    case 'signup':
      subject = 'Verify Your Email - Mining App';
      heading = 'Welcome to Mining App!';
      message = 'Please use the following OTP to verify your email and complete your registration:';
      break;
    case 'login':
      subject = 'Login OTP - Mining App';
      heading = 'Login Verification';
      message = 'Please use the following OTP to login to your account:';
      break;
    case 'reset-password':
      subject = 'Reset Password OTP - Mining App';
      heading = 'Password Reset Request';
      message = 'Please use the following OTP to reset your password:';
      break;
    default:
      subject = 'OTP Verification - Mining App';
      heading = 'OTP Verification';
      message = 'Please use the following OTP:';
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #f59e0b, #ea580c); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .otp-box { background: #f8fafc; border: 2px dashed #f59e0b; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
        .otp { font-size: 36px; font-weight: bold; color: #ea580c; letter-spacing: 8px; }
        .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; }
        .warning { color: #ef4444; font-size: 13px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${heading}</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>${message}</p>
          <div class="otp-box">
            <div class="otp">${otp}</div>
          </div>
          <p class="warning">⚠️ This OTP is valid for 10 minutes. Do not share it with anyone.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Mining App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({ email, subject, html });
};

// Welcome Email Template
const sendWelcomeEmail = async (email, name, referralCode) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #f59e0b, #ea580c); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .code-box { background: #1e293b; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
        .code { font-size: 24px; font-weight: bold; color: #f59e0b; letter-spacing: 4px; }
        .feature { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 10px 0; }
        .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to Mining App!</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${name}</strong>,</p>
          <p>Congratulations! Your account has been successfully created. You've received <strong>100 coins</strong> as a signup bonus!</p>
          
          <h3>Your Referral Code:</h3>
          <div class="code-box">
            <div class="code">${referralCode}</div>
          </div>
          <p>Share this code with friends and earn <strong>50 coins</strong> for each direct referral!</p>
          
          <h3>What's Next?</h3>
          <div class="feature">🚀 Start mining to earn coins every hour</div>
          <div class="feature">👥 Invite friends to boost your mining speed by 20%</div>
          <div class="feature">✅ Complete KYC to unlock more features</div>
          
          <p>Happy Mining!</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Mining App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    email,
    subject: 'Welcome to Mining App! 🎉',
    html,
  });
};

// Mining Complete Notification
const sendMiningCompleteEmail = async (email, name, coinsEarned) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; text-align: center; }
        .coins { font-size: 48px; font-weight: bold; color: #f59e0b; }
        .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⛏️ Mining Cycle Complete!</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your 24-hour mining cycle has completed!</p>
          <p>You earned:</p>
          <div class="coins">+${coinsEarned} Coins</div>
          <p style="margin-top: 20px;">Start a new mining cycle now to keep earning!</p>
          <a href="#" style="display: inline-block; background: #f59e0b; color: white; padding: 15px 30px; border-radius: 10px; text-decoration: none; margin-top: 20px;">Start Mining</a>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Mining App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    email,
    subject: 'Mining Cycle Complete! ⛏️',
    html,
  });
};

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendWelcomeEmail,
  sendMiningCompleteEmail,
};

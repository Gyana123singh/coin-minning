const User = require("../models/User");
const OTP = require("../models/OTP");
const Settings = require("../models/Settings");
const Notification = require("../models/Notification");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { sendOTPEmail, sendWelcomeEmail } = require("../utils/sendEmail");
const {
  generateOTP,
  generateReferralCode,
  sanitizeUser,
  calculateReferralReward,
} = require("../utils/helpers");

// Google OAuth clients - accept tokens from Web, Android, and iOS
const googleClientIds = [
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
  process.env.GOOGLE_IOS_CLIENT_ID,
].filter(Boolean);

const googleClient = new OAuth2Client();

// Generate JWT Token
const generateJWT = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

// @desc    Send OTP for signup/login
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = async (req, res) => {
  try {
    const { email, purpose } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const validPurposes = ["signup", "login", "reset-password"];
    const otpPurpose = validPurposes.includes(purpose) ? purpose : "login";

    // Check if user exists for login/reset
    const existingUser = await User.findOne({ email });

    if (otpPurpose === "signup" && existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    if (
      (otpPurpose === "login" || otpPurpose === "reset-password") &&
      !existingUser
    ) {
      return res
        .status(404)
        .json({ success: false, message: "No account found with this email" });
    }

    // Delete existing OTPs for this email
    await OTP.deleteMany({ email });

    // Generate new OTP
    const otp = generateOTP();

    // Save OTP to database
    await OTP.create({
      email,
      otp,
      purpose: otpPurpose,
    });

    // Send OTP email
    await sendOTPEmail(email, otp, otpPurpose);

    res.status(200).json({
      success: true,
      message: `OTP sent to ${email}`,
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required" });
    }

    const otpRecord = await OTP.findOne({ email, otp });

    if (!otpRecord) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    // Mark OTP as verified (don't delete yet, needed for signup/login completion)
    otpRecord.verified = true;
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      purpose: otpRecord.purpose,
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ success: false, message: "Failed to verify OTP" });
  }
};

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
  try {
    const { email, name, password, referralCode } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({
        success: false,
        message: "Email, name, and password are required",
      });
    }

    // Check verified OTP
    const otpRecord = await OTP.findOne({
      email,
      purpose: "signup",
      verified: true,
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    // Check if already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const settings = await Settings.getSettings();

    // Generate unique referral code for new user
    let userReferralCode = generateReferralCode();
    while (await User.findOne({ referralCode: userReferralCode })) {
      userReferralCode = generateReferralCode();
    }

    const userData = {
      email,
      name,
      password,
      referralCode: userReferralCode,
      isEmailVerified: true,
      "miningStats.totalCoins": settings.signupBonus || 100,
    };

    let referrer = null;

    // =========================
    // 🔥 SELF REFERRAL BLOCK
    // =========================
    if (referralCode && referralCode.trim() !== "") {
      const cleanCode = referralCode.trim().toUpperCase();

      referrer = await User.findOne({ referralCode: cleanCode });

      if (!referrer) {
        return res.status(400).json({
          success: false,
          message: "Invalid referral code",
        });
      }

      // ❌ Block self referral (same email)
      if (referrer.email.toLowerCase() === email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: "You cannot use your own referral code",
        });
      }

      userData.referredBy = referrer._id;
    }

    // Create user AFTER validation
    const user = await User.create(userData);

    // Delete OTP
    await OTP.deleteMany({ email });

    const token = generateJWT(user._id);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create account",
    });
  }
};

// @desc    Login user with OTP
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "No account found with this email" });
    }

    // Check if user is active
    if (user.status !== "active") {
      return res
        .status(403)
        .json({ success: false, message: "Your account has been suspended" });
    }

    // Login with OTP
    if (otp) {
      const otpRecord = await OTP.findOne({ email, otp, purpose: "login" });
      if (!otpRecord) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid or expired OTP" });
      }
      await OTP.deleteMany({ email });
    }
    // Login with password
    else if (password) {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid password" });
      }
    } else {
      return res
        .status(400)
        .json({ success: false, message: "OTP or password required" });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateJWT(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Failed to login" });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required",
      });
    }

    // Verify OTP
    const otpRecord = await OTP.findOne({
      email,
      otp,
      purpose: "reset-password",
    });
    if (!otpRecord) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    // Update password
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    // Delete OTP
    await OTP.deleteMany({ email });

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to reset password" });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "referredBy",
      "name email referralCode",
    );

    res.status(200).json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Get Me Error:", error);
    res.status(500).json({ success: false, message: "Failed to get user" });
  }
};

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

// @desc    Login/Signup with Google
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
  try {
    const { idToken, referralCode } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google ID token is required",
      });
    }

    // Verify Google token
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken,
        audience: googleClientIds,
      });
    } catch (error) {
      console.error("Google token verification failed:", error);
      return res.status(401).json({
        success: false,
        message: "Invalid Google token",
      });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email not provided by Google",
      });
    }

    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    let isNewUser = false;

    // ===============================
    // EXISTING USER LOGIN
    // ===============================
    if (user) {
      if (user.status !== "active") {
        return res.status(403).json({
          success: false,
          message: "Your account has been suspended",
        });
      }

      user.googleId = googleId;
      user.authProvider = "google";
      user.lastLogin = new Date();
      user.isEmailVerified = true;

      if (picture && !user.avatar) {
        user.avatar = picture;
      }

      await user.save();
    }

    // ===============================
    // NEW USER SIGNUP
    // ===============================
    else {
      isNewUser = true;
      const settings = await Settings.getSettings();

      // Generate unique referral code
      let userReferralCode = generateReferralCode();
      while (await User.findOne({ referralCode: userReferralCode })) {
        userReferralCode = generateReferralCode();
      }

      const userData = {
        email,
        name: name || email.split("@")[0],
        googleId,
        authProvider: "google",
        avatar: picture || "",
        referralCode: userReferralCode,
        isEmailVerified: true,
        miningStats: {
          totalCoins: settings.signupBonus || 100,
        },
      };

      let referrer = null;

      // 🔥 SELF REFERRAL BLOCK
      if (referralCode && referralCode.trim() !== "") {
        const cleanCode = referralCode.trim().toUpperCase();

        referrer = await User.findOne({ referralCode: cleanCode });

        if (!referrer) {
          return res.status(400).json({
            success: false,
            message: "Invalid referral code",
          });
        }

        // Block self referral
        if (referrer.email.toLowerCase() === email.toLowerCase()) {
          return res.status(400).json({
            success: false,
            message: "You cannot use your own referral code",
          });
        }

        userData.referredBy = referrer._id;
      }

      // Create user AFTER validation
      user = await User.create(userData);

      // ===============================
      // PROCESS REFERRAL REWARD
      // ===============================
      if (referrer) {
        const directReward = calculateReferralReward(true, settings);

        referrer.miningStats.totalCoins += directReward;
        referrer.referralStats.totalCount += 1;
        referrer.referralStats.totalEarned += directReward;
        referrer.referralStats.directReferrals.push(user._id);

        await referrer.save();

        await Notification.create({
          user: referrer._id,
          type: "referral",
          title: "New Referral!",
          message: `${user.name} joined using your referral code. You earned ${directReward} coins!`,
        });
      }

      // Send welcome email
      try {
        await sendWelcomeEmail(email, name, userReferralCode);
      } catch (err) {
        console.error("Welcome email failed:", err);
      }
    }

    const token = generateJWT(user._id);

    return res.status(200).json({
      success: true,
      message: isNewUser ? "Account created successfully" : "Login successful",
      isNewUser,
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    return res.status(500).json({
      success: false,
      message: "Google authentication failed",
    });
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  signup,
  login,
  googleAuth,
  resetPassword,
  getMe,
  logout,
};

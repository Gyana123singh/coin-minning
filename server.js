const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const cron = require("node-cron");
const {
  checkMiningCycles,
  sendInactiveReminders,
  updateOwnershipProgress,
  updateReferralStatus,
  transferReferralToMiningWallet,
} = require("./utils/cronJobs");
const MiningSession = require("./models/MiningSession");
const User = require("./models/User");
const jwt = require("jsonwebtoken");

// Load env vars
dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Store connected users
const connectedUsers = new Map();

// Socket.io authentication
io.on("connection", (socket) => {
  console.log("New socket connection:", socket.id);

  socket.on("authenticate", async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      connectedUsers.set(userId, socket.id);
      socket.userId = userId;

      console.log(`User ${userId} authenticated on socket ${socket.id}`);

      const miningData = await getMiningDataForUser(userId);
      socket.emit("mining-status", miningData);
    } catch (error) {
      console.log("Socket auth error:", error.message);
      socket.emit("auth-error", { message: "Invalid token" });
    }
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
    }
  });

  socket.on("get-mining-status", async () => {
    if (socket.userId) {
      const miningData = await getMiningDataForUser(socket.userId);
      socket.emit("mining-status", miningData);
    }
  });
});

// Helper function
async function getMiningDataForUser(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const activeSession = await MiningSession.findOne({
      user: userId,
      status: "active",
    }).sort({ startTime: -1 });

    if (!activeSession) {
      return {
        status: "idle",
        currentSession: null,
        coinsEarned: 0,
        timeRemaining: 0,
        progress: 0,
      };
    }

    const now = new Date();
    const startTime = new Date(activeSession.startTime);
    const endTime = new Date(activeSession.endTime);

    const totalDuration = (endTime - startTime) / 1000;
    const elapsed = (now - startTime) / 1000;
    const remaining = Math.max(0, (endTime - now) / 1000);

    let status = "mining";
    let progress = (elapsed / totalDuration) * 100;
    let coinsEarned = (progress / 100) * activeSession.expectedCoins;

    if (now >= endTime) {
      status = "complete";
      progress = 100;
      coinsEarned = activeSession.expectedCoins;
    }

    return {
      status,
      currentSession: {
        id: activeSession._id,
        startTime: activeSession.startTime,
        endTime: activeSession.endTime,
        expectedCoins: activeSession.expectedCoins,
        miningRate: activeSession.miningRate,
      },
      coinsEarned: parseFloat(coinsEarned.toFixed(4)),
      timeRemaining: Math.floor(remaining),
      progress: parseFloat(progress.toFixed(2)),
    };
  } catch (error) {
    console.error("Error getting mining data:", error);
    return null;
  }
}

// Broadcast updates
setInterval(async () => {
  for (const [userId, socketId] of connectedUsers) {
    try {
      const miningData = await getMiningDataForUser(userId);

      if (!miningData) continue;

      if (miningData.status === "mining") {
        io.to(socketId).emit("mining-update", miningData);
      } else if (miningData.status === "complete") {
        io.to(socketId).emit("mining-complete", miningData);
      }
    } catch (error) {
      console.error(`Error broadcasting to user ${userId}:`, error);
    }
  }
}, 1000);

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://coin-minning.onrender.com",
      "https://olaroclub.online",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/mining", require("./routes/miningRoutes"));
app.use("/api/referrals", require("./routes/referralRoutes"));
app.use("/api/kyc", require("./routes/kycRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/settings", require("./routes/settingsRoutes"));
app.use("/api/wallet", require("./routes/walletRoutes"));
app.use("/api/coins", require("./routes/coinRoutes"));
app.use("/api/community", require("./routes/communityFeedRoutes"));
app.use("/api/admin", require("./routes/admin"));

// Health
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Mining App API is running" });
});

app.get("/", (req, res) => {
  res.send("Mining App API is running");
});

// Error handler
app.use(errorHandler);

// Cron Jobs
cron.schedule("0 * * * *", () => checkMiningCycles());
cron.schedule("0 */12 * * *", () => sendInactiveReminders());
cron.schedule("0 0 * * *", () => updateOwnershipProgress());
cron.schedule("0 */6 * * *", () => updateReferralStatus());
cron.schedule("1 0 * * *", () => transferReferralToMiningWallet());

// ✅ START SERVER AFTER DB CONNECTS
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB(); // 🔥 FIXED

    server.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      console.log(`Socket.io ready for real-time connections`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
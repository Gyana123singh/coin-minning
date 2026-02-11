const mongoose = require("mongoose");

const cryptoNetworkSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },        // TRC20, ERC20
    symbol: { type: String, default: "USDT" },     // USDT
    network: { type: String, required: true },     // TRON, ETH
    walletAddress: { type: String, required: true },
    qrCodeUrl: { type: String },                   // Image URL
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CryptoNetwork", cryptoNetworkSchema);

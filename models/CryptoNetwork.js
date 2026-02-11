const mongoose = require("mongoose");

const cryptoNetworkSchema = new mongoose.Schema(
  {
    network: {
      type: String,
      required: true,
      enum: ["TRC20", "ERC20"],
      unique: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CryptoNetwork", cryptoNetworkSchema);

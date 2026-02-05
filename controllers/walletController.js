const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const Notification = require('../models/Notification');
const { parsePagination } = require('../utils/helpers');

// @desc    Get wallet details (both wallets)
// @route   GET /api/wallet
// @access  Private
const getWallet = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user._id });
    
    // Create wallet if doesn't exist
    if (!wallet) {
      const user = await User.findById(req.user._id);
      wallet = await Wallet.create({
        user: req.user._id,
        miningBalance: user.miningStats?.totalCoins || 0,
        totalMined: user.miningStats?.totalMined || 0,
        coinBalance: user.miningStats?.totalCoins || 0,
      });
    }

    const settings = await Settings.getSettings();

    res.status(200).json({
      success: true,
      wallet: {
        // Combined totals (legacy compatible)
        totalBalance: wallet.miningBalance + wallet.purchaseBalance + wallet.referralBalance,
        availableBalance: wallet.availableCoins,
        lockedCoins: wallet.lockedCoins,
        
        // Mining Wallet
        miningWallet: {
          balance: wallet.miningBalance,
          available: wallet.availableMiningCoins,
          locked: wallet.miningLockedCoins,
          totalMined: wallet.totalMined,
        },
        
        // Purchase Wallet
        purchaseWallet: {
          balance: wallet.purchaseBalance,
          available: wallet.availablePurchaseCoins,
          locked: wallet.purchaseLockedCoins,
          totalPurchased: wallet.totalPurchased,
        },
        
        // Referral Bonus
        referralWallet: {
          balance: wallet.referralBalance,
          totalEarned: wallet.totalReferralEarned,
        },
        
        // Other stats
        fiatBalance: wallet.fiatBalance,
        totalEarned: wallet.totalEarned,
        totalWithdrawn: wallet.totalWithdrawn,
        currency: wallet.currency,
        status: wallet.status,
        withdrawalAddress: wallet.withdrawalAddress,
        canWithdraw: wallet.canWithdraw(),
        canWithdrawMining: wallet.canWithdraw('mining'),
        canWithdrawPurchase: wallet.canWithdraw('purchase'),
        minWithdrawal: wallet.minWithdrawal,
        coinValue: settings.coinValue || 0.01,
      },
    });
  } catch (error) {
    console.error('Get Wallet Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get wallet' });
  }
};

// @desc    Get mining wallet only
// @route   GET /api/wallet/mining
// @access  Private
const getMiningWallet = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user._id });
    
    if (!wallet) {
      const user = await User.findById(req.user._id);
      wallet = await Wallet.create({
        user: req.user._id,
        miningBalance: user.miningStats?.totalCoins || 0,
        totalMined: user.miningStats?.totalMined || 0,
      });
    }

    const settings = await Settings.getSettings();

    res.status(200).json({
      success: true,
      miningWallet: {
        balance: wallet.miningBalance,
        available: wallet.availableMiningCoins,
        locked: wallet.miningLockedCoins,
        totalMined: wallet.totalMined,
        fiatValue: wallet.miningBalance * (settings.coinValue || 0.01),
        canWithdraw: wallet.canWithdraw('mining'),
      },
    });
  } catch (error) {
    console.error('Get Mining Wallet Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get mining wallet' });
  }
};

// @desc    Get purchase wallet only
// @route   GET /api/wallet/purchase
// @access  Private
const getPurchaseWallet = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user._id });
    
    if (!wallet) {
      wallet = await Wallet.create({ user: req.user._id });
    }

    const settings = await Settings.getSettings();

    res.status(200).json({
      success: true,
      purchaseWallet: {
        balance: wallet.purchaseBalance,
        available: wallet.availablePurchaseCoins,
        locked: wallet.purchaseLockedCoins,
        totalPurchased: wallet.totalPurchased,
        fiatValue: wallet.purchaseBalance * (settings.coinValue || 0.01),
        canWithdraw: wallet.canWithdraw('purchase'),
      },
    });
  } catch (error) {
    console.error('Get Purchase Wallet Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get purchase wallet' });
  }
};

// @desc    Sync wallet with user coins
// @route   POST /api/wallet/sync
// @access  Private
const syncWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let wallet = await Wallet.findOne({ user: req.user._id });

    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user._id,
        miningBalance: user.miningStats?.totalCoins || 0,
        totalMined: user.miningStats?.totalMined || 0,
        coinBalance: user.miningStats?.totalCoins || 0,
        totalEarned: user.miningStats?.totalMined || 0,
      });
    } else {
      // Sync only mining coins from user model if user has more
      if (user.miningStats?.totalCoins > wallet.miningBalance) {
        const diff = user.miningStats.totalCoins - wallet.miningBalance;
        wallet.miningBalance = user.miningStats.totalCoins;
        wallet.totalMined = user.miningStats.totalMined || wallet.totalMined;
        wallet.totalEarned += diff;
        await wallet.syncTotalBalance();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Wallet synced successfully',
      miningBalance: wallet.miningBalance,
      purchaseBalance: wallet.purchaseBalance,
      totalBalance: wallet.miningBalance + wallet.purchaseBalance + wallet.referralBalance,
    });
  } catch (error) {
    console.error('Sync Wallet Error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync wallet' });
  }
};

// @desc    Update withdrawal address
// @route   PUT /api/wallet/withdrawal-address
// @access  Private
const updateWithdrawalAddress = async (req, res) => {
  try {
    const { upiId, bankAccount, bankIfsc, bankName, accountHolderName, cryptoAddress, cryptoNetwork } = req.body;

    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({ user: req.user._id });
    }

    wallet.withdrawalAddress = {
      upiId,
      bankAccount,
      bankIfsc,
      bankName,
      accountHolderName,
      cryptoAddress,
      cryptoNetwork,
    };
    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'Withdrawal address updated successfully',
      withdrawalAddress: wallet.withdrawalAddress,
    });
  } catch (error) {
    console.error('Update Withdrawal Address Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update withdrawal address' });
  }
};

// @desc    Request withdrawal (specify wallet type)
// @route   POST /api/wallet/withdraw
// @access  Private
const requestWithdrawal = async (req, res) => {
  try {
    const { amount, paymentMethod, walletType } = req.body; // walletType: 'mining', 'purchase', or 'all'

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' });
    }

    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    // Determine which wallet to withdraw from
    const withdrawFrom = walletType || 'all';
    
    // Check if can withdraw from specified wallet
    const canWithdraw = wallet.canWithdraw(withdrawFrom);
    if (!canWithdraw.canWithdraw) {
      return res.status(400).json({ success: false, message: canWithdraw.reason });
    }

    // Check balance based on wallet type
    let availableBalance;
    if (withdrawFrom === 'mining') {
      availableBalance = wallet.availableMiningCoins;
    } else if (withdrawFrom === 'purchase') {
      availableBalance = wallet.availablePurchaseCoins;
    } else {
      availableBalance = wallet.availableCoins;
    }

    if (availableBalance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Check minimum withdrawal
    if (amount < wallet.minWithdrawal) {
      return res.status(400).json({ 
        success: false, 
        message: `Minimum withdrawal is ${wallet.minWithdrawal} coins` 
      });
    }

    // Lock coins based on wallet type
    if (withdrawFrom === 'mining') {
      await wallet.lockMiningCoins(amount);
    } else if (withdrawFrom === 'purchase') {
      await wallet.lockPurchaseCoins(amount);
    } else {
      await wallet.lockCoins(amount);
    }

    // Get settings for coin value
    const settings = await Settings.getSettings();
    const fiatAmount = amount * (settings.coinValue || 0.01);

    // Create transaction with wallet type info
    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'withdrawal',
      amount: fiatAmount,
      coins: amount,
      currency: wallet.currency,
      status: 'pending',
      paymentMethod: paymentMethod || 'upi',
      paymentDetails: wallet.withdrawalAddress,
      description: `Withdrawal of ${amount} coins from ${withdrawFrom} wallet`,
      balanceAfter: wallet.coinBalance - amount,
      metadata: {
        walletType: withdrawFrom,
      },
    });

    // Send notification
    await Notification.create({
      user: req.user._id,
      type: 'system',
      title: 'Withdrawal Requested',
      message: `Your withdrawal request for ${amount} coins ($${fiatAmount.toFixed(2)}) from ${withdrawFrom} wallet is being processed.`,
    });

    res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      transaction: {
        id: transaction._id,
        transactionId: transaction.transactionId,
        coins: transaction.coins,
        amount: transaction.amount,
        status: transaction.status,
        walletType: withdrawFrom,
      },
    });
  } catch (error) {
    console.error('Request Withdrawal Error:', error);
    res.status(500).json({ success: false, message: 'Failed to process withdrawal' });
  }
};

// @desc    Get transaction history
// @route   GET /api/wallet/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { type, status, walletType } = req.query;

    let query = { user: req.user._id };
    if (type) query.type = type;
    if (status) query.status = status;
    if (walletType) query['metadata.walletType'] = walletType;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get Transactions Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get transactions' });
  }
};

// @desc    Get single transaction
// @route   GET /api/wallet/transactions/:id
// @access  Private
const getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error('Get Transaction Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get transaction' });
  }
};

// @desc    Get wallet summary (both wallets)
// @route   GET /api/wallet/summary
// @access  Private
const getWalletSummary = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    
    // Get transaction summary
    const summary = await Transaction.aggregate([
      { $match: { user: req.user._id, status: 'completed' } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalCoins: { $sum: '$coins' },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    // Recent transactions
    const recentTransactions = await Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      wallets: {
        mining: {
          balance: wallet?.miningBalance || 0,
          available: wallet?.availableMiningCoins || 0,
          locked: wallet?.miningLockedCoins || 0,
        },
        purchase: {
          balance: wallet?.purchaseBalance || 0,
          available: wallet?.availablePurchaseCoins || 0,
          locked: wallet?.purchaseLockedCoins || 0,
        },
        referral: {
          balance: wallet?.referralBalance || 0,
        },
        total: {
          balance: (wallet?.miningBalance || 0) + (wallet?.purchaseBalance || 0) + (wallet?.referralBalance || 0),
          available: wallet?.availableCoins || 0,
          locked: wallet?.lockedCoins || 0,
        },
      },
      summary,
      recentTransactions,
    });
  } catch (error) {
    console.error('Get Wallet Summary Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get wallet summary' });
  }
};

// @desc    Transfer coins between wallets (mining <-> purchase)
// @route   POST /api/wallet/internal-transfer
// @access  Private
const internalTransfer = async (req, res) => {
  try {
    const { amount, fromWallet, toWallet } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid transfer amount' });
    }

    if (!['mining', 'purchase'].includes(fromWallet) || !['mining', 'purchase'].includes(toWallet)) {
      return res.status(400).json({ success: false, message: 'Invalid wallet type. Use "mining" or "purchase"' });
    }

    if (fromWallet === toWallet) {
      return res.status(400).json({ success: false, message: 'Cannot transfer to the same wallet' });
    }

    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    // Check source balance
    const sourceBalance = fromWallet === 'mining' ? wallet.availableMiningCoins : wallet.availablePurchaseCoins;
    if (sourceBalance < amount) {
      return res.status(400).json({ success: false, message: `Insufficient ${fromWallet} wallet balance` });
    }

    // Perform transfer
    if (fromWallet === 'mining') {
      wallet.miningBalance -= amount;
      wallet.purchaseBalance += amount;
    } else {
      wallet.purchaseBalance -= amount;
      wallet.miningBalance += amount;
    }
    
    await wallet.syncTotalBalance();

    // Log transaction
    await Transaction.create({
      user: req.user._id,
      type: 'transfer',
      amount: 0,
      coins: amount,
      currency: 'COIN',
      status: 'completed',
      description: `Internal transfer from ${fromWallet} to ${toWallet} wallet`,
      metadata: {
        fromWallet,
        toWallet,
        internalTransfer: true,
      },
    });

    // Emit wallet update via Socket.io for real-time update
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    const socketId = connectedUsers?.get(req.user._id.toString());
    
    if (io && socketId) {
      const walletData = {
        miningBalance: wallet.miningBalance || 0,
        purchaseBalance: wallet.purchaseBalance || 0,
        referralBalance: wallet.referralBalance || 0,
        totalBalance: (wallet.miningBalance || 0) + (wallet.purchaseBalance || 0) + (wallet.referralBalance || 0),
        lastUpdated: new Date().toISOString(),
        reason: 'internal_transfer',
      };
      io.to(socketId).emit('wallet-update', walletData);
    }

    res.status(200).json({
      success: true,
      message: `Successfully transferred ${amount} coins from ${fromWallet} to ${toWallet} wallet`,
      wallets: {
        mining: {
          balance: wallet.miningBalance,
          available: wallet.availableMiningCoins,
        },
        purchase: {
          balance: wallet.purchaseBalance,
          available: wallet.availablePurchaseCoins,
        },
      },
    });
  } catch (error) {
    console.error('Internal Transfer Error:', error);
    res.status(500).json({ success: false, message: 'Failed to transfer coins' });
  }
};

module.exports = {
  getWallet,
  getMiningWallet,
  getPurchaseWallet,
  syncWallet,
  updateWithdrawalAddress,
  requestWithdrawal,
  getTransactions,
  getTransaction,
  getWalletSummary,
  internalTransfer,
};

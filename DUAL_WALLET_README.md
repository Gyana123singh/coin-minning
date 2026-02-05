# Dual Wallet System Documentation

## Overview

The Mining App now supports **three separate wallets** for different coin sources:

1. **Mining Wallet** - Coins earned from mining activities
2. **Purchase Wallet** - Coins bought with real money
3. **Referral Wallet** - Coins earned from referral bonuses

## Wallet Structure

### Mining Wallet
- `miningBalance` - Current balance from mining
- `miningLockedCoins` - Coins locked for withdrawal
- `totalMined` - Lifetime total mined

### Purchase Wallet
- `purchaseBalance` - Current balance from purchases
- `purchaseLockedCoins` - Coins locked for withdrawal
- `totalPurchased` - Lifetime total purchased

### Referral Wallet
- `referralBalance` - Current balance from referrals
- `totalReferralEarned` - Lifetime referral earnings

---

## API Endpoints

### Get All Wallets
```
GET /api/wallet
```

**Response:**
```json
{
  "success": true,
  "wallet": {
    "totalBalance": 1500,
    "availableBalance": 1400,
    "lockedCoins": 100,
    
    "miningWallet": {
      "balance": 1000,
      "available": 950,
      "locked": 50,
      "totalMined": 1200
    },
    
    "purchaseWallet": {
      "balance": 400,
      "available": 350,
      "locked": 50,
      "totalPurchased": 500
    },
    
    "referralWallet": {
      "balance": 100,
      "totalEarned": 150
    }
  }
}
```

### Get Mining Wallet Only
```
GET /api/wallet/mining
```

### Get Purchase Wallet Only
```
GET /api/wallet/purchase
```

### Get Wallet Summary
```
GET /api/wallet/summary
```

---

## Withdrawals

### Request Withdrawal (Specify Wallet)
```
POST /api/wallet/withdraw
```

**Body:**
```json
{
  "amount": 100,
  "paymentMethod": "upi",
  "walletType": "mining"  // Options: "mining", "purchase", "all"
}
```

- `walletType: "mining"` - Withdraw from mining wallet only
- `walletType: "purchase"` - Withdraw from purchase wallet only
- `walletType: "all"` (default) - Withdraw from purchase first, then mining

---

## Internal Transfers

### Transfer Between Wallets
```
POST /api/wallet/internal-transfer
```

**Body:**
```json
{
  "amount": 100,
  "fromWallet": "mining",    // "mining" or "purchase"
  "toWallet": "purchase"     // "mining" or "purchase"
}
```

---

## Coin Balance API

### Get Balance (All Wallets)
```
GET /api/coins/balance
```

**Response:**
```json
{
  "success": true,
  "balance": {
    "totalCoins": 1500,
    "totalAvailable": 1400,
    "totalLocked": 100,
    "totalFiatValue": 15.00,
    
    "miningWallet": {
      "balance": 1000,
      "available": 950,
      "locked": 50,
      "totalMined": 1200,
      "fiatValue": 10.00
    },
    
    "purchaseWallet": {
      "balance": 400,
      "available": 350,
      "locked": 50,
      "totalPurchased": 500,
      "fiatValue": 4.00
    },
    
    "referralWallet": {
      "balance": 100,
      "totalEarned": 150,
      "fiatValue": 1.00
    },
    
    "currency": "USD",
    "coinValue": 0.01
  }
}
```

---

## Transfer Coins to User

### Transfer with Wallet Selection
```
POST /api/coins/transfer
```

**Body:**
```json
{
  "recipientEmail": "user@example.com",
  "amount": 50,
  "note": "Thanks!",
  "fromWallet": "mining"  // Optional: "mining", "purchase", or "auto"
}
```

- Received coins always go to recipient's **Purchase Wallet**

---

## Dashboard API

### Get Dashboard (Updated)
```
GET /api/users/dashboard
```

**Response includes:**
```json
{
  "dashboard": {
    "wallets": {
      "mining": {
        "balance": 1000,
        "available": 950,
        "locked": 50,
        "totalMined": 1200,
        "fiatValue": 10.00
      },
      "purchase": {
        "balance": 400,
        "available": 350,
        "locked": 50,
        "totalPurchased": 500,
        "fiatValue": 4.00
      },
      "referral": {
        "balance": 100,
        "totalEarned": 150,
        "fiatValue": 1.00
      },
      "total": {
        "balance": 1500,
        "available": 1400,
        "locked": 100,
        "fiatValue": 15.00
      },
      "coinValue": 0.01,
      "currency": "USD"
    }
  }
}
```

---

## How Coins Are Added

| Source | Wallet |
|--------|--------|
| Mining rewards | Mining Wallet |
| Coin purchases (approved) | Purchase Wallet |
| Referral bonuses | Referral Wallet |
| Daily check-in bonus | Mining Wallet |
| Received transfers | Purchase Wallet |
| Promo codes | Mining Wallet |

---

## Transaction Metadata

All transactions now include wallet type in metadata:

```json
{
  "type": "withdrawal",
  "coins": 100,
  "metadata": {
    "walletType": "mining"
  }
}
```

---

## Admin Payment Approval

When admin approves a coin purchase, coins are added to the **Purchase Wallet**:

```
PUT /api/admin/payments/:id/approve
```

The notification to user will say: "...coins have been credited to your Purchase Wallet."

---

## Migration Notes

- Existing wallets will have `miningBalance = coinBalance` (old coins treated as mined)
- New fields default to 0
- The `coinBalance` field is kept for backward compatibility
- Legacy methods still work but default to mining wallet

---

## Files Modified

1. `backend/models/Wallet.js` - New dual wallet schema
2. `backend/models/Transaction.js` - Added metadata field
3. `backend/controllers/walletController.js` - New endpoints
4. `backend/controllers/miningController.js` - Add to mining wallet
5. `backend/controllers/coinController.js` - Dual wallet support
6. `backend/controllers/userController.js` - Dashboard wallet data
7. `backend/controllers/authController.js` - Referral wallet bonuses
8. `backend/controllers/admin/adminTransactionController.js` - Purchase wallet
9. `backend/routes/walletRoutes.js` - New routes
10. `backend/utils/cronJobs.js` - Mining wallet integration

---

## Restart Server

After these changes, restart the backend server:

```bash
pm2 restart all
```

Or manually:

```bash
cd backend
node server.js
```

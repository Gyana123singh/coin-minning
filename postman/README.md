# 🚀 Mining App - Postman API Collection

## Overview
Complete API documentation for Mining App Backend with 90+ endpoints covering:
- User Authentication & Profile
- Wallet & Transactions
- Mining Operations
- Coin Packages
- KYC Verification
- Notifications & Referrals
- Admin Dashboard & Management

## Files

| File | Description |
|------|-------------|
| `Mining-App-Complete-Collection.postman_collection.json` | **MAIN FILE** - Import this single file for all APIs |
| `Mining-App-API.postman_collection.json` | Phase 1 - User Auth, Profile, Wallet, Mining |
| `phase2-coins.json` | Phase 2 - Coin Package APIs |
| `phase2-user-apis.json` | Phase 2 - KYC, Notifications, Referrals, Settings |
| `phase3-admin-auth-users.json` | Phase 3 - Admin Auth, Dashboard, User Management |
| `phase4-admin-kyc-mining-transactions.json` | Phase 4 - Admin KYC, Mining, Transactions, Payments |
| `phase5-admin-remaining.json` | Phase 5 - Admin Coins, Banners, Referrals, Settings, Notifications |

## Quick Start

### 1. Import Collection
1. Open Postman
2. Click **Import** button
3. Select `Mining-App-Complete-Collection.postman_collection.json`
4. Collection will appear in sidebar

### 2. Set Environment Variables
The collection includes these variables (pre-configured):

| Variable | Default Value | Description |
|----------|--------------|-------------|
| `baseUrl` | `http://localhost:5000` | API base URL |
| `userToken` | (auto-saved) | User JWT token |
| `adminToken` | (auto-saved) | Admin JWT token |
| `userId` | (auto-saved) | Current user ID |

### 3. Test Credentials
```
📱 User Account:
   Email: testuser@test.com
   Password: test123456
   Referral Code: TESTUSER

🔐 Admin Account:
   Email: admin@mining.com
   Password: admin123456
```

## Usage Flow

### For User APIs:
1. Run `🔐 User Auth > Login` first
2. Token automatically saves to `{{userToken}}`
3. All other user requests will use this token

### For Admin APIs:
1. Run `🔒 Admin Auth > Admin Login` first
2. Token automatically saves to `{{adminToken}}`
3. All other admin requests will use this token

## API Categories

### 👤 User APIs

| Category | Endpoints | Description |
|----------|-----------|-------------|
| 🔐 User Auth | 8 | Login, Signup, OTP, Password Reset |
| 👤 User Profile | 9 | Profile CRUD, Stats, Check-in |
| 💰 Wallet | 6 | Balance, Transactions, Withdrawal |
| ⛏️ Mining | 8 | Start, Claim, Boost, History |
| 🪙 Coin Packages | 4 | View, Purchase, Payment Proof |
| 📄 KYC | 3 | Submit, Status, View |
| 🔔 Notifications | 6 | Get, Mark Read, FCM Token |
| 👥 Referrals | 5 | Validate, List, Earnings |
| ⚙️ Settings | 3 | App Settings, Social Links |

### 🔒 Admin APIs

| Category | Endpoints | Description |
|----------|-----------|-------------|
| 🔒 Admin Auth | 5 | Login, Profile, Manage Admins |
| 📊 Dashboard | 2 | Stats, System Health |
| 👤 User Management | 7 | List, Ban, Coins, Delete |
| 📄 KYC Management | 4 | Approve, Reject, Stats |
| ⛏️ Mining Management | 5 | Sessions, Settings, Stats |
| 💳 Transactions | 4 | List, Approve, Reject |
| 💰 Payments | 4 | Proofs, Approve, Reject |
| 🪙 Coin Packages | 5 | CRUD, Toggle |
| 🖼️ Banners | 4 | CRUD |
| 👥 Referrals | 4 | Stats, Settings |
| ⚙️ Settings | 5 | App, Social, Withdrawal |
| 🔔 Notifications | 3 | Send, Bulk |

## Request Examples

### User Login
```http
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "email": "testuser@test.com",
  "password": "test123456"
}
```

### Get Mining Status
```http
GET {{baseUrl}}/api/mining/status
Authorization: Bearer {{userToken}}
```

### Admin - Get Dashboard Stats
```http
GET {{baseUrl}}/api/admin/dashboard/stats
Authorization: Bearer {{adminToken}}
```

## Response Format

All APIs return JSON in this format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## Testing Tips

1. **Start Server First**: Ensure backend is running on port 5000
2. **Login First**: Always login before testing protected routes
3. **Check Tokens**: If requests fail with 401, re-login to refresh token
4. **Use Variables**: Replace `:userId`, `:kycId` etc. with actual IDs
5. **File Uploads**: For avatar/KYC/banner uploads, select actual files

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Re-run login to get fresh token |
| 404 Not Found | Check if server is running |
| 500 Server Error | Check server logs for details |
| Token not saving | Enable "Automatically persist variable values" in Postman |

## Collection Structure

```
🚀 Mining App - Complete API Collection
├── 🔐 User Auth (8 requests)
├── 👤 User Profile (9 requests)
├── 💰 Wallet (6 requests)
├── ⛏️ Mining (8 requests)
├── 🪙 Coin Packages (4 requests)
├── 📄 KYC (3 requests)
├── 🔔 Notifications (6 requests)
├── 👥 Referrals (5 requests)
├── ⚙️ Settings (3 requests)
├── 🔒 Admin Auth (5 requests)
├── 📊 Admin Dashboard (2 requests)
├── 👤 Admin - Users (7 requests)
├── 📄 Admin - KYC (4 requests)
├── ⛏️ Admin - Mining (5 requests)
├── 💳 Admin - Transactions (4 requests)
├── 💰 Admin - Payments (4 requests)
├── 🪙 Admin - Coins (5 requests)
├── 🖼️ Admin - Banners (4 requests)
├── 👥 Admin - Referrals (4 requests)
├── ⚙️ Admin - Settings (5 requests)
└── 🔔 Admin - Notifications (3 requests)
```

---

**Total: 94+ API Endpoints** 🎉

Generated for Mining App Backend v1.0

# Mining App Backend API

Node.js/Express backend for the Mining App user-side and admin-side applications.

## Features

- 🔐 **Email OTP Authentication** - Secure login with email OTP verification
- ⛏️ **Mining System** - 24-hour mining cycles with rewards
- 👥 **Referral System** - Direct and indirect referral bonuses
- 📄 **KYC Verification** - Document upload with Cloudinary
- 🔔 **Notifications** - Real-time user notifications
- 📊 **Activity Dashboard** - Mining rates, levels, and progress tracking
- ⏰ **Cron Jobs** - Automated mining cycle checks and reminders
- 👨‍💼 **Admin Panel** - Complete admin API for managing users, KYC, mining, and more

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + Email OTP
- **Image Upload**: Cloudinary
- **Email**: Nodemailer with Gmail SMTP
- **Scheduled Tasks**: node-cron

## Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your actual values.

3. **Start MongoDB** (if running locally)

4. **Create super admin:**
   ```bash
   npm run seed:admin
   ```
   Default credentials:
   - Email: admin@mining.com
   - Password: admin123456
   
   ⚠️ Change the password immediately after first login!

5. **Run the server:**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Environment (development/production) |
| `PORT` | Server port (default: 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `JWT_EXPIRE` | JWT expiration time (e.g., 30d) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP server port |
| `SMTP_EMAIL` | SMTP email address |
| `SMTP_PASSWORD` | SMTP password (app password for Gmail) |
| `APP_NAME` | Application name |
| `APP_URL` | Frontend application URL |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/send-otp` | Send OTP to email |
| POST | `/api/auth/verify-otp` | Verify OTP |
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login with OTP or password |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/auth/me` | Get current user |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get user profile |
| PUT | `/api/users/profile` | Update profile |
| POST | `/api/users/avatar` | Upload avatar |
| PUT | `/api/users/password` | Change password |
| GET | `/api/users/activity` | Get activity dashboard |
| GET | `/api/users/stats` | Get user statistics |

### Mining
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mining/start` | Start mining cycle |
| GET | `/api/mining/status` | Get mining status |
| POST | `/api/mining/claim` | Claim mining rewards |
| GET | `/api/mining/history` | Get mining history |
| POST | `/api/mining/cancel` | Cancel active mining |

### Referrals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/referrals` | Get referral list |
| GET | `/api/referrals/share` | Get share link |
| POST | `/api/referrals/ping` | Ping inactive referrals |
| GET | `/api/referrals/earnings` | Get referral earnings |
| GET | `/api/referrals/validate/:code` | Validate referral code |

### KYC
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/kyc/status` | Get KYC status & checklist |
| POST | `/api/kyc/submit` | Submit KYC documents |
| GET | `/api/kyc/:id` | Get KYC details |
| PUT | `/api/kyc/resubmit` | Resubmit after rejection |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get all notifications |
| GET | `/api/notifications/unread-count` | Get unread count |
| PUT | `/api/notifications/read-all` | Mark all as read |
| PUT | `/api/notifications/:id/read` | Mark as read |
| DELETE | `/api/notifications/:id` | Delete notification |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get app settings |
| GET | `/api/settings/social` | Get social links |
| GET | `/api/settings/maintenance` | Check maintenance |

---

## Admin API Endpoints

All admin endpoints are prefixed with `/api/admin`

### Admin Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/auth/login` | Admin login |
| GET | `/api/admin/auth/me` | Get current admin |
| PUT | `/api/admin/auth/profile` | Update admin profile |
| PUT | `/api/admin/auth/change-password` | Change password |
| POST | `/api/admin/auth/logout` | Logout |
| POST | `/api/admin/auth/admins` | Create new admin (super_admin only) |
| GET | `/api/admin/auth/admins` | Get all admins (super_admin only) |
| PUT | `/api/admin/auth/admins/:id` | Update admin (super_admin only) |
| DELETE | `/api/admin/auth/admins/:id` | Delete admin (super_admin only) |

### Admin Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard/stats` | Get dashboard statistics |
| GET | `/api/admin/dashboard/health` | Get system health |

### User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | Get all users |
| GET | `/api/admin/users/stats` | Get user statistics |
| GET | `/api/admin/users/export` | Export users to CSV |
| GET | `/api/admin/users/:id` | Get user by ID |
| PUT | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Delete user |
| PUT | `/api/admin/users/:id/ban` | Ban user |
| PUT | `/api/admin/users/:id/unban` | Unban user |
| POST | `/api/admin/users/:id/add-coins` | Add coins to user |
| POST | `/api/admin/users/:id/deduct-coins` | Deduct coins from user |

### KYC Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/kyc` | Get all KYC submissions |
| GET | `/api/admin/kyc/stats` | Get KYC statistics |
| GET | `/api/admin/kyc/export` | Export KYC data |
| GET | `/api/admin/kyc/:id` | Get KYC by ID |
| PUT | `/api/admin/kyc/:id/approve` | Approve KYC |
| PUT | `/api/admin/kyc/:id/reject` | Reject KYC |

### Mining Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/mining/sessions` | Get all mining sessions |
| GET | `/api/admin/mining/stats` | Get mining statistics |
| GET | `/api/admin/mining/active` | Get active miners |
| GET | `/api/admin/mining/leaderboard` | Get leaderboard |
| GET | `/api/admin/mining/settings` | Get mining settings |
| PUT | `/api/admin/mining/settings` | Update mining settings |
| PUT | `/api/admin/mining/sessions/:id/cancel` | Cancel mining session |

### Transaction Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/transactions` | Get all transactions |
| GET | `/api/admin/transactions/stats` | Get transaction statistics |
| GET | `/api/admin/transactions/withdrawals/pending` | Get pending withdrawals |
| PUT | `/api/admin/transactions/withdrawals/:id/approve` | Approve withdrawal |
| PUT | `/api/admin/transactions/withdrawals/:id/reject` | Reject withdrawal |

### Payment Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/payments` | Get all payment proofs |
| GET | `/api/admin/payments/stats` | Get payment statistics |
| GET | `/api/admin/payments/settings` | Get payment settings |
| PUT | `/api/admin/payments/settings` | Update payment settings |
| GET | `/api/admin/payments/:id` | Get payment proof by ID |
| PUT | `/api/admin/payments/:id/approve` | Approve payment proof |
| PUT | `/api/admin/payments/:id/reject` | Reject payment proof |

### Coin Package Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/coins` | Get all packages |
| POST | `/api/admin/coins` | Create package |
| PUT | `/api/admin/coins/reorder` | Reorder packages |
| GET | `/api/admin/coins/:id` | Get package by ID |
| PUT | `/api/admin/coins/:id` | Update package |
| DELETE | `/api/admin/coins/:id` | Delete package |
| PUT | `/api/admin/coins/:id/toggle` | Toggle package status |

### Banner Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/banners` | Get all banners |
| GET | `/api/admin/banners/stats` | Get banner statistics |
| GET | `/api/admin/banners/active` | Get active banners |
| POST | `/api/admin/banners` | Create banner |
| PUT | `/api/admin/banners/reorder` | Reorder banners |
| GET | `/api/admin/banners/:id` | Get banner by ID |
| PUT | `/api/admin/banners/:id` | Update banner |
| DELETE | `/api/admin/banners/:id` | Delete banner |
| PUT | `/api/admin/banners/:id/toggle` | Toggle banner status |
| POST | `/api/admin/banners/:id/view` | Record banner view |
| POST | `/api/admin/banners/:id/click` | Record banner click |

### Referral Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/referrals` | Get all referrals |
| GET | `/api/admin/referrals/stats` | Get referral statistics |
| GET | `/api/admin/referrals/export` | Export referral data |
| GET | `/api/admin/referrals/settings` | Get referral settings |
| PUT | `/api/admin/referrals/settings` | Update referral settings |
| GET | `/api/admin/referrals/user/:userId/tree` | Get user's referral tree |

### Settings Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/settings` | Get all settings |
| PUT | `/api/admin/settings/bulk` | Bulk update settings |
| GET | `/api/admin/settings/social` | Get social links |
| PUT | `/api/admin/settings/social` | Update social links |
| PUT | `/api/admin/settings/app` | Update app settings |
| PUT | `/api/admin/settings/withdrawal` | Update withdrawal settings |
| PUT | `/api/admin/settings/kyc` | Update KYC settings |
| PUT | `/api/admin/settings/transfer` | Update transfer settings |
| PUT | `/api/admin/settings/checkin` | Update check-in settings |
| PUT | `/api/admin/settings/maintenance` | Toggle maintenance mode |

### Notification Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/notifications` | Get all notifications |
| POST | `/api/admin/notifications` | Send notification to user |
| POST | `/api/admin/notifications/bulk` | Send bulk notifications |
| GET | `/api/admin/notifications/stats` | Get notification statistics |
| GET | `/api/admin/notifications/templates` | Get notification templates |
| DELETE | `/api/admin/notifications/:id` | Delete notification |
| DELETE | `/api/admin/notifications/user/:userId` | Delete user's notifications |

## Admin Roles & Permissions

### Roles
- **super_admin**: Full access to all features
- **admin**: Full access except admin management
- **moderator**: Limited access (view only for most features)

### Permissions
| Permission | Description |
|------------|-------------|
| manage_users | Add/edit/delete users, add/deduct coins |
| manage_admins | Create/edit/delete admin accounts |
| manage_kyc | Approve/reject KYC submissions |
| manage_transactions | Approve/reject withdrawals/payments |
| manage_mining | Cancel mining sessions, update settings |
| manage_settings | Update app settings |
| manage_coins | CRUD coin packages |
| manage_banners | CRUD banners |
| manage_referrals | Update referral settings |
| send_notifications | Send notifications to users |
| view_reports | View all reports and statistics |
| export_data | Export user/KYC/referral data |

## Referral System

- **Direct Referral**: User directly invites someone → Earns 50 coins
- **Indirect Referral**: User's referral invites someone → Earns 20 coins
- **20% Mining Boost**: For each active referral (mined in last 48 hours)

## Mining System

- Base mining rate: 0.25 coins/hour
- Mining cycle: 24 hours
- Level up: Every 100 coins mined
- Streak bonus: Mining consistently without 48-hour gaps

## KYC Requirements

1. Complete ownership (be active for 30 days)
2. Complete 20 mining sessions
3. Receive KYC invitation

## License

MIT

# ============================================
# TEST ALL AUTHENTICATED APIs WITH REAL DATA
# ============================================
# This script tests ALL APIs with authentication and shows actual response data

$baseUrl = "http://localhost:5000/api"
$adminUrl = "$baseUrl/admin"

Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "  TESTING ALL AUTHENTICATED APIs - REAL DATA" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# ============================================
# ADMIN LOGIN
# ============================================
Write-Host "`n📌 Admin Login" -ForegroundColor Yellow
Write-Host "-" * 40

$adminCreds = @{email='admin@mining.com'; password='admin123456'} | ConvertTo-Json
try {
    $adminResponse = Invoke-RestMethod -Uri "$adminUrl/auth/login" -Method POST -Body $adminCreds -ContentType "application/json"
    $adminToken = $adminResponse.token
    $adminHeaders = @{Authorization="Bearer $adminToken"}
    Write-Host "✅ Admin logged in: $($adminResponse.admin.name)" -ForegroundColor Green
} catch {
    Write-Host "❌ Admin login failed" -ForegroundColor Red
    exit 1
}

# ============================================
# ADMIN DASHBOARD APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  1. ADMIN DASHBOARD APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/admin/dashboard/stats - Dashboard Statistics" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/dashboard/stats" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/admin/dashboard/health - System Health" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/dashboard/health" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# ADMIN USER APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  2. ADMIN USER APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/admin/users - All Users (with pagination)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/users?page=1&limit=5" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
    $testUserId = if ($response.users.Count -gt 0) { $response.users[0]._id } else { $null }
    if ($testUserId) {
        Write-Host "   📝 Found user ID for testing: $testUserId" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

if ($testUserId) {
    Write-Host "`n🔹 GET /api/admin/users/$testUserId - Single User Details" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$adminUrl/users/$testUserId" -Method GET -Headers $adminHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ============================================
# ADMIN KYC APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  3. ADMIN KYC APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/admin/kyc - All KYC Requests" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/kyc" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
    $testKycId = if ($response.kycRequests.Count -gt 0) { $response.kycRequests[0]._id } else { $null }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/admin/kyc/stats - KYC Statistics" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/kyc/stats" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# ADMIN MINING APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  4. ADMIN MINING APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/admin/mining/sessions - All Mining Sessions" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/mining/sessions" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/admin/mining/stats - Mining Statistics" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/mining/stats" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/admin/mining/active - Active Miners" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/mining/active" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/admin/mining/leaderboard - Leaderboard" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/mining/leaderboard" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/admin/mining/settings - Mining Settings" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/mining/settings" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# ADMIN TRANSACTION APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  5. ADMIN TRANSACTION APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/admin/transactions - All Transactions" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/transactions" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/admin/transactions/stats - Transaction Stats" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/transactions/stats" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# ADMIN PAYMENT APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  6. ADMIN PAYMENT APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/admin/payments - All Payments" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/payments" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/admin/payments/stats - Payment Stats" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/payments/stats" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# ADMIN COIN PACKAGE APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  7. ADMIN COIN PACKAGE APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/admin/coins - All Coin Packages" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/coins" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
    $testPackageId = if ($response.packages.Count -gt 0) { $response.packages[0]._id } else { $null }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Create a test package if none exist
if (-not $testPackageId) {
    Write-Host "`n🔹 POST /api/admin/coins - Create Test Package" -ForegroundColor Cyan
    $packageBody = @{
        name = "Starter Pack"
        description = "Get started with 100 coins"
        coins = 100
        bonusCoins = 10
        price = 99
        currency = "INR"
    } | ConvertTo-Json
    try {
        $response = Invoke-RestMethod -Uri "$adminUrl/coins" -Method POST -Body $packageBody -ContentType "application/json" -Headers $adminHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
        $testPackageId = $response.package._id
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($testPackageId) {
    Write-Host "`n🔹 GET /api/admin/coins/$testPackageId - Single Package" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$adminUrl/coins/$testPackageId" -Method GET -Headers $adminHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ============================================
# ADMIN BANNER APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  8. ADMIN BANNER APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/admin/banners - All Banners" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/banners" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
    $testBannerId = if ($response.banners.Count -gt 0) { $response.banners[0]._id } else { $null }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# ADMIN REFERRAL APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  9. ADMIN REFERRAL APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/admin/referrals - All Referrals" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/referrals" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/admin/referrals/stats - Referral Stats" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/referrals/stats" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/admin/referrals/leaderboard - Referral Leaderboard" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/referrals/leaderboard" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/admin/referrals/settings - Referral Settings" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/referrals/settings" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# ADMIN SETTINGS APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  10. ADMIN SETTINGS APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/admin/settings - All Settings" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/settings" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/admin/settings/social - Social Links" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/settings/social" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/admin/settings/payment - Payment Settings" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/settings/payment" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# ADMIN NOTIFICATION APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  11. ADMIN NOTIFICATION APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/admin/notifications - All Notifications" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/notifications" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/admin/notifications/stats - Notification Stats" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/notifications/stats" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# ADMIN AUTH APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  12. ADMIN AUTH APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/admin/auth/me - Current Admin" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/auth/me" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/admin/auth/admins - All Admins" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/auth/admins" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# PUBLIC SETTINGS API (User Side)
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  13. PUBLIC/USER APIs (No Auth Required)" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/settings - Public App Settings" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/settings" -Method GET
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/settings/banners - Public Banners" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/settings/banners" -Method GET
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/settings/social - Public Social Links" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/settings/social" -Method GET
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/coins/packages - Public Coin Packages" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/coins/packages" -Method GET
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/referrals/validate?code=TEST - Validate Referral Code" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/referrals/validate?code=TEST" -Method GET
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error (expected - invalid code)" -ForegroundColor Yellow
}

# ============================================
# SUMMARY
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "  TEST COMPLETE" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "`n📝 Summary:" -ForegroundColor Yellow
Write-Host "   - All admin authenticated APIs tested with real responses" -ForegroundColor Gray
Write-Host "   - Public APIs tested without authentication" -ForegroundColor Gray
Write-Host "   - User APIs require a registered user (OTP-based signup)" -ForegroundColor Gray
Write-Host ""

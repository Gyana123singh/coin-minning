# ============================================
# TEST ALL USER AUTHENTICATED APIs WITH REAL DATA
# ============================================
# This script tests ALL user APIs with a real logged-in user

$baseUrl = "http://localhost:5000/api"
$adminUrl = "$baseUrl/admin"

Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "  TESTING ALL USER AUTHENTICATED APIs" -ForegroundColor Cyan
Write-Host "  With Real User Data" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# ============================================
# USER LOGIN
# ============================================
Write-Host "`n📌 User Login" -ForegroundColor Yellow
Write-Host "-" * 40

$userCreds = @{email='testuser@test.com'; password='test123456'} | ConvertTo-Json
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $userCreds -ContentType "application/json"
    $userToken = $loginResponse.token
    $userHeaders = @{Authorization="Bearer $userToken"}
    Write-Host "✅ User logged in: $($loginResponse.user.name) ($($loginResponse.user.email))" -ForegroundColor Green
    Write-Host "   Referral Code: $($loginResponse.user.referralCode)" -ForegroundColor Gray
    Write-Host "   Total Coins: $($loginResponse.user.miningStats.totalCoins)" -ForegroundColor Gray
} catch {
    Write-Host "❌ User login failed: $_" -ForegroundColor Red
    exit 1
}

# ============================================
# 1. AUTH APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  1. AUTH APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/auth/me - Get Current User" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# 2. USER PROFILE APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  2. USER PROFILE APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/users/profile - Get Profile" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/profile" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/users/stats - Get User Stats" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/stats" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/users/activity - Get Activity Log" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/activity" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 PUT /api/users/profile - Update Profile" -ForegroundColor Cyan
$updateBody = @{name='Test User Updated'; phone='9876543210'} | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/profile" -Method PUT -Body $updateBody -ContentType "application/json" -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 POST /api/users/checkin - Daily Check-in" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/checkin" -Method POST -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# 3. WALLET APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  3. WALLET APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/wallet - Get Wallet Info" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/wallet" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/wallet/balance - Get Balance" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/wallet/balance" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/wallet/transactions - Get Transactions" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/wallet/transactions" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/wallet/withdrawal-history - Get Withdrawal History" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/wallet/withdrawal-history" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 POST /api/wallet/update-address - Update UPI Address" -ForegroundColor Cyan
$addressBody = @{upiId='testuser@upi'} | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/wallet/update-address" -Method POST -Body $addressBody -ContentType "application/json" -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# 4. MINING APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  4. MINING APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/mining/status - Get Mining Status" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/mining/status" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 POST /api/mining/start - Start Mining" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/mining/start" -Method POST -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
    $miningSessionId = $response.session._id
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/mining/status - Get Mining Status (After Start)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/mining/status" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/mining/history - Get Mining History" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/mining/history" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/mining/earnings - Get Mining Earnings" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/mining/earnings" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 POST /api/mining/claim - Claim Mining Rewards (may fail if session not complete)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/mining/claim" -Method POST -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "⚠️ Expected: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ============================================
# 5. COIN PACKAGE APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  5. COIN PACKAGE APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/coins/packages - Get All Packages" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/coins/packages" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
    $testPackageId = if ($response.packages.Count -gt 0) { $response.packages[0].id } else { $null }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/coins/purchases - Get My Purchases" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/coins/purchases" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

if ($testPackageId) {
    Write-Host "`n🔹 POST /api/coins/purchase - Purchase Coins (initiate)" -ForegroundColor Cyan
    $purchaseBody = @{packageId=$testPackageId} | ConvertTo-Json
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/coins/purchase" -Method POST -Body $purchaseBody -ContentType "application/json" -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ============================================
# 6. KYC APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  6. KYC APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/kyc/status - Get KYC Status" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/kyc/status" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# 7. NOTIFICATION APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  7. NOTIFICATION APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/notifications - Get All Notifications" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/notifications" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/notifications/unread-count - Get Unread Count" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/notifications/unread-count" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 PUT /api/notifications/read-all - Mark All as Read" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/notifications/read-all" -Method PUT -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# 8. REFERRAL APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  8. REFERRAL APIs" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/referrals - Get My Referrals" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/referrals" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/referrals/stats - Get Referral Stats" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/referrals/stats" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/referrals/leaderboard - Get Leaderboard" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/referrals/leaderboard" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/referrals/earnings - Get Referral Earnings" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/referrals/earnings" -Method GET -Headers $userHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/referrals/validate?code=TESTUSER - Validate Own Code" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/referrals/validate?code=TESTUSER" -Method GET
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# 9. SETTINGS APIs
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Magenta
Write-Host "  9. SETTINGS APIs (Public)" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Magenta

Write-Host "`n🔹 GET /api/settings - Get App Settings" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/settings" -Method GET
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/settings/social - Get Social Links" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/settings/social" -Method GET
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/settings/maintenance - Check Maintenance Mode" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/settings/maintenance" -Method GET
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# 10. ADMIN VIEW OF THIS USER
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Yellow
Write-Host "  10. ADMIN VIEW OF THIS USER" -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Yellow

# Admin login
$adminCreds = @{email='admin@mining.com'; password='admin123456'} | ConvertTo-Json
$adminResponse = Invoke-RestMethod -Uri "$adminUrl/auth/login" -Method POST -Body $adminCreds -ContentType "application/json"
$adminToken = $adminResponse.token
$adminHeaders = @{Authorization="Bearer $adminToken"}

Write-Host "`n🔹 GET /api/admin/users - See User in Admin Panel" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/users" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
    $testUserId = if ($response.users.Count -gt 0) { $response.users[0]._id } else { $null }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

if ($testUserId) {
    Write-Host "`n🔹 GET /api/admin/users/$testUserId - User Details in Admin" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$adminUrl/users/$testUserId" -Method GET -Headers $adminHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🔹 GET /api/admin/mining/sessions - See User's Mining Session" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/mining/sessions" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/admin/dashboard/stats - Updated Dashboard Stats" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/dashboard/stats" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# SUMMARY
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "  TEST COMPLETE" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "`n✅ All user authenticated APIs tested with real data!" -ForegroundColor Green
Write-Host "   User: testuser@test.com" -ForegroundColor Gray
Write-Host "   Password: test123456" -ForegroundColor Gray
Write-Host "   Referral Code: TESTUSER" -ForegroundColor Gray
Write-Host ""

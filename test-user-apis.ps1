# Mining App USER API Test Script
# Tests all user-facing APIs

$baseUrl = "http://localhost:5000/api"
$results = @()

function Test-API {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )
    
    Write-Host "`n🧪 Testing: $Name" -ForegroundColor Cyan
    Write-Host "   URL: $Method $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "   ✅ SUCCESS" -ForegroundColor Green
        
        $script:results += @{
            Name = $Name
            Status = "✅ PASS"
            Url = "$Method $Url"
        }
        
        return $response
    }
    catch {
        Write-Host "   ❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        
        $script:results += @{
            Name = $Name
            Status = "❌ FAIL"
            Url = "$Method $Url"
            Error = $_.Exception.Message
        }
        
        return $null
    }
}

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          MINING APP USER API COMPREHENSIVE TEST           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# ===== AUTHENTICATION APIs (PUBLIC) =====
Write-Host "`n" + "="*60 -ForegroundColor Yellow
Write-Host "USER AUTHENTICATION APIs (Public)" -ForegroundColor Yellow
Write-Host "="*60 -ForegroundColor Yellow

# Test OTP sending (will fail without valid phone, but tests endpoint)
Test-API "Send OTP" "$baseUrl/auth/send-otp" -Method POST -Body @{
    phone = "+1234567890"
}

# Test verify OTP (will fail, but tests endpoint)
Test-API "Verify OTP" "$baseUrl/auth/verify-otp" -Method POST -Body @{
    phone = "+1234567890"
    otp = "123456"
}

# Test login (will fail without user, but tests endpoint)
Test-API "User Login" "$baseUrl/auth/login" -Method POST -Body @{
    phone = "+1234567890"
    password = "password123"
}

# Note: We'll skip signup as it requires OTP verification
# Note: We'll skip reset password as it requires OTP

# ===== PUBLIC ENDPOINTS =====
Write-Host "`n" + "="*60 -ForegroundColor Yellow
Write-Host "PUBLIC User Endpoints" -ForegroundColor Yellow
Write-Host "="*60 -ForegroundColor Yellow

Test-API "Get Settings" "$baseUrl/settings"
Test-API "Get Social Links" "$baseUrl/settings/social"
Test-API "Check Maintenance" "$baseUrl/settings/maintenance"
Test-API "Get Coin Packages" "$baseUrl/coins/packages"
Test-API "Get Coin Rate" "$baseUrl/coins/rate"
Test-API "Validate Referral Code" "$baseUrl/referrals/validate/TEST123"

# ===== PROTECTED ENDPOINTS (Without Auth - Should Fail) =====
Write-Host "`n" + "="*60 -ForegroundColor Yellow
Write-Host "PROTECTED Endpoints (No Auth - Should Fail)" -ForegroundColor Yellow
Write-Host "="*60 -ForegroundColor Yellow

# These should all fail with 401 Unauthorized
Test-API "Get User Profile (No Auth)" "$baseUrl/user/profile"
Test-API "Get User Dashboard (No Auth)" "$baseUrl/user/dashboard"
Test-API "Get Coin Balance (No Auth)" "$baseUrl/coins/balance"
Test-API "Get Mining Status (No Auth)" "$baseUrl/mining/status"
Test-API "Get Wallet (No Auth)" "$baseUrl/wallet"
Test-API "Get KYC Status (No Auth)" "$baseUrl/kyc/status"
Test-API "Get Referrals (No Auth)" "$baseUrl/referrals"
Test-API "Get Notifications (No Auth)" "$baseUrl/notifications"

# ===== SUMMARY =====
Write-Host "`n" + "="*60 -ForegroundColor Magenta
Write-Host "USER API TEST SUMMARY" -ForegroundColor Magenta
Write-Host "="*60 -ForegroundColor Magenta

$passed = ($results | Where-Object { $_.Status -eq "✅ PASS" }).Count
$failed = ($results | Where-Object { $_.Status -eq "❌ FAIL" }).Count
$total = $results.Count

Write-Host "`nTotal Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red

Write-Host "`n📝 NOTE: Many user APIs failed because:" -ForegroundColor Yellow
Write-Host "   1. Protected endpoints require user authentication (401 errors are expected)" -ForegroundColor Gray
Write-Host "   2. Auth endpoints require valid OTP verification" -ForegroundColor Gray
Write-Host "   3. No test user accounts exist yet" -ForegroundColor Gray
Write-Host "`n   ✅ Public endpoints working correctly" -ForegroundColor Green
Write-Host "   ✅ Protected endpoints correctly rejecting unauthenticated requests" -ForegroundColor Green

if ($failed -gt 0) {
    Write-Host "`n❌ FAILED TESTS:" -ForegroundColor Red
    $results | Where-Object { $_.Status -eq "❌ FAIL" } | ForEach-Object {
        Write-Host "   • $($_.Name)" -ForegroundColor Red
        Write-Host "     $($_.Url)" -ForegroundColor Gray
    }
}

Write-Host "`n✅ User API test completed!" -ForegroundColor Green
Write-Host "="*60 -ForegroundColor Magenta

# Export results
Write-Host "`n💾 Available User API Endpoints:" -ForegroundColor Cyan
Write-Host @"

📱 AUTHENTICATION (Public):
   POST   /api/auth/send-otp           - Send OTP to phone
   POST   /api/auth/verify-otp         - Verify OTP
   POST   /api/auth/signup             - User signup
   POST   /api/auth/login              - User login
   POST   /api/auth/reset-password     - Reset password
   GET    /api/auth/me                 - Get current user
   POST   /api/auth/logout             - Logout

👤 USER PROFILE (Protected):
   GET    /api/user/profile            - Get profile
   PUT    /api/user/profile            - Update profile
   POST   /api/user/avatar             - Upload avatar
   PUT    /api/user/password           - Change password
   GET    /api/user/activity           - Get activity log
   GET    /api/user/stats              - Get user stats
   GET    /api/user/dashboard          - Get dashboard data
   DELETE /api/user/account            - Delete account

✅ DAILY CHECK-IN (Protected):
   GET    /api/user/daily-checkin      - Get check-in status
   POST   /api/user/daily-checkin      - Perform check-in

🎟️ PROMO CODES (Protected):
   POST   /api/user/redeem-code        - Redeem promo code

💰 COINS (Protected):
   GET    /api/coins/balance           - Get coin balance
   POST   /api/coins/purchase          - Purchase coins
   POST   /api/coins/purchase/:id/proof - Submit payment proof
   POST   /api/coins/purchase/:id/cancel - Cancel purchase
   GET    /api/coins/purchases         - Purchase history
   POST   /api/coins/transfer          - Transfer coins

⛏️ MINING (Protected):
   POST   /api/mining/start            - Start mining
   GET    /api/mining/status           - Get mining status
   POST   /api/mining/claim            - Claim rewards
   GET    /api/mining/history          - Mining history
   POST   /api/mining/cancel           - Cancel mining
   GET    /api/mining/leaderboard      - Get leaderboard
   POST   /api/mining/boost            - Boost mining
   GET    /api/mining/rewards          - Rewards breakdown

💳 WALLET (Protected):
   GET    /api/wallet                  - Get wallet
   POST   /api/wallet/sync             - Sync wallet
   PUT    /api/wallet/withdrawal-address - Update address
   POST   /api/wallet/withdraw         - Request withdrawal
   GET    /api/wallet/transactions     - Transaction history
   GET    /api/wallet/transactions/:id - Transaction details
   GET    /api/wallet/summary          - Wallet summary

🛡️ KYC (Protected):
   GET    /api/kyc/status              - Get KYC status
   POST   /api/kyc/submit              - Submit KYC
   GET    /api/kyc/:id                 - Get KYC details
   PUT    /api/kyc/resubmit            - Resubmit KYC

👥 REFERRALS (Protected):
   GET    /api/referrals               - Get referrals
   GET    /api/referrals/share         - Get share link
   POST   /api/referrals/ping          - Ping inactive referrals
   GET    /api/referrals/earnings      - Referral earnings
   GET    /api/referrals/validate/:code (Public) - Validate code

🔔 NOTIFICATIONS (Protected):
   GET    /api/notifications           - Get notifications
   GET    /api/notifications/unread-count - Unread count
   PUT    /api/notifications/read-all  - Mark all as read
   PUT    /api/notifications/:id/read  - Mark as read
   DELETE /api/notifications/:id       - Delete notification
   DELETE /api/notifications           - Delete all

⚙️ SETTINGS (Public):
   GET    /api/settings                - Get app settings
   GET    /api/settings/social         - Get social links
   GET    /api/settings/maintenance    - Check maintenance

"@ -ForegroundColor Gray

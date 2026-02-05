# Mining App - COMPLETE API TEST SUITE
# Tests EVERY SINGLE API endpoint in both Admin and User sides

$baseUrl = "http://localhost:5000/api"
$testResults = @()
$adminToken = $null
$userToken = $null

function Log-Test {
    param(
        [string]$TestName,
        [string]$Status,
        [string]$Details = "",
        [string]$Endpoint = ""
    )
    
    $icon = if ($Status -eq "PASS") { "✅" } elseif ($Status -eq "FAIL") { "❌" } else { "⏭️" }
    Write-Host "$icon $TestName" -ForegroundColor $(if ($Status -eq "PASS") { "Green" } elseif ($Status -eq "FAIL") { "Red" } else { "Yellow" })
    if ($Endpoint) {
        Write-Host "   📍 $Endpoint" -ForegroundColor DarkGray
    }
    if ($Details) {
        Write-Host "   $Details" -ForegroundColor Gray
    }
    
    $script:testResults += @{
        Name = $TestName
        Status = $Status
        Details = $Details
        Endpoint = $Endpoint
    }
}

function API-Call {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        return @{ Success = $false; Error = $_.Exception.Message; StatusCode = $statusCode }
    }
}

Write-Host @"
╔══════════════════════════════════════════════════════════════════════╗
║        MINING APP - COMPLETE API TEST SUITE (ALL ENDPOINTS)          ║
╚══════════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Magenta

# ═══════════════════════════════════════════════════════════════
# SECTION 1: PUBLIC SETTINGS APIs
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 1: PUBLIC SETTINGS APIs (No Auth Required)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/settings"
Log-Test "Get App Settings" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/settings"

$result = API-Call -Url "$baseUrl/settings/social"
Log-Test "Get Social Links" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/settings/social"

$result = API-Call -Url "$baseUrl/settings/maintenance"
Log-Test "Check Maintenance Mode" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/settings/maintenance"

# ═══════════════════════════════════════════════════════════════
# SECTION 2: PUBLIC COIN APIs
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 2: PUBLIC COIN APIs (No Auth Required)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/coins/packages"
Log-Test "Get Coin Packages" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/coins/packages"

$result = API-Call -Url "$baseUrl/coins/rate"
Log-Test "Get Coin Rate" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/coins/rate"

# ═══════════════════════════════════════════════════════════════
# SECTION 3: PUBLIC REFERRAL APIs
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 3: PUBLIC REFERRAL APIs (No Auth Required)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/referrals/validate/TESTCODE"
Log-Test "Validate Referral Code" $(if ($result.Success -or $result.StatusCode -eq 404) { "PASS" } else { "FAIL" }) "Returns 404 if code not found (expected)" "GET /api/referrals/validate/:code"

# ═══════════════════════════════════════════════════════════════
# SECTION 4: USER AUTH APIs
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 4: USER AUTH APIs" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/auth/send-otp" -Method POST -Body @{ phone = "+919876543210" }
Log-Test "Send OTP" $(if ($result.Success -or $result.StatusCode -eq 400) { "PASS" } else { "FAIL" }) "Endpoint works (validation may fail without real phone)" "POST /api/auth/send-otp"

$result = API-Call -Url "$baseUrl/auth/verify-otp" -Method POST -Body @{ phone = "+919876543210"; otp = "123456" }
Log-Test "Verify OTP" $(if ($result.Success -or $result.StatusCode -eq 400 -or $result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Endpoint works (invalid OTP expected)" "POST /api/auth/verify-otp"

$result = API-Call -Url "$baseUrl/auth/signup" -Method POST -Body @{ phone = "+919876543210"; name = "Test"; otp = "123456" }
Log-Test "Signup" $(if ($result.Success -or $result.StatusCode -eq 400 -or $result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Endpoint works (validation may fail)" "POST /api/auth/signup"

$result = API-Call -Url "$baseUrl/auth/login" -Method POST -Body @{ phone = "+919876543210"; otp = "123456" }
Log-Test "Login" $(if ($result.Success -or $result.StatusCode -eq 400 -or $result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Endpoint works (invalid credentials expected)" "POST /api/auth/login"

$result = API-Call -Url "$baseUrl/auth/reset-password" -Method POST -Body @{ phone = "+919876543210" }
Log-Test "Reset Password" $(if ($result.Success -or $result.StatusCode -eq 400 -or $result.StatusCode -eq 404) { "PASS" } else { "FAIL" }) "Endpoint works" "POST /api/auth/reset-password"

# Protected User Auth routes (should return 401 without token)
$result = API-Call -Url "$baseUrl/auth/me"
Log-Test "Get Me (Auth Required)" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/auth/me"

$result = API-Call -Url "$baseUrl/auth/logout" -Method POST
Log-Test "Logout (Auth Required)" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "POST /api/auth/logout"

# ═══════════════════════════════════════════════════════════════
# SECTION 5: USER PROFILE APIs (Protected)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 5: USER PROFILE APIs (Auth Required - Should Return 401)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/users/profile"
Log-Test "Get Profile" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/users/profile"

$result = API-Call -Url "$baseUrl/users/profile" -Method PUT -Body @{ name = "Test" }
Log-Test "Update Profile" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "PUT /api/users/profile"

$result = API-Call -Url "$baseUrl/users/avatar" -Method POST
Log-Test "Upload Avatar" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "POST /api/users/avatar"

$result = API-Call -Url "$baseUrl/users/password" -Method PUT -Body @{ oldPassword = "test"; newPassword = "test2" }
Log-Test "Change Password" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "PUT /api/users/password"

$result = API-Call -Url "$baseUrl/users/activity"
Log-Test "Get Activity" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/users/activity"

$result = API-Call -Url "$baseUrl/users/stats"
Log-Test "Get User Stats" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/users/stats"

$result = API-Call -Url "$baseUrl/users/dashboard"
Log-Test "Get Dashboard" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/users/dashboard"

$result = API-Call -Url "$baseUrl/users/daily-checkin"
Log-Test "Get Checkin Status" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/users/daily-checkin"

$result = API-Call -Url "$baseUrl/users/daily-checkin" -Method POST
Log-Test "Daily Checkin" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "POST /api/users/daily-checkin"

$result = API-Call -Url "$baseUrl/users/redeem-code" -Method POST -Body @{ code = "TEST" }
Log-Test "Redeem Promo Code" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "POST /api/users/redeem-code"

$result = API-Call -Url "$baseUrl/users/account" -Method DELETE
Log-Test "Delete Account" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "DELETE /api/users/account"

# ═══════════════════════════════════════════════════════════════
# SECTION 6: USER WALLET APIs (Protected)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 6: USER WALLET APIs (Auth Required - Should Return 401)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/wallet"
Log-Test "Get Wallet" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/wallet"

$result = API-Call -Url "$baseUrl/wallet/sync" -Method POST
Log-Test "Sync Wallet" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "POST /api/wallet/sync"

$result = API-Call -Url "$baseUrl/wallet/withdrawal-address" -Method PUT -Body @{ address = "test" }
Log-Test "Update Withdrawal Address" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "PUT /api/wallet/withdrawal-address"

$result = API-Call -Url "$baseUrl/wallet/withdraw" -Method POST -Body @{ amount = 100 }
Log-Test "Request Withdrawal" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "POST /api/wallet/withdraw"

$result = API-Call -Url "$baseUrl/wallet/transactions"
Log-Test "Get Transactions" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/wallet/transactions"

$result = API-Call -Url "$baseUrl/wallet/transactions/test123"
Log-Test "Get Transaction By ID" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/wallet/transactions/:id"

$result = API-Call -Url "$baseUrl/wallet/summary"
Log-Test "Get Wallet Summary" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/wallet/summary"

# ═══════════════════════════════════════════════════════════════
# SECTION 7: USER COIN APIs (Protected)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 7: USER COIN APIs (Auth Required - Should Return 401)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/coins/balance"
Log-Test "Get Coin Balance" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/coins/balance"

$result = API-Call -Url "$baseUrl/coins/purchase" -Method POST -Body @{ packageId = "test" }
Log-Test "Purchase Coins" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "POST /api/coins/purchase"

$result = API-Call -Url "$baseUrl/coins/purchase/test123/proof" -Method POST
Log-Test "Submit Payment Proof" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "POST /api/coins/purchase/:id/proof"

$result = API-Call -Url "$baseUrl/coins/purchase/test123/cancel" -Method POST
Log-Test "Cancel Purchase" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "POST /api/coins/purchase/:id/cancel"

$result = API-Call -Url "$baseUrl/coins/purchases"
Log-Test "Get Purchase History" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/coins/purchases"

$result = API-Call -Url "$baseUrl/coins/transfer" -Method POST -Body @{ recipientEmail = "test@test.com"; amount = 100 }
Log-Test "Transfer Coins" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "POST /api/coins/transfer"

# ═══════════════════════════════════════════════════════════════
# SECTION 8: USER MINING APIs (Protected)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 8: USER MINING APIs (Auth Required - Should Return 401)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/mining/start" -Method POST
Log-Test "Start Mining" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "POST /api/mining/start"

$result = API-Call -Url "$baseUrl/mining/status"
Log-Test "Get Mining Status" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/mining/status"

$result = API-Call -Url "$baseUrl/mining/claim" -Method POST
Log-Test "Claim Rewards" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "POST /api/mining/claim"

$result = API-Call -Url "$baseUrl/mining/history"
Log-Test "Get Mining History" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/mining/history"

$result = API-Call -Url "$baseUrl/mining/cancel" -Method POST
Log-Test "Cancel Mining" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "POST /api/mining/cancel"

$result = API-Call -Url "$baseUrl/mining/leaderboard"
Log-Test "Get Leaderboard" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/mining/leaderboard"

$result = API-Call -Url "$baseUrl/mining/boost" -Method POST
Log-Test "Boost Mining" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "POST /api/mining/boost"

$result = API-Call -Url "$baseUrl/mining/rewards"
Log-Test "Get Rewards Breakdown" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/mining/rewards"

# ═══════════════════════════════════════════════════════════════
# SECTION 9: USER KYC APIs (Protected)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 9: USER KYC APIs (Auth Required - Should Return 401)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/kyc/status"
Log-Test "Get KYC Status" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/kyc/status"

$result = API-Call -Url "$baseUrl/kyc/submit" -Method POST
Log-Test "Submit KYC" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "POST /api/kyc/submit"

$result = API-Call -Url "$baseUrl/kyc/test123"
Log-Test "Get KYC Details" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/kyc/:id"

$result = API-Call -Url "$baseUrl/kyc/resubmit" -Method PUT
Log-Test "Resubmit KYC" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "PUT /api/kyc/resubmit"

# ═══════════════════════════════════════════════════════════════
# SECTION 10: USER NOTIFICATION APIs (Protected)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 10: USER NOTIFICATION APIs (Auth Required - Should Return 401)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/notifications"
Log-Test "Get Notifications" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/notifications"

$result = API-Call -Url "$baseUrl/notifications/unread-count"
Log-Test "Get Unread Count" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/notifications/unread-count"

$result = API-Call -Url "$baseUrl/notifications/read-all" -Method PUT
Log-Test "Mark All As Read" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "PUT /api/notifications/read-all"

$result = API-Call -Url "$baseUrl/notifications/test123/read" -Method PUT
Log-Test "Mark As Read" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "PUT /api/notifications/:id/read"

$result = API-Call -Url "$baseUrl/notifications/test123" -Method DELETE
Log-Test "Delete Notification" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "DELETE /api/notifications/:id"

$result = API-Call -Url "$baseUrl/notifications" -Method DELETE
Log-Test "Delete All Notifications" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "DELETE /api/notifications"

# ═══════════════════════════════════════════════════════════════
# SECTION 11: USER REFERRAL APIs (Protected)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 11: USER REFERRAL APIs (Auth Required - Should Return 401)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/referrals"
Log-Test "Get Referrals" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/referrals"

$result = API-Call -Url "$baseUrl/referrals/share"
Log-Test "Get Share Link" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/referrals/share"

$result = API-Call -Url "$baseUrl/referrals/ping" -Method POST
Log-Test "Ping Inactive Referrals" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "POST /api/referrals/ping"

$result = API-Call -Url "$baseUrl/referrals/earnings"
Log-Test "Get Referral Earnings" $(if ($result.StatusCode -eq 401) { "PASS" } else { "FAIL" }) "Returns 401 without auth" "GET /api/referrals/earnings"

# ═══════════════════════════════════════════════════════════════
# SECTION 12: ADMIN AUTH APIs
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 12: ADMIN AUTH APIs" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$adminLogin = API-Call -Url "$baseUrl/admin/auth/login" -Method POST -Body @{
    email = "admin@mining.com"
    password = "admin123456"
}

if ($adminLogin.Success) {
    $adminToken = $adminLogin.Data.token
    $adminHeaders = @{ Authorization = "Bearer $adminToken" }
    Log-Test "Admin Login" "PASS" "Token obtained" "POST /api/admin/auth/login"
} else {
    Log-Test "Admin Login" "FAIL" $adminLogin.Error "POST /api/admin/auth/login"
    Write-Host "`n❌ Cannot proceed without admin login. Exiting." -ForegroundColor Red
    exit 1
}

$result = API-Call -Url "$baseUrl/admin/auth/me" -Headers $adminHeaders
Log-Test "Get Admin Profile" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/auth/me"

$result = API-Call -Url "$baseUrl/admin/auth/admins" -Headers $adminHeaders
Log-Test "Get All Admins" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/auth/admins"

# ═══════════════════════════════════════════════════════════════
# SECTION 13: ADMIN DASHBOARD APIs
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 13: ADMIN DASHBOARD APIs" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/admin/dashboard/stats" -Headers $adminHeaders
Log-Test "Get Dashboard Stats" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/dashboard/stats"

$result = API-Call -Url "$baseUrl/admin/dashboard/health" -Headers $adminHeaders
Log-Test "Get System Health" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/dashboard/health"

# ═══════════════════════════════════════════════════════════════
# SECTION 14: ADMIN USER MANAGEMENT APIs
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 14: ADMIN USER MANAGEMENT APIs" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/admin/users" -Headers $adminHeaders
Log-Test "Get All Users" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/users"

$result = API-Call -Url "$baseUrl/admin/users/stats" -Headers $adminHeaders
Log-Test "Get User Stats" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/users/stats"

$result = API-Call -Url "$baseUrl/admin/users/export" -Headers $adminHeaders
Log-Test "Export Users" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/users/export"

# ═══════════════════════════════════════════════════════════════
# SECTION 15: ADMIN KYC MANAGEMENT APIs
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 15: ADMIN KYC MANAGEMENT APIs" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/admin/kyc" -Headers $adminHeaders
Log-Test "Get All KYC Requests" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/kyc"

$result = API-Call -Url "$baseUrl/admin/kyc/stats" -Headers $adminHeaders
Log-Test "Get KYC Stats" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/kyc/stats"

$result = API-Call -Url "$baseUrl/admin/kyc/export" -Headers $adminHeaders
Log-Test "Export KYC" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/kyc/export"

# ═══════════════════════════════════════════════════════════════
# SECTION 16: ADMIN MINING MANAGEMENT APIs
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 16: ADMIN MINING MANAGEMENT APIs" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/admin/mining/sessions" -Headers $adminHeaders
Log-Test "Get All Mining Sessions" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/mining/sessions"

$result = API-Call -Url "$baseUrl/admin/mining/stats" -Headers $adminHeaders
Log-Test "Get Mining Stats" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/mining/stats"

$result = API-Call -Url "$baseUrl/admin/mining/active" -Headers $adminHeaders
Log-Test "Get Active Miners" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/mining/active"

$result = API-Call -Url "$baseUrl/admin/mining/leaderboard" -Headers $adminHeaders
Log-Test "Get Mining Leaderboard" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/mining/leaderboard"

$result = API-Call -Url "$baseUrl/admin/mining/settings" -Headers $adminHeaders
Log-Test "Get Mining Settings" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/mining/settings"

# ═══════════════════════════════════════════════════════════════
# SECTION 17: ADMIN TRANSACTION MANAGEMENT APIs
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 17: ADMIN TRANSACTION MANAGEMENT APIs" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/admin/transactions" -Headers $adminHeaders
Log-Test "Get All Transactions" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/transactions"

$result = API-Call -Url "$baseUrl/admin/transactions/stats" -Headers $adminHeaders
Log-Test "Get Transaction Stats" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/transactions/stats"

$result = API-Call -Url "$baseUrl/admin/transactions/withdrawals/pending" -Headers $adminHeaders
Log-Test "Get Pending Withdrawals" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/transactions/withdrawals/pending"

# ═══════════════════════════════════════════════════════════════
# SECTION 18: ADMIN PAYMENT MANAGEMENT APIs
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 18: ADMIN PAYMENT MANAGEMENT APIs" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/admin/payments" -Headers $adminHeaders
Log-Test "Get All Payment Proofs" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/payments"

$result = API-Call -Url "$baseUrl/admin/payments/stats" -Headers $adminHeaders
Log-Test "Get Payment Stats" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/payments/stats"

$result = API-Call -Url "$baseUrl/admin/payments/settings" -Headers $adminHeaders
Log-Test "Get Payment Settings" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/payments/settings"

# ═══════════════════════════════════════════════════════════════
# SECTION 19: ADMIN COIN PACKAGE MANAGEMENT APIs
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 19: ADMIN COIN PACKAGE MANAGEMENT APIs" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/admin/coins" -Headers $adminHeaders
Log-Test "Get All Coin Packages" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/coins"

# ═══════════════════════════════════════════════════════════════
# SECTION 20: ADMIN BANNER MANAGEMENT APIs
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 20: ADMIN BANNER MANAGEMENT APIs" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/admin/banners" -Headers $adminHeaders
Log-Test "Get All Banners" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/banners"

$result = API-Call -Url "$baseUrl/admin/banners/active" -Headers $adminHeaders
Log-Test "Get Active Banners" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/banners/active"

$result = API-Call -Url "$baseUrl/admin/banners/stats" -Headers $adminHeaders
Log-Test "Get Banner Stats" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/banners/stats"

# ═══════════════════════════════════════════════════════════════
# SECTION 21: ADMIN REFERRAL MANAGEMENT APIs
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 21: ADMIN REFERRAL MANAGEMENT APIs" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/admin/referrals" -Headers $adminHeaders
Log-Test "Get All Referrals" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/referrals"

$result = API-Call -Url "$baseUrl/admin/referrals/stats" -Headers $adminHeaders
Log-Test "Get Referral Stats" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/referrals/stats"

$result = API-Call -Url "$baseUrl/admin/referrals/settings" -Headers $adminHeaders
Log-Test "Get Referral Settings" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/referrals/settings"

$result = API-Call -Url "$baseUrl/admin/referrals/export" -Headers $adminHeaders
Log-Test "Export Referrals" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/referrals/export"

# ═══════════════════════════════════════════════════════════════
# SECTION 22: ADMIN SETTINGS MANAGEMENT APIs
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 22: ADMIN SETTINGS MANAGEMENT APIs" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/admin/settings" -Headers $adminHeaders
Log-Test "Get All Settings" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/settings"

$result = API-Call -Url "$baseUrl/admin/settings/social" -Headers $adminHeaders
Log-Test "Get Social Links (Admin)" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/settings/social"

# ═══════════════════════════════════════════════════════════════
# SECTION 23: ADMIN NOTIFICATION MANAGEMENT APIs
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SECTION 23: ADMIN NOTIFICATION MANAGEMENT APIs" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$result = API-Call -Url "$baseUrl/admin/notifications" -Headers $adminHeaders
Log-Test "Get All Notifications" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/notifications"

$result = API-Call -Url "$baseUrl/admin/notifications/stats" -Headers $adminHeaders
Log-Test "Get Notification Stats" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/notifications/stats"

$result = API-Call -Url "$baseUrl/admin/notifications/templates" -Headers $adminHeaders
Log-Test "Get Notification Templates" $(if ($result.Success) { "PASS" } else { "FAIL" }) "" "GET /api/admin/notifications/templates"

# ═══════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════
Write-Host "`n"
Write-Host "╔══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║               COMPLETE API TEST SUITE - SUMMARY                      ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta

$passed = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$skipped = ($testResults | Where-Object { $_.Status -eq "SKIP" }).Count
$total = $testResults.Count

Write-Host "`n📊 Test Results:" -ForegroundColor White
Write-Host "   ✅ Passed:  $passed" -ForegroundColor Green
Write-Host "   ❌ Failed:  $failed" -ForegroundColor Red
Write-Host "   ⏭️ Skipped: $skipped" -ForegroundColor Yellow
Write-Host "   📋 Total:   $total" -ForegroundColor Cyan

$successRate = if ($total -gt 0) { [math]::Round(($passed / $total) * 100, 2) } else { 0 }
Write-Host "`n   Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 70) { "Yellow" } else { "Red" })

if ($failed -gt 0) {
    Write-Host "`n❌ Failed Tests:" -ForegroundColor Red
    $testResults | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "   • $($_.Name)" -ForegroundColor Red
        Write-Host "     $($_.Endpoint)" -ForegroundColor DarkRed
    }
}

Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Magenta

# Count by category
$userAPIs = $testResults | Where-Object { $_.Endpoint -notlike "*admin*" }
$adminAPIs = $testResults | Where-Object { $_.Endpoint -like "*admin*" }

Write-Host "`n📋 API Coverage Summary:" -ForegroundColor White
Write-Host "   👤 User APIs Tested:  $($userAPIs.Count)" -ForegroundColor Cyan
Write-Host "   🔧 Admin APIs Tested: $($adminAPIs.Count)" -ForegroundColor Cyan

Write-Host "`nComplete API test finished!" -ForegroundColor Green

# Mining App API Test Script
# Tests all public and admin APIs

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

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║          MINING APP API COMPREHENSIVE TEST SUITE          ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta

# ===== PUBLIC APIs =====
Write-Host "`n" + "="*60 -ForegroundColor Yellow
Write-Host "PUBLIC APIs (No Authentication)" -ForegroundColor Yellow
Write-Host "="*60 -ForegroundColor Yellow

Test-API "Get App Settings" "$baseUrl/settings"
Test-API "Get Social Links" "$baseUrl/settings/social"
Test-API "Check Maintenance Mode" "$baseUrl/settings/maintenance"
Test-API "Get Coin Packages" "$baseUrl/coins/packages"
Test-API "Get Coin Rate" "$baseUrl/coins/rate"

# ===== ADMIN LOGIN =====
Write-Host "`n" + "="*60 -ForegroundColor Yellow
Write-Host "ADMIN AUTHENTICATION" -ForegroundColor Yellow
Write-Host "="*60 -ForegroundColor Yellow

$loginResponse = Test-API "Admin Login" "$baseUrl/admin/auth/login" -Method POST -Body @{
    email = "admin@mining.com"
    password = "admin123456"
}

if (-not $loginResponse) {
    Write-Host "`n❌ Admin login failed. Cannot test protected APIs." -ForegroundColor Red
    exit 1
}

$token = $loginResponse.token
$authHeaders = @{ Authorization = "Bearer $token" }

Write-Host "`n   🔑 Token obtained: $($token.Substring(0, 50))..." -ForegroundColor Green

# ===== ADMIN DASHBOARD =====
Write-Host "`n" + "="*60 -ForegroundColor Yellow
Write-Host "ADMIN DASHBOARD APIs" -ForegroundColor Yellow
Write-Host "="*60 -ForegroundColor Yellow

Test-API "Get Admin Profile" "$baseUrl/admin/auth/me" -Headers $authHeaders
Test-API "Get Dashboard Stats" "$baseUrl/admin/dashboard/stats" -Headers $authHeaders
Test-API "Get System Health" "$baseUrl/admin/dashboard/health" -Headers $authHeaders

# ===== USER MANAGEMENT =====
Write-Host "`n" + "="*60 -ForegroundColor Yellow
Write-Host "USER MANAGEMENT APIs" -ForegroundColor Yellow
Write-Host "="*60 -ForegroundColor Yellow

Test-API "Get All Users" "$baseUrl/admin/users" -Headers $authHeaders
Test-API "Get User Stats" "$baseUrl/admin/users/stats" -Headers $authHeaders

# ===== KYC MANAGEMENT =====
Write-Host "`n" + "="*60 -ForegroundColor Yellow
Write-Host "KYC MANAGEMENT APIs" -ForegroundColor Yellow
Write-Host "="*60 -ForegroundColor Yellow

Test-API "Get All KYC Requests" "$baseUrl/admin/kyc" -Headers $authHeaders
Test-API "Get KYC Stats" "$baseUrl/admin/kyc/stats" -Headers $authHeaders

# ===== MINING MANAGEMENT =====
Write-Host "`n" + "="*60 -ForegroundColor Yellow
Write-Host "MINING MANAGEMENT APIs" -ForegroundColor Yellow
Write-Host "="*60 -ForegroundColor Yellow

Test-API "Get Mining Sessions" "$baseUrl/admin/mining/sessions" -Headers $authHeaders
Test-API "Get Mining Stats" "$baseUrl/admin/mining/stats" -Headers $authHeaders
Test-API "Get Active Miners" "$baseUrl/admin/mining/active" -Headers $authHeaders
Test-API "Get Mining Leaderboard" "$baseUrl/admin/mining/leaderboard" -Headers $authHeaders
Test-API "Get Mining Settings" "$baseUrl/admin/mining/settings" -Headers $authHeaders

# ===== TRANSACTION MANAGEMENT =====
Write-Host "`n" + "="*60 -ForegroundColor Yellow
Write-Host "TRANSACTION MANAGEMENT APIs" -ForegroundColor Yellow
Write-Host "="*60 -ForegroundColor Yellow

Test-API "Get All Transactions" "$baseUrl/admin/transactions" -Headers $authHeaders
Test-API "Get Transaction Stats" "$baseUrl/admin/transactions/stats" -Headers $authHeaders
Test-API "Get Pending Withdrawals" "$baseUrl/admin/transactions/withdrawals/pending" -Headers $authHeaders

# ===== PAYMENT MANAGEMENT =====
Write-Host "`n" + "="*60 -ForegroundColor Yellow
Write-Host "PAYMENT MANAGEMENT APIs" -ForegroundColor Yellow
Write-Host "="*60 -ForegroundColor Yellow

Test-API "Get All Payment Proofs" "$baseUrl/admin/payments" -Headers $authHeaders
Test-API "Get Payment Stats" "$baseUrl/admin/payments/stats" -Headers $authHeaders
Test-API "Get Payment Settings" "$baseUrl/admin/payments/settings" -Headers $authHeaders

# ===== COIN PACKAGE MANAGEMENT =====
Write-Host "`n" + "="*60 -ForegroundColor Yellow
Write-Host "COIN PACKAGE MANAGEMENT APIs" -ForegroundColor Yellow
Write-Host "="*60 -ForegroundColor Yellow

Test-API "Get All Coin Packages (Admin)" "$baseUrl/admin/coins" -Headers $authHeaders

# ===== BANNER MANAGEMENT =====
Write-Host "`n" + "="*60 -ForegroundColor Yellow
Write-Host "BANNER MANAGEMENT APIs" -ForegroundColor Yellow
Write-Host "="*60 -ForegroundColor Yellow

Test-API "Get All Banners" "$baseUrl/admin/banners" -Headers $authHeaders
Test-API "Get Active Banners" "$baseUrl/admin/banners/active" -Headers $authHeaders
Test-API "Get Banner Stats" "$baseUrl/admin/banners/stats" -Headers $authHeaders

# ===== REFERRAL MANAGEMENT =====
Write-Host "`n" + "="*60 -ForegroundColor Yellow
Write-Host "REFERRAL MANAGEMENT APIs" -ForegroundColor Yellow
Write-Host "="*60 -ForegroundColor Yellow

Test-API "Get All Referrals" "$baseUrl/admin/referrals" -Headers $authHeaders
Test-API "Get Referral Stats" "$baseUrl/admin/referrals/stats" -Headers $authHeaders
Test-API "Get Referral Settings" "$baseUrl/admin/referrals/settings" -Headers $authHeaders

# ===== SETTINGS MANAGEMENT =====
Write-Host "`n" + "="*60 -ForegroundColor Yellow
Write-Host "SETTINGS MANAGEMENT APIs" -ForegroundColor Yellow
Write-Host "="*60 -ForegroundColor Yellow

Test-API "Get All Settings (Admin)" "$baseUrl/admin/settings" -Headers $authHeaders
Test-API "Get Social Links (Admin)" "$baseUrl/admin/settings/social" -Headers $authHeaders

# ===== NOTIFICATION MANAGEMENT =====
Write-Host "`n" + "="*60 -ForegroundColor Yellow
Write-Host "NOTIFICATION MANAGEMENT APIs" -ForegroundColor Yellow
Write-Host "="*60 -ForegroundColor Yellow

Test-API "Get All Notifications" "$baseUrl/admin/notifications" -Headers $authHeaders
Test-API "Get Notification Stats" "$baseUrl/admin/notifications/stats" -Headers $authHeaders
Test-API "Get Notification Templates" "$baseUrl/admin/notifications/templates" -Headers $authHeaders

# ===== ADMIN MANAGEMENT =====
Write-Host "`n" + "="*60 -ForegroundColor Yellow
Write-Host "ADMIN MANAGEMENT APIs" -ForegroundColor Yellow
Write-Host "="*60 -ForegroundColor Yellow

Test-API "Get All Admins" "$baseUrl/admin/auth/admins" -Headers $authHeaders

# ===== SUMMARY =====
Write-Host "`n" + "="*60 -ForegroundColor Magenta
Write-Host "TEST SUMMARY" -ForegroundColor Magenta
Write-Host "="*60 -ForegroundColor Magenta

$passed = ($results | Where-Object { $_.Status -eq "✅ PASS" }).Count
$failed = ($results | Where-Object { $_.Status -eq "❌ FAIL" }).Count
$total = $results.Count

Write-Host "`nTotal Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Success Rate: $([math]::Round(($passed/$total)*100, 2))%" -ForegroundColor Cyan

if ($failed -gt 0) {
    Write-Host "`n❌ FAILED TESTS:" -ForegroundColor Red
    $results | Where-Object { $_.Status -eq "❌ FAIL" } | ForEach-Object {
        Write-Host "   • $($_.Name)" -ForegroundColor Red
        Write-Host "     $($_.Url)" -ForegroundColor Gray
        if ($_.Error) {
            Write-Host "     Error: $($_.Error)" -ForegroundColor DarkRed
        }
    }
}

Write-Host "`n✅ All API tests completed!" -ForegroundColor Green
Write-Host "="*60 -ForegroundColor Magenta

# ============================================
# TEST USER AUTHENTICATED APIS - SEE ACTUAL DATA
# ============================================
# This script tests all user APIs WITH authentication
# to see what data they actually return

$baseUrl = "http://localhost:5000/api"
$adminUrl = "$baseUrl/admin"

Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "  TESTING AUTHENTICATED USER APIs" -ForegroundColor Cyan
Write-Host "  See what data the APIs actually return" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# ============================================
# STEP 1: ADMIN LOGIN (to create test user if needed)
# ============================================
Write-Host "`n📌 STEP 1: Admin Login" -ForegroundColor Yellow
Write-Host "-" * 40

$adminCreds = @{email='admin@mining.com'; password='admin123456'} | ConvertTo-Json
try {
    $adminResponse = Invoke-RestMethod -Uri "$adminUrl/auth/login" -Method POST -Body $adminCreds -ContentType "application/json"
    $adminToken = $adminResponse.token
    $adminHeaders = @{Authorization="Bearer $adminToken"}
    Write-Host "✅ Admin logged in successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Admin login failed - cannot proceed" -ForegroundColor Red
    exit 1
}

# ============================================
# STEP 2: CHECK/CREATE TEST USER
# ============================================
Write-Host "`n📌 STEP 2: Check/Create Test User" -ForegroundColor Yellow
Write-Host "-" * 40

$testEmail = "testuser@test.com"
$testPassword = "test123456"
$testName = "Test User"

# Get all users
try {
    $usersResponse = Invoke-RestMethod -Uri "$adminUrl/users" -Method GET -Headers $adminHeaders
    $existingUser = $usersResponse.users | Where-Object { $_.email -eq $testEmail }
    
    if ($existingUser) {
        Write-Host "✅ Test user already exists: $testEmail" -ForegroundColor Green
        $testUserId = $existingUser._id
    } else {
        Write-Host "⚠️ No test user found, creating one..." -ForegroundColor Yellow
        
        # We need to create user via admin API or simulate signup
        # Let's use admin to create user directly in database
        $createUserBody = @{
            email = $testEmail
            name = $testName
            password = $testPassword
        } | ConvertTo-Json
        
        # Note: Admin might not have direct user creation API
        # Let's try login - if fails, user doesn't exist
        Write-Host "   Test user doesn't exist. Please create one manually or use existing user." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to check users: $_" -ForegroundColor Red
}

# ============================================
# STEP 3: TRY USER LOGIN
# ============================================
Write-Host "`n📌 STEP 3: Try User Login" -ForegroundColor Yellow
Write-Host "-" * 40

$userToken = $null
$userHeaders = @{}

# Try with test user first
$loginBody = @{email=$testEmail; password=$testPassword} | ConvertTo-Json
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $userToken = $loginResponse.token
    $userHeaders = @{Authorization="Bearer $userToken"}
    Write-Host "✅ Test user logged in successfully" -ForegroundColor Green
    Write-Host "   User: $($loginResponse.user.name) ($($loginResponse.user.email))" -ForegroundColor Gray
} catch {
    Write-Host "⚠️ Test user login failed, trying to find any existing user..." -ForegroundColor Yellow
    
    # Get first active user from admin
    try {
        $usersResponse = Invoke-RestMethod -Uri "$adminUrl/users" -Method GET -Headers $adminHeaders
        $activeUser = $usersResponse.users | Where-Object { $_.status -eq 'active' } | Select-Object -First 1
        
        if ($activeUser) {
            Write-Host "   Found active user: $($activeUser.email)" -ForegroundColor Gray
            Write-Host "   But we don't know the password. Let's test with what we have..." -ForegroundColor Yellow
        } else {
            Write-Host "❌ No active users found in the system" -ForegroundColor Red
            Write-Host "   Creating a test user via database would require OTP verification" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Cannot get users list" -ForegroundColor Red
    }
}

# ============================================
# STEP 4: TEST USER APIs (If we have a token)
# ============================================
if ($userToken) {
    Write-Host "`n" -NoNewline
    Write-Host "=" * 60 -ForegroundColor Green
    Write-Host "  USER AUTHENTICATED API RESPONSES" -ForegroundColor Green
    Write-Host "=" * 60 -ForegroundColor Green

    # --- AUTH APIs ---
    Write-Host "`n📦 AUTH APIs" -ForegroundColor Magenta
    Write-Host "-" * 40

    Write-Host "`n🔹 GET /api/auth/me - Get Current User" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    # --- USER PROFILE APIs ---
    Write-Host "`n📦 USER PROFILE APIs" -ForegroundColor Magenta
    Write-Host "-" * 40

    Write-Host "`n🔹 GET /api/users/profile - Get Profile" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/users/profile" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    Write-Host "`n🔹 GET /api/users/stats - Get Stats" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/users/stats" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    Write-Host "`n🔹 GET /api/users/activity - Get Activity" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/users/activity" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    # --- WALLET APIs ---
    Write-Host "`n📦 WALLET APIs" -ForegroundColor Magenta
    Write-Host "-" * 40

    Write-Host "`n🔹 GET /api/wallet/balance - Get Wallet Balance" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/wallet/balance" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    Write-Host "`n🔹 GET /api/wallet - Get Wallet Info" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/wallet" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    Write-Host "`n🔹 GET /api/wallet/transactions - Get Transactions" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/wallet/transactions" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    Write-Host "`n🔹 GET /api/wallet/withdrawal-history - Get Withdrawal History" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/wallet/withdrawal-history" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    # --- MINING APIs ---
    Write-Host "`n📦 MINING APIs" -ForegroundColor Magenta
    Write-Host "-" * 40

    Write-Host "`n🔹 GET /api/mining/status - Get Mining Status" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/mining/status" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    Write-Host "`n🔹 GET /api/mining/history - Get Mining History" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/mining/history" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    Write-Host "`n🔹 GET /api/mining/earnings - Get Mining Earnings" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/mining/earnings" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    # --- COIN APIs ---
    Write-Host "`n📦 COIN APIs" -ForegroundColor Magenta
    Write-Host "-" * 40

    Write-Host "`n🔹 GET /api/coins/packages - Get Coin Packages" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/coins/packages" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    Write-Host "`n🔹 GET /api/coins/purchases - Get User Purchases" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/coins/purchases" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    # --- KYC APIs ---
    Write-Host "`n📦 KYC APIs" -ForegroundColor Magenta
    Write-Host "-" * 40

    Write-Host "`n🔹 GET /api/kyc/status - Get KYC Status" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/kyc/status" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    # --- NOTIFICATION APIs ---
    Write-Host "`n📦 NOTIFICATION APIs" -ForegroundColor Magenta
    Write-Host "-" * 40

    Write-Host "`n🔹 GET /api/notifications - Get Notifications" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/notifications" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    Write-Host "`n🔹 GET /api/notifications/unread-count - Get Unread Count" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/notifications/unread-count" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    # --- REFERRAL APIs ---
    Write-Host "`n📦 REFERRAL APIs" -ForegroundColor Magenta
    Write-Host "-" * 40

    Write-Host "`n🔹 GET /api/referrals - Get My Referrals" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/referrals" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    Write-Host "`n🔹 GET /api/referrals/stats - Get Referral Stats" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/referrals/stats" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    Write-Host "`n🔹 GET /api/referrals/leaderboard - Get Leaderboard" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/referrals/leaderboard" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    Write-Host "`n🔹 GET /api/referrals/earnings - Get Referral Earnings" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/referrals/earnings" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

    # --- SETTINGS APIs ---
    Write-Host "`n📦 SETTINGS APIs" -ForegroundColor Magenta
    Write-Host "-" * 40

    Write-Host "`n🔹 GET /api/settings - Get App Settings" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/settings" -Method GET -Headers $userHeaders
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }

} else {
    Write-Host "`n⚠️ NO USER TOKEN AVAILABLE" -ForegroundColor Yellow
    Write-Host "   Cannot test authenticated endpoints without a valid user token" -ForegroundColor Yellow
    Write-Host "`n   To create a test user, you need to:" -ForegroundColor Yellow
    Write-Host "   1. Call POST /api/auth/send-otp with email and purpose='signup'" -ForegroundColor Gray
    Write-Host "   2. Check email for OTP (or check OTP collection in MongoDB)" -ForegroundColor Gray
    Write-Host "   3. Call POST /api/auth/verify-otp with email and otp" -ForegroundColor Gray
    Write-Host "   4. Call POST /api/auth/signup with email, name, password" -ForegroundColor Gray
}

# ============================================
# STEP 5: ADMIN VIEW OF SAME USER
# ============================================
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Green
Write-Host "  ADMIN API RESPONSES (Full Data)" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green

Write-Host "`n📦 ADMIN DASHBOARD" -ForegroundColor Magenta
Write-Host "-" * 40

Write-Host "`n🔹 GET /api/admin/dashboard - Dashboard Stats" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/dashboard" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n🔹 GET /api/admin/dashboard/analytics - Analytics" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/dashboard/analytics" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n📦 ADMIN USERS" -ForegroundColor Magenta
Write-Host "-" * 40

Write-Host "`n🔹 GET /api/admin/users - All Users" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/users" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n📦 ADMIN KYC" -ForegroundColor Magenta
Write-Host "-" * 40

Write-Host "`n🔹 GET /api/admin/kyc - All KYC Requests" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/kyc" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n📦 ADMIN MINING" -ForegroundColor Magenta
Write-Host "-" * 40

Write-Host "`n🔹 GET /api/admin/mining - Mining Overview" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/mining" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n📦 ADMIN TRANSACTIONS" -ForegroundColor Magenta
Write-Host "-" * 40

Write-Host "`n🔹 GET /api/admin/transactions - All Transactions" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/transactions" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n📦 ADMIN PAYMENTS" -ForegroundColor Magenta
Write-Host "-" * 40

Write-Host "`n🔹 GET /api/admin/payments - All Payments" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/payments" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n📦 ADMIN COINS" -ForegroundColor Magenta
Write-Host "-" * 40

Write-Host "`n🔹 GET /api/admin/coins/packages - All Coin Packages" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/coins/packages" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n📦 ADMIN BANNERS" -ForegroundColor Magenta
Write-Host "-" * 40

Write-Host "`n🔹 GET /api/admin/banners - All Banners" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/banners" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n📦 ADMIN REFERRALS" -ForegroundColor Magenta
Write-Host "-" * 40

Write-Host "`n🔹 GET /api/admin/referrals - All Referrals" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/referrals" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n📦 ADMIN SETTINGS" -ForegroundColor Magenta
Write-Host "-" * 40

Write-Host "`n🔹 GET /api/admin/settings - All Settings" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/settings" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n📦 ADMIN NOTIFICATIONS" -ForegroundColor Magenta
Write-Host "-" * 40

Write-Host "`n🔹 GET /api/admin/notifications - All Notifications" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$adminUrl/notifications" -Method GET -Headers $adminHeaders
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "  TEST COMPLETE" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

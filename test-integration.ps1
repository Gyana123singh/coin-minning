# Mining App - FULL INTEGRATION TEST
# Tests coordinated flow between User and Admin APIs

$baseUrl = "http://localhost:5000/api"
$testResults = @()
$testPhone = "+919876543210"
$testEmail = "testuser@example.com"
$testPassword = "Test@123456"
$userToken = $null
$adminToken = $null
$userId = $null
$kycId = $null
$transactionId = $null

function Log-Test {
    param(
        [string]$TestName,
        [string]$Status,
        [string]$Details = ""
    )
    
    $icon = if ($Status -eq "PASS") { "✅" } elseif ($Status -eq "FAIL") { "❌" } else { "⏭️" }
    Write-Host "$icon $TestName" -ForegroundColor $(if ($Status -eq "PASS") { "Green" } elseif ($Status -eq "FAIL") { "Red" } else { "Yellow" })
    if ($Details) {
        Write-Host "   $Details" -ForegroundColor Gray
    }
    
    $script:testResults += @{
        Name = $TestName
        Status = $Status
        Details = $Details
    }
}

function API-Call {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [switch]$ExpectError
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
        if ($ExpectError) {
            return @{ Success = $false; Error = $_.Exception.Message; Expected = $true }
        }
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

Write-Host @"
╔══════════════════════════════════════════════════════════════════════╗
║     MINING APP - FULL INTEGRATION TEST (User + Admin Coordination)   ║
╚══════════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Magenta

# ═══════════════════════════════════════════════════════════════
# STEP 1: ADMIN LOGIN
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 1: ADMIN LOGIN" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$adminLogin = API-Call -Url "$baseUrl/admin/auth/login" -Method POST -Body @{
    email = "admin@mining.com"
    password = "admin123456"
}

if ($adminLogin.Success) {
    $adminToken = $adminLogin.Data.token
    $adminHeaders = @{ Authorization = "Bearer $adminToken" }
    Log-Test "Admin Login" "PASS" "Token: $($adminToken.Substring(0,30))..."
} else {
    Log-Test "Admin Login" "FAIL" $adminLogin.Error
    Write-Host "`n❌ Cannot proceed without admin login. Exiting." -ForegroundColor Red
    exit 1
}

# ═══════════════════════════════════════════════════════════════
# STEP 2: CHECK INITIAL STATE (Before User Creation)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 2: CHECK INITIAL STATE (Admin Dashboard)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$initialStats = API-Call -Url "$baseUrl/admin/dashboard/stats" -Headers $adminHeaders
if ($initialStats.Success) {
    $initialUserCount = $initialStats.Data.stats.users.total
    Log-Test "Get Initial User Count" "PASS" "Total users: $initialUserCount"
} else {
    Log-Test "Get Initial User Count" "FAIL" $initialStats.Error
}

$initialKYC = API-Call -Url "$baseUrl/admin/kyc/stats" -Headers $adminHeaders
if ($initialKYC.Success) {
    $initialPendingKYC = $initialKYC.Data.stats.pending
    Log-Test "Get Initial KYC Count" "PASS" "Pending KYC: $initialPendingKYC"
} else {
    Log-Test "Get Initial KYC Count" "FAIL" $initialKYC.Error
}

# ═══════════════════════════════════════════════════════════════
# STEP 3: CREATE TEST USER DIRECTLY IN DB (Simulating signup)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 3: USER SIGNUP SIMULATION" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Since we can't do real OTP, let's check if we can create user via admin
# First check admin can see users list
$usersList = API-Call -Url "$baseUrl/admin/users" -Headers $adminHeaders
if ($usersList.Success) {
    Log-Test "Admin Get Users List" "PASS" "Found $($usersList.Data.pagination.total) users"
    
    # Check if test user already exists
    $existingUser = $usersList.Data.users | Where-Object { $_.phone -eq $testPhone -or $_.email -eq $testEmail }
    if ($existingUser) {
        $userId = $existingUser._id
        Log-Test "Test User Exists" "PASS" "User ID: $userId"
    } else {
        Log-Test "Test User Not Found" "SKIP" "Need to create via signup flow"
    }
} else {
    Log-Test "Admin Get Users List" "FAIL" $usersList.Error
}

# ═══════════════════════════════════════════════════════════════
# STEP 4: TEST ADMIN ADD COINS TO USER (If user exists)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 4: ADMIN COIN MANAGEMENT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($userId) {
    # Get user's current balance
    $userDetails = API-Call -Url "$baseUrl/admin/users/$userId" -Headers $adminHeaders
    if ($userDetails.Success) {
        $initialBalance = $userDetails.Data.user.wallet.balance
        Log-Test "Get User Initial Balance" "PASS" "Balance: $initialBalance coins"
        
        # Admin adds 500 coins
        $addCoins = API-Call -Url "$baseUrl/admin/users/$userId/add-coins" -Method POST -Headers $adminHeaders -Body @{
            amount = 500
            reason = "Integration test bonus"
        }
        
        if ($addCoins.Success) {
            Log-Test "Admin Add 500 Coins" "PASS" "Coins added successfully"
            
            # Verify balance increased
            $userAfterAdd = API-Call -Url "$baseUrl/admin/users/$userId" -Headers $adminHeaders
            if ($userAfterAdd.Success) {
                $newBalance = $userAfterAdd.Data.user.wallet.balance
                if ($newBalance -eq ($initialBalance + 500)) {
                    Log-Test "Verify Balance Increased" "PASS" "Balance: $initialBalance → $newBalance (+500)"
                } else {
                    Log-Test "Verify Balance Increased" "FAIL" "Expected $($initialBalance + 500), got $newBalance"
                }
            }
            
            # Admin deducts 200 coins
            $deductCoins = API-Call -Url "$baseUrl/admin/users/$userId/deduct-coins" -Method POST -Headers $adminHeaders -Body @{
                amount = 200
                reason = "Integration test deduction"
            }
            
            if ($deductCoins.Success) {
                Log-Test "Admin Deduct 200 Coins" "PASS" "Coins deducted successfully"
                
                # Verify balance decreased
                $userAfterDeduct = API-Call -Url "$baseUrl/admin/users/$userId" -Headers $adminHeaders
                if ($userAfterDeduct.Success) {
                    $finalBalance = $userAfterDeduct.Data.user.wallet.balance
                    $expectedBalance = $initialBalance + 500 - 200
                    if ($finalBalance -eq $expectedBalance) {
                        Log-Test "Verify Balance After Deduction" "PASS" "Balance: $expectedBalance (Initial + 500 - 200)"
                    } else {
                        Log-Test "Verify Balance After Deduction" "FAIL" "Expected $expectedBalance, got $finalBalance"
                    }
                }
            } else {
                Log-Test "Admin Deduct 200 Coins" "FAIL" $deductCoins.Error
            }
        } else {
            Log-Test "Admin Add 500 Coins" "FAIL" $addCoins.Error
        }
    } else {
        Log-Test "Get User Initial Balance" "FAIL" $userDetails.Error
    }
} else {
    Log-Test "Coin Management Tests" "SKIP" "No test user available"
}

# ═══════════════════════════════════════════════════════════════
# STEP 5: TEST ADMIN BAN/UNBAN USER
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 5: ADMIN BAN/UNBAN USER" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($userId) {
    # Ban user
    $banUser = API-Call -Url "$baseUrl/admin/users/$userId/ban" -Method PUT -Headers $adminHeaders -Body @{
        reason = "Integration test ban"
    }
    
    if ($banUser.Success) {
        Log-Test "Admin Ban User" "PASS" "User banned"
        
        # Verify user is banned
        $bannedUser = API-Call -Url "$baseUrl/admin/users/$userId" -Headers $adminHeaders
        if ($bannedUser.Success -and $bannedUser.Data.user.status -eq "suspended") {
            Log-Test "Verify User Banned" "PASS" "Status: suspended"
        } else {
            Log-Test "Verify User Banned" "FAIL" "Status not suspended"
        }
        
        # Unban user
        $unbanUser = API-Call -Url "$baseUrl/admin/users/$userId/unban" -Method PUT -Headers $adminHeaders
        
        if ($unbanUser.Success) {
            Log-Test "Admin Unban User" "PASS" "User unbanned"
            
            # Verify user is unbanned
            $unbannedUser = API-Call -Url "$baseUrl/admin/users/$userId" -Headers $adminHeaders
            if ($unbannedUser.Success -and $unbannedUser.Data.user.status -eq "active") {
                Log-Test "Verify User Unbanned" "PASS" "Status: active"
            } else {
                Log-Test "Verify User Unbanned" "FAIL" "Status not active"
            }
        } else {
            Log-Test "Admin Unban User" "FAIL" $unbanUser.Error
        }
    } else {
        Log-Test "Admin Ban User" "FAIL" $banUser.Error
    }
} else {
    Log-Test "Ban/Unban Tests" "SKIP" "No test user available"
}

# ═══════════════════════════════════════════════════════════════
# STEP 6: TEST KYC FLOW
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 6: KYC MANAGEMENT FLOW" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Get pending KYC requests
$pendingKYC = API-Call -Url "$baseUrl/admin/kyc?status=pending" -Headers $adminHeaders
if ($pendingKYC.Success) {
    $pendingCount = $pendingKYC.Data.pagination.total
    Log-Test "Get Pending KYC Requests" "PASS" "Found $pendingCount pending"
    
    if ($pendingKYC.Data.kycRequests.Count -gt 0) {
        $testKYC = $pendingKYC.Data.kycRequests[0]
        $kycId = $testKYC._id
        $kycUserId = $testKYC.user._id
        Log-Test "Found KYC to Test" "PASS" "KYC ID: $kycId"
        
        # Get KYC details
        $kycDetails = API-Call -Url "$baseUrl/admin/kyc/$kycId" -Headers $adminHeaders
        if ($kycDetails.Success) {
            Log-Test "Get KYC Details" "PASS" "Document: $($kycDetails.Data.kyc.documentType)"
        }
        
        # Approve KYC
        $approveKYC = API-Call -Url "$baseUrl/admin/kyc/$kycId/approve" -Method PUT -Headers $adminHeaders -Body @{
            verifiedBy = "admin@mining.com"
        }
        
        if ($approveKYC.Success) {
            Log-Test "Admin Approve KYC" "PASS" "KYC approved"
            
            # Verify user's KYC status changed
            $userAfterKYC = API-Call -Url "$baseUrl/admin/users/$kycUserId" -Headers $adminHeaders
            if ($userAfterKYC.Success -and $userAfterKYC.Data.user.kycStatus -eq "verified") {
                Log-Test "Verify User KYC Status" "PASS" "KYC Status: verified"
            } else {
                Log-Test "Verify User KYC Status" "FAIL" "KYC status not updated"
            }
        } else {
            Log-Test "Admin Approve KYC" "FAIL" $approveKYC.Error
        }
    } else {
        Log-Test "KYC Approval Test" "SKIP" "No pending KYC requests"
    }
} else {
    Log-Test "Get Pending KYC Requests" "FAIL" $pendingKYC.Error
}

# ═══════════════════════════════════════════════════════════════
# STEP 7: TEST MINING SESSION MONITORING
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 7: MINING SESSION MONITORING" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$miningSessions = API-Call -Url "$baseUrl/admin/mining/sessions" -Headers $adminHeaders
if ($miningSessions.Success) {
    Log-Test "Get All Mining Sessions" "PASS" "Found $($miningSessions.Data.pagination.total) sessions"
}

$miningStats = API-Call -Url "$baseUrl/admin/mining/stats" -Headers $adminHeaders
if ($miningStats.Success) {
    Log-Test "Get Mining Stats" "PASS" "Active: $($miningStats.Data.stats.activeSessions), Total Mined: $($miningStats.Data.stats.totalMinedCoins)"
}

$activeMiners = API-Call -Url "$baseUrl/admin/mining/active" -Headers $adminHeaders
if ($activeMiners.Success) {
    Log-Test "Get Active Miners" "PASS" "Active miners: $($activeMiners.Data.count)"
}

$miningLeaderboard = API-Call -Url "$baseUrl/admin/mining/leaderboard" -Headers $adminHeaders
if ($miningLeaderboard.Success) {
    Log-Test "Get Mining Leaderboard" "PASS" "Leaderboard fetched"
}

# ═══════════════════════════════════════════════════════════════
# STEP 8: TEST TRANSACTION/WITHDRAWAL FLOW
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 8: TRANSACTION/WITHDRAWAL MANAGEMENT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$transactions = API-Call -Url "$baseUrl/admin/transactions" -Headers $adminHeaders
if ($transactions.Success) {
    Log-Test "Get All Transactions" "PASS" "Found $($transactions.Data.pagination.total) transactions"
}

$transactionStats = API-Call -Url "$baseUrl/admin/transactions/stats" -Headers $adminHeaders
if ($transactionStats.Success) {
    Log-Test "Get Transaction Stats" "PASS" "Total: $($transactionStats.Data.stats.total)"
}

$pendingWithdrawals = API-Call -Url "$baseUrl/admin/transactions/withdrawals/pending" -Headers $adminHeaders
if ($pendingWithdrawals.Success) {
    $pendingCount = $pendingWithdrawals.Data.withdrawals.Count
    Log-Test "Get Pending Withdrawals" "PASS" "Found $pendingCount pending"
    
    if ($pendingCount -gt 0) {
        $testWithdrawal = $pendingWithdrawals.Data.withdrawals[0]
        $withdrawalId = $testWithdrawal._id
        
        # Approve withdrawal
        $approveWithdrawal = API-Call -Url "$baseUrl/admin/transactions/withdrawals/$withdrawalId/approve" -Method PUT -Headers $adminHeaders -Body @{
            txHash = "TEST_TX_HASH_123"
        }
        
        if ($approveWithdrawal.Success) {
            Log-Test "Admin Approve Withdrawal" "PASS" "Withdrawal approved"
        } else {
            Log-Test "Admin Approve Withdrawal" "FAIL" $approveWithdrawal.Error
        }
    } else {
        Log-Test "Withdrawal Approval Test" "SKIP" "No pending withdrawals"
    }
} else {
    Log-Test "Get Pending Withdrawals" "FAIL" $pendingWithdrawals.Error
}

# ═══════════════════════════════════════════════════════════════
# STEP 9: TEST PAYMENT PROOF FLOW
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 9: PAYMENT PROOF MANAGEMENT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$paymentProofs = API-Call -Url "$baseUrl/admin/payments" -Headers $adminHeaders
if ($paymentProofs.Success) {
    Log-Test "Get All Payment Proofs" "PASS" "Found $($paymentProofs.Data.pagination.total) proofs"
    
    if ($paymentProofs.Data.paymentProofs.Count -gt 0) {
        $testPayment = $paymentProofs.Data.paymentProofs | Where-Object { $_.status -eq "pending" } | Select-Object -First 1
        if ($testPayment) {
            $paymentId = $testPayment._id
            $paymentUserId = $testPayment.user._id
            $paymentAmount = $testPayment.amount
            
            # Get user balance before approval
            $userBeforePayment = API-Call -Url "$baseUrl/admin/users/$paymentUserId" -Headers $adminHeaders
            $balanceBefore = $userBeforePayment.Data.user.wallet.balance
            
            # Approve payment
            $approvePayment = API-Call -Url "$baseUrl/admin/payments/$paymentId/approve" -Method PUT -Headers $adminHeaders
            
            if ($approvePayment.Success) {
                Log-Test "Admin Approve Payment" "PASS" "Payment approved"
                
                # Verify user balance increased
                $userAfterPayment = API-Call -Url "$baseUrl/admin/users/$paymentUserId" -Headers $adminHeaders
                $balanceAfter = $userAfterPayment.Data.user.wallet.balance
                
                if ($balanceAfter -gt $balanceBefore) {
                    Log-Test "Verify User Balance After Payment" "PASS" "Balance: $balanceBefore → $balanceAfter"
                } else {
                    Log-Test "Verify User Balance After Payment" "FAIL" "Balance didn't increase"
                }
            } else {
                Log-Test "Admin Approve Payment" "FAIL" $approvePayment.Error
            }
        } else {
            Log-Test "Payment Approval Test" "SKIP" "No pending payments"
        }
    }
} else {
    Log-Test "Get All Payment Proofs" "FAIL" $paymentProofs.Error
}

$paymentStats = API-Call -Url "$baseUrl/admin/payments/stats" -Headers $adminHeaders
if ($paymentStats.Success) {
    Log-Test "Get Payment Stats" "PASS" "Total: $($paymentStats.Data.stats.total)"
}

# ═══════════════════════════════════════════════════════════════
# STEP 10: TEST BANNER MANAGEMENT
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 10: BANNER MANAGEMENT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Create banner (use 'image' not 'imageUrl')
$createBanner = API-Call -Url "$baseUrl/admin/banners" -Method POST -Headers $adminHeaders -Body @{
    title = "Test Banner"
    description = "Integration test banner"
    image = "https://example.com/banner.jpg"
    link = "https://example.com"
    status = "active"
    order = 1
}

if ($createBanner.Success) {
    $bannerId = $createBanner.Data.banner._id
    Log-Test "Create Banner" "PASS" "Banner ID: $bannerId"
    
    # Verify banner in list
    $bannerList = API-Call -Url "$baseUrl/admin/banners" -Headers $adminHeaders
    if ($bannerList.Success) {
        $foundBanner = $bannerList.Data.banners | Where-Object { $_._id -eq $bannerId }
        if ($foundBanner) {
            Log-Test "Verify Banner Created" "PASS" "Banner found in list"
        }
    }
    
    # Toggle banner status
    $toggleBanner = API-Call -Url "$baseUrl/admin/banners/$bannerId/toggle" -Method PUT -Headers $adminHeaders
    if ($toggleBanner.Success) {
        Log-Test "Toggle Banner Status" "PASS" "Status toggled"
    }
    
    # Delete banner
    $deleteBanner = API-Call -Url "$baseUrl/admin/banners/$bannerId" -Method DELETE -Headers $adminHeaders
    if ($deleteBanner.Success) {
        Log-Test "Delete Banner" "PASS" "Banner deleted"
        
        # Verify deletion
        $bannerListAfter = API-Call -Url "$baseUrl/admin/banners" -Headers $adminHeaders
        $deletedBanner = $bannerListAfter.Data.banners | Where-Object { $_._id -eq $bannerId }
        if (-not $deletedBanner) {
            Log-Test "Verify Banner Deleted" "PASS" "Banner not in list"
        }
    }
} else {
    Log-Test "Create Banner" "FAIL" $createBanner.Error
}

# ═══════════════════════════════════════════════════════════════
# STEP 11: TEST COIN PACKAGE MANAGEMENT
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 11: COIN PACKAGE MANAGEMENT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Create coin package
$createPackage = API-Call -Url "$baseUrl/admin/coins" -Method POST -Headers $adminHeaders -Body @{
    name = "Test Package"
    coins = 1000
    price = 99
    bonus = 100
    isPopular = $false
    isActive = $true
}

if ($createPackage.Success) {
    $packageId = $createPackage.Data.package._id
    Log-Test "Create Coin Package" "PASS" "Package ID: $packageId"
    
    # Verify in public API
    $publicPackages = API-Call -Url "$baseUrl/coins/packages"
    if ($publicPackages.Success) {
        $foundPackage = $publicPackages.Data.packages | Where-Object { $_._id -eq $packageId }
        if ($foundPackage) {
            Log-Test "Verify Package in Public API" "PASS" "Package visible to users"
        }
    }
    
    # Update package
    $updatePackage = API-Call -Url "$baseUrl/admin/coins/$packageId" -Method PUT -Headers $adminHeaders -Body @{
        name = "Test Package Updated"
        price = 89
    }
    if ($updatePackage.Success) {
        Log-Test "Update Coin Package" "PASS" "Package updated"
    }
    
    # Toggle status
    $togglePackage = API-Call -Url "$baseUrl/admin/coins/$packageId/toggle" -Method PUT -Headers $adminHeaders
    if ($togglePackage.Success) {
        Log-Test "Toggle Package Status" "PASS" "Status toggled"
    }
    
    # Delete package
    $deletePackage = API-Call -Url "$baseUrl/admin/coins/$packageId" -Method DELETE -Headers $adminHeaders
    if ($deletePackage.Success) {
        Log-Test "Delete Coin Package" "PASS" "Package deleted"
    }
} else {
    Log-Test "Create Coin Package" "FAIL" $createPackage.Error
}

# ═══════════════════════════════════════════════════════════════
# STEP 12: TEST NOTIFICATION SYSTEM
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 12: NOTIFICATION SYSTEM" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($userId) {
    # Send notification to specific user
    $sendNotification = API-Call -Url "$baseUrl/admin/notifications" -Method POST -Headers $adminHeaders -Body @{
        userId = $userId
        title = "Test Notification"
        message = "This is an integration test notification"
        type = "info"
    }
    
    if ($sendNotification.Success) {
        Log-Test "Send Notification to User" "PASS" "Notification sent"
    } else {
        Log-Test "Send Notification to User" "FAIL" $sendNotification.Error
    }
}

# Send bulk notification (skip if no users exist)
$userCount = (API-Call -Url "$baseUrl/admin/users" -Headers $adminHeaders).Data.pagination.total
if ($userCount -gt 0) {
    $bulkNotification = API-Call -Url "$baseUrl/admin/notifications/bulk" -Method POST -Headers $adminHeaders -Body @{
        title = "Test Bulk Notification"
        message = "This is a bulk notification test"
        type = "info"
    }

    if ($bulkNotification.Success) {
        Log-Test "Send Bulk Notification" "PASS" "Bulk notification sent to $userCount users"
    } else {
        Log-Test "Send Bulk Notification" "FAIL" $bulkNotification.Error
    }
} else {
    Log-Test "Send Bulk Notification" "SKIP" "No users in database to send notifications"
}

$notificationStats = API-Call -Url "$baseUrl/admin/notifications/stats" -Headers $adminHeaders
if ($notificationStats.Success) {
    Log-Test "Get Notification Stats" "PASS" "Total: $($notificationStats.Data.stats.total)"
}

# ═══════════════════════════════════════════════════════════════
# STEP 13: TEST REFERRAL SYSTEM
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 13: REFERRAL SYSTEM" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$referrals = API-Call -Url "$baseUrl/admin/referrals" -Headers $adminHeaders
if ($referrals.Success) {
    Log-Test "Get All Referrals" "PASS" "Found $($referrals.Data.pagination.total) referrals"
}

$referralStats = API-Call -Url "$baseUrl/admin/referrals/stats" -Headers $adminHeaders
if ($referralStats.Success) {
    Log-Test "Get Referral Stats" "PASS" "Total: $($referralStats.Data.stats.total)"
}

$referralSettings = API-Call -Url "$baseUrl/admin/referrals/settings" -Headers $adminHeaders
if ($referralSettings.Success) {
    Log-Test "Get Referral Settings" "PASS" "Direct Bonus: $($referralSettings.Data.settings.directReferralBonus)"
    
    # Update referral settings
    $updateReferralSettings = API-Call -Url "$baseUrl/admin/referrals/settings" -Method PUT -Headers $adminHeaders -Body @{
        directReferralBonus = 60
        indirectReferralBonus = 25
    }
    
    if ($updateReferralSettings.Success) {
        Log-Test "Update Referral Settings" "PASS" "Settings updated"
        
        # Verify update in public settings
        $publicSettings = API-Call -Url "$baseUrl/settings"
        if ($publicSettings.Data.settings.directReferralBonus -eq 60) {
            Log-Test "Verify Referral Settings Public" "PASS" "Public settings updated"
        }
        
        # Revert settings
        API-Call -Url "$baseUrl/admin/referrals/settings" -Method PUT -Headers $adminHeaders -Body @{
            directReferralBonus = 50
            indirectReferralBonus = 20
        } | Out-Null
    }
}

# ═══════════════════════════════════════════════════════════════
# STEP 14: TEST SETTINGS MANAGEMENT
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 14: SETTINGS MANAGEMENT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$adminSettings = API-Call -Url "$baseUrl/admin/settings" -Headers $adminHeaders
if ($adminSettings.Success) {
    Log-Test "Get Admin Settings" "PASS" "App: $($adminSettings.Data.settings.appName)"
}

# Update social links
$updateSocial = API-Call -Url "$baseUrl/admin/settings/social" -Method PUT -Headers $adminHeaders -Body @{
    twitter = "https://twitter.com/testmining"
    telegram = "https://t.me/testmining"
}

if ($updateSocial.Success) {
    Log-Test "Update Social Links" "PASS" "Social links updated"
    
    # Verify in public API
    $publicSocial = API-Call -Url "$baseUrl/settings/social"
    if ($publicSocial.Data.socialLinks.twitter -eq "https://twitter.com/testmining") {
        Log-Test "Verify Social Links Public" "PASS" "Public API reflects changes"
    }
    
    # Revert
    API-Call -Url "$baseUrl/admin/settings/social" -Method PUT -Headers $adminHeaders -Body @{
        twitter = "https://twitter.com/miningapp"
        telegram = "https://t.me/miningapp"
    } | Out-Null
}

# Test mining settings
$miningSettings = API-Call -Url "$baseUrl/admin/mining/settings" -Headers $adminHeaders
if ($miningSettings.Success) {
    Log-Test "Get Mining Settings" "PASS" "Rate: $($miningSettings.Data.settings.miningRate)"
    
    # Update mining settings
    $updateMining = API-Call -Url "$baseUrl/admin/mining/settings" -Method PUT -Headers $adminHeaders -Body @{
        miningRate = 0.30
    }
    
    if ($updateMining.Success) {
        Log-Test "Update Mining Settings" "PASS" "Mining rate updated"
        
        # Revert
        API-Call -Url "$baseUrl/admin/mining/settings" -Method PUT -Headers $adminHeaders -Body @{
            miningRate = 0.25
        } | Out-Null
    }
}

# ═══════════════════════════════════════════════════════════════
# STEP 15: TEST ADMIN MANAGEMENT (Super Admin Only)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 15: ADMIN MANAGEMENT (Super Admin)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Get all admins
$admins = API-Call -Url "$baseUrl/admin/auth/admins" -Headers $adminHeaders
if ($admins.Success) {
    Log-Test "Get All Admins" "PASS" "Found $($admins.Data.count) admins"
}

# Create new admin
$createAdmin = API-Call -Url "$baseUrl/admin/auth/admins" -Method POST -Headers $adminHeaders -Body @{
    name = "Test Admin"
    email = "testadmin@mining.com"
    password = "TestAdmin@123"
    role = "admin"
}

if ($createAdmin.Success) {
    $newAdminId = $createAdmin.Data.admin.id
    Log-Test "Create New Admin" "PASS" "Admin ID: $newAdminId"
    
    # Verify new admin can login
    $newAdminLogin = API-Call -Url "$baseUrl/admin/auth/login" -Method POST -Body @{
        email = "testadmin@mining.com"
        password = "TestAdmin@123"
    }
    
    if ($newAdminLogin.Success) {
        Log-Test "New Admin Login" "PASS" "New admin can login"
    }
    
    # Delete the test admin
    $deleteAdmin = API-Call -Url "$baseUrl/admin/auth/admins/$newAdminId" -Method DELETE -Headers $adminHeaders
    if ($deleteAdmin.Success) {
        Log-Test "Delete Test Admin" "PASS" "Admin deleted"
    }
} else {
    Log-Test "Create New Admin" "FAIL" $createAdmin.Error
}

# ═══════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════
Write-Host "`n"
Write-Host "╔══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                    INTEGRATION TEST SUMMARY                          ║" -ForegroundColor Magenta
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

$successRate = if ($total -gt 0) { [math]::Round((($passed) / ($total - $skipped)) * 100, 2) } else { 0 }
Write-Host "`n   Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 50) { "Yellow" } else { "Red" })

if ($failed -gt 0) {
    Write-Host "`n❌ Failed Tests:" -ForegroundColor Red
    $testResults | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "   • $($_.Name): $($_.Details)" -ForegroundColor Red
    }
}

if ($skipped -gt 0) {
    Write-Host "`n⏭️ Skipped Tests:" -ForegroundColor Yellow
    $testResults | Where-Object { $_.Status -eq "SKIP" } | ForEach-Object {
        Write-Host "   • $($_.Name): $($_.Details)" -ForegroundColor Yellow
    }
}

Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "Integration test completed!" -ForegroundColor Green

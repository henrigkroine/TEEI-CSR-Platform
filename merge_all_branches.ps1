# Merge all unmerged branches into main

$unmergedBranches = @(
    "origin/claude/cockpit-ga-plus-phase-h3-013VNEKh23bgNrB5JqzrttyQ",
    "origin/claude/cockpit-ga-plus-phase-h3-01L3aeNnzMnE4UBTwbp9tJXq",
    "origin/claude/cockpit-ga-sharing-admin-analytics-0161GFYXKUCDABbVHUtKGGUC",
    "origin/claude/ga-cutover-multi-region-013YpMsrt4BSZvu89BSKN7Dy",
    "origin/claude/ga-cutover-phase-one-0111mH9eWczXzBtpzUU5uUVU",
    "origin/claude/ga-launch-canary-finops-chaos-01N5xjrDMnMT2Kq3tE2VKEGW",
    "origin/claude/ops-compliance-automation-01Dqomf7mW9xwrR6JS527Go3",
    "origin/claude/phase-f-boardroom-pptx-a11y-01GvaGy8W3FGnuPTTgeRH8vx",
    "origin/claude/phase-f-prod-pilot-sre-01N5KShxwW4m8hNkqEJpi8x2",
    "origin/claude/phase-h-insights-copilot-012me24fbJii4g9ZYghyZAKB",
    "origin/claude/phaseG-global-ga-multiregion-017uvLqAucExNFGykX9bSDSY",
    "origin/claude/worker2-phaseG-insights-selfserve-013ktPEUSZdeh7Gqn7vFSXtY",
    "origin/claude/worker2-phaseG-nlq-builder-hil-013afuWXrNQq3R3P2SRcTM9M",
    "origin/claude/worker2-phaseG2-insights-ga-01FXrGnKtHgmcZG2d8jpPRMf",
    "origin/claude/worker3-phaseE-cockpit-polish-01DEt2S7UMEooTBJBivWKcpD",
    "origin/claude/worker3-phaseH2-scheduler-admin-usage-aaa-0157u7VEQjoVVhqTBgYcuumh",
    "origin/claude/worker4-phaseH2-ops-compliance-ga-01FHPfBXYdxVH4ACRF24PzuS"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Merging $($unmergedBranches.Count) branches into main" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$conflictCount = 0
$failedBranches = @()

foreach ($branch in $unmergedBranches) {
    Write-Host "[$($successCount + $conflictCount + 1)/$($unmergedBranches.Count)] Merging: $branch" -ForegroundColor Yellow

    # Attempt merge with no-edit (use default merge message)
    git merge --no-edit $branch 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Merged successfully" -ForegroundColor Green
        $successCount++
    } else {
        # Check if there are conflicts
        $status = git status --porcelain
        if ($status -match "^(UU|AA|DD)") {
            Write-Host "  ⚠ Conflicts detected - keeping conflict markers" -ForegroundColor Red

            # Add all files (including those with conflicts)
            git add -A 2>&1 | Out-Null

            # Complete the merge with conflicts preserved
            git commit --no-edit -m "Merge $branch (with conflicts)" 2>&1 | Out-Null

            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Merged with conflict markers preserved" -ForegroundColor Yellow
                $conflictCount++
            } else {
                Write-Host "  ✗ Failed to complete merge" -ForegroundColor Red
                $failedBranches += $branch
                git merge --abort 2>&1 | Out-Null
            }
        } else {
            Write-Host "  ✗ Merge failed" -ForegroundColor Red
            $failedBranches += $branch
            git merge --abort 2>&1 | Out-Null
        }
    }
    Write-Host ""
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "MERGE SUMMARY" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Successfully merged (clean): $successCount" -ForegroundColor Green
Write-Host "Merged with conflicts:       $conflictCount" -ForegroundColor Yellow
Write-Host "Failed to merge:             $($failedBranches.Count)" -ForegroundColor Red
Write-Host ""

if ($failedBranches.Count -gt 0) {
    Write-Host "Failed branches:" -ForegroundColor Red
    foreach ($branch in $failedBranches) {
        Write-Host "  - $branch" -ForegroundColor Gray
    }
}

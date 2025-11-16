# Analyze all GitHub remote branches for unmerged content

Write-Host "Analyzing all GitHub remote branches for TEEI CSR Platform..." -ForegroundColor Cyan
Write-Host ""

$mainCommit = git rev-parse main
$branches = git branch -r | Where-Object { $_ -notmatch "HEAD" -and $_ -notmatch "origin/main" }

$unmergedBranches = @()

foreach ($branch in $branches) {
    $branch = $branch.Trim()
    $branchCommit = git rev-parse $branch 2>$null

    # Check if this branch commit is an ancestor of main
    $isAncestor = git merge-base --is-ancestor $branchCommit $mainCommit 2>$null

    if ($LASTEXITCODE -ne 0) {
        # Branch is NOT an ancestor of main - has unique content
        Write-Host "Branch NOT fully merged: $branch" -ForegroundColor Red

        # Count unique commits
        $commitCount = (git log main..$branch --oneline 2>$null | Measure-Object).Count
        Write-Host "  Unique commits: $commitCount" -ForegroundColor Yellow

        # Show last 3 commits
        Write-Host "  Recent commits:" -ForegroundColor Yellow
        git log main..$branch --oneline -3 2>$null | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
        Write-Host ""

        $unmergedBranches += @{Branch=$branch; Commits=$commitCount}
    }
}

if ($unmergedBranches.Count -eq 0) {
    Write-Host "All remote branches are fully merged into main!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Yellow
    Write-Host "SUMMARY: $($unmergedBranches.Count) branches have unmerged content" -ForegroundColor Yellow
    Write-Host "=========================================" -ForegroundColor Yellow

    $totalCommits = ($unmergedBranches | ForEach-Object { $_.Commits } | Measure-Object -Sum).Sum
    Write-Host "Total unmerged commits across all branches: $totalCommits" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Unmerged branches:" -ForegroundColor Yellow
    foreach ($item in $unmergedBranches) {
        Write-Host "  - $($item.Branch) ($($item.Commits) commits)" -ForegroundColor Gray
    }
}

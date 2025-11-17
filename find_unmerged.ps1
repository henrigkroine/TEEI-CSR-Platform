# Find all unmerged remote branches

Write-Host "Checking all remote branches for unmerged content..." -ForegroundColor Cyan
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
        $commitCount = (git log main..$branch --oneline 2>$null | Measure-Object).Count

        if ($commitCount -gt 0) {
            Write-Host "UNMERGED: $branch ($commitCount commits)" -ForegroundColor Red
            $unmergedBranches += @{Branch=$branch; Commits=$commitCount}
        }
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Yellow
if ($unmergedBranches.Count -eq 0) {
    Write-Host "All remote branches are merged!" -ForegroundColor Green
} else {
    Write-Host "Found $($unmergedBranches.Count) unmerged branches" -ForegroundColor Yellow
    $totalCommits = ($unmergedBranches | ForEach-Object { $_.Commits } | Measure-Object -Sum).Sum
    Write-Host "Total unmerged commits: $totalCommits" -ForegroundColor Cyan
    Write-Host ""
    foreach ($item in $unmergedBranches) {
        Write-Host "  - $($item.Branch)" -ForegroundColor Gray
    }
}
Write-Host "=========================================" -ForegroundColor Yellow

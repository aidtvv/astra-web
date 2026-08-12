# ============================================================
# Astra Deploy to GitHub Pages (gh-pages branch)
# Usage:
#   Option 1 (recommended): Right-click deploy.bat -> Run
#   Option 2: powershell -ExecutionPolicy Bypass -File deploy.ps1 "update msg"
# Menu:
#   [1] Full deploy   Build + push source to main + push gh-pages
#   [2] Web only      Build current + push gh-pages only (no source commit)
# Token: env GH_TOKEN, or D:\CheckBox\kebiaochuli\.deploy_token
# ============================================================
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$OutputEncoding = [System.Text.Encoding]::UTF8

Set-Location $PSScriptRoot

$REPO  = 'aidtvv/astra-web'
$MAIN_BRANCH = 'main'
$GH_BRANCH = 'gh-pages'
$PROXY = 'http://127.0.0.1:7897'
$TOKEN_FILE = 'D:\CheckBox\课表处理\.deploy_token'

function Show-Banner {
    Clear-Host
    Write-Host ''
    Write-Host '  +---------------------------------------------+' -ForegroundColor Cyan
    Write-Host '  |        Astra Deploy to GitHub Pages        |' -ForegroundColor Cyan
    Write-Host '  +---------------------------------------------+' -ForegroundColor Cyan
    Write-Host ''
    Write-Host "  Repo   : $REPO" -ForegroundColor Gray
    Write-Host '  URL    : https://aidtvv.github.io/astra-web/' -ForegroundColor Gray
    Write-Host ''
}

function Step($title) {
    Write-Host ''
    Write-Host "  -> $title ..." -ForegroundColor Yellow
}

function Ok($msg) {
    Write-Host "  OK $msg" -ForegroundColor Green
}

function Fail($msg) {
    Write-Host "  FAIL $msg" -ForegroundColor Red
}

function Ask-Confirm($prompt, $defaultYes = $true) {
    $suffix = if ($defaultYes) { ' [Y/n]' } else { '[y/N]' }
    $answer = Read-Host "  $prompt $suffix"
    if ([string]::IsNullOrWhiteSpace($answer)) { return $defaultYes }
    return $answer.Trim().ToLower() -match '^(y|yes)$'
}

function Select-Mode {
    Write-Host '  Select operation:' -ForegroundColor White
    Write-Host ''
    Write-Host '    [1] Full deploy   Build + push source to main + push gh-pages' -ForegroundColor Cyan
    Write-Host '    [2] Web only      Build + push gh-pages only (no source commit)' -ForegroundColor Cyan
    Write-Host '    [0] Exit' -ForegroundColor Gray
    Write-Host ''
    $answer = Read-Host '  Enter number'
    switch ($answer.Trim()) {
        '1' { return 'full' }
        '2' { return 'web' }
        '0' { Write-Host '  Exited.' -ForegroundColor Gray; exit 0 }
        default {
            Write-Host '  Invalid input, exited.' -ForegroundColor Red
            exit 1
        }
    }
}

function Invoke-Build {
    Step 'Building client (production)'
    
    $envFile = Join-Path $PSScriptRoot 'client\.env.production'
    if (-not (Test-Path $envFile)) {
        Write-Host '  Warning: .env.production not found, creating default' -ForegroundColor Yellow
        $workerUrl = Read-Host '  Enter Cloudflare Worker URL (e.g. https://astra-api.workers.dev)'
        if ([string]::IsNullOrWhiteSpace($workerUrl)) {
            $workerUrl = 'https://astra-api.workers.dev'
        }
        $envContent = "# Production - GitHub Pages deployment`nVITE_API_BASE=$workerUrl`nVITE_BASE=/astra-web/"
        Set-Content -Path $envFile -Value $envContent -Encoding UTF8
        Ok ".env.production created (Worker URL: $workerUrl)"
    }
    
    Push-Location (Join-Path $PSScriptRoot 'client')
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed (exit $LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
    Ok 'Build complete'
}

function Invoke-PushSource {
    $changes = git status --porcelain
    if ($changes) {
        $msg = $args[0]
        if (-not $msg) { $msg = "Update Astra $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }
        Write-Host ''
        Write-Host "  Commit message: $msg" -ForegroundColor Gray
        if (-not (Ask-Confirm 'Confirm commit and push source to main?')) {
            Write-Host '  Cancelled, script ends.' -ForegroundColor Gray
            exit 0
        }
        git add -A
        git commit -m $msg
        if ($LASTEXITCODE -ne 0) { throw "git commit failed (exit $LASTEXITCODE)" }
        Ok "Source committed: $msg"
    } else {
        Write-Host '  No local changes, skipping commit...' -ForegroundColor Gray
    }

    Step 'Pushing source to main'
    git config http.proxy $PROXY
    git remote set-url origin "https://aidtvv:${token}@github.com/${REPO}.git"
    try {
        git push origin $MAIN_BRANCH
        if ($LASTEXITCODE -ne 0) { throw "git push main failed (exit $LASTEXITCODE)" }
    } finally {
        git remote set-url origin "https://github.com/${REPO}.git"
    }
    Ok 'main pushed'
}

function Invoke-PushGhPages {
    Step 'Pushing gh-pages branch'
    $tmpBranch = "ghpages-deploy-$([guid]::NewGuid().ToString('N').Substring(0,8))"
    $dist = Join-Path $PSScriptRoot 'client\dist'
    $savedHead = git rev-parse HEAD
    try {
        if (-not (Test-Path (Join-Path $dist 'index.html'))) {
            throw 'Build output missing: client/dist/index.html not found'
        }
        Copy-Item (Join-Path $dist 'index.html') (Join-Path $dist '404.html') -Force

        git add -f client/dist
        git commit -m "chore: build artifacts client/dist (deploy)" -- client/dist
        if ($LASTEXITCODE -ne 0) { throw "git commit dist failed (exit $LASTEXITCODE)" }

        git subtree split --prefix client/dist -b $tmpBranch
        if ($LASTEXITCODE -ne 0) { throw "git subtree split failed (exit $LASTEXITCODE)" }

        git config http.proxy $PROXY
        git remote set-url origin "https://aidtvv:${token}@github.com/${REPO}.git"
        try {
            git push --force origin "$tmpBranch`:$GH_BRANCH"
            if ($LASTEXITCODE -ne 0) { throw "git push gh-pages failed (exit $LASTEXITCODE)" }
        } finally {
            git remote set-url origin "https://github.com/${REPO}.git"
        }

        if ((git rev-parse HEAD) -ne $savedHead) {
            git reset --soft $savedHead
            git reset -q HEAD -- client/dist
        }
    } finally {
        git branch -D $tmpBranch 2>$null
    }
    Ok 'gh-pages pushed'
}

try {
    Show-Banner

    $token = $env:GH_TOKEN
    if (-not $token -and (Test-Path $TOKEN_FILE)) {
        $token = (Get-Content $TOKEN_FILE -Raw).Trim()
    }
    if (-not $token) {
        Fail "GitHub token not found: set env GH_TOKEN or write to $TOKEN_FILE"
        throw 'Missing GitHub token'
    }
    Ok 'GitHub token ready'

    $mode = Select-Mode

    Invoke-Build

    if ($mode -eq 'full') {
        Invoke-PushSource $args[0]
        Invoke-PushGhPages
        Write-Host ''
        Write-Host '  =========================================' -ForegroundColor Cyan
        Write-Host '  Full deploy done! Source and web updated.' -ForegroundColor Green
        Write-Host '  URL: https://aidtvv.github.io/astra-web/' -ForegroundColor Green
        Write-Host '  =========================================' -ForegroundColor Cyan
    } else {
        Invoke-PushGhPages
        Write-Host ''
        Write-Host '  =========================================' -ForegroundColor Cyan
        Write-Host '  Web updated! (Source not committed yet)' -ForegroundColor Green
        Write-Host '  URL: https://aidtvv.github.io/astra-web/' -ForegroundColor Green
        Write-Host '  =========================================' -ForegroundColor Cyan
    }

    Write-Host ''
} catch {
    Write-Host ''
    Write-Host '  -------------------------------------------' -ForegroundColor Red
    Write-Host "  Deploy FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host '  -------------------------------------------' -ForegroundColor Red
    Write-Host ''
} finally {
    Read-Host '  Press Enter to exit'
}

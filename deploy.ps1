# ============================================================
# Astra 一键部署到 GitHub Pages（gh-pages 分支方案）
# 用法：
#   方式一（推荐）：右键 deploy.ps1 -> 使用 PowerShell 运行
#   方式二：powershell -ExecutionPolicy Bypass -File deploy.ps1 "更新说明(可选)"
# 流程：1. 构建 client（VITE_BASE=/astra-web/）
#       2. 提交并推送源码到 main
#       3. 把 client/dist 推送到 gh-pages 分支，Pages 托管该分支
# 令牌来源：优先环境变量 $env:GH_TOKEN，否则读取 D:\CheckBox\课表处理\.deploy_token。
# ============================================================
$ErrorActionPreference = 'Stop'
# 控制台输出编码设为 UTF-8，避免 Windows PowerShell 5.1 下中文乱码
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
    Write-Host '  ┌─────────────────────────────────────────────┐' -ForegroundColor Cyan
    Write-Host '  │        Astra 一键部署到 GitHub Pages        │' -ForegroundColor Cyan
    Write-Host '  └─────────────────────────────────────────────┘' -ForegroundColor Cyan
    Write-Host ''
    Write-Host "  仓库   : $REPO" -ForegroundColor Gray
    Write-Host "  线上   : https://aidtvv.github.io/astra-web/" -ForegroundColor Gray
    Write-Host ''
}

function Step($title) {
    Write-Host ''
    Write-Host "  → $title …" -ForegroundColor Yellow
}

function Ok($msg) {
    Write-Host "  ✔ $msg" -ForegroundColor Green
}

function Fail($msg) {
    Write-Host "  ✖ $msg" -ForegroundColor Red
}

function Ask-Confirm($prompt, $defaultYes = $true) {
    $suffix = if ($defaultYes) { ' [Y/n]' } else { '[y/N]' }
    $answer = Read-Host "  $prompt $suffix"
    if ([string]::IsNullOrWhiteSpace($answer)) { return $defaultYes }
    return $answer.Trim().ToLower() -match '^(y|yes|是|对)$'
}

try {
    Show-Banner

    # ---------- 读取令牌 ----------
    $token = $env:GH_TOKEN
    if (-not $token -and (Test-Path $TOKEN_FILE)) {
        $token = (Get-Content $TOKEN_FILE -Raw).Trim()
    }
    if (-not $token) {
        Fail "未找到 GitHub 令牌：请设置环境变量 GH_TOKEN，或在 $TOKEN_FILE 写入令牌。"
        throw '缺少 GitHub 令牌'
    }
    Ok 'GitHub 令牌已就绪'

    # ---------- 确认开始 ----------
    if (-not (Ask-Confirm '是否开始部署？')) {
        Write-Host '  已取消。' -ForegroundColor Gray
        exit 0
    }

    # ---------- 1. 构建 client ----------
    Step '构建 client（VITE_BASE=/astra-web/）'
    $env:VITE_BASE = '/astra-web/'
    Push-Location (Join-Path $PSScriptRoot 'client')
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build 失败（退出码 $LASTEXITCODE）" }
    } finally {
        Pop-Location
        Remove-Item Env:VITE_BASE -ErrorAction SilentlyContinue
    }
    Ok '构建完成'

    # ---------- 2. 提交并推送源码到 main ----------
    $changes = git status --porcelain
    if ($changes) {
        $msg = $args[0]
        if (-not $msg) { $msg = "更新 Astra $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }
        Write-Host ''
        Write-Host "  提交信息：$msg" -ForegroundColor Gray
        if (-not (Ask-Confirm '确认提交并推送源码到 main？')) {
            Write-Host '  已取消，脚本结束。' -ForegroundColor Gray
            exit 0
        }
        git add -A
        git commit -m $msg
        if ($LASTEXITCODE -ne 0) { throw "git commit 失败（退出码 $LASTEXITCODE）" }
        Ok "源码已提交：$msg"
    } else {
        Write-Host '  源码无本地改动，跳过提交…' -ForegroundColor Gray
    }

    Step '推送源码到 main'
    git config http.proxy $PROXY
    git remote set-url origin "https://aidtvv:${token}@github.com/${REPO}.git"
    try {
        git push origin $MAIN_BRANCH
        if ($LASTEXITCODE -ne 0) { throw "git push main 失败（退出码 $LASTEXITCODE）" }
    } finally {
        git remote set-url origin "https://github.com/${REPO}.git"
    }
    Ok 'main 已推送'

    # ---------- 3. 把 dist 推送到 gh-pages 分支 ----------
    Step '推送 gh-pages 分支'
    $tmpBranch = "ghpages-deploy-$([guid]::NewGuid().ToString('N').Substring(0,8))"
    $dist = Join-Path $PSScriptRoot 'client\dist'
    try {
        # SPA fallback：深层路由（如 /stats）刷新时由 404.html 兜底加载应用
        if (-not (Test-Path (Join-Path $dist 'index.html'))) {
            throw '构建产物缺失：client/dist/index.html 不存在'
        }
        Copy-Item (Join-Path $dist 'index.html') (Join-Path $dist '404.html') -Force

        # dist 被 .gitignore 忽略，需强制加入并单独提交
        git add -f client/dist
        $tmpCommit = git rev-parse HEAD
        git commit -m "chore: 构建产物 client/dist（部署用）"
        if ($LASTEXITCODE -ne 0) { throw "git commit dist 失败（退出码 $LASTEXITCODE）" }

        # 提取 client/dist 为独立分支
        git subtree split --prefix client/dist -b $tmpBranch
        if ($LASTEXITCODE -ne 0) { throw "git subtree split 失败（退出码 $LASTEXITCODE）" }

        git remote set-url origin "https://aidtvv:${token}@github.com/${REPO}.git"
        try {
            # subtree split 每次生成与远程 gh-pages 无共同祖先的新历史，
            # 必须用 --force 覆盖（gh-pages 是纯构建产物分支，历史连续性无意义）
            git push --force origin "$tmpBranch`:$GH_BRANCH"
            if ($LASTEXITCODE -ne 0) { throw "git push gh-pages 失败（退出码 $LASTEXITCODE）" }
        } finally {
            git remote set-url origin "https://github.com/${REPO}.git"
        }

        # 回退临时 dist 提交（仅当最近提交就是它时）
        if ((git rev-parse HEAD) -ne $tmpCommit) {
            git reset --hard $tmpCommit
        }
    } finally {
        git branch -D $tmpBranch 2>$null
    }
    Ok 'gh-pages 已推送'

    Write-Host ''
    Write-Host '  ═══════════════════════════════════════════' -ForegroundColor Cyan
    Write-Host '  ✅ 部署完成！Pages 正在刷新，约 1 分钟后生效。' -ForegroundColor Green
    Write-Host '  🌐 https://aidtvv.github.io/astra-web/' -ForegroundColor Green
    Write-Host '  ═══════════════════════════════════════════' -ForegroundColor Cyan
    Write-Host ''
} catch {
    Write-Host ''
    Write-Host '  ────────────────────────────────────────────' -ForegroundColor Red
    Write-Host "  ❌ 部署失败：$($_.Exception.Message)" -ForegroundColor Red
    Write-Host '  ────────────────────────────────────────────' -ForegroundColor Red
    Write-Host ''
} finally {
    Read-Host '  按回车键退出'
}

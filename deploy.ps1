# ============================================================
# Astra 部署到 GitHub Pages（gh-pages 分支方案）
# 用法：
#   方式一（推荐）：右键 deploy.ps1 -> 使用 PowerShell 运行
#   方式二：powershell -ExecutionPolicy Bypass -File deploy.ps1 "更新说明(可选)"
# 菜单：
#   [1] 完整部署   构建 + 提交源码到 main + 推 gh-pages
#   [2] 只更新网站 构建当前代码 + 只推 gh-pages（不提交源码）
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
    Write-Host '  │        Astra 部署到 GitHub Pages            │' -ForegroundColor Cyan
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

function Select-Mode {
    Write-Host '  请选择操作：' -ForegroundColor White
    Write-Host ''
    Write-Host '    [1] 完整部署   构建 + 提交源码到 main + 推 gh-pages' -ForegroundColor Cyan
    Write-Host '    [2] 只更新网站 构建当前代码 + 只推 gh-pages（不提交源码）' -ForegroundColor Cyan
    Write-Host '    [0] 退出' -ForegroundColor Gray
    Write-Host ''
    $answer = Read-Host '  请输入编号'
    switch ($answer.Trim()) {
        '1' { return 'full' }
        '2' { return 'web' }
        '0' { Write-Host '  已退出。' -ForegroundColor Gray; exit 0 }
        default {
            Write-Host '  无效输入，已退出。' -ForegroundColor Red
            exit 1
        }
    }
}

function Invoke-Build {
    Step '构建 client（生产环境）'
    
    # 检查 .env.production 是否存在
    $envFile = Join-Path $PSScriptRoot 'client\.env.production'
    if (-not (Test-Path $envFile)) {
        Write-Host '  警告：.env.production 不存在，将创建默认版本' -ForegroundColor Yellow
        $workerUrl = Read-Host '  请输入你的 Cloudflare Worker URL（如 https://astra-api.workers.dev）'
        if ([string]::IsNullOrWhiteSpace($workerUrl)) {
            $workerUrl = 'https://astra-api.workers.dev'
        }
        @"
# 生产环境 - 部署到 GitHub Pages
VITE_API_BASE=$workerUrl
VITE_BASE=/astra-web/
"@ | Out-File -FilePath $envFile -Encoding utf8
        Ok ".env.production 已创建（Worker URL: $workerUrl）"
    }
    
    Push-Location (Join-Path $PSScriptRoot 'client')
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build 失败（退出码 $LASTEXITCODE）" }
    } finally {
        Pop-Location
    }
    Ok '构建完成'
}

function Invoke-PushSource {
    # 提交并推送源码到 main
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
}

function Invoke-PushGhPages {
    # 把构建产物 client/dist 推送到 gh-pages 分支
    Step '推送 gh-pages 分支'
    $tmpBranch = "ghpages-deploy-$([guid]::NewGuid().ToString('N').Substring(0,8))"
    $dist = Join-Path $PSScriptRoot 'client\dist'
    $savedHead = git rev-parse HEAD
    try {
        # SPA fallback：深层路由（如 /stats）刷新时由 404.html 兜底加载应用
        if (-not (Test-Path (Join-Path $dist 'index.html'))) {
            throw '构建产物缺失：client/dist/index.html 不存在'
        }
        Copy-Item (Join-Path $dist 'index.html') (Join-Path $dist '404.html') -Force

        # 只暂存并提交 dist 目录，绝不把其他未提交源码改动带进去
        git add -f client/dist
        git commit -m "chore: 构建产物 client/dist（部署用）" -- client/dist
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

        # 回退临时 dist 提交（仅当最近提交就是它时）；--soft 保证不丢工作区改动
        if ((git rev-parse HEAD) -ne $savedHead) {
            git reset --soft $savedHead
            git reset -q HEAD -- client/dist
        }
    } finally {
        git branch -D $tmpBranch 2>$null
    }
    Ok 'gh-pages 已推送'
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

    # ---------- 选择模式 ----------
    $mode = Select-Mode

    # ---------- 构建（两种模式都先构建） ----------
    Invoke-Build

    if ($mode -eq 'full') {
        # 完整部署：提交源码 + 推送 main + 推送 gh-pages
        Invoke-PushSource $args[0]
        Invoke-PushGhPages
        Write-Host ''
        Write-Host '  ═══════════════════════════════════════════' -ForegroundColor Cyan
        Write-Host '  ✅ 完整部署完成！源码与网站均已更新。' -ForegroundColor Green
        Write-Host '  🌐 https://aidtvv.github.io/astra-web/' -ForegroundColor Green
        Write-Host '  ═══════════════════════════════════════════' -ForegroundColor Cyan
    } else {
        # 只更新网站：仅推送 gh-pages，源码提交留待以后
        Invoke-PushGhPages
        Write-Host ''
        Write-Host '  ═══════════════════════════════════════════' -ForegroundColor Cyan
        Write-Host '  ✅ 网站已更新！（源码未提交，可稍后用完整部署提交）' -ForegroundColor Green
        Write-Host '  🌐 https://aidtvv.github.io/astra-web/' -ForegroundColor Green
        Write-Host '  ═══════════════════════════════════════════' -ForegroundColor Cyan
    }

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

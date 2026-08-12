# ============================================================
# Astra 一键部署到 GitHub Pages（gh-pages 分支方案）
# 用法：  powershell -ExecutionPolicy Bypass -File deploy.ps1 "更新说明(可选)"
# 流程： 1. 构建 client（VITE_BASE=/astra-web/）
#        2. 提交并推送源码到 main
#        3. 把 client/dist 推送到 gh-pages 分支，Pages 托管该分支
# 令牌来源：优先环境变量 $env:GH_TOKEN，否则读取 D:\CheckBox\课表处理\.deploy_token。
# ============================================================
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$REPO  = 'aidtvv/astra-web'
$MAIN_BRANCH = 'main'
$GH_BRANCH = 'gh-pages'
$PROXY = 'http://127.0.0.1:7897'
$TOKEN_FILE = 'D:\CheckBox\课表处理\.deploy_token'

try {
    # ---------- 读取令牌 ----------
    $token = $env:GH_TOKEN
    if (-not $token -and (Test-Path $TOKEN_FILE)) {
        $token = (Get-Content $TOKEN_FILE -Raw).Trim()
    }
    if (-not $token) {
        Write-Host "错误：未找到 GitHub 令牌。请设置环境变量 GH_TOKEN，或在 $TOKEN_FILE 写入令牌。" -ForegroundColor Red
        throw '缺少 GitHub 令牌'
    }

    # ---------- 1. 构建 client ----------
    Write-Host '→ 构建 client…'
    $env:VITE_BASE = '/astra-web/'
    Push-Location (Join-Path $PSScriptRoot 'client')
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build 失败（退出码 $LASTEXITCODE）" }
    } finally {
        Pop-Location
        Remove-Item Env:VITE_BASE -ErrorAction SilentlyContinue
    }

    # ---------- 2. 提交并推送源码到 main ----------
    $changes = git status --porcelain
    if ($changes) {
        git add -A
        $msg = $args[0]
        if (-not $msg) { $msg = "更新 Astra $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }
        git commit -m $msg
        Write-Host "已提交：$msg" -ForegroundColor Green
    } else {
        Write-Host '源码无本地改动，跳过提交…'
    }

    git config http.proxy $PROXY
    git remote set-url origin "https://aidtvv:${token}@github.com/${REPO}.git"
    try {
        git push origin $MAIN_BRANCH
        if ($LASTEXITCODE -ne 0) { throw "git push main 失败（退出码 $LASTEXITCODE）" }
    } finally {
        git remote set-url origin "https://github.com/${REPO}.git"
    }

    # ---------- 3. 把 dist 推送到 gh-pages 分支 ----------
    # 流程：临时提交 dist -> subtree split 提取 -> 推送 gh-pages -> 回退临时提交
    Write-Host '→ 推送 gh-pages 分支…'
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
            git push origin "$tmpBranch`:$GH_BRANCH"
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

    Write-Host ''
    Write-Host "✅ 部署成功！GitHub Pages 正在刷新，约 1 分钟后生效。" -ForegroundColor Green
    Write-Host "🌐 访问：https://aidtvv.github.io/astra-web/"
    Write-Host ''
} catch {
    Write-Host ''
    Write-Host "❌ 部署失败：$($_.Exception.Message)" -ForegroundColor Red
    Write-Host ''
} finally {
    Read-Host '按回车键退出'
}

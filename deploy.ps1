# ============================================================
# Astra 一键部署到 GitHub（源码推送到 aidtvv/astra-web）
# 用法：  powershell -ExecutionPolicy Bypass -File deploy.ps1 "更新说明(可选)"
# 说明： 自动提交本目录改动并推送到 GitHub，main 分支推送后由
#        GitHub Actions 自动构建并发布到 GitHub Pages。
# 令牌来源：优先环境变量 $env:GH_TOKEN，否则读取 D:\CheckBox\课表处理\.deploy_token。
# ============================================================
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$REPO  = 'aidtvv/astra-web'
$BRANCH = 'main'
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

    # ---------- 提交 ----------
    $changes = git status --porcelain
    if ($changes) {
        git add -A
        $msg = $args[0]
        if (-not $msg) { $msg = "更新 Astra $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }
        git commit -m $msg
        Write-Host "已提交：$msg" -ForegroundColor Green
    } else {
        Write-Host '无本地改动，仅推送已有提交…'
    }

    # ---------- 推送（走代理 + 临时令牌地址） ----------
    git config http.proxy $PROXY
    git remote set-url origin "https://aidtvv:${token}@github.com/${REPO}.git"
    try {
        git push origin $BRANCH
        if ($LASTEXITCODE -ne 0) { throw "git push 失败（退出码 $LASTEXITCODE）" }
    } finally {
        # 恢复干净的远程地址，避免令牌残留
        git remote set-url origin "https://github.com/${REPO}.git"
    }

    Write-Host ''
    Write-Host "✅ 推送成功！GitHub Actions 正在构建并发布，约 1-2 分钟后生效。" -ForegroundColor Green
    Write-Host "🌐 访问：https://aidtvv.github.io/astra-web/"
    Write-Host ''
} catch {
    Write-Host ''
    Write-Host "❌ 部署失败：$($_.Exception.Message)" -ForegroundColor Red
    Write-Host ''
} finally {
    # 防止窗口闪退：等待用户按回车
    Read-Host '按回车键退出'
}

# 블로그 공개용 동기화: 초안이 아닌 글만 content 로 복사하고 GitHub 로 올립니다.
# 사용: PowerShell 에서  .\sync.ps1   (올리지 않고 확인만: .\sync.ps1 -DryRun)
param([switch]$DryRun)
$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding($false)
$site  = $PSScriptRoot
$vault = Split-Path $site -Parent
$src   = Join-Path $vault "블로그"
$dst   = Join-Path $site "content"
if (-not (Test-Path $src)) { throw "블로그 폴더를 찾지 못했습니다: $src" }

# content 비우기 (원본 볼트는 건드리지 않음)
if (Test-Path $dst) { Get-ChildItem $dst -Force | Remove-Item -Recurse -Force } else { New-Item -ItemType Directory $dst | Out-Null }

function IsDraft([string]$text) {
  if ($text -match '(?s)^---\r?\n(.*?)\r?\n---') {
    return ($Matches[1] -match '(?m)^\s*draft:\s*(true|yes)\s*$')
  }
  return $false
}

$copied = 0; $skipped = 0
Get-ChildItem $src -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($src.Length).TrimStart('\','/')
  if ($_.Name -eq "블로그 홈.md") {
    $text = [IO.File]::ReadAllText($_.FullName, $utf8)
    $text = ($text -split "\r?\n" | Where-Object { $_ -notmatch '!\[\[' }) -join "`n"
    [IO.File]::WriteAllText((Join-Path $dst "index.md"), $text, $utf8)
    $script:copied++
    return
  }
  if ($_.Extension -eq ".md") {
    $text = [IO.File]::ReadAllText($_.FullName, $utf8)
    if (IsDraft $text) { $script:skipped++; return }
  }
  $target = Join-Path $dst $rel
  New-Item -ItemType Directory (Split-Path $target -Parent) -Force | Out-Null
  Copy-Item $_.FullName $target
  $script:copied++
}
Write-Host "복사 $copied 개, 초안 제외 $skipped 개"

# 안전 점검: 직원 폴더나 개인정보 흔적이 있으면 중단
$bad = Get-ChildItem $dst -Recurse -File -Filter *.md | Select-String -Pattern "면허번호|연락처:|EMR:|미래병원/명단" -List
if ($bad) { throw "공개 폴더에서 직원 정보로 보이는 내용이 발견되어 중단합니다: $($bad.Path -join ', ')" }

if ($DryRun) { Write-Host "확인만 했습니다. 올리지 않았습니다."; exit 0 }

Set-Location $site
if (-not (Test-Path (Join-Path $site ".git"))) { throw "아직 GitHub 저장소와 연결되지 않았습니다. 처음 한 번 연결이 필요합니다." }
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { Write-Host "변경된 글이 없습니다."; exit 0 }
git commit -m ("update " + (Get-Date -Format "yyyy-MM-dd HH:mm")) | Out-Null
git pull --rebase origin main
git push origin main
Write-Host "올렸습니다. 잠시 뒤 사이트가 갱신됩니다."

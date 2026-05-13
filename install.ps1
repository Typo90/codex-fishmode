$ErrorActionPreference = "Stop"

$RepoUrl = if ($env:FISHMODE_REPO_URL) {
  $env:FISHMODE_REPO_URL
} else {
  "https://github.com/example/codex-fishmode/archive/refs/heads/main.zip"
}

if (Test-Path ".\scripts\install.mjs") {
  node .\scripts\install.mjs @args
  exit $LASTEXITCODE
}

$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-fishmode-" + [System.Guid]::NewGuid())
New-Item -ItemType Directory -Path $TempDir | Out-Null

try {
  $ZipPath = Join-Path $TempDir "fishmode.zip"
  Invoke-WebRequest -Uri $RepoUrl -OutFile $ZipPath
  Expand-Archive -Path $ZipPath -DestinationPath $TempDir
  $RepoDir = Get-ChildItem -Path $TempDir -Directory | Where-Object { $_.Name -like "codex-fishmode-*" } | Select-Object -First 1
  node (Join-Path $RepoDir.FullName "scripts\install.mjs") @args
  exit $LASTEXITCODE
} finally {
  Remove-Item -Recurse -Force $TempDir
}

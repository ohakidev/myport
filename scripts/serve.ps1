$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path

$targetDirectory = if ($env:CARGO_TARGET_DIR) { $env:CARGO_TARGET_DIR } else { Join-Path $env:LOCALAPPDATA 'myport-rust\build' }
if (-not [System.IO.Path]::IsPathRooted($targetDirectory)) {
    $targetDirectory = Join-Path $projectRoot $targetDirectory
}
$serverPath = Join-Path $targetDirectory 'release\myport-server.exe'

if (-not (Test-Path -LiteralPath $serverPath -PathType Leaf)) {
    throw "Rust server not found at '$serverPath'. Run scripts/build.ps1 first."
}

& $serverPath

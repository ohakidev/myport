$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
Push-Location -LiteralPath $projectRoot

try {
    $taskToolRoot = Join-Path $env:USERPROFILE '.cache\myport-rust'
    if (-not (Get-Command cargo -ErrorAction SilentlyContinue) -and (Test-Path -LiteralPath (Join-Path $taskToolRoot 'cargo\bin\cargo.exe'))) {
        $env:CARGO_HOME = Join-Path $taskToolRoot 'cargo'
        $env:RUSTUP_HOME = Join-Path $taskToolRoot 'rustup'
        $env:PATH = "$env:CARGO_HOME\bin;$env:PATH"
    }

    $rustupHome = if ($env:RUSTUP_HOME) { $env:RUSTUP_HOME } else { Join-Path $env:USERPROFILE '.rustup' }
    $mingwBin = Join-Path $taskToolRoot 'mingw64\bin'
    $mingwDlltool = Join-Path $mingwBin 'dlltool.exe'
    foreach ($localToolPath in @(
        $mingwBin,
        (Join-Path $taskToolRoot 'wasm-bindgen-0.2.129-x86_64-pc-windows-msvc'),
        (Join-Path $rustupHome 'toolchains\stable-x86_64-pc-windows-gnu\lib\rustlib\x86_64-pc-windows-gnu\bin\self-contained')
    )) {
        if ((Test-Path -LiteralPath $localToolPath -PathType Container) -and $env:PATH -notlike "*$localToolPath*") {
            $env:PATH = "$localToolPath;$env:PATH"
        }
    }

    $resolvedDlltool = Get-Command dlltool -ErrorAction SilentlyContinue
    if ((Test-Path -LiteralPath $mingwDlltool -PathType Leaf) -and ($resolvedDlltool.Source -ne $mingwDlltool)) {
        $env:PATH = "$mingwBin;$env:PATH"
    }

    foreach ($tool in @('cargo', 'rustup', 'wasm-bindgen')) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
            throw "Required build tool '$tool' is not on PATH. See README.md for the required toolchain."
        }
    }

    $targets = & rustup target list --installed
    if ($LASTEXITCODE -ne 0 -or $targets -notcontains 'wasm32-unknown-unknown') {
        throw "Install the wasm32-unknown-unknown target with: rustup target add wasm32-unknown-unknown"
    }

    $wasmBindgenVersion = (& wasm-bindgen --version).Trim()
    if ($LASTEXITCODE -ne 0 -or $wasmBindgenVersion -ne 'wasm-bindgen 0.2.129') {
        throw "This workspace requires wasm-bindgen-cli 0.2.129; found '$wasmBindgenVersion'."
    }

    if (-not $env:CARGO_TARGET_DIR) {
        $env:CARGO_TARGET_DIR = Join-Path $env:LOCALAPPDATA 'myport-rust\build'
    }

    & cargo build --release -p myport-play --target wasm32-unknown-unknown
    if ($LASTEXITCODE -ne 0) { throw 'The Rust/WebAssembly build failed.' }

    $wasmPath = Join-Path $env:CARGO_TARGET_DIR 'wasm32-unknown-unknown\release\myport_play.wasm'
    & wasm-bindgen $wasmPath --target web --out-dir public/play --out-name myport_play
    if ($LASTEXITCODE -ne 0) { throw 'Generating the WebAssembly browser bindings failed.' }

    & cargo build --release -p myport-server
    if ($LASTEXITCODE -ne 0) { throw 'The Rust server build failed.' }

    foreach ($asset in @('site.css', 'play.css', 'play/bootstrap.js', 'play/myport_play.js', 'play/myport_play_bg.wasm')) {
        if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "public\$asset") -PathType Leaf)) {
            throw "Required runtime asset '$asset' was not produced."
        }
    }

    Write-Output "Build complete: $env:CARGO_TARGET_DIR\release\myport-server.exe"
}
finally {
    Pop-Location
}

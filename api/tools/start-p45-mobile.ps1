param(
    [Parameter(Mandatory=$true)][string]$LanAddress,
    [int]$Port = 8085
)
$ErrorActionPreference = 'Stop'
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    $p45DockerPaths = @(
        (Join-Path $env:LOCALAPPDATA 'Programs/DockerDesktop/resources/bin'),
        'C:/Program Files/Docker/Docker/resources/bin'
    )
    $p45DockerDirectory = $p45DockerPaths | Where-Object {Test-Path -LiteralPath (Join-Path $_ 'docker.exe')} | Select-Object -First 1
    if ($p45DockerDirectory) { $env:PATH = "$p45DockerDirectory;$env:PATH" }
}
$parsedAddress = $null
if (-not [System.Net.IPAddress]::TryParse($LanAddress, [ref]$parsedAddress) -or
    $parsedAddress.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork -or
    [System.Net.IPAddress]::IsLoopback($parsedAddress) -or $LanAddress -eq '0.0.0.0') {
    throw 'Use the development PC IPv4 LAN address reachable from both phones.'
}
$repoDirectory = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$mobileDirectory = Join-Path $repoDirectory 'mobile'
Push-Location $repoDirectory
try {
    # Capture status: it includes local privileged keys that must never be printed.
    $p45PreviousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $statusText = & npx.cmd --yes supabase@2.122.0 status --output json 2>$null }
    finally { $ErrorActionPreference = $p45PreviousPreference }
    if ($LASTEXITCODE -ne 0) { throw 'Start local Supabase first.' }
    $localStatus = ($statusText -join "`n") | ConvertFrom-Json
    $origin = [uri]$localStatus.API_URL
    if ($origin.Scheme -ne 'http' -or $origin.Host -notin @('127.0.0.1','localhost')) {
        throw 'This launcher accepts local Supabase only.'
    }
    if (-not $localStatus.ANON_KEY) { throw 'Local public key unavailable.' }
    # Process-scoped overrides: existing hosted .env files remain untouched.
    $env:EXPO_PUBLIC_SUPABASE_URL = "http://${LanAddress}:$($origin.Port)"
    $env:EXPO_PUBLIC_SUPABASE_ANON_KEY = $localStatus.ANON_KEY
    $env:EXPO_PUBLIC_API_BASE_URL = ''
    $env:EXPO_NO_DOTENV = '1'
    Remove-Item Env:EXPO_PACKAGER_PROXY_URL -ErrorAction SilentlyContinue
    Write-Output 'Starting local-only P4.5 preview. AI stays unavailable; submissions remain pending.'
    Set-Location $mobileDirectory
    & npm.cmd start -- --host lan --port $Port
} finally {
    Pop-Location
}

param([int]$Port = 8774)
$ErrorActionPreference = 'Stop'
$apiDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pythonPath = Join-Path $apiDirectory '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) { throw 'Install the API virtual environment first.' }
$listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
foreach ($listener in $listeners) {
    $existing = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
    if ($existing.CommandLine -notmatch [regex]::Escape($pythonPath) -or
        $existing.CommandLine -notmatch 'uvicorn app.main:create_app' -or
        $existing.CommandLine -notmatch "--port $Port(?:\s|$)") {
        throw "Port $Port belongs to a different process; nothing was stopped."
    }
    Stop-Process -Id $listener.OwningProcess
}
$logDirectory = Join-Path $apiDirectory '.local'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$started = Start-Process -FilePath $pythonPath -ArgumentList '-m','uvicorn','app.main:create_app','--factory','--host','127.0.0.1','--port',"$Port" -WorkingDirectory $apiDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'api.stdout.log') -RedirectStandardError (Join-Path $logDirectory 'api.stderr.log') -PassThru
$started.Id | Set-Content -LiteralPath (Join-Path $logDirectory 'api.pid')
Write-Output "Started local API launcher PID $($started.Id) on port $Port; logs in api/.local. Check /health for startup."

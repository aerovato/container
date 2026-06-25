$ErrorActionPreference = "Stop"

$Repo = "aerovato/container"
$InstallDir = Join-Path $HOME ".code-container\bin"
$NpmFallback = 2

function Write-Fallback {
  Write-Host ""
  Write-Host "The standalone installer cannot continue on this system."
  Write-Host "Install container via npm instead:"
  Write-Host "  npm install -g @aerovato/container"
}

function Get-Arch {
  switch ($env:PROCESSOR_ARCHITECTURE) {
    "AMD64" { return "x64" }
    "ARM64" { return "arm64" }
    default {
      Write-Host "Unsupported architecture: $env:PROCESSOR_ARCHITECTURE"
      return $null
    }
  }
}

function Start-ReplacementHelper {
  param($TargetPath, $StagedPath)

  $ScriptPath = Join-Path ([System.IO.Path]::GetTempPath()) "container-upgrade-$([System.Guid]::NewGuid().ToString()).ps1"
  $Script = @"
`$ErrorActionPreference = "Stop"
`$Target = '$($TargetPath.Replace("'", "''"))'
`$Staged = '$($StagedPath.Replace("'", "''"))'

for (`$i = 0; `$i -lt 60; `$i++) {
  try {
    Move-Item -Force -Path `$Staged -Destination `$Target
    Remove-Item -Force -Path `$PSCommandPath -ErrorAction SilentlyContinue
    exit 0
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

Write-Error "Timed out waiting to replace `$Target"
exit 1
"@

  Set-Content -Path $ScriptPath -Value $Script
  Start-Process -WindowStyle Hidden -FilePath powershell.exe -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $ScriptPath)
}

function Add-ToPath {
  $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $PathParts = @($UserPath -split ";" | Where-Object { $_ })

  if ($PathParts -notcontains $InstallDir) {
    [Environment]::SetEnvironmentVariable("Path", (($PathParts + $InstallDir) -join ";"), "User")
    $env:PATH = "$env:PATH;$InstallDir"
    Write-Host "Added $InstallDir to your user PATH. Restart your terminal if container is not found."
  }
}

function Install-Container {
  $Arch = Get-Arch
  if (-not $Arch) {
    return $NpmFallback
  }

  $Archive = "container-windows-$Arch.zip"
  $BaseUrl = "https://github.com/$Repo/releases/latest/download"
  $TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())

  New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

  try {
    $ArchivePath = Join-Path $TempDir $Archive
    $ChecksumsPath = Join-Path $TempDir "checksums.txt"

    Write-Host "Downloading $Archive..."
    Invoke-WebRequest -Uri "$BaseUrl/$Archive" -OutFile $ArchivePath
    Invoke-WebRequest -Uri "$BaseUrl/checksums.txt" -OutFile $ChecksumsPath

    $ChecksumLine = Select-String -Path $ChecksumsPath -Pattern "\s+$([regex]::Escape($Archive))$" | Select-Object -First 1
    if (-not $ChecksumLine) {
      Write-Host "Checksum entry not found for $Archive."
      return $NpmFallback
    }

    $Expected = ($ChecksumLine.Line -split "\s+")[0].ToLowerInvariant()
    $Actual = (Get-FileHash -Algorithm SHA256 $ArchivePath).Hash.ToLowerInvariant()
    if ($Expected -ne $Actual) {
      Write-Host "Checksum verification failed for $Archive. Please rerun the installer."
      return 1
    }

    # Extract and install the binary into the user's container bin directory.
    Expand-Archive -Path $ArchivePath -DestinationPath $TempDir -Force
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
    $TargetPath = Join-Path $InstallDir "container.exe"
    $StagedPath = Join-Path $InstallDir "container.exe.new"
    $ReplacementStaged = $false
    Copy-Item -Force -Path (Join-Path $TempDir "container.exe") -Destination $StagedPath

    try {
      Move-Item -Force -Path $StagedPath -Destination $TargetPath
    } catch {
      Start-ReplacementHelper $TargetPath $StagedPath
      $ReplacementStaged = $true
    }

    if ($ReplacementStaged) {
      Write-Host "container upgrade staged. It will complete after this process exits."
    } else {
      Write-Host "container installed to $TargetPath"
    }

    Add-ToPath
  } catch {
    Write-Host "$($_.Exception.Message) Please rerun the installer."
    return 1
  } finally {
    Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue
  }

  return 0
}

$Status = Install-Container
if ($Status -eq $NpmFallback) {
  Write-Fallback
}
exit $Status

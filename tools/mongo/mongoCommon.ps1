# Shared by backup.ps1 and resetSandbox.ps1. Dot-source it, do not run it.
# Keep these scripts ASCII only: Windows PowerShell reads a script without a BOM as ANSI.

$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$EnvLocalPath = Join-Path $RepoRoot '.env.local'

# The production URI names no database, so Mongoose uses "test".
$ProductionDb = 'test'
$SandboxDb = 'sgSandbox'

# Hardcoded on purpose: no parameter or setting can aim a restore at Atlas.
# 127.0.0.1, not localhost: Node resolves localhost to ::1, where mongod does not listen.
$SandboxServer = 'mongodb://127.0.0.1:27017'

function Read-EnvLocal {
    if (-not (Test-Path -LiteralPath $EnvLocalPath)) {
        throw "Settings file not found: $EnvLocalPath"
    }

    $settings = @{}
    foreach ($line in [System.IO.File]::ReadAllLines($EnvLocalPath)) {
        if ($line -match '^\s*#') { continue }
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $name = $matches[1]
            $value = $matches[2].Trim()
            if ($value.Length -ge 2) {
                $first = $value[0]
                $last = $value[$value.Length - 1]
                if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
                    $value = $value.Substring(1, $value.Length - 2)
                }
            }
            $settings[$name] = $value
        }
    }
    return $settings
}

# The installers do not put the tools on PATH, so look in their install folders too.
function Find-MongoTool {
    param([string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }

    $searchRoots = @(
        (Join-Path $env:ProgramFiles 'MongoDB'),
        (Join-Path $env:ProgramFiles 'mongosh'),
        (Join-Path $env:LOCALAPPDATA 'Programs\mongosh')
    )
    $found = foreach ($searchRoot in $searchRoots) {
        if (Test-Path -LiteralPath $searchRoot) {
            Get-ChildItem -LiteralPath $searchRoot -Recurse -Filter "$Name.exe" -ErrorAction SilentlyContinue
        }
    }
    $newest = $found | Sort-Object FullName -Descending | Select-Object -First 1
    if (-not $newest) {
        throw "$Name.exe was not found on PATH or in the MongoDB install folders. See src/lib/mongoose/mongoSandbox.readme.md, 'Install'."
    }
    return $newest.FullName
}

# One .env.local can serve several machines: a line named for this computer wins over
# the plain MONGO_BACKUP_DIR line.
function Get-BackupDir {
    param([hashtable]$Settings)

    $computerSuffix = $env:COMPUTERNAME.ToUpper() -replace '[^A-Z0-9]', '_'
    $computerKey = "MONGO_BACKUP_DIR_$computerSuffix"

    $backupDir = $Settings[$computerKey]
    if (-not $backupDir) { $backupDir = $Settings['MONGO_BACKUP_DIR'] }
    if (-not $backupDir) {
        throw "Add $computerKey=<folder> (or MONGO_BACKUP_DIR=<folder>) to .env.local."
    }

    $fullBackupDir = [System.IO.Path]::GetFullPath($backupDir).TrimEnd('\')
    $repoPrefix = $RepoRoot.TrimEnd('\') + '\'
    if (($fullBackupDir + '\').StartsWith($repoPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "The backup folder must be outside the repository: $fullBackupDir"
    }
    return $fullBackupDir
}

function Invoke-MongoTool {
    param([string]$ToolPath, [string[]]$ToolArgs)

    # The tools write progress to stderr, which "Stop" would treat as a failure.
    $ErrorActionPreference = 'Continue'
    & $ToolPath @ToolArgs
    if ($LASTEXITCODE -ne 0) {
        throw "$(Split-Path -Leaf $ToolPath) failed with exit code $LASTEXITCODE."
    }
}

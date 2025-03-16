# Set environment variables
$env:BUILD_TYPE = "canary"
$env:DISTRIBUTION = "desktop"
$env:SKIP_WEB_BUILD = 1
$env:HOIST_NODE_MODULES = 1

# Function to clear environment variables
function Clear-EnvVariables {
    Remove-Item Env:BUILD_TYPE -ErrorAction SilentlyContinue
    Remove-Item Env:DISTRIBUTION -ErrorAction SilentlyContinue
    Remove-Item Env:SKIP_WEB_BUILD -ErrorAction SilentlyContinue
    Remove-Item Env:HOIST_NODE_MODULES -ErrorAction SilentlyContinue
}

# Function to handle errors
function Handle-Error {
    Write-Host "Build_Win_Desktop: An error occurred. Aborting the build process." -ForegroundColor DarkMagenta
    Clear-EnvVariables
    exit 1
}

# Function to check Node.js and Yarn versions
function Check-Versions {
    Write-Host "Build_Win_Desktop: Checking Node.js and Yarn versions..." -ForegroundColor DarkMagenta

    # Check Node.js version
    $nodeVersion = node -v 2>$null
    if ($LASTEXITCODE -ne 0 -or $nodeVersion -notlike "v22.14.0") {
        Write-Host "Build_Win_Desktop: Node.js v22.14.0 is required but not found. Please install it." -ForegroundColor DarkMagenta
        exit 1
    }

    # Check Yarn version
    $yarnVersion = yarn -v 2>$null
    if ($LASTEXITCODE -ne 0 -or $yarnVersion -ne "4.7.0") {
        Write-Host "Build_Win_Desktop: Yarn v4.7.0 is required but not found. Please install it." -ForegroundColor DarkMagenta
        exit 1
    }

    Write-Host "Build_Win_Desktop: Node.js and Yarn versions are correct." -ForegroundColor DarkMagenta
}

# Function to check if @affine/native module is built
function Check-Native-Built {
    Write-Host "Build_Win_Desktop: Checking if @affine/native module is already built..." -ForegroundColor DarkMagenta
    $nativeBuildFile = "packages/frontend/native/affine.win32-x64-msvc.node"
    if (Test-Path $nativeBuildFile) {
        Write-Host "Build_Win_Desktop: @affine/native module is already built. Skipping build step." -ForegroundColor DarkMagenta
        return $true
    } else {
        Write-Host "Build_Win_Desktop: @affine/native module is not built. Proceeding with build..." -ForegroundColor DarkMagenta
        return $false
    }
}

# Enable error handling
$ErrorActionPreference = "Stop"
try {
    # Step 0: Check Node.js and Yarn versions
    Check-Versions

    # Step 1: Build native module if not already built
    if (-not (Check-Native-Built)) {
        Write-Host "Build_Win_Desktop: Building native module..." -ForegroundColor DarkMagenta
        yarn affine @affine/native build
        if ($LASTEXITCODE -ne 0) { Handle-Error }
    }

    # Step 2: Generate assets
    Write-Host "Build_Win_Desktop: Generating assets..." -ForegroundColor DarkMagenta
    yarn affine @affine/electron generate-assets
    if ($LASTEXITCODE -ne 0) { Handle-Error }

    # Step 3: Build the desktop layers
    Write-Host "Build_Win_Desktop: Building the desktop layers..." -ForegroundColor DarkMagenta
    yarn affine @affine/electron build
    if ($LASTEXITCODE -ne 0) { Handle-Error }

    # Step 4: Package the application for win32
    Write-Host "Build_Win_Desktop: Packaging the application for win32..." -ForegroundColor DarkMagenta
    yarn affine @affine/electron package --platform=win32 --arch=x64
    if ($LASTEXITCODE -ne 0) { Handle-Error }

    # Step 5: Create the Installer for win32, switch comments to use nsis instead
    Write-Host "Build_Win_Desktop: Creating the Installer for win32..." -ForegroundColor DarkMagenta
    yarn affine @affine/electron make-squirrel --platform=win32 --arch=x64
    # yarn affine @affine/electron make-nsis --platform=win32 --arch=x64
    if ($LASTEXITCODE -ne 0) { Handle-Error }

    # Output the location of the created installer
$installerPath = "./packages/frontend/apps/electron/out/canary/AFFiNE-canary.exe"

if (Test-Path $installerPath) {
    Write-Host "Build_Win_Desktop: Build completed successfully!  Installer created at $installerPath" -ForegroundColor DarkMagenta
} else {
    Write-Host "Build_Win_Desktop: Installer not found at expected location: $installerPath" -ForegroundColor Red
}

} catch {
    Handle-Error
} finally {
    # Clear environment variables
    Clear-EnvVariables
}
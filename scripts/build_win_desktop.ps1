# This Powershell script is used to automatically build the Windows client installer for the AFFiNE desktop app.
# It is designed to run locally on a Windows environment and has only been tested on:
# PowerShell version 5.1.26100.2200.
# Please ensure all prerequisites (Node.js, Yarn, Rust) are installed and accessible via the system PATH before running.
#
# Written by @Xyvir; Last Updated: March 16, 2025

# Add a parameter to accept the -nsis flag
param (
    [switch]$nsis,
    [switch]$YesToAll
)

# Define the project root directory
$ProjectRoot = Join-Path -Path $PSScriptRoot -ChildPath ".."

# Change to the project root directory
Set-Location -Path (Join-Path -Path $PSScriptRoot -ChildPath "..")

# Set environment variables
$env:BUILD_TYPE = "canary"
$env:DISTRIBUTION = "desktop"
$env:HOIST_NODE_MODULES = 1
$env:NODE_OPTIONS = "--max-old-space-size=4096"  # Increase heap size globally to 4 GB



# Function to clear environment variables
function Clear-EnvVariables {
    Remove-Item Env:BUILD_TYPE -ErrorAction SilentlyContinue
    Remove-Item Env:DISTRIBUTION -ErrorAction SilentlyContinue
    Remove-Item Env:SKIP_WEB_BUILD -ErrorAction SilentlyContinue
    Remove-Item Env:HOIST_NODE_MODULES -ErrorAction SilentlyContinue
    Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue  # Reset NODE_OPTIONS
}

# Function to handle errors
function Handle-Error {
    Write-Host "Build_Win_Desktop.ps1 : An error occurred. Aborting the build process." -ForegroundColor DarkMagenta
    Clear-EnvVariables
    exit 1
}

# Function to check Node.js, Yarn, and Rust versions
function Check-Versions {
    Write-Host "Build_Win_Desktop.ps1 : Checking Node.js, Yarn, and Rust versions..." -ForegroundColor DarkMagenta

    # Check Node.js version
    $nodeVersion = node -v 2>$null
    if ($LASTEXITCODE -ne 0 -or $nodeVersion -notlike "v22.14.0") {
        Write-Host "Build_Win_Desktop.ps1 : Node.js v22.14.0 is required but not found. Please install it." -ForegroundColor DarkMagenta
        exit 1
    }

    # Check Yarn version
    $yarnVersion = yarn -v 2>$null
    if ($LASTEXITCODE -ne 0 -or $yarnVersion -ne "4.7.0") {
        Write-Host "Build_Win_Desktop.ps1 : Yarn v4.7.0 is required but not found. Please install it." -ForegroundColor DarkMagenta
        exit 1
    }

    # Check Rust version
    $rustVersion = rustc -V 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build_Win_Desktop.ps1 : Rust is not installed. Please install Rust to proceed." -ForegroundColor DarkMagenta
        exit 1
    }

    Write-Host "Build_Win_Desktop.ps1 : Dependencies Node.js, Yarn, and Rust versions are correct." -ForegroundColor DarkMagenta
}

# Function to check if @affine/native module is built
function Check-Native-Built {
    Write-Host "Build_Win_Desktop.ps1 : Checking if @affine/native module is already built..." -ForegroundColor DarkMagenta
    $nativeBuildFile = "packages/frontend/native/affine.win32-x64-msvc.node"
    if (Test-Path $nativeBuildFile) {
        Write-Host "Build_Win_Desktop.ps1 : Native module already exists." -ForegroundColor Yellow
        return $true
    } else {
        Write-Host "Build_Win_Desktop.ps1 : @affine/native module is not built. Proceeding with build..." -ForegroundColor DarkMagenta
        return $false
    }
}

# Function to clean up all node_modules directories recursively
function Cleanup-NodeModules {
    param (
        [string]$PathToClean
    )
    Write-Host "Build_Win_Desktop.ps1 : Searching for and cleaning up all node_modules subdirectories in $PathToClean..." -ForegroundColor DarkMagenta
    Get-ChildItem -Path $PathToClean -Filter "node_modules" -Recurse -Directory | ForEach-Object {
        Write-Host "Removing: $($_.FullName)" -ForegroundColor Yellow
        Remove-Item -Recurse -Force $_.FullName
    }
    Write-Host "Build_Win_Desktop.ps1 : All node_modules subdirectories successfully deleted in $PathToClean." -ForegroundColor DarkMagenta
}

# Function to reconfigure Yarn and reinstall dependencies with hoisting disabled
function Reconfigure-Yarn {
    Write-Host "Build_Win_Desktop.ps1 : Reconfiguring Yarn to disable hoisting..." -ForegroundColor DarkMagenta

    # Cleanup all node_modules subdirectories
    Cleanup-NodeModules -PathToClean $ProjectRoot

    # Reconfigure Yarn to disable hoisting
    yarn config set nmMode classic
    yarn config set nmHoistingLimits workspaces
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build_Win_Desktop.ps1 : Failed to configure Yarn. Aborting." -ForegroundColor Red
        exit 1
    }

    # Reinstall dependencies with hoisting disabled
    Write-Host "Build_Win_Desktop.ps1 : Reinstalling dependencies with hoisting disabled..." -ForegroundColor DarkMagenta
    yarn install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build_Win_Desktop.ps1 : Failed to reinstall dependencies. Aborting." -ForegroundColor Red
        exit 1
    }

    Write-Host "Build_Win_Desktop.ps1 : Yarn reconfiguration and dependency installation completed successfully." -ForegroundColor DarkMagenta
}

# Function to reset Yarn to default settings
function Reset-Yarn {
    Write-Host "Build_Win_Desktop.ps1 : Resetting Yarn to default settings..." -ForegroundColor DarkMagenta

    # Reset Yarn configuration to default
    yarn config unset nmMode
    yarn config unset nmHoistingLimits
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build_Win_Desktop.ps1 : Failed to reset Yarn settings. Please check manually." -ForegroundColor Red
    } else {
        Write-Host "Build_Win_Desktop.ps1 : Yarn settings reset to default successfully." -ForegroundColor DarkMagenta
    }
}

# Function to run "yarn install" only once per script execution
function OneTime-YarnInstall {
    # Static variable to track if yarn install has already been run
    if (-not $global:HasRunYarnInstall) {
        Write-Host "Build_Win_Desktop.ps1 : Running 'yarn install'..." -ForegroundColor DarkMagenta
        yarn install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Build_Win_Desktop.ps1 : 'yarn install' failed. Aborting." -ForegroundColor Red
            exit 1
        }
        $global:HasRunYarnInstall = $true
        Write-Host "Build_Win_Desktop.ps1 : 'yarn install' completed successfully." -ForegroundColor DarkMagenta
    }
}

# Enable error handling
$ErrorActionPreference = "Stop"

try {
    # Step 0: Check for Node.js, Yarn, and Rust
    Check-Versions

    # Step 0.5: Check if output directory exists and prompt user to clean or cancel
    $outputDir = Join-Path -Path $ProjectRoot -ChildPath "packages\frontend\apps\electron\out\canary"
    if (Test-Path $outputDir) {
        Write-Host "Build_Win_Desktop.ps1 : Existing build files found in $outputDir." -ForegroundColor Yellow
        if ($YesToAll) {
            $response = "y"
        } else {
            $response = Read-Host "Build_Win_Desktop.ps1 : Do you want to clean the output directory before proceeding? (y to clean, anything else to cancel)"
        }
        if ($response -eq "y") {
            Write-Host "Build_Win_Desktop.ps1 : Cleaning the output directory..." -ForegroundColor DarkMagenta
            Remove-Item -Recurse -Force $outputDir
            Write-Host "Build_Win_Desktop.ps1 : Output directory cleaned." -ForegroundColor DarkMagenta
        } else {
            Write-Host "Build_Win_Desktop.ps1 : Operation canceled by the user." -ForegroundColor Red
            exit 1
        }
    }

    # Step 1: Build native module if not already built
    if (-not (Check-Native-Built)) {
        Write-Host "Build_Win_Desktop.ps1 : Building native module..." -ForegroundColor DarkMagenta
        OneTime-YarnInstall
        yarn affine @affine/native build
        if ($LASTEXITCODE -ne 0) { Handle-Error }
    } else {
        if ($YesToAll) {
            $response = "y"
        } else {
            $response = Read-Host "Build_Win_Desktop.ps1 Native module exists. Rebuild from current source? (y/n) (Recommended if the native source has been modified)"
        }
        if ($response -eq "y") {
            Write-Host "Build_Win_Desktop.ps1 : Rebuilding native module from current source..." -ForegroundColor DarkMagenta
            OneTime-YarnInstall
            yarn affine @affine/native build
            if ($LASTEXITCODE -ne 0) { Handle-Error }
        } else {
            Write-Host "Build_Win_Desktop.ps1 : Using existing native module build." -ForegroundColor DarkMagenta
        }
    }

    # Step 2: Build the web app if not already built
    $webAppIndexFile = Join-Path -Path $ProjectRoot -ChildPath "packages/frontend/apps/web/dist/index.html"
    if (-not (Test-Path $webAppIndexFile)) {
        Write-Host "Build_Win_Desktop.ps1 : Web app not built. Proceeding with build..." -ForegroundColor DarkMagenta
        OneTime-YarnInstall
        yarn build --package @affine/web
        if ($LASTEXITCODE -ne 0) { Handle-Error }
    } else {
        Write-Host "Build_Win_Desktop.ps1 : Web app already exists." -ForegroundColor Yellow
        $response = Read-Host "Build_Win_Desktop.ps1 Rebuild web app from current source? (y/n) (Recommended if the web app source has been modified)"
        if ($response -eq "y") {
            Write-Host "Build_Win_Desktop.ps1 : Rebuilding web app from current source..." -ForegroundColor DarkMagenta
            OneTime-YarnInstall
            yarn build --package @affine/web
            if ($LASTEXITCODE -ne 0) { Handle-Error }
        } else {
            Write-Host "Build_Win_Desktop.ps1 : Using existing web app build." -ForegroundColor DarkMagenta
        }
    }

    # Step 3: Generate assets
    Write-Host "Build_Win_Desktop.ps1 : Generating assets..." -ForegroundColor DarkMagenta
    OneTime-YarnInstall
    yarn affine @affine/electron generate-assets
    if ($LASTEXITCODE -ne 0) { Handle-Error }

    # Step 4: Reconfigure Yarn and reinstall dependencies with hoisting disabled
    Write-Host "Build_Win_Desktop.ps1 : Reconfiguring Yarn and reinstalling dependencies..." -ForegroundColor DarkMagenta
    Reconfigure-Yarn

    # Step 5: Build the desktop layers
    Write-Host "Build_Win_Desktop.ps1 : Building the desktop layers..." -ForegroundColor DarkMagenta
    yarn affine @affine/electron build
    if ($LASTEXITCODE -ne 0) { Handle-Error }

    # Step 6: Package the application for win32
    Write-Host "Build_Win_Desktop.ps1 : Packaging the application for win32..." -ForegroundColor DarkMagenta
    yarn affine @affine/electron package --platform=win32 --arch=x64
    if ($LASTEXITCODE -ne 0) { Handle-Error }

    # Step 7: Create the Installer for win32
    $env:SKIP_WEB_BUILD=1
    if ($nsis) {
        Write-Host "Build_Win_Desktop.ps1 : Building NSIS installer (Use without -nsis flag to build Squirrel installer instead)..." -ForegroundColor DarkMagenta
        yarn affine @affine/electron make-nsis --platform=win32 --arch=x64
        $installerPath = Join-Path -Path $outputDir -ChildPath "make\nsis.windows\x64\AFFiNE-canary-0.20.0 Setup.exe"
    } else {
        Write-Host "Build_Win_Desktop.ps1 : Building Squirrel installer (Use -nsis flag to build NSIS installer instead)..." -ForegroundColor DarkMagenta
        yarn affine @affine/electron make-squirrel --platform=win32 --arch=x64
        $installerPath = Join-Path -Path $outputDir -ChildPath "make\squirrel.windows\x64\AFFiNE-canary-0.20.0 Setup.exe"
    }

    if ($LASTEXITCODE -ne 0) { Handle-Error }

    # Step 8: Cleanup all node_modules subdirectories
    Write-Host "Build_Win_Desktop.ps1 : Would you like to clean up all non-hoisted node_modules subdirectories (or save them for future builds)?" -ForegroundColor Yellow
    if ($YesToAll) {
        $response = "y"
    } else {
        $response = Read-Host "Enter 'y' to delete all node_modules subdirectories, or anything else to keep them"
    }
    if ($response -eq "y") {
        Cleanup-NodeModules -PathToClean $ProjectRoot
    } else {
        Write-Host "Build_Win_Desktop.ps1 : Keeping existing non-hoisted node_modules subdirectories for future electron builds." -ForegroundColor DarkMagenta
    }

    # Output the location of the created installer to terminal
    if (Test-Path $installerPath) {
        Write-Host "Build_Win_Desktop.ps1 : Build completed successfully!" -ForegroundColor DarkMagenta
        Write-Host ""
        Write-Host "Build_Win_Desktop.ps1 : Installer created at:" -ForegroundColor DarkMagenta
        Write-Host "$installerPath" -ForegroundColor DarkMagenta
        Write-Host ""
    } else {
        Write-Host "Build_Win_Desktop.ps1 : Installer not found at expected location: $installerPath" -ForegroundColor Red
    }
    

} catch {
    Handle-Error
    Cleanup-NodeModules
} finally {
    # Clear environment variables
    Clear-EnvVariables

    # Reset Yarn to default settings
    Reset-Yarn
}
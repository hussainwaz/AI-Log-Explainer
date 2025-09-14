# This script automates running the backend server.
# It ensures the virtual environment is active and runs from the project root.

# Get the directory where the script is located
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Set the current location to the script's directory (project root)
Set-Location $scriptDir

Write-Host "Running from: $(Get-Location)"

# --- Step 1: Activate Virtual Environment ---
$venvPath = Join-Path $scriptDir ".venv/Scripts/Activate.ps1"

if (-not (Test-Path $venvPath)) {
    Write-Host "Virtual environment not found. Creating it now..."
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create virtual environment. Make sure Python is installed and in your PATH."
        exit 1
    }
}

Write-Host "Activating virtual environment..."
& $venvPath

# --- Step 2: Install/Update Dependencies ---
Write-Host "Installing dependencies from backend/requirements.txt..."
pip install -r (Join-Path $scriptDir "backend/requirements.txt")
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install dependencies."
    exit 1
}

# --- Step 3: Run the Server ---
Write-Host "Starting Uvicorn server on http://127.0.0.1:8000"
Write-Host "(Press CTRL+C to stop)"

# Use python -m uvicorn to be certain we're using the venv's package
# Add the project root to PYTHONPATH to fix the "Could not import module 'app'" error
$env:PYTHONPATH = "$scriptDir" + [IO.Path]::PathSeparator + $env:PYTHONPATH
python -m uvicorn app:app --reload --app-dir backend --port 8000

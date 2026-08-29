$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
npm run build
npx cap sync android
./android/gradlew -p android assembleRelease
./android/gradlew -p android bundleRelease
Write-Host "Build complete. APK: android/app/build/outputs/apk/release/app-release.apk"
Write-Host "Build complete. AAB: android/app/build/outputs/bundle/release/app-release.aab"

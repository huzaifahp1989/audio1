@echo off
setlocal
cd /d "%~dp0.."
npm run build
npx cap sync android
call android\gradlew -p android assembleRelease
call android\gradlew -p android bundleRelease
@echo Build complete.
@echo APK: android\app\build\outputs\apk\release\app-release.apk
@echo AAB: android\app\build\outputs\bundle\release\app-release.aab


# Build Troubleshooting Guide

## Current Status

All references to `ffmpeg-kit-react-native` in the project are correctly set to version **6.0.2**.

## If You're Still Getting Build Errors

### Step 1: Clean Local Environment

```bash
# Remove all build artifacts and dependencies
rm -rf node_modules package-lock.json yarn.lock bun.lockb
rm -rf ios/Pods ios/Podfile.lock ios/build

# Clear package manager cache
npm cache clean --force
# OR if using yarn
yarn cache clean
# OR if using bun
bun pm cache rm
```

### Step 2: Reinstall Dependencies

```bash
# This will automatically run the postinstall script
npm install
# OR
yarn install
# OR
bun install
```

You should see output like:
```
✅ Successfully patched ffmpeg-kit-react-native.podspec
   All references to v6.0 have been updated to v6.0.2
```

### Step 3: Verify the Patch

```bash
# Check that the podspec was patched correctly
grep "6.0.2" node_modules/ffmpeg-kit-react-native/ffmpeg-kit-react-native.podspec
```

You should see URLs like:
```
https://github.com/arthenica/ffmpeg-kit/releases/download/v6.0.2/ffmpeg-kit-https-6.0.2-ios-xcframework.zip
```

### Step 4: Commit Your Lockfile

**IMPORTANT:** Make sure you have a lockfile committed to your repository!

```bash
# Generate lockfile if it doesn't exist
npm install  # Creates package-lock.json
# OR
yarn install  # Creates yarn.lock
# OR
bun install  # Creates bun.lockb

# Commit the lockfile
git add package-lock.json  # or yarn.lock or bun.lockb
git commit -m "Add lockfile for consistent builds"
git push
```

EAS Build needs a lockfile to know which package manager to use and to ensure consistent dependency versions.

### Step 5: Clean EAS Build Cache

```bash
# Build with cache cleared
eas build --platform ios --profile production --clear-cache
```

The `--clear-cache` flag ensures EAS doesn't use any cached dependencies or build artifacts.

## Common Issues and Solutions

### Issue 1: "No version matching 6.0.3 found"

**Cause:** Cached lockfile or node_modules referencing non-existent version

**Solution:**
1. Delete lockfile and node_modules locally
2. Run `npm install` to regenerate
3. Commit new lockfile
4. Build with `--clear-cache`

### Issue 2: "404 error downloading v6.0 iOS framework"

**Cause:** Podspec wasn't patched or patch didn't apply

**Solution:**
1. Manually run: `node scripts/patch-ffmpeg-kit.js`
2. Verify patch applied: `grep "6.0.2" node_modules/ffmpeg-kit-react-native/ffmpeg-kit-react-native.podspec`
3. If still failing, delete `node_modules` and reinstall

### Issue 3: "Did not detect any lock files"

**Cause:** No lockfile committed to repository

**Solution:**
1. Run `npm install` locally to generate `package-lock.json`
2. Commit the lockfile: `git add package-lock.json && git commit -m "Add lockfile"`
3. Push to repository
4. Rebuild on EAS

### Issue 4: Postinstall script didn't run

**Cause:** Package manager didn't execute postinstall hook

**Solution:**
1. Manually run: `node scripts/patch-ffmpeg-kit.js`
2. Check package.json has: `"postinstall": "node scripts/patch-ffmpeg-kit.js"`
3. Try different package manager (npm vs yarn vs bun)

## Verification Checklist

Before building on EAS, verify locally:

- [ ] **Lockfile exists and is committed**
  ```bash
  ls -la package-lock.json  # or yarn.lock or bun.lockb
  git status  # Should show lockfile is tracked
  ```

- [ ] **Dependencies installed successfully**
  ```bash
  npm install
  # Should complete without errors
  ```

- [ ] **Postinstall script ran**
  ```bash
  # Should see in npm install output:
  # ✅ Successfully patched ffmpeg-kit-react-native.podspec
  ```

- [ ] **Podspec is patched**
  ```bash
  grep "6.0.2" node_modules/ffmpeg-kit-react-native/ffmpeg-kit-react-native.podspec
  # Should return multiple matches
  ```

- [ ] **Package.json has correct version**
  ```bash
  grep "ffmpeg-kit-react-native" package.json
  # Should show: "ffmpeg-kit-react-native": "6.0.2"
  ```

## EAS Build Command

Once everything is verified locally, build with:

```bash
# For production TestFlight build
eas build --platform ios --profile production --clear-cache

# For development build
eas build --platform ios --profile development --clear-cache
```

## Expected Build Output

### Successful Dependency Installation:
```
Installing with npm in: /Users/expo/workingdir/build
> npm install
✓ Installing ffmpeg-kit-react-native@6.0.2
✓ Running postinstall script
✓ Successfully patched ffmpeg-kit-react-native.podspec
```

### Successful Pod Installation:
```
Installing Pods
> pod install
✓ Installing ffmpeg-kit-ios-https (6.0.2)
✓ Pod installation complete
```

### Successful Build:
```
✓ Build completed successfully
✓ Uploaded to TestFlight
```

## Still Having Issues?

If you've followed all steps and are still experiencing issues:

1. **Check EAS Build Logs:**
   - Look for the exact error message
   - Check which version is being attempted
   - Verify postinstall script output

2. **Try Different Package Manager:**
   ```bash
   # If using npm, try yarn
   rm -rf node_modules package-lock.json
   yarn install
   git add yarn.lock
   git commit -m "Switch to yarn"
   ```

3. **Verify GitHub Release Exists:**
   - Visit: https://github.com/arthenica/ffmpeg-kit/releases
   - Confirm v6.0.2 exists
   - Check that iOS xcframework files are available

4. **Contact Support:**
   - Include EAS build logs
   - Include output of `npm install`
   - Include output of `grep "ffmpeg" package.json`

## Summary

Your project is correctly configured to use `ffmpeg-kit-react-native@6.0.2`. The most common cause of build failures is **cached dependencies** or **missing lockfiles**. Follow the steps above to ensure a clean build environment.

**Key Points:**
- ✅ package.json specifies 6.0.2
- ✅ Postinstall script patches podspec
- ✅ iOS Podfile forces correct version
- ✅ Documentation is up to date
- ⚠️ Must have lockfile committed
- ⚠️ Must clear cache on EAS Build

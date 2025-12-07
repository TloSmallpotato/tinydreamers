
# TurboModule Crash Debugging Guide

## Overview
This document provides guidance on debugging TurboModule crashes that occur after sign-in in React Native apps, particularly those related to view snapshots during navigation transitions.

## Common Symptoms
- App crashes immediately after successful sign-in
- Crash occurs in Thread 10 (TurboModule manager queue)
- Stack trace shows `resizableSnapshotViewFromRect` calls
- Crash happens during mounting/rendering operations
- No visible error message to the user

## Root Causes

### 1. Race Conditions
- Authentication state changes trigger multiple context providers simultaneously
- Navigation occurs before views are fully mounted
- Data fetching starts before native modules are ready

### 2. View Snapshot Issues
- Navigation transitions attempt to take snapshots of unmounted views
- React Native tries to capture view state during critical mounting phases
- TurboModule system is overwhelmed by concurrent operations

### 3. Native Module Initialization
- Native modules not fully initialized when JavaScript calls them
- Timing issues between JavaScript and native threads
- Missing error handling in native module calls

## Implemented Fixes

### 1. Extended Delays After Sign-In
**File:** `contexts/AuthContext.tsx`

```typescript
// Extended delay to ensure all native modules are ready
// This prevents view snapshot crashes during navigation
await new Promise(resolve => {
  signInTimeoutRef.current = setTimeout(resolve, 1000);
});
```

**Why:** Gives native modules time to initialize before navigation occurs.

### 2. Initialization Flags
**File:** `contexts/AuthContext.tsx`

```typescript
const [isInitialized, setIsInitialized] = useState(false);
```

**Why:** Prevents premature rendering and navigation before auth is ready.

### 3. Fetch Guards
**File:** `contexts/ChildContext.tsx`

```typescript
const isFetching = useRef(false);

// Prevent concurrent fetches
if (isFetching.current) {
  console.log('ChildContext: Already fetching, skipping');
  return;
}
```

**Why:** Prevents multiple simultaneous database queries that can overwhelm TurboModules.

### 4. Navigation Delays
**File:** `app/index.tsx`

```typescript
// Extended delay after sign-in to prevent TurboModule crashes
// This ensures all native modules are ready before navigation
await new Promise(resolve => setTimeout(resolve, 800));
```

**Why:** Ensures views are fully mounted before navigation transitions.

### 5. Comprehensive Error Handling
**Files:** All context providers and components

```typescript
try {
  // Operation
} catch (err) {
  console.error('Error:', err);
  // Graceful fallback
}
```

**Why:** Prevents errors from propagating to native modules and causing crashes.

### 6. Timeout Cleanup
**Files:** `AuthContext.tsx`, `ChildContext.tsx`

```typescript
return () => {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
};
```

**Why:** Prevents memory leaks and ensures clean component unmounting.

## Debugging Steps

### 1. Enable Exception Breakpoints in Xcode
1. Open your project in Xcode
2. Click the Breakpoints navigator (⌘7)
3. Click the + button at the bottom left
4. Select "Exception Breakpoint"
5. This will pause execution when the exception is thrown, BEFORE the crash

### 2. Run on Physical Device
1. Connect your iPhone to your Mac
2. In Xcode, select your device from the device selector
3. Hit Run (⌘R)
4. Sign in and reproduce the crash
5. Xcode should break at the exact line throwing the exception

### 3. Check Console Logs
Look for these log patterns:
- `AuthProvider: User signed in, stabilizing session...`
- `ChildContext: Fetching children for user:`
- `Index: Redirecting to profile after sign-in`

Any errors or warnings before these logs indicate the problem area.

### 4. Monitor Native Module Calls
Watch for:
- Multiple simultaneous database queries
- Navigation calls during loading states
- View snapshot operations during transitions

### 5. Check Timing
Verify these delays are sufficient:
- Auth initialization: 100ms
- Sign-in stabilization: 1000ms
- Navigation after sign-in: 800ms
- Child data fetch: 500ms

If crashes persist, increase these delays incrementally.

## Testing Checklist

After implementing fixes, test these scenarios:

- [ ] Sign in with new account
- [ ] Sign in with existing account
- [ ] Sign in with slow network
- [ ] Sign in and immediately interact with UI
- [ ] Sign out and sign in again
- [ ] Kill app and reopen (session restoration)
- [ ] Background app during sign-in
- [ ] Rotate device during sign-in

## Performance Considerations

The implemented delays add ~2 seconds to the sign-in flow:
- 1000ms: Auth stabilization
- 800ms: Navigation delay
- 500ms: Data fetch delay

This is acceptable for preventing crashes, but can be optimized:

### Optimization Strategies
1. **Progressive Loading**: Show loading states instead of delays
2. **Lazy Initialization**: Initialize modules on-demand
3. **Parallel Operations**: Use `Promise.all()` for independent operations
4. **Caching**: Cache frequently accessed data
5. **Preloading**: Preload data during authentication

## Monitoring

Add these logs to track performance:

```typescript
const startTime = Date.now();
// Operation
console.log(`Operation took ${Date.now() - startTime}ms`);
```

Monitor these metrics:
- Time to first render after sign-in
- Number of database queries on sign-in
- Native module initialization time
- Navigation transition duration

## Known Limitations

1. **Delays are not guaranteed**: Device performance varies
2. **Network latency**: Slow networks may require longer delays
3. **Memory pressure**: Low memory can cause crashes despite delays
4. **iOS version differences**: Behavior varies across iOS versions

## Future Improvements

1. **Native Module Readiness Check**: Implement a native module that signals when all modules are ready
2. **Progressive Enhancement**: Load UI in stages rather than all at once
3. **Error Recovery**: Implement automatic retry logic for failed operations
4. **Crash Reporting**: Integrate Sentry or similar for production crash tracking
5. **Performance Profiling**: Use React Native Performance Monitor to identify bottlenecks

## Additional Resources

- [React Native TurboModules Documentation](https://reactnative.dev/docs/the-new-architecture/pillars-turbomodules)
- [Debugging React Native Apps](https://reactnative.dev/docs/debugging)
- [Xcode Debugging Guide](https://developer.apple.com/documentation/xcode/debugging)
- [Supabase Error Handling](https://supabase.com/docs/guides/api/error-handling)

## Support

If crashes persist after implementing these fixes:

1. Check Xcode crash logs for specific error codes
2. Review native module implementations
3. Test on different iOS versions
4. Consider filing an issue with React Native or Expo
5. Consult the Supabase community for database-related issues

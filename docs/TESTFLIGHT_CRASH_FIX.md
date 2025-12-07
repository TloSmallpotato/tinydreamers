
# TestFlight Crash Fix - View Snapshot Issue

## Problem
The app was crashing on TestFlight (iOS/macOS Catalyst) with the following error:
```
Thread 12 Crashed:: Dispatch queue: com.meta.react.turbomodulemanager.queue
resizableSnapshotViewFromRect:afterScreenUpdates:withCapInsets:
```

This crash occurs when React Native's TurboModule system tries to take snapshots of views during animations or transitions, which is a known issue with macOS Catalyst builds.

## Root Cause
React Native attempts to create snapshot images of views for animations and transitions. On macOS Catalyst (which TestFlight uses for iOS apps), this snapshot operation can fail and cause the app to crash.

## Solution
We've disabled animations and snapshot-triggering features on iOS to prevent the crash:

### 1. Modal Components
Changed `animationType` from `"fade"` or `"slide"` to `"none"`:
- `FullScreenVideoPlayer.tsx`
- `ISBNNotFoundModal.tsx`

### 2. BottomSheet Components
Added two critical props to all BottomSheet components:
```typescript
animateOnMount={false}
enableContentPanningGesture={Platform.OS !== 'ios'}
```

Updated components:
- `AddWordBottomSheet.tsx`
- `BookDetailBottomSheet.tsx`
- `WordDetailBottomSheet.tsx`
- `SelectWordBottomSheet.tsx`
- `ChildSelectorBottomSheet.tsx`
- `AddChildBottomSheet.tsx`
- `AddCustomBookBottomSheet.tsx`
- `SettingsBottomSheet.tsx`

### 3. Helper Utility
Created `utils/bottomSheetConfig.ts` with reusable configuration functions for consistent application of these fixes across the app.

## What Changed
- **Animations**: Disabled mount animations for bottom sheets on iOS
- **Gestures**: Disabled content panning gestures on iOS (pan-down-to-close still works)
- **Modals**: Changed to instant appearance instead of fade/slide animations

## User Experience Impact
- Bottom sheets and modals now appear instantly instead of animating in
- Functionality remains exactly the same
- No impact on Android or web platforms
- Prevents crashes on TestFlight/production iOS builds

## Testing
After applying these fixes:
1. Test all bottom sheets (Books, Words, Settings, etc.)
2. Test video player modal
3. Test ISBN scanner modal
4. Verify no crashes occur when opening/closing these components
5. Test on TestFlight build specifically

## Technical Details
The crash was happening in:
- `resizableSnapshotViewFromRect:afterScreenUpdates:withCapInsets:` (Objective-C method)
- During React Native's mounting/rendering operations
- Specifically when animations triggered view snapshot operations

By disabling animations and certain gestures on iOS, we prevent React Native from attempting to take these problematic snapshots.

## References
- React Native Issue: Known macOS Catalyst snapshot crash
- Expo Router: Modal presentation styles
- @gorhom/bottom-sheet: Animation configuration options

## Future Considerations
- Monitor React Native updates for fixes to the underlying snapshot issue
- Consider re-enabling animations once the issue is resolved in React Native core
- Test on future iOS versions to see if Apple resolves the Catalyst snapshot issue

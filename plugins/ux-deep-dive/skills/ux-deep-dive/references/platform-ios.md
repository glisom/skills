# Platform: iOS simulator

Commands assume Xcode's command-line tools. `UDID` is the simulator's identifier from `xcrun simctl list devices booted`. Driving (tap, swipe, type) uses whatever device-control tool the harness exposes; everything else below is `simctl`.

## Build and install

- **Stale generated project.** When `ios/` is generated and gitignored (Expo, React Native with prebuild), a checkout whose `ios/` predates a native config change will miss pods and fail with a module-not-found error and no hint about the cause. Regenerate: `npx expo prebuild -p ios --clean`.
- **Locale for CocoaPods.** `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` before `pod install`; without it, recent Ruby versions abort with an encoding error.
- **Build directly when the CLI misdetects the target.** If `expo run:ios` or `react-native run-ios` insists on a physical device with none attached, build with `xcodebuild` against the booted simulator:

  ```bash
  xcodebuild -workspace ios/<App>.xcworkspace -scheme <App> -configuration Debug \
    -sdk iphonesimulator -destination "id=$UDID" -derivedDataPath ios/build \
    CODE_SIGN_IDENTITY="-" CODE_SIGNING_REQUIRED=NO build
  ```

  Use `CODE_SIGN_IDENTITY="-"` rather than `CODE_SIGNING_ALLOWED=NO`. The latter strips entitlements, and a keychain-backed secure store then throws at launch.
- **Paths with spaces.** Generated build phases sometimes interpolate script paths unquoted and fail on a space in the checkout path, after compiling but before embedding frameworks, so the app installs and then dies with a dynamic-loader error that points nowhere near the cause. Either patch the generated phase to quote its substitutions (the patch is disposable if the project is regenerated) or clone to a space-free path. Record it as a DX finding either way.
- **Install, launch, terminate.**

  ```bash
  xcrun simctl install "$UDID" path/to/<App>.app
  xcrun simctl launch "$UDID" <bundle.id>
  xcrun simctl terminate "$UDID" <bundle.id>
  xcrun simctl uninstall "$UDID" <bundle.id>
  ```

- **Debug builds load JavaScript from the bundler.** Start it with the environment flags on the command line; it is the only place the flags need to be set:

  ```bash
  EXPO_PUBLIC_API_BASE_URL=http://localhost:3006/api EXPO_PUBLIC_FLAG_ONE=true npx expo start --port 8081 --clear
  ```

## Capture

```bash
xcrun simctl io "$UDID" screenshot --type=png raw/NN-slug.png
```

Modern iPhones are 3x: a 1206 by 2622 capture is a 402 by 874 point space. `assets/capture.sh` does the capture and writes the point-scale preview.

## Record

```bash
xcrun simctl io "$UDID" recordVideo --codec=h264 --force motion/NN-slug.mov &
# perform the interaction
kill -INT %1   # stop with SIGINT, never SIGKILL, or the file is unreadable
ffmpeg -y -i motion/NN-slug.mov -vf "scale=402:-2" -c:v libx264 -preset veryfast -crf 26 \
  -pix_fmt yuv420p -movflags +faststart motion/NN-slug.mp4
```

`assets/record.sh start <slug>` and `assets/record.sh stop` wrap this.

## Navigate

```bash
xcrun simctl openurl "$UDID" "<scheme>://path/to/screen"
```

The scheme is in the app config. Universal links need the associated domain; the custom scheme is the reliable route on a simulator.

## Text entry

```bash
printf 'jordan.sample@example.com' | xcrun simctl pbcopy "$UDID"
```

Then long-press or select-all in the field and paste. The host clipboard is also synced to the simulator on recent Xcode versions, so `pbcopy` on the host works as well; use one or the other consistently.

## Keyboard

The software keyboard is hidden while a hardware keyboard is connected. Disconnect it and restart the Simulator app (the device stays booted):

```bash
defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool false
osascript -e 'quit app "Simulator"'; open -a Simulator --args -CurrentDeviceUDID "$UDID"
```

## Clean status bar

```bash
xcrun simctl status_bar "$UDID" override --time 9:41 --batteryState charged --batteryLevel 100 \
  --cellularBars 4 --wifiBars 3 --dataNetwork wifi
xcrun simctl status_bar "$UDID" clear
```

## Appearance passes

```bash
xcrun simctl ui "$UDID" appearance dark
xcrun simctl ui "$UDID" content_size extra-extra-extra-large
xcrun simctl ui "$UDID" content_size medium
xcrun simctl ui "$UDID" appearance light
```

## State

```bash
xcrun simctl uninstall "$UDID" <bundle.id>              # wipes app data, not the keychain
xcrun simctl keychain "$UDID" reset                      # the keychain survives a reinstall; reset it for a logged-out capture
xcrun simctl privacy "$UDID" grant photos <bundle.id>    # pre-grant a permission, or `reset` to see the prompt again
xcrun simctl push "$UDID" <bundle.id> payload.json       # a simulated push, for notification screens
```

## Crashes

```bash
xcrun simctl spawn "$UDID" launchctl list | grep <bundle.id>     # empty means the process is gone
xcrun simctl spawn "$UDID" log show --predicate 'process == "<App>"' --last 2m --style compact \
  | grep -iE "Terminating app|uncaught exception|fatal"
```

Keep the exception line verbatim. An `NSInternalInconsistencyException` or a Fabric view-registry message is a native fault that no JavaScript error boundary can catch; a red box or a boundary fallback screen is a JavaScript error. Say which.

## React Native specifics

- A warnings toast reappears on every reload. Read it (a require cycle is a real finding), then suppress it reversibly in the root layout with `LogBox.ignoreAllLogs(true)` behind a marked comment, and revert it in Phase 7.
- Hardware-key injection into the simulator can open the developer menu. Use the clipboard route for text.
- A background color placed inside a `Pressable`'s function-form `style` prop while the label color is static can render an invisible primary action. When a button is missing from a capture, read the component before recording anything; when the component confirms it, it is a P1 with a cited line.

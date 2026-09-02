# Platform: Android emulator

Commands assume the platform tools on the path. `SERIAL` is the device from `adb devices`; omit `-s` when there is only one. Driving uses the harness's device-control tool when it has one; `adb shell input` is the fallback and is sufficient.

## Build and install

```bash
./gradlew -p android assembleDebug            # or: npx expo run:android, flutter build apk --debug
adb -s "$SERIAL" install -r android/app/build/outputs/apk/debug/app-debug.apk
adb -s "$SERIAL" shell monkey -p <package> -c android.intent.category.LAUNCHER 1
adb -s "$SERIAL" shell am force-stop <package>
```

- **Port forwarding.** The emulator reaches the host at `10.0.2.2`, not `localhost`. Either point the app at `http://10.0.2.2:<port>` or reverse the ports so `localhost` works inside the emulator:

  ```bash
  adb reverse tcp:8081 tcp:8081     # the bundler
  adb reverse tcp:3006 tcp:3006     # the fixture server
  ```

- **Hardware keyboard.** An AVD with `hw.keyboard=yes` hides the software keyboard. Edit the AVD's `config.ini` or toggle it in the AVD settings and cold-boot.

## Capture

```bash
adb -s "$SERIAL" exec-out screencap -p > raw/NN-slug.png
```

The scale factor is the device density divided by 160 (`adb shell wm density`). `assets/capture.sh` handles both.

## Record

```bash
adb -s "$SERIAL" shell screenrecord --time-limit 180 /sdcard/uxdd-slug.mp4 &
# perform the interaction, then stop with SIGINT to the adb process
kill -INT %1
adb -s "$SERIAL" pull /sdcard/uxdd-slug.mp4 motion/NN-slug-src.mp4
ffmpeg -y -i motion/NN-slug-src.mp4 -vf "scale=402:-2" -c:v libx264 -preset veryfast -crf 26 \
  -pix_fmt yuv420p -movflags +faststart motion/NN-slug.mp4
```

`screenrecord` cannot capture some secure surfaces and stops at three minutes; record one behavior per clip. `assets/record.sh` wraps this with `UXDD_PLATFORM=android`.

## Navigate

```bash
adb -s "$SERIAL" shell am start -W -a android.intent.action.VIEW -d "<scheme>://path/to/screen" <package>
adb -s "$SERIAL" shell dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity"   # confirm where you landed
```

## Input

```bash
adb shell input tap X Y
adb shell input swipe X1 Y1 X2 Y2 300
adb shell input text 'jordan.sample@example.com'      # spaces as %s; symbols are unreliable, verify in a capture
adb shell input keyevent KEYCODE_BACK                  # KEYCODE_MENU (82) opens the React Native dev menu; avoid it
```

There is no built-in clipboard write on modern Android without a helper app. Type into the field and verify it in a capture before judging any control that depends on it.

## Clean status bar

```bash
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
adb shell am broadcast -a com.android.systemui.demo -e command exit
```

## Appearance passes

```bash
adb shell cmd uimode night yes          # dark; `no` to revert
adb shell settings put system font_scale 1.3
adb shell settings put system font_scale 1.0
```

## State

```bash
adb shell pm clear <package>            # wipes app data and its credential storage together
```

## Crashes

```bash
adb shell pidof -s <package>            # empty means the process is gone
adb logcat -d -b crash | tail -60       # the crash buffer, with the exception and stack
adb logcat -d --pid=$(adb shell pidof -s <package>) '*:E' | tail -60
```

Keep the exception line verbatim. A `FATAL EXCEPTION` in the crash buffer is a native or unhandled Java error; a red box or a boundary fallback is a JavaScript error. Say which.

## React Native and Flutter specifics

- The React Native warnings toast and dev menu behave as on iOS; suppress reversibly, revert in Phase 7. The dev menu opens on `KEYCODE_MENU` (82), so avoid that key.
- Flutter debug builds show a debug banner in the corner; disable it reversibly (`debugShowCheckedModeBanner: false`) behind a marked comment, and revert.

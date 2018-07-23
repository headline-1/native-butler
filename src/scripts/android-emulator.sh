#!/usr/bin/env bash
set +e
AVD_PACKAGE=$1
AVD_NAME="RNEmulator"
EMULATOR_HIDDEN=$2

if [[ -z "$AVD_PACKAGE" ]]; then
  AVD_PACKAGE="system-images;android-27;google_apis_playstore;x86"
fi

echo "no" | avdmanager --silent create avd --force --name ${AVD_NAME} --package ${AVD_PACKAGE} || true
cd $(dirname $(which emulator))
if [[ "$EMULATOR_HIDDEN" == "hidden" ]]; then
  emulator -avd ${AVD_NAME} -no-audio -no-window &
else
  emulator -avd ${AVD_NAME} -skin "720x1280" &
fi

#Wait for emulator
bootanim=""
failcounter=0
timeout_in_sec=360

until [[ "$bootanim" =~ "stopped" ]]; do
  bootanim=`adb -e shell getprop init.svc.bootanim 2>&1 &`
  if [[ "$bootanim" =~ "device not found" || "$bootanim" =~ "device offline"
    || "$bootanim" =~ "running" ]]; then
    let "failcounter += 1"
    echo "Waiting for emulator to start"
    if [[ $failcounter -gt timeout_in_sec ]]; then
      echo "Timeout ($timeout_in_sec seconds) reached; failed kto start emulator"
      exit 1
    fi
  fi
  sleep 1
done

echo "Emulator is ready"

# Unlock screen
adb shell input keyevent 82

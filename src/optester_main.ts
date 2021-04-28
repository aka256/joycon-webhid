import { controlHID, getDeviceInfo, switchSimpleHIDInput, switchStandardInput, switchIMU, switchSimpleHIDInputMCU, switchMCUInput, switchMCUSuspend, switchMCUResume, getMCUState, switchNFCMode, switchIRMode, pollingToTarget, setPlayerLights, switchRumble, setRumble } from './event';
import { debugMode, toggleDebugMode } from './debug';

document.addEventListener("DOMContentLoaded", function(){
  // Home
  document.querySelector("#hid-connect-btn")?.addEventListener("click", controlHID);
  document.querySelector("#device-info-btn")?.addEventListener("click", getDeviceInfo);
  document.querySelector("#input-mode-simple")?.addEventListener("click", switchSimpleHIDInput);
  document.querySelector("#input-mode-standard")?.addEventListener("click", switchStandardInput);
  document.querySelector("#enable-imu-btn")?.addEventListener("click", switchIMU);
  document.querySelector("#player-light-on-1-btn")?.addEventListener("click", setPlayerLights);
  document.querySelector("#player-light-on-2-btn")?.addEventListener("click", setPlayerLights);
  document.querySelector("#player-light-on-3-btn")?.addEventListener("click", setPlayerLights);
  document.querySelector("#player-light-on-4-btn")?.addEventListener("click", setPlayerLights);
  document.querySelector("#player-light-flash-1-btn")?.addEventListener("click", setPlayerLights);
  document.querySelector("#player-light-flash-2-btn")?.addEventListener("click", setPlayerLights);
  document.querySelector("#player-light-flash-3-btn")?.addEventListener("click", setPlayerLights);
  document.querySelector("#player-light-flash-4-btn")?.addEventListener("click", setPlayerLights);
  document.querySelector("#enable-rumble-btn")?.addEventListener("click", switchRumble);
  document.querySelector("#rumble-set-btn")?.addEventListener("click", setRumble);
  // NFC/IR
  document.querySelector("#input-mode-mcu-simple-btn")?.addEventListener("click", switchSimpleHIDInputMCU);
  document.querySelector("#input-mode-mcu-nfc-ir-btn")?.addEventListener("click", switchMCUInput);
  document.querySelector("#mcu-suspend-btn")?.addEventListener("click", switchMCUSuspend);
  document.querySelector("#mcu-resume-btn")?.addEventListener("click", switchMCUResume);
  document.querySelector("#request-mcu-state-btn")?.addEventListener("click", getMCUState);
  document.querySelector("#nfc-mode-btn")?.addEventListener("click", switchNFCMode);
  document.querySelector("#ir-mode-btn")?.addEventListener("click", switchIRMode);
  document.querySelector("#mcu-nfc-polling-btn")?.addEventListener("click", pollingToTarget);
  document.querySelector("#display-debug-btn")?.addEventListener("click", function(){
    let element = <HTMLInputElement>document.getElementById("display-debug-btn");
    if ( element.checked != debugMode ) {
      toggleDebugMode();
    }
  });
}, false);

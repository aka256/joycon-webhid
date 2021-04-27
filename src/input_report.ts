import { moveStickHat, pushButtunAnimation, releaseButtunAnimation } from "./animation";
import { JoyConLProductId, JoyConRProductId, ProConProductId } from "./data";

const ControllerType: {[name: number]: string} = { 1: "Joy-Con (L)", 2: "Joy-Con (R)", 3: "Pro Controller" };

/**
 * InputReport 0x21 のDeviceInformation(0x02)のparseとtextboxへの出力を行う。
 * @param event InputReport
 */
export function parseReplyDeviceInfo(event: HIDInputReportEvent){
  const {data, device, reportId} = event;
  // 前半部のparse
  parseStandardInputTimerToButtons(event);

  let firmwareVerInput = <HTMLInputElement>document.getElementById('firmware-ver');
  let controllerTypeInput = <HTMLInputElement>document.getElementById('controller-type');
  let macAddressInput = <HTMLInputElement>document.getElementById('mac-address');
  let colorInput = <HTMLInputElement>document.getElementById('color');

  // firmwareのversion
  firmwareVerInput.value = String(data.getUint8(14)) + "." + String(data.getUint8(15));
  // ControllerType
  controllerTypeInput.value = ControllerType[data.getUint8(16)];
  // bt MAC address
  macAddressInput.value = "";
  for(let i = 17; i<23; i++){
    macAddressInput.value += data.getUint8(i).toString(16).padStart(2, "0");
    if (i !== 22){
      macAddressInput.value += ":";
    }
  }
  // color
  if (data.getUint8(24) === 1){
    colorInput.value = "In SPI";
  } else {
    colorInput.value = "Default";
  }
}

const SimpleHIDButtonTypeL: {[name: string]: number}[] = [{ "down": 0x01, "right": 0x02, "left": 0x04, "up": 0x08, "sl": 0x10, "sr": 0x20 }, { "minus": 0x01, "stickl": 0x04, "capture": 0x20, "l": 0x40, "zl": 0x80 }];
const SimpleHIDButtonTypeR: {[name: string]: number}[] = [{ "a": 0x01, "x": 0x02, "b": 0x04, "y": 0x08, "sl": 0x10, "sr": 0x20 }, { "plus": 0x02, "stickr": 0x08, "home": 0x10, "r": 0x40, "zr": 0x80 }];
const StickHat: number[][] = [[0,-24], [15,-15], [24,0], [15,15], [0,24], [-15,15], [-24,0], [-15,-15], [0,0]];

/**
 * SimpleHIDInputのparseを行う。
 * @param event InputReport
 */
export function parseSimpleHIDInput(event: HIDInputReportEvent){
  const {data, device, reportId} = event;
  // ButtonState
  if (device.productId === JoyConLProductId || device.productId === ProConProductId){
    for(let i = 0; i<2; i++){
      let buttonState = data.getUint8(i);
      Object.keys(SimpleHIDButtonTypeL[i]).forEach(key => {
        let value = SimpleHIDButtonTypeL[i][key];
        if (buttonState&value){
          pushButtunAnimation("l-button-" + key);
        } else {
          releaseButtunAnimation("l-button-" + key);
        }
      });
    }
  }
  if (device.productId === JoyConRProductId || device.productId === ProConProductId){
    for(let i = 0; i<2; i++){
      let buttonState = data.getUint8(i);
      Object.keys(SimpleHIDButtonTypeR[i]).forEach(key => {
        let value = SimpleHIDButtonTypeR[i][key];
        if (buttonState&value){
          pushButtunAnimation("r-button-" + key);
        } else {
          releaseButtunAnimation("r-button-" + key);
        }
      });
    }
  }
  // StickHat
  let stickHat = data.getUint8(2);
  if (device.productId === JoyConLProductId || device.productId === ProConProductId){
    moveStickHat("l-stick-hat", StickHat[stickHat][0], StickHat[stickHat][1]);
  }
  if (device.productId === JoyConRProductId || device.productId === ProConProductId){
    moveStickHat("r-stick-hat", StickHat[stickHat][0], StickHat[stickHat][1]);
  }
}

const BatteryDic: {[name: string]: number} = { "Full": 8, "Medium":6, "Low": 4, "Critical": 2, "Empty": 0, "Charging": 1 };
const ConnectionInfoDic: {[name: string]: number} = { "Joy-Con": 0xe, "Pro Controller/Charging Grip": 0, "Switch/USB": 1 };
// EXCLUDEING "charging-grip": 0x80
const StandardButtonType: {[name: string]: number}[] = [{ "r-button-y": 0x01, "r-button-x": 0x02, "r-button-b": 0x04, "r-button-a": 0x08, "r-button-sr": 0x10, "r-button-sl": 0x20, "r-button-r": 0x40, "r-button-zr": 0x80 }, { "l-button-minus": 0x01, "r-button-plus": 0x02, "r-button-stickr": 0x04, "l-button-stickl": 0x08, "r-button-home": 0x10, "l-button-capture": 0x20,  }, { "l-button-down": 0x01, "l-button-up": 0x02, "l-button-right": 0x04, "l-button-left": 0x08, "l-button-sr": 0x10, "l-button-sl": 0x20, "l-button-l": 0x40, "l-button-zl": 0x80 }];
const XAxisCenterCalibration = 0x79f;
const YAxisCenterCalibration = 0x8a0;
const XAxisMinBelowCenterCalibration = 0x510;
const YAxisMinBelowCenterCalibration = 0x479;
const XAxisMaxBelowCenterCalibration = 0x4f7;
const YAxisMaxBelowCenterCalibration = 0x424;

/**
 * StandardInputのTimerからButtonStatusまでのparseを行う。
 * @param event InputReport
 */
function parseStandardInputTimerToButtons(event: HIDInputReportEvent){
  const {data, device, reportId} = event;

  let timerInput = <HTMLInputElement>document.getElementById('timer');
  let batteryLevelInput = <HTMLInputElement>document.getElementById('battery-level');
  let connectionInfoInput = <HTMLInputElement>document.getElementById('connection-info');
  
  // Timer
  timerInput.value = data.getUint8(0).toString();
  
  // Battery Level
  let batteryNum = data.getUint8(1) >> 4;
  //console.log(batteryNum);
  Object.keys(BatteryDic).forEach(key => {
    if (BatteryDic[key] === batteryNum) {
      batteryLevelInput.value = key;
    }
  });

  // Connection Information
  let connectionInfoNum = data.getUint8(1) & 0x0f;
  //console.log(connectionInfoNum);
  Object.keys(ConnectionInfoDic).forEach(key => {
    if (ConnectionInfoDic[key] === connectionInfoNum) {
      connectionInfoInput.value = key;
    }
  });

  // Buttons
  for(let i = 0; i<3; i++){
    let buttonState = data.getUint8(i+2);
    Object.keys(StandardButtonType[i]).forEach(key => {
      let value = StandardButtonType[i][key];
      if (buttonState&value){
        pushButtunAnimation(key);
      } else {
        releaseButtunAnimation(key);
      }
    });
  }

  // Stick
  let lStickData = [data.getUint8(5), data.getUint8(6), data.getUint8(7)];
  if (lStickData[0]!==0 && lStickData[1]!==0 && lStickData[2]!==0){
    let lStickH = lStickData[0] | ((lStickData[1] & 0x0f) << 8) - XAxisCenterCalibration;
    let lStickV = (lStickData[1] >> 4) | (lStickData[2] << 4) - YAxisCenterCalibration;
    //console.log(lStickH, lStickV);
    let lStickHNormalization;
    let lStickVNormalization;
    if (lStickH<0){
      lStickHNormalization = lStickH/XAxisMinBelowCenterCalibration*25;
    } else {
      lStickHNormalization = lStickH/XAxisMaxBelowCenterCalibration*25;
    }
    if (lStickV<0){
      lStickVNormalization = lStickV/YAxisMinBelowCenterCalibration*25;
    } else {
      lStickVNormalization = lStickV/YAxisMaxBelowCenterCalibration*25;
    }
    //console.log(lStickHNormalization, lStickVNormalization);
    moveStickHat("l-stick-hat", -lStickVNormalization, -lStickHNormalization);
  } else {
    moveStickHat("l-stick-hat", 0, 0);
  }
  
  let rStickData = [data.getUint8(8), data.getUint8(9), data.getUint8(10)];
  if (rStickData[0]!==0 && rStickData[1]!==0 && rStickData[2]!==0){
    let rStickH = rStickData[0] | ((rStickData[1] & 0x0f) << 8) - YAxisCenterCalibration;
    let rStickV = (rStickData[1] >> 4) | (rStickData[2] << 4) - XAxisCenterCalibration;
    //console.log(rStickH, rStickV);
    let rStickHNormalization;
    let rStickVNormalization;
    if (rStickH<0){
      rStickHNormalization = rStickH/YAxisMinBelowCenterCalibration*25;
    } else {
      rStickHNormalization = rStickH/YAxisMaxBelowCenterCalibration*25;
    }
    if (rStickV<0){
      rStickVNormalization = rStickV/XAxisMinBelowCenterCalibration*25;
    } else {
      rStickVNormalization = rStickV/XAxisMaxBelowCenterCalibration*25;
    }
    //console.log(rStickHNormalization, rStickVNormalization);
    moveStickHat("r-stick-hat", rStickVNormalization, rStickHNormalization);
  } else {
    moveStickHat("r-stick-hat", 0, 0);
  }
}

const AcceHOffsetXJCL = 350;
const AcceHOffsetYJCL = 0;
const AcceHOffsetZJCL = 4081;
const AcceHOffsetXJCR = 350;
const AcceHOffsetYJCR = 0;
const AcceHOffsetZJCR = -4081;
const AcceHOffsetXPC = -688;
const AcceHOffsetYPC = 0;
const AcceHOffsetZPC = 4038;

const acceCoeff = 0.000244;
const acceLower = 1;

const gyroCoeff = 0.06103;
const gyroLower = 1;

/**
 * StandardInputReportのparseを行う。
 * @param event InputReport
 */
export function parseStandardInput(event: HIDInputReportEvent) {
  const {data, device, reportId} = event;

  parseStandardInputTimerToButtons(event);
  
  // IMU
  // Accelerometer
  let acce0xInput = <HTMLInputElement>document.getElementById('accelerometer-0-x');
  let acce0yInput = <HTMLInputElement>document.getElementById('accelerometer-0-y');
  let acce0zInput = <HTMLInputElement>document.getElementById('accelerometer-0-z');
  let acce5xInput = <HTMLInputElement>document.getElementById('accelerometer-5-x');
  let acce5yInput = <HTMLInputElement>document.getElementById('accelerometer-5-y');
  let acce5zInput = <HTMLInputElement>document.getElementById('accelerometer-5-z');
  let acce10xInput = <HTMLInputElement>document.getElementById('accelerometer-10-x');
  let acce10yInput = <HTMLInputElement>document.getElementById('accelerometer-10-y');
  let acce10zInput = <HTMLInputElement>document.getElementById('accelerometer-10-z');
  
  let offsetX = 0, offsetY = 0, offsetZ = 0;
  if (device.productId === JoyConLProductId) {
    offsetX = AcceHOffsetXJCL;
    offsetY = AcceHOffsetYJCL;
    offsetZ = AcceHOffsetZJCL;
  } else if (device.productId === JoyConRProductId) {
    offsetX = AcceHOffsetXJCR;
    offsetY = AcceHOffsetYJCR;
    offsetZ = AcceHOffsetZJCR;
  } else if (device.productId === ProConProductId) {
    offsetX = AcceHOffsetXPC;
    offsetY = AcceHOffsetYPC;
    offsetZ = AcceHOffsetZPC;
  } else {
    const e = new Error("An expected device is connected.");
    console.log(e);
  }
  acce0xInput.value = String(Math.round((data.getInt16(12,true)-offsetX)*acceCoeff*Math.pow(10,acceLower))/Math.pow(10,acceLower));
  acce0yInput.value = String(Math.round((data.getInt16(14,true)-offsetY)*acceCoeff*Math.pow(10,acceLower))/Math.pow(10,acceLower));
  acce0zInput.value = String(Math.round((data.getInt16(16,true)-offsetZ)*acceCoeff*Math.pow(10,acceLower))/Math.pow(10,acceLower));
  acce5xInput.value = String(Math.round((data.getInt16(24,true)-offsetX)*acceCoeff*Math.pow(10,acceLower))/Math.pow(10,acceLower));
  acce5yInput.value = String(Math.round((data.getInt16(26,true)-offsetY)*acceCoeff*Math.pow(10,acceLower))/Math.pow(10,acceLower));
  acce5zInput.value = String(Math.round((data.getInt16(28,true)-offsetZ)*acceCoeff*Math.pow(10,acceLower))/Math.pow(10,acceLower));
  acce10xInput.value = String(Math.round((data.getInt16(36,true)-offsetX)*acceCoeff*Math.pow(10,acceLower))/Math.pow(10,acceLower));
  acce10yInput.value = String(Math.round((data.getInt16(38,true)-offsetY)*acceCoeff*Math.pow(10,acceLower))/Math.pow(10,acceLower));
  acce10zInput.value = String(Math.round((data.getInt16(40,true)-offsetZ)*acceCoeff*Math.pow(10,acceLower))/Math.pow(10,acceLower));

  // Gyroscope
  let gyro0xInput = <HTMLInputElement>document.getElementById('gyroscope-0-x');
  let gyro0yInput = <HTMLInputElement>document.getElementById('gyroscope-0-y');
  let gyro0zInput = <HTMLInputElement>document.getElementById('gyroscope-0-z');
  let gyro5xInput = <HTMLInputElement>document.getElementById('gyroscope-5-x');
  let gyro5yInput = <HTMLInputElement>document.getElementById('gyroscope-5-y');
  let gyro5zInput = <HTMLInputElement>document.getElementById('gyroscope-5-z');
  let gyro10xInput = <HTMLInputElement>document.getElementById('gyroscope-10-x');
  let gyro10yInput = <HTMLInputElement>document.getElementById('gyroscope-10-y');
  let gyro10zInput = <HTMLInputElement>document.getElementById('gyroscope-10-z');

  gyro0xInput.value = String(Math.round(data.getInt16(18,true)*gyroCoeff*Math.pow(10, gyroLower)) / Math.pow(10, gyroLower));
  gyro0yInput.value = String(Math.round(data.getInt16(20,true)*gyroCoeff*Math.pow(10, gyroLower)) / Math.pow(10, gyroLower));
  gyro0zInput.value = String(Math.round(data.getInt16(22,true)*gyroCoeff*Math.pow(10, gyroLower)) / Math.pow(10, gyroLower));
  gyro5xInput.value = String(Math.round(data.getInt16(30,true)*gyroCoeff*Math.pow(10, gyroLower)) / Math.pow(10, gyroLower));
  gyro5yInput.value = String(Math.round(data.getInt16(32,true)*gyroCoeff*Math.pow(10, gyroLower)) / Math.pow(10, gyroLower));
  gyro5zInput.value = String(Math.round(data.getInt16(34,true)*gyroCoeff*Math.pow(10, gyroLower)) / Math.pow(10, gyroLower));
  gyro10xInput.value = String(Math.round(data.getInt16(42,true)*gyroCoeff*Math.pow(10, gyroLower)) / Math.pow(10, gyroLower));
  gyro10yInput.value = String(Math.round(data.getInt16(44,true)*gyroCoeff*Math.pow(10, gyroLower)) / Math.pow(10, gyroLower));
  gyro10zInput.value = String(Math.round(data.getInt16(46,true)*gyroCoeff*Math.pow(10, gyroLower)) / Math.pow(10, gyroLower));
}

const MCUState: {[name: number]: string} = { 1: "Stanby", 2: "Background", 4: "NFC mode", 5: "IR mode", 6: "Initializing" };

/**
 * MCU State Reportのparseを行う。
 * @param event Input report
 */
export function parseMCUStateReport(event: HIDInputReportEvent) {
  const {data, device, reportId} = event;

  let fwVerInput = <HTMLInputElement>document.getElementById('mcu-firmware-ver');
  let mcuStateInput = <HTMLInputElement>document.getElementById('mcu-state');

  fwVerInput.value = data.getUint16(51).toString() + '.' + data.getUint16(53).toString();
  mcuStateInput.value = MCUState[data.getUint8(55)];
}

const NFCResult: {[name: number]: string} = { 0x00: "OK", 0x3c: "Function error", 0x3d: "Reset required", 0x3e: "Read error", 0x3f: "Write error", 0x40: "Argument error", 0x41: "Timeout error", 0x42: "Invalid UID error", 0x43: "Unknown error", 0x44: "T2T password Invalid Tag error", 0x45: "Verify error", 0x46: "Activation error", 0x47: "Invalid tag error", 0x48: "Invalid format error", 0x49: "Authentication error", 0x4a: "Sequence error", 0x4b: "Command timeout error", 0x4c: "Mifare error" };

const NFCICState: {[name: number]: string} = {
0x00: "WaitingForCmd", 0x01: "TagPolling", 0x02: "TagReading", 0x03: "TagWriting", 0x04: "TagReadFinished", 0x05: "TagWriteFinished", 0x06: "PassThroughSending", 0x07: "Error", 0x08: "NFCDeactivated", 0x09: "TagDetected", 0x0a: "FactoryMode", 0x0b: "Initializing", 0x0c: "PassThroughFinished", 0x0d: "ResetIsRequired", 0x0e: "HardwareFatalError", 0x0f: "MifareSending", 0x10: "MifareFinished", 0x11: "MifareKeyWriting", 0x12: "MifareKeyWritingFinished" };

const NFCInputType: {[name: number]: string} = { 0x05: "State info", 0x07: "Ntag read data", 0x0a: "Pass-through data", 0x10: "Mifare data" };

const NFCTagIC: {[name: number]: string} = { 2: "Ntag", 3: "Felica", 4: "Mifare" };

const NFCType: {[name: number]: string} = { 0: "Type A", 1: "Type B", 2: "Type F", 6: "ISO/IEC 15693 type" };

/**
 * NFC State Reportのparseを行う。
 * Pollingのみなので分割パケットは考えない。
 * また、payloadにはUID/IDm以外来ることも考えない。
 * @param event Input report
 */
export function parseNFCState(event: HIDInputReportEvent) {
  const {data, device, reportId} = event;

  let nfcResultInput = <HTMLInputElement>document.getElementById('mcu-nfc-result');
  let inputTypeInput = <HTMLInputElement>document.getElementById('mcu-nfc-input-type');
  let nfcIcStateInput = <HTMLInputElement>document.getElementById('mcu-nfc-ic-state');
  let nfcTagIcInput = <HTMLInputElement>document.getElementById('mcu-nfc-tag-ic');
  let nfcTypeInput = <HTMLInputElement>document.getElementById('mcu-nfc-type');
  let nfcUidInput = <HTMLInputElement>document.getElementById('mcu-nfc-uid');

  nfcResultInput.value = NFCResult[data.getUint8(49)];
  inputTypeInput.value = NFCInputType[data.getUint8(50)];
  nfcIcStateInput.value = NFCICState[data.getUint8(55)];
  if (data.getUint8(59) === 1) {
    nfcTagIcInput.value = NFCTagIC[data.getUint8(61)];
    nfcTypeInput.value = NFCType[data.getUint8(62)];
    nfcUidInput.value = "";
    let payloadLen = data.getUint8(63);
    for(let i = 0; i<payloadLen; i++) {
      nfcUidInput.value += data.getUint8(i+64).toString(16);
    }
  } else {
    nfcTagIcInput.value = "";
    nfcTypeInput.value = "";
    nfcUidInput.value = "";
  }
}
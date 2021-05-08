import { moveStickHat, pushButtunAnimation, releaseButtunAnimation } from "./animation";
import { JoyConLProductId, JoyConRProductId, ProConProductId } from "./data";
import { debugInfo } from "./debug";
import { arrayToAddress, arrayToHexString, byteToInt16, dataViewToArray, MemoryDumpManager } from "./helper";

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
  macAddressInput.value = arrayToAddress(dataViewToArray(data,18,6));
  // color
  if (data.getUint8(25) === 1){
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

let dumpData: Array<number> = [];
export function initDumpData(){
  for(let i = 0; i<0x80000; i++) {
    dumpData.push(0x00);
  }
}

/**
 * SPI Falsh memory内のデータをdumpDataへ保存する。
 * @param event Input report
 */
export function parseSPIFlashRead(event: HIDInputReportEvent) {
  debugInfo("[fun] parseSPIFlashRead");

  const {data, device, reportId} = event;

  if(MemoryDumpManager.receiveData(data) === true) {
    let headAddr = data.getUint32(14, true);
    let length = data.getUint8(18);
  
    for(let i = 0; i<length; i++){
      dumpData[i + headAddr] = data.getUint8(i+19);
    }
  }
}

/**
 * dumpData内の一部のデータをSPI Flash Memoryページに表示する。
 */
export function displaySPIFlashMemoryPage() {
  debugInfo("[fun] displaySPIFlashMemoryPage");

  // 0x0000
  let spi0LoaderMagic = <HTMLInputElement>document.getElementById("spi-0-magic");
  let spi0BDADDR = <HTMLInputElement>document.getElementById("spi-0-bd-addr");

  spi0LoaderMagic.value = arrayToHexString(dumpData.slice(0x0000,0x0011)," ");
  spi0BDADDR.value = arrayToHexString(dumpData.slice(0x0015,0x001b)," ") + " (" + arrayToAddress(dumpData.slice(0x0015,0x001b).reverse()) + ")";

  // 0x1000
  let spi1OTAMagic = <HTMLInputElement>document.getElementById("spi-1-ota-magic");
  let spi1DynamicSection = <HTMLInputElement>document.getElementById("spi-1-dynamic-section");

  spi1OTAMagic.value = arrayToHexString(dumpData.slice(0x1ff4,0x1ffc)," ");
  spi1DynamicSection.value = arrayToHexString(dumpData.slice(0x1ffc,0x2000)," ");

  // 0x2000
  let spi2Used = <HTMLInputElement>document.getElementById("spi-2-used");
  let spi2Sec1Addr = <HTMLInputElement>document.getElementById("spi-2-sec1-addr");
  let spi2Sec1LTK = <HTMLInputElement>document.getElementById("spi-2-sec1-ltk");
  let spi2Sec1Host = <HTMLInputElement>document.getElementById("spi-2-sec1-host");
  let spi2Sec2Addr = <HTMLInputElement>document.getElementById("spi-2-sec2-addr");
  let spi2Sec2LTK = <HTMLInputElement>document.getElementById("spi-2-sec2-ltk");
  let spi2Sec2Host = <HTMLInputElement>document.getElementById("spi-2-sec2-host");

  spi2Used.value = arrayToHexString(dumpData.slice(0x2000,0x2001),"");
  if (dumpData[0x2000] === 0x95) {
    spi2Used.value += " (Section 1)";
  } else if (dumpData[0x2000] === 0x00) {
    spi2Used.value += " (Section 2)";
  }
  spi2Sec1Addr.value = arrayToHexString(dumpData.slice(0x2004,0x200a)," ") + " (" + arrayToAddress(dumpData.slice(0x2004,0x200a)) + ")";
  spi2Sec1LTK.value = arrayToHexString(dumpData.slice(0x200a,0x201a).reverse()," ");
  spi2Sec1Host.value = arrayToHexString(dumpData.slice(0x2024,0x2025),"");
  if (dumpData[0x2024] === 0x68) {
    spi2Sec1Host.value += " (Switch)";
  } else if (dumpData[0x2024] === 0x08) {
    spi2Sec1Host.value += " (PC)";
  }
  spi2Sec2Addr.value = arrayToHexString(dumpData.slice(0x202a,0x2030)," ") + " (" + arrayToAddress(dumpData.slice(0x202a,0x2030)) + ")";
  spi2Sec2LTK.value = arrayToHexString(dumpData.slice(0x2030,0x2040).reverse()," ");
  spi2Sec2Host.value = arrayToHexString(dumpData.slice(0x204a,0x204b),"");
  if (dumpData[0x204a] === 0x68) {
    spi2Sec2Host.value += " (Switch)";
  } else if (dumpData[0x204a] === 0x08) {
    spi2Sec2Host.value += " (PC)";
  }

  // 0x6000
  let spi6Serial = <HTMLInputElement>document.getElementById("spi-6-serial");
  let spi6DeviceType = <HTMLInputElement>document.getElementById("spi-6-device-type");
  let spi6AccXOrigin = <HTMLInputElement>document.getElementById("spi-6-acc-x-origin");
  let spi6AccYOrigin = <HTMLInputElement>document.getElementById("spi-6-acc-y-origin");
  let spi6AccZOrigin = <HTMLInputElement>document.getElementById("spi-6-acc-z-origin");
  let spi6AccXCoeff = <HTMLInputElement>document.getElementById("spi-6-acc-x-coeff");
  let spi6AccYCoeff = <HTMLInputElement>document.getElementById("spi-6-acc-y-coeff");
  let spi6AccZCoeff = <HTMLInputElement>document.getElementById("spi-6-acc-z-coeff");
  let spi6GyroXOrigin = <HTMLInputElement>document.getElementById("spi-6-gyro-x-origin");
  let spi6GyroYOrigin = <HTMLInputElement>document.getElementById("spi-6-gyro-y-origin");
  let spi6GyroZOrigin = <HTMLInputElement>document.getElementById("spi-6-gyro-z-origin");
  let spi6GyroXCoeff = <HTMLInputElement>document.getElementById("spi-6-gyro-x-coeff");
  let spi6GyroYCoeff = <HTMLInputElement>document.getElementById("spi-6-gyro-y-coeff");
  let spi6GyroZCoeff = <HTMLInputElement>document.getElementById("spi-6-gyro-z-coeff");
  let spi6StickLXMax = <HTMLInputElement>document.getElementById("spi-6-stick-l-x-max");
  let spi6StickLYMax = <HTMLInputElement>document.getElementById("spi-6-stick-l-y-max");
  let spi6StickLXCenter = <HTMLInputElement>document.getElementById("spi-6-stick-l-x-center");
  let spi6StickLYCenter = <HTMLInputElement>document.getElementById("spi-6-stick-l-y-center");
  let spi6StickLXMin = <HTMLInputElement>document.getElementById("spi-6-stick-l-x-min");
  let spi6StickLYMin = <HTMLInputElement>document.getElementById("spi-6-stick-l-y-min");
  let spi6StickRXMax = <HTMLInputElement>document.getElementById("spi-6-stick-r-x-max");
  let spi6StickRYMax = <HTMLInputElement>document.getElementById("spi-6-stick-r-y-max");
  let spi6StickRXCenter = <HTMLInputElement>document.getElementById("spi-6-stick-r-x-center");
  let spi6StickRYCenter = <HTMLInputElement>document.getElementById("spi-6-stick-r-y-center");
  let spi6StickRXMin = <HTMLInputElement>document.getElementById("spi-6-stick-r-x-min");
  let spi6StickRYMin = <HTMLInputElement>document.getElementById("spi-6-stick-r-y-min");
  let spi6ColorBody = <HTMLInputElement>document.getElementById("spi-6-color-body");
  let spi6ColorButtons = <HTMLInputElement>document.getElementById("spi-6-color-buttons");
  let spi6ColorLGrip = <HTMLInputElement>document.getElementById("spi-6-color-l-grip");
  let spi6ColorRGrip = <HTMLInputElement>document.getElementById("spi-6-color-r-grip");
  let spi6HOffsetX = <HTMLInputElement>document.getElementById("spi-6-horizontal-x");
  let spi6HOffsetY = <HTMLInputElement>document.getElementById("spi-6-horizontal-y");
  let spi6HOffsetZ = <HTMLInputElement>document.getElementById("spi-6-horizontal-z");
  let spi6StickParam1 = <HTMLInputElement>document.getElementById("spi-6-stick-1");
  let spi6StickParam2 = <HTMLInputElement>document.getElementById("spi-6-stick-2");

  spi6Serial.value = arrayToHexString(dumpData.slice(0x6000,0x6010)," ") + " ";
  if (dumpData[0x6000] >= 0x80) {
    spi6Serial.value += "(S/N don't exist)";
  } else {
    spi6Serial.value += "(";
    for(let i of dumpData.slice(0x6000,0x6010)) {
      if(i !== 0x00){
        spi6Serial.value += String.fromCharCode(i);
      }
    }
    spi6Serial.value += ")";
  }
  spi6DeviceType.value = dumpData[0x6012].toString(16).padStart(2,"0");
  if (dumpData[0x6012] === 0x01) {
    spi6DeviceType.value += " (Joy-Con L)"
  } else if (dumpData[0x6012] === 0x02) {
    spi6DeviceType.value += " (Joy-Con R)"
  } else if (dumpData[0x6012] === 0x03) {
    spi6DeviceType.value += " (Pro Controller)"
  }

  spi6AccXOrigin.value = arrayToHexString(dumpData.slice(0x6020,0x6022).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x6020,0x6022).reverse()).toString() + ")";
  spi6AccYOrigin.value = arrayToHexString(dumpData.slice(0x6022,0x6024).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x6022,0x6024).reverse()).toString() + ")";
  spi6AccZOrigin.value = arrayToHexString(dumpData.slice(0x6024,0x6026).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x6024,0x6026).reverse()).toString() + ")";
  spi6AccXCoeff.value = arrayToHexString(dumpData.slice(0x6026,0x6028).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x6026,0x6028).reverse()).toString() + ")";
  spi6AccYCoeff.value = arrayToHexString(dumpData.slice(0x6028,0x602a).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x6028,0x602a).reverse()).toString() + ")";
  spi6AccZCoeff.value = arrayToHexString(dumpData.slice(0x602a,0x602c).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x602a,0x602c).reverse()).toString() + ")";
  spi6GyroXOrigin.value = arrayToHexString(dumpData.slice(0x602c,0x602e).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x602c,0x602e).reverse()).toString() + ")";
  spi6GyroYOrigin.value = arrayToHexString(dumpData.slice(0x602e,0x6030).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x602e,0x6030).reverse()).toString() + ")";
  spi6GyroZOrigin.value = arrayToHexString(dumpData.slice(0x6030,0x6032).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x6030,0x6032).reverse()).toString() + ")";
  spi6GyroXCoeff.value = arrayToHexString(dumpData.slice(0x6032,0x6034).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x6032,0x6034).reverse()).toString() + ")";
  spi6GyroYCoeff.value = arrayToHexString(dumpData.slice(0x6034,0x6036).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x6034,0x6036).reverse()).toString() + ")";
  spi6GyroZCoeff.value = arrayToHexString(dumpData.slice(0x6036,0x6038).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x6036,0x6038).reverse()).toString() + ")";

  let spi6StickLData = convertTostickData(dumpData.slice(0x603d,0x6046));
  spi6StickLXMax.value = spi6StickLData[0].toString(16).padStart(3,"0") + " (" + spi6StickLData[0].toString() + ")";
  spi6StickLYMax.value = spi6StickLData[1].toString(16).padStart(3,"0") + " (" + spi6StickLData[1].toString() + ")";
  spi6StickLXCenter.value = spi6StickLData[2].toString(16).padStart(3,"0") + " (" + spi6StickLData[2].toString() + ")";
  spi6StickLYCenter.value = spi6StickLData[3].toString(16).padStart(3,"0") + " (" + spi6StickLData[3].toString() + ")";
  spi6StickLXMin.value = spi6StickLData[4].toString(16).padStart(3,"0") + " (" + spi6StickLData[4].toString() + ")";
  spi6StickLYMin.value = spi6StickLData[5].toString(16).padStart(3,"0") + " (" + spi6StickLData[5].toString() + ")";
  let spi6StickRData = convertTostickData(dumpData.slice(0x6046,0x604f));
  spi6StickRXCenter.value = spi6StickRData[0].toString(16).padStart(3,"0") + " (" + spi6StickRData[0].toString() + ")";
  spi6StickRYCenter.value = spi6StickRData[1].toString(16).padStart(3,"0") + " (" + spi6StickRData[1].toString() + ")";
  spi6StickRXMin.value = spi6StickRData[2].toString(16).padStart(3,"0") + " (" + spi6StickRData[2].toString() + ")";
  spi6StickRYMin.value = spi6StickRData[3].toString(16).padStart(3,"0") + " (" + spi6StickRData[3].toString() + ")";
  spi6StickRXMax.value = spi6StickRData[4].toString(16).padStart(3,"0") + " (" + spi6StickRData[4].toString() + ")";
  spi6StickRYMax.value = spi6StickRData[5].toString(16).padStart(3,"0") + " (" + spi6StickRData[5].toString() + ")";

  spi6ColorBody.value = arrayToHexString(dumpData.slice(0x6050,0x6053),"")
  spi6ColorButtons.value = arrayToHexString(dumpData.slice(0x6053,0x6056),"")
  spi6ColorLGrip.value = arrayToHexString(dumpData.slice(0x6056,0x6059),"")
  spi6ColorRGrip.value = arrayToHexString(dumpData.slice(0x6059,0x605c),"")

  spi6HOffsetX.value = arrayToHexString(dumpData.slice(0x6080,0x6082).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x6080,0x6082).reverse()).toString() + ")";
  spi6HOffsetY.value = arrayToHexString(dumpData.slice(0x6082,0x6084).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x6082,0x6084).reverse()).toString() + ")";
  spi6HOffsetZ.value = arrayToHexString(dumpData.slice(0x6084,0x6086).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x6084,0x6086).reverse()).toString() + ")";

  spi6StickParam1.value = arrayToHexString(dumpData.slice(0x6086,0x6098)," ");
  spi6StickParam2.value = arrayToHexString(dumpData.slice(0x6098,0x60aa)," ");

  // 0x8000
  let spi8StickLMagic = <HTMLInputElement>document.getElementById("spi-8-stick-l-magic");
  let spi8StickLXMax = <HTMLInputElement>document.getElementById("spi-8-stick-l-x-max");
  let spi8StickLYMax = <HTMLInputElement>document.getElementById("spi-8-stick-l-y-max");
  let spi8StickLXCenter = <HTMLInputElement>document.getElementById("spi-8-stick-l-x-center");
  let spi8StickLYCenter = <HTMLInputElement>document.getElementById("spi-8-stick-l-y-center");
  let spi8StickLXMin = <HTMLInputElement>document.getElementById("spi-8-stick-l-x-min");
  let spi8StickLYMin = <HTMLInputElement>document.getElementById("spi-8-stick-l-y-min");
  let spi8StickRMagic = <HTMLInputElement>document.getElementById("spi-8-stick-r-magic");
  let spi8StickRXMax = <HTMLInputElement>document.getElementById("spi-8-stick-r-x-max");
  let spi8StickRYMax = <HTMLInputElement>document.getElementById("spi-8-stick-r-y-max");
  let spi8StickRXCenter = <HTMLInputElement>document.getElementById("spi-8-stick-r-x-center");
  let spi8StickRYCenter = <HTMLInputElement>document.getElementById("spi-8-stick-r-y-center");
  let spi8StickRXMin = <HTMLInputElement>document.getElementById("spi-8-stick-r-x-min");
  let spi8StickRYMin = <HTMLInputElement>document.getElementById("spi-8-stick-r-y-min");
  let spi86AxisMagic = <HTMLInputElement>document.getElementById("spi-8-6axis-magic");
  let spi8AccXOrigin = <HTMLInputElement>document.getElementById("spi-8-acc-x-origin");
  let spi8AccYOrigin = <HTMLInputElement>document.getElementById("spi-8-acc-y-origin");
  let spi8AccZOrigin = <HTMLInputElement>document.getElementById("spi-8-acc-z-origin");
  let spi8AccXCoeff = <HTMLInputElement>document.getElementById("spi-8-acc-x-coeff");
  let spi8AccYCoeff = <HTMLInputElement>document.getElementById("spi-8-acc-y-coeff");
  let spi8AccZCoeff = <HTMLInputElement>document.getElementById("spi-8-acc-z-coeff");
  let spi8GyroXOrigin = <HTMLInputElement>document.getElementById("spi-8-gyro-x-origin");
  let spi8GyroYOrigin = <HTMLInputElement>document.getElementById("spi-8-gyro-y-origin");
  let spi8GyroZOrigin = <HTMLInputElement>document.getElementById("spi-8-gyro-z-origin");
  let spi8GyroXCoeff = <HTMLInputElement>document.getElementById("spi-8-gyro-x-coeff");
  let spi8GyroYCoeff = <HTMLInputElement>document.getElementById("spi-8-gyro-y-coeff");
  let spi8GyroZCoeff = <HTMLInputElement>document.getElementById("spi-8-gyro-z-coeff");

  spi8StickLMagic.value = arrayToHexString(dumpData.slice(0x8010,0x8012)," ") + " " + (dumpData[0x8010] === 0xb2 && dumpData[0x8011] === 0xa1 ? "(Yes)": "(No)");
  let spi8StickLData = convertTostickData(dumpData.slice(0x8012,0x801b));
  spi8StickLXMax.value = spi8StickLData[0].toString(16).padStart(3,"0") + " (" + spi8StickLData[0].toString() + ")";
  spi8StickLYMax.value = spi8StickLData[1].toString(16).padStart(3,"0") + " (" + spi8StickLData[1].toString() + ")";
  spi8StickLXCenter.value = spi8StickLData[2].toString(16).padStart(3,"0") + " (" + spi8StickLData[2].toString() + ")";
  spi8StickLYCenter.value = spi8StickLData[3].toString(16).padStart(3,"0") + " (" + spi8StickLData[3].toString() + ")";
  spi8StickLXMin.value = spi8StickLData[4].toString(16).padStart(3,"0") + " (" + spi8StickLData[4].toString() + ")";
  spi8StickLYMin.value = spi8StickLData[5].toString(16).padStart(3,"0") + " (" + spi8StickLData[5].toString() + ")";
  spi8StickRMagic.value = arrayToHexString(dumpData.slice(0x801b,0x801d)," ") + " " + (dumpData[0x801b] === 0xb2 && dumpData[0x801c] === 0xa1 ? "(Yes)": "(No)");
  let spi8StickRData = convertTostickData(dumpData.slice(0x801d,0x8026));
  spi8StickRXCenter.value = spi8StickRData[0].toString(16).padStart(3,"0") + " (" + spi8StickRData[0].toString() + ")";
  spi8StickRYCenter.value = spi8StickRData[1].toString(16).padStart(3,"0") + " (" + spi8StickRData[1].toString() + ")";
  spi8StickRXMin.value = spi8StickRData[2].toString(16).padStart(3,"0") + " (" + spi8StickRData[2].toString() + ")";
  spi8StickRYMin.value = spi8StickRData[3].toString(16).padStart(3,"0") + " (" + spi8StickRData[3].toString() + ")";
  spi8StickRXMax.value = spi8StickRData[4].toString(16).padStart(3,"0") + " (" + spi8StickRData[4].toString() + ")";
  spi8StickRYMax.value = spi8StickRData[5].toString(16).padStart(3,"0") + " (" + spi8StickRData[5].toString() + ")";

  spi86AxisMagic.value = arrayToHexString(dumpData.slice(0x8026,0x8028)," ") + " " + (dumpData[0x8026] === 0xb2 && dumpData[0x8027] === 0xa1 ? "(Yes)": "(No)");
  spi8AccXOrigin.value = arrayToHexString(dumpData.slice(0x8028,0x802a).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x8028,0x802a).reverse()).toString() + ")";
  spi8AccYOrigin.value = arrayToHexString(dumpData.slice(0x802a,0x802c).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x802a,0x802c).reverse()).toString() + ")";
  spi8AccZOrigin.value = arrayToHexString(dumpData.slice(0x802c,0x802e).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x802c,0x802e).reverse()).toString() + ")";
  spi8AccXCoeff.value = arrayToHexString(dumpData.slice(0x802e,0x8030).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x802e,0x8030).reverse()).toString() + ")";
  spi8AccYCoeff.value = arrayToHexString(dumpData.slice(0x8030,0x8032).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x8030,0x8032).reverse()).toString() + ")";
  spi8AccZCoeff.value = arrayToHexString(dumpData.slice(0x8032,0x8034).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x8032,0x8034).reverse()).toString() + ")";
  spi8GyroXOrigin.value = arrayToHexString(dumpData.slice(0x8034,0x8036).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x8034,0x8036).reverse()).toString() + ")";
  spi8GyroYOrigin.value = arrayToHexString(dumpData.slice(0x8036,0x8038).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x8036,0x8038).reverse()).toString() + ")";
  spi8GyroZOrigin.value = arrayToHexString(dumpData.slice(0x8038,0x803a).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x8038,0x803a).reverse()).toString() + ")";
  spi8GyroXCoeff.value = arrayToHexString(dumpData.slice(0x803a,0x803c).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x803a,0x803c).reverse()).toString() + ")";
  spi8GyroYCoeff.value = arrayToHexString(dumpData.slice(0x803c,0x803e).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x803c,0x803e).reverse()).toString() + ")";
  spi8GyroZCoeff.value = arrayToHexString(dumpData.slice(0x803e,0x8040).reverse(),"") + " (" + byteToInt16(dumpData.slice(0x803e,0x8040).reverse()).toString() + ")";
}

function convertTostickData(arr: number[]) {
  if (arr.length !== 9) {
    return [0,0,0,0,0,0];
  }
  let retval = [];
  retval.push((arr[1] << 8) & 0xf00 | arr[0]);
  retval.push((arr[2] << 4) | (arr[1] >> 4));
  retval.push((arr[4] << 8) & 0xf00 | arr[3]);
  retval.push((arr[5] << 4) | (arr[4] >> 4));
  retval.push((arr[7] << 8) & 0xf00 | arr[6]);
  retval.push((arr[8] << 4) | (arr[7] >> 4));
  return retval;
}

/**
 * dumpData内の全てのデータをHex dumpとして表示する。
 */
export function displayDumpData() {
  debugInfo("[fun] displayDumpData");

  let radio16Element = <HTMLInputElement>document.getElementById("hexdump-16byte-radio");
  let radio32Element = <HTMLInputElement>document.getElementById("hexdump-32byte-radio");
  let checkboxASCIIElement = <HTMLInputElement>document.getElementById("hexdump-ascii-checkbox");
  let checkboxOffsetElement = <HTMLInputElement>document.getElementById("hexdump-offset-checkbox");
  let codeElement = <HTMLTextAreaElement>document.getElementById("dumpViewer");

  // 1行目が数文字分ずれてしまうので改行しておく
  let displayText = "\n";
  
  if(radio16Element.checked === true){
    if(checkboxOffsetElement.checked === true){
      displayText += "Offset: 00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f\n";
    }

    for(let i = 0; i<Math.ceil(dumpData.length/16); i++) {
      if(checkboxOffsetElement.checked === true){
        displayText += i.toString(16).padStart(5,'0') + "0: ";
      }
      for(let j = 0; j<16; j++) {
        displayText += dumpData[16*i+j].toString(16).padStart(2, '0') + " ";
      }

      if(checkboxASCIIElement.checked === true){
        displayText += "    |";

        for(let j = 0; j<16; j++) {
          if(dumpData[16*i+j]<0x80 && dumpData[16*i+j]>0x20){
            displayText += String.fromCharCode(dumpData[16*i+j]);
          } else {
            displayText += ".";
          }
        }
        displayText += "|";
      }
      displayText += "\n";
    }
  } else if(radio32Element.checked === true) {
    if(checkboxOffsetElement.checked === true){
      displayText += "Offset: 00   02   04   06   08   0a   0c   0e   00   02   04   06   08   0a   0c   0e\n";
    }

    for(let i = 0; i<Math.ceil(dumpData.length/32); i++) {
      if(checkboxOffsetElement.checked === true){
        displayText += (i*2).toString(16).padStart(5,'0') + "0: ";
      }
      for(let j = 0; j<16; j++) {
        displayText += dumpData[16*i+j].toString(16).padStart(2, '0') + dumpData[16*i+j+1].toString(16).padStart(2, '0') + " ";
      }

      if(checkboxASCIIElement.checked === true){
        displayText += "    |";

        for(let j = 0; j<32; j++) {
          if(dumpData[32*i+j]<0x80 && dumpData[32*i+j]>0x20){
            displayText += String.fromCharCode(dumpData[32*i+j]);
          } else {
            displayText += ".";
          }
        }
        displayText += "|";
      }
      displayText += "\n";
    }
  } else {
    debugInfo("Each radio buttons is not pushed");
  }
  codeElement.innerText = displayText;
}
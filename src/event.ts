import { writeOutputReport, writeOutputReport0x01Crc, writeOutputReport0x11Crc } from './output_report';
import { NintendoVendorId, DefaultRumble, JoyConRProductId, ProConProductId } from './data';
import { toHex, PacketManager, displayModal, encodeHighFreq, encodeHighAmpli,encodeLowFreq, encodeLowAmpli, arrayToHexString, MemoryDumpManager, dataViewToArray } from './helper';
import { parseSimpleHIDInput, parseReplyDeviceInfo, parseStandardInput, parseMCUStateReport, parseNFCState, parseSPIFlashRead, displayDumpData, displaySPIFlashMemoryPage } from './input_report';
import { debugInfo } from './debug';

let connectedDevice: HIDDevice;

async function initJoyCon() {
  // Simple HID modeへの変更
  writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x03, 0x3f);
  
  // 100ms待機
  await new Promise(resolve => setTimeout(resolve, 100))

  // Set player light1
  writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x30, 0x01);
  // Player light1 Button の有効化
  let playerLightOn1Btn = <HTMLInputElement>document.getElementById("player-light-on-1-btn");
  playerLightOn1Btn.classList.add("active");

  // 100ms待機
  await new Promise(resolve => setTimeout(resolve, 100))

  writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x48, 0x01);

  // Send rumble
  let encodedHighFreq = encodeHighFreq(320);
  let encodedHighAmpli = encodeHighAmpli(0.3);
  let encodedLowFreq = encodeLowFreq(160);
  let encodedLowAmpli = encodeLowAmpli(0.3);

  let rumbleData: number[] = [];
  rumbleData.push(encodedHighFreq & 0xff);
  rumbleData.push(encodedHighAmpli + ((encodedHighFreq >> 8) & 0xff));
  rumbleData.push(encodedLowFreq + ((encodedLowAmpli >> 8) & 0xff));
  rumbleData.push(encodedLowAmpli & 0xff);
  rumbleData.push(encodedHighFreq & 0xff);
  rumbleData.push(encodedHighAmpli + ((encodedHighFreq >> 8) & 0xff));
  rumbleData.push(encodedLowFreq + ((encodedLowAmpli >> 8) & 0xff));
  rumbleData.push(encodedLowAmpli & 0xff);

  writeOutputReport(connectedDevice, 0x10, PacketManager.get(), rumbleData);

  // 250ms待機
  await new Promise(resolve => setTimeout(resolve, 250))

  writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x48, 0x00);
}

/**
* Switch関連のHIDへの接続を行う。
*/
export async function controlHID() {
  const devices: HIDDevice[] = await navigator.hid.requestDevice({
    filters: [{
      vendorId: NintendoVendorId,
    }]
  });

  let device = devices[0];
  connectedDevice = device;

  if (device){
    await device.open();
    
    // 初期化処理
    initJoyCon();

    // Input Reportの処理
    device.addEventListener("inputreport", event=>{
      const {data, device, reportId} = event;

      // consoleへの出力(デバッグ用)
      //debugInfo("input Report: " + toHex(reportId),"data: " + arrayToHexString(dataViewToArray(data)));

      // dataのparse
      switch (reportId){
        case 0x21:
          let replyId = data.getUint8(13);
          switch (replyId){
            case 0x02:
              parseReplyDeviceInfo(event);
              break;
            case 0x10:
              parseSPIFlashRead(event);
              break;
            default:
              debugInfo("Unknown Reply", toHex(replyId));
          }
          break;
        case 0x30:
          parseStandardInput(event);
          break;
        case 0x31:
          let mcuReportId = data.getUint8(48);
          debugInfo("MCU ReportID", toHex(mcuReportId));
          switch (mcuReportId) {
            case 0x00:  // Empty Report
              break;
            case 0x01:  // MCU State Report
              parseMCUStateReport(event);
              break;
            case 0x2a:  // NFC Report
              parseNFCState(event);
              break;
            case 0xff:  // Empty Report
              break;
          }
          break;
        case 0x3f:
          parseSimpleHIDInput(event);
          break;
        default:
          debugInfo("There are no output places.")
      }
    });


  }
}

export async function getDeviceInfo() {
  try {
    writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x02, 0x00);
  } catch (e) {
    displayModal("not-connected-modal");
    console.log(e);
  }
}

export async function switchSimpleHIDInput() {
  let element = <HTMLInputElement>document.querySelector("#input-mode-simple");
  if(element?.checked){
    try {
      writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x03, 0x3f);
    } catch (e) {
      displayModal("not-connected-modal");
      console.log(e);
    }
  }
}

export async function switchStandardInput() {
  let element = <HTMLInputElement>document.querySelector("#input-mode-standard");
  if(element.checked){
    try {
      writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x03, 0x30);
    } catch (e) {
      displayModal("not-connected-modal");
      console.log(e);
    }
  }
}

export async function switchIMU() {
  let element = <HTMLInputElement>document.querySelector("#enable-imu-btn");

  //aria-pressedの反映まで10ms待機
  await new Promise(resolve => setTimeout(resolve, 10))

  if (element.getAttribute("aria-pressed")==="true"){
    try {
      writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x40, 0x01);
    } catch (e) {
      displayModal("not-connected-modal");
      console.log(e);
    }
  } else {
    try {
      writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x40, 0x00);
    } catch (e) {
      displayModal("not-connected-modal");
      console.log(e);
    }
  }
}

export async function switchSimpleHIDInputMCU() {
  let element = <HTMLInputElement>document.querySelector("#input-mode-mcu-simple-btn");
  if(element?.checked){
    try {
      writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x03, 0x3f);
    } catch (e) {
      displayModal("not-connected-modal");
      console.log(e);
    }
  }
}

export async function switchMCUInput() {
  if (connectedDevice.productId === JoyConRProductId || connectedDevice.productId === ProConProductId){
    let element = <HTMLInputElement>document.querySelector("#input-mode-mcu-nfc-ir-btn");
    if(element?.checked){
      try {
        writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x03, 0x31);
      } catch (e) {
        displayModal("not-connected-modal");
        console.log(e);
      }
    }
  } else {
    displayModal("not-have-mcu-modal");
  }
}

export async function switchMCUSuspend() {
  if (connectedDevice.productId === JoyConRProductId || connectedDevice.productId === ProConProductId){
    let element = <HTMLInputElement>document.querySelector("#mcu-suspend-btn");
    if(element?.checked){
      try {
        writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x22, 0x00);
      } catch (e) {
        displayModal("not-connected-modal");
        console.log(e);
      }
    }
  } else {
    displayModal("not-have-mcu-modal");
  }
}

export async function switchMCUResume() {
  if (connectedDevice.productId === JoyConRProductId || connectedDevice.productId === ProConProductId){
    let element = <HTMLInputElement>document.querySelector("#mcu-resume-btn");
    if(element?.checked){
      try {
        writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x22, 0x01);
      } catch (e) {
        displayModal("not-connected-modal");
        console.log(e);
      }
    }
  } else {
    displayModal("not-have-mcu-modal");
  }
}

export async function getMCUState() {
  if (connectedDevice.productId === JoyConRProductId || connectedDevice.productId === ProConProductId){
    try {
      writeOutputReport(connectedDevice, 0x11, PacketManager.get(), DefaultRumble, 0x01);
    } catch (e) {
      displayModal("not-connected-modal");
      console.log(e);
    }
  } else {
    displayModal("not-have-mcu-modal");
  }
}

export async function switchNFCMode() {
  if (connectedDevice.productId === JoyConRProductId || connectedDevice.productId === ProConProductId){
    try {
      writeOutputReport0x01Crc(connectedDevice, PacketManager.get(), DefaultRumble, 0x21, 0x21, 0x00, 0x04);
    } catch (e) {
      displayModal("not-connected-modal");
      console.log(e);
    }
  } else {
    displayModal("not-have-mcu-modal");
  }
}

export async function switchIRMode() {
  if (connectedDevice.productId === JoyConRProductId || connectedDevice.productId === ProConProductId){
    try {
      writeOutputReport0x01Crc(connectedDevice, PacketManager.get(), DefaultRumble, 0x21, 0x21, 0x00, 0x05);
    } catch (e) {
      displayModal("not-connected-modal");
      console.log(e);
    }
  } else {
    displayModal("not-have-mcu-modal");
  }
}

let pollingCount = 0;
let pollingLimit = 10;

export async function pollingToTarget() {
  if (connectedDevice.productId === JoyConRProductId || connectedDevice.productId === ProConProductId){
    if(pollingCount===0){  // initializing
      try{
        // stop polling
        writeOutputReport0x11Crc(connectedDevice, PacketManager.get(), DefaultRumble, 0x02, 0x02, 0x00, 0x00, 0x08, 0x00);
      } catch (e) {
        displayModal("not-connected-modal");
        console.log(e);
        return;
      }
      let spinnerElement = <HTMLElement>document.getElementById("polling-btn-spinner");
      spinnerElement.style.visibility = "visible";
    }
    if (pollingCount<pollingLimit){
      try {
        writeOutputReport0x11Crc(connectedDevice, PacketManager.get(), DefaultRumble, 0x02, 0x01, 0x00, 0x00, 0x08, 0x05, 0x00, 0xff, 0xff, 0x00, 0x01);
      } catch (e) {
        displayModal("not-connected-modal");
        console.log(e);
      }
      pollingCount += 1;

      setTimeout(pollingToTarget, 500);
    } else {
      let spinnerElement = <HTMLElement>document.getElementById("polling-btn-spinner");
      spinnerElement.style.visibility = "hidden";

      pollingCount = 0;
    }
  } else {
    displayModal("not-have-mcu-modal");
  }
}

export async function setPlayerLights() {
  let lightOn1Btn = <HTMLInputElement>document.getElementById("player-light-on-1-btn");
  let lightOn2Btn = <HTMLInputElement>document.getElementById("player-light-on-2-btn");
  let lightOn3Btn = <HTMLInputElement>document.getElementById("player-light-on-3-btn");
  let lightOn4Btn = <HTMLInputElement>document.getElementById("player-light-on-4-btn");
  let lightFlash1Btn = <HTMLInputElement>document.getElementById("player-light-flash-1-btn");
  let lightFlash2Btn = <HTMLInputElement>document.getElementById("player-light-flash-2-btn");
  let lightFlash3Btn = <HTMLInputElement>document.getElementById("player-light-flash-3-btn");
  let lightFlash4Btn = <HTMLInputElement>document.getElementById("player-light-flash-4-btn");
  let arg = 0;

  //aria-pressedの反映まで10ms待機
  await new Promise(resolve => setTimeout(resolve, 10))

  if (lightOn1Btn.getAttribute("aria-pressed")==="true") {
    arg += 0x01;
  }
  if (lightOn2Btn.getAttribute("aria-pressed")==="true") {
    arg += 0x02;
  }
  if (lightOn3Btn.getAttribute("aria-pressed")==="true") {
    arg += 0x04;
  }
  if (lightOn4Btn.getAttribute("aria-pressed")==="true") {
    arg += 0x08;
  }
  if (lightFlash1Btn.getAttribute("aria-pressed")==="true") {
    arg += 0x10;
  }
  if (lightFlash2Btn.getAttribute("aria-pressed")==="true") {
    arg += 0x20;
  }
  if (lightFlash3Btn.getAttribute("aria-pressed")==="true") {
    arg += 0x40;
  }
  if (lightFlash4Btn.getAttribute("aria-pressed")==="true") {
    arg += 0x80;
  }

  try {
    writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x30, arg);
  } catch (e) {
    displayModal("not-connected-modal");
    console.log(e);
  }
}

export async function switchRumble() {
  let element = <HTMLInputElement>document.querySelector("#enable-rumble-btn");

  //aria-pressedの反映まで10ms待機
  await new Promise(resolve => setTimeout(resolve, 10))

  if (element.getAttribute("aria-pressed")==="true"){
    try {
      writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x48, 0x01);
    } catch (e) {
      displayModal("not-connected-modal");
      console.log(e);
    }
  } else {
    try {
      writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x48, 0x00);
    } catch (e) {
      displayModal("not-connected-modal");
      console.log(e);
    }
  }
}

/**
 * 入力されたバイブレーションの実行を行う。
 */
export async function setRumble() {
  // 入力内容の取得
  let leftHighFreq = <HTMLInputElement>document.getElementById("rumble-left-high-freq");
  let leftHighAmpli = <HTMLInputElement>document.getElementById("rumble-left-high-ampli");
  let rightHighFreq = <HTMLInputElement>document.getElementById("rumble-right-high-freq");
  let rightHighAmpli = <HTMLInputElement>document.getElementById("rumble-right-high-ampli");
  let leftLowFreq = <HTMLInputElement>document.getElementById("rumble-left-low-freq");
  let leftLowAmpli = <HTMLInputElement>document.getElementById("rumble-left-low-ampli");
  let rightLowFreq = <HTMLInputElement>document.getElementById("rumble-right-low-freq");
  let rightLowAmpli = <HTMLInputElement>document.getElementById("rumble-right-low-ampli");

  // 送信用データへエンコード
  let encodedLeftHighFreq = encodeHighFreq(Number(leftHighFreq.value));
  let encodedLeftHighAmpli = encodeHighAmpli(Number(leftHighAmpli.value));
  let encodedLeftLowFreq = encodeLowFreq(Number(leftLowFreq.value));
  let encodedLeftLowAmpli = encodeLowAmpli(Number(leftLowAmpli.value));
  let encodedRightHighFreq = encodeHighFreq(Number(rightHighFreq.value));
  let encodedRightHighAmpli = encodeHighAmpli(Number(rightHighAmpli.value));
  let encodedRightLowFreq = encodeLowFreq(Number(rightLowFreq.value));
  let encodedRightLowAmpli = encodeLowAmpli(Number(rightLowAmpli.value));

  let rumbleData: number[] = [];
  rumbleData.push(encodedLeftHighFreq & 0xff);
  rumbleData.push(encodedLeftHighAmpli + ((encodedLeftHighFreq >> 8) & 0xff));
  rumbleData.push(encodedLeftLowFreq + ((encodedLeftLowAmpli >> 8) & 0xff));
  rumbleData.push(encodedLeftLowAmpli & 0xff);
  rumbleData.push(encodedRightHighFreq & 0xff);
  rumbleData.push(encodedRightHighAmpli + ((encodedRightHighFreq >> 8) & 0xff));
  rumbleData.push(encodedRightLowFreq + ((encodedRightLowAmpli >> 8) & 0xff));
  rumbleData.push(encodedRightLowAmpli & 0xff);

  try {
    writeOutputReport(connectedDevice, 0x10, PacketManager.get(), rumbleData);
  } catch (e) {
    displayModal("not-connected-modal");
    console.log(e);
  }
}

export async function getPartialSPIData() {
  if(connectedDevice === undefined || connectedDevice.opened !== true){
    displayModal("not-connected-modal");
    return;
  }

  const ReadDataSet = [[0x0000,0x001b],[0x1ff4,0x2000],[0x2000,0x204b],[0x6000,0x60aa],[0x8010,0x8040]];
  const DataMaxLength = 0x1d;

  // MemoryDumpManagerを他が使用していなければ、通信を開始
  if (MemoryDumpManager.isSending() === false){
    // MemoryDumpManagerを使用中に変更
    MemoryDumpManager.startSendReport();

    // 通信を開始
    for(let data of ReadDataSet) {
      for(let head = data[0]; head<=data[1]; head += DataMaxLength) {
        let len = Math.min(DataMaxLength, data[1] - head);

        // MemoryDumpManagerに通信内容を通知
        MemoryDumpManager.requestData(head,len);
        
        writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x10, head%0x100, Math.floor(head/0x100), 0x00, 0x00, len);
        
        // Replyが返ってくるまで待機
        while (MemoryDumpManager.isEmptyRequestedQueue() === false) {
          //10ms待機
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    }
    // MemoryDumpManagerを使用済に変更
    MemoryDumpManager.stopSendReport();

    // dump内容を表示
    displaySPIFlashMemoryPage();
  }
}

/**
 * Joy-Con内のフラッシュメモリのダンプを取る。
 * @returns None
 */
export async function hexDumpFlashMemory() {
  if(connectedDevice === undefined || connectedDevice.opened !== true){
    displayModal("not-connected-modal");
    return;
  }

  const DataMaxLength = 0x1d;
  const ReadLengthLimit = 0x5000;
  const UpperAddressLimit = 0x170000;
  let readStartAddress = 0x6000;
  let readLength = 0x1000;
  
  // MemoryDumpManagerを他が使用していなければ、通信を開始
  if (MemoryDumpManager.isSending() === false){
    // MemoryDumpManagerを使用中に変更
    MemoryDumpManager.startSendReport();

    // 通信を開始
    for(let i = readStartAddress; i<readStartAddress+Math.min(readLength,ReadLengthLimit); i += DataMaxLength){
      // MemoryDumpManagerに通信内容を通知
      MemoryDumpManager.requestData(i, Math.min(DataMaxLength, UpperAddressLimit-(DataMaxLength+i), readStartAddress+readLength-i));
      
      writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x10, i%0x100, Math.floor(i/0x100), 0x00, 0x00, Math.min(DataMaxLength, UpperAddressLimit-(DataMaxLength+i), readStartAddress+readLength-i));
      
      // Replyが返ってくるまで待機
      while (MemoryDumpManager.isEmptyRequestedQueue() === false) {
        //10ms待機
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    // MemoryDumpManagerを使用済に変更
    MemoryDumpManager.stopSendReport();

    // dump内容を表示
    displayDumpData();
  }
}

export async function requestFlashMemory(headAddr: number, length: number) {
  if(connectedDevice.opened !== true){
    displayModal("not-connected-modal");
    return;
  }

  writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x10, headAddr%0x100, Math.floor(headAddr/0x100), 0x00, 0x00, length);
}
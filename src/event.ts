import { writeOutputReport, writeOutputReport0x01Crc, writeOutputReport0x11Crc } from './output_report';
import { NintendoVendorId, DefaultRumble, JoyConRProductId, ProConProductId } from './data';
import { toHex, PacketManager, displayModal } from './helper';
import { parseSimpleHIDInput, parseReplyDeviceInfo, parseStandardInput, parseMCUStateReport, parseNFCState } from './input_report';
import { debugInfo } from './debug';

let connectedDevice: HIDDevice;

async function initJoyCon() {
  // Simple HID modeへの変更
  writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x03, 0x3f);
  //aria-pressedの反映まで20ms待機
  await new Promise(resolve => setTimeout(resolve, 20))
  // Set player light1
  writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x30, 0x01);

  let element = <HTMLInputElement>document.getElementById("player-light-on-1-btn");
  element.classList.add("active");
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
  console.log("light arg:" + String(arg))
  try {
    writeOutputReport(connectedDevice, 0x01, PacketManager.get(), DefaultRumble, 0x30, arg);
  } catch (e) {
    displayModal("not-connected-modal");
    console.log(e);
  }
}
import { writeOutputReport, writeOutputReport0x01Crc, writeOutputReport0x11Crc } from './output_report';
import { NintendoVendorId, DefaultRumble, JoyConRProductId, ProConProductId } from './data';
import { toHex, PacketManager } from './helper';
import { parseSimpleHIDInput, parseReplyDeviceInfo, parseStandardInput, parseMCUStateReport, parseNFCState } from './input_report';
import { debugInfo } from './debug';

let connectedDevice: HIDDevice;

function displayModal(id: string){
  //let element = <Modal><unknown>document.getElementById("not-connected-modal");
  //element.show();
  $('#'+id).modal('show')
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
  if (element.getAttribute("aria-pressed")==="false"){
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
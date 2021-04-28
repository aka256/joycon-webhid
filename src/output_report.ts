import { calcCrc8 } from "./helper";

/**
 * deviceに向けてoutput reportを送信する。
 * @param device 対象となるHID device
 * @param reportId 
 * @param packetNumber 
 * @param rumbleData 
 * @param subCommand 
 * @param argument 
 */
export function writeOutputReport(device: HIDDevice, reportId: number, packetNumber: number, rumbleData: number[], subCommand: number = 0x00, ...argument: number[]){
  let n:BufferSource = Uint8Array.from([packetNumber].concat(rumbleData).concat([subCommand]).concat(argument));
  device.sendReport(reportId, n);
}

/**
 * MCUに対し、CRC-8を含む0x01のoutput reportを送信する。
 * @param device 対象となるHID device
 * @param packetNumber 
 * @param rumbleData 
 * @param subCommand 
 * @param mcuCommand 
 * @param mcuSubCommand 
 * @param argument 
 */
export function writeOutputReport0x01Crc(device: HIDDevice, packetNumber: number, rumbleData: number[], subCommand: number, mcuCommand: number, mcuSubCommand: number, ...argument: number[]){
  let mcuSubCmdArg = [mcuSubCommand].concat(argument);
  for(let i = 0; i<35-argument.length; i++){
    mcuSubCmdArg.push(0);
  }
  let buf = [packetNumber].concat(rumbleData).concat([subCommand, mcuCommand]).concat(mcuSubCmdArg);
  buf.push(calcCrc8(mcuSubCmdArg));
  device.sendReport(0x01, Uint8Array.from(buf));
}

/**
 * MCUに対し、CRC-8を含む0x11のoutput reportを送信する。
 * @param device 対象となるHID devices
 * @param packetNumber 
 * @param rumbleData 
 * @param mcuCommand 
 * @param mcuSubCommand 
 * @param argument 
 */
export function writeOutputReport0x11Crc(device: HIDDevice, packetNumber: number, rumbleData: number[], mcuCommand: number, mcuSubCommand: number, ...argument: number[]){
  let mcuSubCmdArg = [mcuSubCommand].concat(argument);
  for(let i = 0; i<35-argument.length; i++){
    mcuSubCmdArg.push(0);
  }
  let buf = [packetNumber].concat(rumbleData).concat([mcuCommand]).concat(mcuSubCmdArg);
  buf.push(calcCrc8(mcuSubCmdArg));
  device.sendReport(0x11, Uint8Array.from(buf));
}

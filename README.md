# Joy-Con WebHID

## 概要

WebHIDを用いたJoy-Conの操作等を行う。

## 主なページ

[トップページ](https://aka256.github.io/joycon-webhid/)

[Joy-Con Operation Tester](https://aka256.github.io/joycon-webhid/pages/operation.html)

## 機能

### Home

- Device Informationの取得(Output Subcommand ID: 0x02)
- Simple HID mode(Input Subcommand ID: 0x3f)もしくはStandard full mode(Input Subcommand ID: 0x30)の解析
  - 入力ボタンの表示
  - 加速度センサーとジャイロスコープのデータの取得
- Joy-ConのサイドについているPlayer lightsの点灯、点滅および消灯の操作
- HD振動(バイブレーター)のHigh/Low bandの周波数もしくは振幅の操作

### NFC/IR
  
NFC ICとIRカメラを制御しているMCUとの通信を行う。

- MCUの状態を取得
- NFC TagのPollingとUID/IDmの取得

### SPI Flash Memory

SPI Flash Memory内の一部の情報を表示する。

- Pairing information
- Factory calibration
- User calibration

### Hex dump

SPI Flash Memory内の一部のデータをHex dumpとして表示する。

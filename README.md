# homebridge-ledstrip-bledob

Highly experimental homebridge control plugin for Bluetooth-enabled RGB "ELK-BLEDOB" LED light strips, that are compatible with the Lotus Lantern app.

Control On/Off, Hue, Saturation and Brightness.

## Installation

`npm i @cagdaskemik/homekit-bledom`

## Configuration

```js
{
    "accessory": "LedStrip", // Dont change
    "name": "LED", // Accessory name
    "uuid": "be320202f8e8" // BLE device UUID
}
```

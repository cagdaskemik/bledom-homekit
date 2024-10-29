// index.js
const Device = require("./Device");
let Service, Characteristic;

const EFFECTS = {
  JUMP_RGB: 0x87,
  JUMP_RGBYCMW: 0x88,
  CROSSFADE_RGB: 0x89,
  CROSSFADE_RGBYCMW: 0x8a,
  BLINK_RGBYCMW: 0x95,
};

class LedStrip {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;

    this.log("Initializing LedStrip...");

    if (!config.uuid) {
      this.log.error("No UUID provided in config!");
      return;
    }

    this.log(`Device UUID: ${config.uuid}`);
    this.device = new Device(config.uuid, this.log);

    this.initializeServices();

    this.effect = config.effect || "none";
    this.effectSpeed = config.effectSpeed || 50;

    this.log("LedStrip initialized successfully");
  }

  initializeServices() {
    this.bulbService = new Service.Lightbulb(this.config.name);

    this.bulbService
      .getCharacteristic(Characteristic.On)
      .onGet(() => {
        this.log("HomeKit requested power state");
        return this.device.power;
      })
      .onSet(async (value) => {
        this.log(`Setting power state to: ${value}`);
        await this.device.set_power(value);
      });

    this.bulbService
      .getCharacteristic(Characteristic.Brightness)
      .onGet(() => {
        this.log("HomeKit requested brightness");
        return this.device.brightness;
      })
      .onSet(async (value) => {
        this.log(`Setting brightness to: ${value}`);
        await this.device.set_brightness(value);
      });

    this.bulbService
      .getCharacteristic(Characteristic.Hue)
      .onGet(() => {
        this.log("HomeKit requested hue");
        return this.device.hue;
      })
      .onSet(async (value) => {
        this.log(`Setting hue to: ${value}`);
        await this.device.set_hue(value);
      });

    this.bulbService
      .getCharacteristic(Characteristic.Saturation)
      .onGet(() => {
        this.log("HomeKit requested saturation");
        return this.device.saturation;
      })
      .onSet(async (value) => {
        this.log(`Setting saturation to: ${value}`);
        await this.device.set_saturation(value);
      });

    if (this.config.effects) {
      this.initializeEffectsService();
    }

    this.log("All services initialized");
  }

  initializeEffectsService() {
    this.effectService = new Service.Switch(`${this.config.name} Effects`);
    this.effectService
      .getCharacteristic(Characteristic.On)
      .onGet(() => this.effect !== "none")
      .onSet(async (value) => {
        this.log(`Setting effect state to: ${value}`);
        if (value) {
          const effectCode = EFFECTS[this.effect];
          if (effectCode) {
            await this.device.set_effect(effectCode);
            await this.device.set_effect_speed(this.effectSpeed);
          }
        } else {
          this.effect = "none";
          await this.device.set_hue(this.device.hue);
        }
      });
  }

  getServices() {
    const infoService = new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Manufacturer, "LedStrip")
      .setCharacteristic(Characteristic.Model, "BLEDOM")
      .setCharacteristic(Characteristic.SerialNumber, this.config.uuid);

    const services = [infoService, this.bulbService];
    if (this.config.effects) {
      services.push(this.effectService);
    }

    return services;
  }
}

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-ledstrip-bledom", "LedStrip", LedStrip);
};

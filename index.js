let Service, Characteristic;

class LedStrip {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;

    if (!config.uuid) {
      this.log.error("No UUID configured - accessory will not work!");
      return;
    }

    this.log.info(`Initializing LedStrip accessory with UUID: ${config.uuid}`);
    this.device = new Device(config.uuid, this.log);

    // Initialize services
    this.initializeServices();

    // Set default values
    this.effect = config.effect || "none";
    this.effectSpeed = config.effectSpeed || 50;
  }

  initializeServices() {
    this.log.debug("Initializing services");

    // Create main bulb service
    this.bulbService = new Service.Lightbulb(this.config.name);

    // Add required characteristics
    this.bulbService
      .getCharacteristic(Characteristic.On)
      .onGet(() => {
        this.log.debug(`Getting power state: ${this.device.power}`);
        return this.device.power;
      })
      .onSet(async (value) => {
        this.log.debug(`Setting power state to: ${value}`);
        await this.device.setPower(value);
      });

    this.bulbService
      .getCharacteristic(Characteristic.Brightness)
      .onGet(() => {
        this.log.debug(`Getting brightness: ${this.device.brightness}`);
        return this.device.brightness;
      })
      .onSet(async (value) => {
        this.log.debug(`Setting brightness to: ${value}`);
        await this.device.setBrightness(value);
      });

    this.bulbService
      .getCharacteristic(Characteristic.Hue)
      .onGet(() => {
        this.log.debug(`Getting hue: ${this.device.hue}`);
        return this.device.hue;
      })
      .onSet(async (value) => {
        this.log.debug(`Setting hue to: ${value}`);
        await this.device.setHue(value);
      });

    this.bulbService
      .getCharacteristic(Characteristic.Saturation)
      .onGet(() => {
        this.log.debug(`Getting saturation: ${this.device.saturation}`);
        return this.device.saturation;
      })
      .onSet(async (value) => {
        this.log.debug(`Setting saturation to: ${value}`);
        await this.device.setSaturation(value);
      });

    // Create effects service
    this.effectService = new Service.Switch(`${this.config.name} Effects`);
    this.effectService
      .getCharacteristic(Characteristic.On)
      .onGet(() => {
        this.log.debug(`Getting effect state: ${this.effect !== "none"}`);
        return this.effect !== "none";
      })
      .onSet(async (value) => {
        this.log.debug(`Setting effect state to: ${value}`);
        if (value) {
          const effectCode = EFFECTS[this.effect];
          if (effectCode) {
            await this.device.setEffect(effectCode);
            await this.device.setEffectSpeed(this.effectSpeed);
          }
        } else {
          this.effect = "none";
          await this.device.setHue(this.device.hue);
        }
      });
  }

  getServices() {
    const infoService = new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Manufacturer, "LedStrip")
      .setCharacteristic(Characteristic.Model, "BLEDOM")
      .setCharacteristic(Characteristic.SerialNumber, this.config.uuid);

    return [infoService, this.bulbService, this.effectService];
  }
}

// Export the plugin
module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-ledstrip-bledom", "LedStrip", LedStrip);
};

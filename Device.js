const noble = require("@abandonware/noble");

function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

class Device {
  constructor(uuid, log) {
    this.uuid = uuid;
    this.log = log;
    this.power = false;
    this.brightness = 100;
    this.hue = 0;
    this.saturation = 0;
    this.l = 0.5;
    this.peripheral = null;
    this.write = null;
    this.connected = false;

    this.initializeBluetooth();
  }

  initializeBluetooth() {
    noble.on("stateChange", async (state) => {
      this.log(`Bluetooth state changed to: ${state}`);
      if (state === "poweredOn") {
        await this.startScanning();
      } else {
        await this.disconnect();
      }
    });

    noble.on("discover", async (peripheral) => {
      this.log(`Discovered device: ${peripheral.uuid}`);
      if (peripheral.uuid === this.uuid) {
        this.peripheral = peripheral;
        await noble.stopScanningAsync();
        this.log("Found target device, stopped scanning");
        await this.connect();
      }
    });
  }

  async startScanning() {
    try {
      this.log("Starting BLE scan...");
      await noble.startScanningAsync();
    } catch (error) {
      this.log.error(`Scanning error: ${error.message}`);
    }
  }

  async connect() {
    try {
      if (!this.peripheral) {
        this.log("No peripheral found, starting scan...");
        await this.startScanning();
        return;
      }

      this.log(`Connecting to ${this.peripheral.uuid}...`);
      await this.peripheral.connectAsync();

      const { characteristics } = await this.peripheral.discoverSomeServicesAndCharacteristicsAsync(["fff0"], ["fff3"]);

      if (!characteristics || characteristics.length === 0) {
        throw new Error("No characteristics found");
      }

      this.write = characteristics[0];
      this.connected = true;
      this.log("Connected successfully");
    } catch (error) {
      this.log.error(`Connection error: ${error.message}`);
      this.connected = false;
      this.write = null;
    }
  }

  async disconnect() {
    if (this.peripheral && this.connected) {
      try {
        await this.peripheral.disconnectAsync();
        this.connected = false;
        this.write = null;
        this.log("Disconnected successfully");
      } catch (error) {
        this.log.error(`Disconnect error: ${error.message}`);
      }
    }
  }

  async writeToDevice(buffer) {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      if (!this.write) {
        reject(new Error("Write characteristic not available"));
        return;
      }

      this.write.write(buffer, true, (error) => {
        if (error) {
          this.log.error(`Write error: ${error.message}`);
          reject(error);
        } else {
          this.log("Write successful");
          resolve();
        }
      });
    });
  }

  async set_power(status) {
    try {
      const buffer = Buffer.from(`7e0404${status ? "f00001" : "000000"}ff00ef`, "hex");
      this.log(`Setting power to: ${status}`);
      await this.writeToDevice(buffer);
      this.power = status;
    } catch (error) {
      this.log.error(`Set power error: ${error.message}`);
    }
  }

  async set_brightness(level) {
    try {
      if (level > 100 || level < 0) {
        this.log.error(`Invalid brightness level: ${level}`);
        return;
      }
      const levelHex = level.toString(16).padStart(2, "0");
      const buffer = Buffer.from(`7e0401${levelHex}01ffff00ef`, "hex");
      this.log(`Setting brightness to: ${level}`);
      await this.writeToDevice(buffer);
      this.brightness = level;
    } catch (error) {
      this.log.error(`Set brightness error: ${error.message}`);
    }
  }

  async set_rgb(r, g, b) {
    try {
      const rhex = r.toString(16).padStart(2, "0");
      const ghex = g.toString(16).padStart(2, "0");
      const bhex = b.toString(16).padStart(2, "0");
      const buffer = Buffer.from(`7e070503${rhex}${ghex}${bhex}10ef`, "hex");
      this.log(`Setting RGB to: ${r},${g},${b}`);
      await this.writeToDevice(buffer);
    } catch (error) {
      this.log.error(`Set RGB error: ${error.message}`);
    }
  }

  async set_hue(hue) {
    try {
      this.hue = hue;
      const rgb = hslToRgb(hue / 360, this.saturation / 100, this.l);
      await this.set_rgb(...rgb);
    } catch (error) {
      this.log.error(`Set hue error: ${error.message}`);
    }
  }

  async set_saturation(saturation) {
    try {
      this.saturation = saturation;
      const rgb = hslToRgb(this.hue / 360, saturation / 100, this.l);
      await this.set_rgb(...rgb);
    } catch (error) {
      this.log.error(`Set saturation error: ${error.message}`);
    }
  }

  async set_effect(effect) {
    try {
      const buffer = Buffer.from(`7e000303${effect.toString(16)}030000ef`, "hex");
      this.log(`Setting effect to: ${effect}`);
      await this.writeToDevice(buffer);
    } catch (error) {
      this.log.error(`Set effect error: ${error.message}`);
    }
  }

  async set_effect_speed(speed) {
    try {
      if (speed > 100 || speed < 0) {
        this.log.error(`Invalid effect speed: ${speed}`);
        return;
      }
      const speedHex = speed.toString(16).padStart(2, "0");
      const buffer = Buffer.from(`7e000202${speedHex}000000ef`, "hex");
      this.log(`Setting effect speed to: ${speed}`);
      await this.writeToDevice(buffer);
    } catch (error) {
      this.log.error(`Set effect speed error: ${error.message}`);
    }
  }
}

module.exports = Device;

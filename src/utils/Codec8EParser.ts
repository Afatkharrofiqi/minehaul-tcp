import { Logger } from './Logger';

export interface BLESensorData {
  temperature: number;
  humidity: number;
}

export interface BLEBeaconData {
  uuid: string;
  major: number;
  minor: number;
  rssi: number;
}

export interface BLEAssetData {
  assetId: string;
  assetType: number;
}

export interface DecodedPacket {
  timestamp: Date;
  priority: number;
  gpsData?: {
    latitude: number;
    longitude: number;
    altitude: number;
    angle: number;
    satellites: number;
    speed: number;
  };
  ioElements?: Record<number, number | string | Record<string, unknown>>;
  bleData?: Record<
    string,
    BLESensorData | BLEBeaconData | BLEAssetData | string
  >;
  rawData: string;
}

export class Codec8EParser {
  public static parsePacket(data: Buffer): DecodedPacket {
    if (data.length < 25) {
      return {
        timestamp: new Date(),
        priority: 0,
        rawData: data.toString('hex'),
      };
    }
    // Extract IMEI (assuming it's located at bytes 2-17)
    const imei = data.subarray(2, 17).toString();
    Logger.log(`Decoded IMEI: ${imei}`);

    // Correct timestamp extraction: 8 bytes after IMEI (milliseconds since Unix epoch)
    const timestampBuffer = data.subarray(17, 25);

    // Convert the 8-byte buffer to a BigInt and create a Date object from milliseconds
    const timestampMs = BigInt(`0x${timestampBuffer.toString('hex')}`);

    // Check if the timestamp value is within the valid range of JavaScript Dates
    const maxJsDateMs = BigInt(Number.MAX_SAFE_INTEGER); // Max safe value for JavaScript Date (about 285,616 years)
    if (timestampMs > maxJsDateMs) {
      throw new Error(`Invalid timestamp value: ${timestampMs.toString()}`);
    }

    // Create a JavaScript Date object
    const timestamp = new Date(Number(timestampMs));

    // Validate timestamp
    if (isNaN(timestamp.getTime())) {
      throw new Error(
        `Invalid timestamp value after conversion: ${timestampMs.toString()}`
      );
    }
    // Extract Priority (1 byte following Timestamp)
    const priority = parseInt(data.subarray(25, 26).toString('hex'), 16);
    // Extract Longitude (4 bytes following Priority)
    const longitude =
      parseInt(data.subarray(26, 30).toString('hex'), 16) / 10000000;
    // Extract Latitude (4 bytes following Longitude)
    const latitude =
      parseInt(data.subarray(30, 34).toString('hex'), 16) / 10000000;
    // Extract Altitude (2 bytes following Latitude)
    const altitude = parseInt(data.subarray(34, 36).toString('hex'), 16);
    // Extract Angle (2 bytes following Altitude)
    const angle = parseInt(data.subarray(36, 38).toString('hex'), 16);
    // Extract Satellites (1 byte following Angle)
    const satellites = parseInt(data.subarray(38, 39).toString('hex'), 16);
    // Extract Speed (2 bytes following Satellites)
    const speed = parseInt(data.subarray(39, 41).toString('hex'), 16);

    const gpsData = { latitude, longitude, altitude, angle, satellites, speed };

    const ioElements: Record<
      number,
      number | string | Record<string, unknown>
    > = {};
    const bleData: Record<
      string,
      BLESensorData | BLEBeaconData | BLEAssetData | string
    > = {};

    const ioElementCount = parseInt(data.subarray(41, 42).toString('hex'), 16);
    let offset = 42;
    for (let i = 0; i < ioElementCount; i++) {
      const ioId = parseInt(
        data.subarray(offset, offset + 1).toString('hex'),
        16
      );
      const ioValue = parseInt(
        data.subarray(offset + 1, offset + 2).toString('hex'),
        16
      );
      ioElements[ioId] = ioValue;
      offset += 2;
    }

    return {
      timestamp,
      priority,
      gpsData,
      ioElements,
      bleData,
      rawData: data.toString('hex'),
    };
  }

  private static parseBLEData(
    ioId: number,
    ioValue: Buffer
  ): BLESensorData | BLEBeaconData | BLEAssetData | string {
    Logger.log(
      `Parsing BLE Data for IO ID: ${ioId}, IO Value: ${ioValue.toString('hex')}`
    );

    if (ioValue.length < 9) {
      Logger.warn(
        `BLE data for IO ID ${ioId} is too short: ${ioValue.length} bytes`
      );
      return `Insufficient BLE data for IO ID ${ioId}`;
    }

    switch (ioId) {
      case 200:
        return this.parseBLESensorData(ioValue);
      case 201:
        return this.parseBLEBeaconData(ioValue);
      case 202:
        return this.parseBLEAssetData(ioValue);
      default:
        return `Unknown BLE data for IO ID ${ioId}`;
    }
  }

  private static parseBLESensorData(ioValue: Buffer): BLESensorData {
    return {
      temperature: ioValue.readInt8(0),
      humidity: ioValue.readInt8(1),
    };
  }

  private static parseBLEBeaconData(ioValue: Buffer): BLEBeaconData {
    return {
      uuid: ioValue.subarray(0, 16).toString('hex'),
      major: ioValue.readUInt16BE(16),
      minor: ioValue.readUInt16BE(18),
      rssi: ioValue.readInt8(20),
    };
  }

  private static parseBLEAssetData(ioValue: Buffer): BLEAssetData {
    return {
      assetId: ioValue.subarray(0, 8).toString('hex'),
      assetType: ioValue.readUInt8(8),
    };
  }
}

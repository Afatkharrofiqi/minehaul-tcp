import { Logger } from './Logger';

// Define interfaces for BLE data
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

// Define the structure of the DecodedPacket interface
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

    const dataView = new DataView(data.buffer);
    const timestamp = new Date(Number(dataView.getBigInt64(0)));
    const priority = data.readUInt8(8);
    const latitude = data.readInt32BE(9) / 10000000;
    const longitude = data.readInt32BE(13) / 10000000;
    const altitude = data.readInt16BE(17);
    const angle = data.readUInt16BE(19);
    const satellites = data.readUInt8(21);
    const speed = data.readUInt16BE(22);
    const gpsData = { latitude, longitude, altitude, angle, satellites, speed };

    const ioElements: Record<
      number,
      number | string | Record<string, unknown>
    > = {};
    const bleData: Record<
      string,
      BLESensorData | BLEBeaconData | BLEAssetData | string
    > = {};

    const ioElementCount = data.readUInt8(24);
    let offset = 25;

    for (let i = 0; i < ioElementCount; i++) {
      if (offset + 1 >= data.length) {
        Logger.warn(
          `Incomplete IO element at offset ${offset}. Skipping remaining elements.`
        );
        break;
      }

      const ioId = data.readUInt8(offset);
      const ioValueLength = data.readUInt8(offset + 1);
      const ioValue = data.subarray(offset + 2, offset + 2 + ioValueLength);

      if (ioId === 200 || ioId === 201 || ioId === 202) {
        const parsedBLEData = this.parseBLEData(ioId, ioValue);
        Logger.log(
          `Parsed BLE Data for IO ID ${ioId}: ${JSON.stringify(parsedBLEData)}`
        );
        bleData[ioId.toString()] = parsedBLEData;
      } else {
        ioElements[ioId] = ioValue.toString('hex');
      }

      offset += 2 + ioValueLength;
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
      // Adjust this value based on the minimum required length for BLE data
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
    Logger.log(`Parsing BLE Sensor Data: ${ioValue.toString('hex')}`);
    return {
      temperature: ioValue.readInt8(0),
      humidity: ioValue.readInt8(1),
    };
  }

  private static parseBLEBeaconData(ioValue: Buffer): BLEBeaconData {
    Logger.log(`Parsing BLE Beacon Data: ${ioValue.toString('hex')}`);
    return {
      uuid: ioValue.subarray(0, 16).toString('hex'),
      major: ioValue.readUInt16BE(16),
      minor: ioValue.readUInt16BE(18),
      rssi: ioValue.readInt8(20),
    };
  }

  private static parseBLEAssetData(ioValue: Buffer): BLEAssetData {
    Logger.log(`Parsing BLE Asset Data: ${ioValue.toString('hex')}`);
    return {
      assetId: ioValue.subarray(0, 8).toString('hex'),
      assetType: ioValue.readUInt8(8),
    };
  }
}

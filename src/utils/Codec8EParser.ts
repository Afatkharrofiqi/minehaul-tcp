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
    // Check if the packet is too short for a full Codec 8 Extended packet
    if (data.length < 25) {
      // Log a warning and return a partially parsed packet or raw data for future analysis
      return {
        timestamp: new Date(), // Use current time as a placeholder
        priority: 0,
        rawData: data.toString('hex'),
      };
    }

    const dataView = new DataView(data.buffer);

    // Parse the first few fields if the data length is sufficient
    const timestamp = new Date(Number(dataView.getBigInt64(0))); // 8 bytes for timestamp
    const priority = data.readUInt8(8); // 1 byte for priority

    // Parse GPS Data (replace with correct offset and length)
    const latitude = data.readInt32BE(9) / 10000000;
    const longitude = data.readInt32BE(13) / 10000000;
    const altitude = data.readInt16BE(17);
    const angle = data.readUInt16BE(19);
    const satellites = data.readUInt8(21);
    const speed = data.readUInt16BE(22);

    const gpsData = { latitude, longitude, altitude, angle, satellites, speed };

    // Parse IO Elements (replace with correct offset and structure parsing)
    const ioElements: Record<
      number,
      number | string | Record<string, unknown>
    > = {};
    const bleData: Record<
      string,
      BLESensorData | BLEBeaconData | BLEAssetData | string
    > = {}; // Store parsed BLE data separately

    const ioElementCount = data.readUInt8(24); // Number of IO elements
    let offset = 25; // Starting position of IO elements

    for (let i = 0; i < ioElementCount; i++) {
      if (offset + 1 >= data.length) {
        Logger.warn(
          `Incomplete IO element at offset ${offset}. Skipping remaining elements.`
        );
        break;
      }
      const ioId = data.readUInt8(offset); // 1 byte for IO ID
      const ioValueLength = data.readUInt8(offset + 1); // Length of the IO value
      const ioValue = data.slice(offset + 2, offset + 2 + ioValueLength); // Extract value

      // Special handling for BLE data based on specific IO IDs
      if (ioId === 200 || ioId === 201 || ioId === 202) {
        bleData[ioId.toString()] = this.parseBLEData(ioId, ioValue);
      } else {
        ioElements[ioId] = ioValue.toString('hex'); // Default to hex string for other IO IDs
      }

      offset += 2 + ioValueLength; // Move to next IO element
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
    // Implement specific parsing logic for BLE data based on IO ID
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
    // Parse BLE sensor data (example: temperature, humidity, etc.)
    // The structure will vary based on the Teltonika protocol specification
    return {
      temperature: ioValue.readInt8(0), // Assume first byte is temperature
      humidity: ioValue.readInt8(1), // Assume second byte is humidity
    };
  }

  private static parseBLEBeaconData(ioValue: Buffer): BLEBeaconData {
    // Parse BLE beacon data (example: UUID, major, minor, RSSI, etc.)
    return {
      uuid: ioValue.slice(0, 16).toString('hex'), // 16 bytes for UUID
      major: ioValue.readUInt16BE(16), // 2 bytes for major value
      minor: ioValue.readUInt16BE(18), // 2 bytes for minor value
      rssi: ioValue.readInt8(20), // 1 byte for RSSI
    };
  }

  private static parseBLEAssetData(ioValue: Buffer): BLEAssetData {
    // Parse BLE asset data (example: asset ID, type, etc.)
    return {
      assetId: ioValue.slice(0, 8).toString('hex'), // First 8 bytes for asset ID
      assetType: ioValue.readUInt8(8), // 1 byte for asset type
    };
  }
}

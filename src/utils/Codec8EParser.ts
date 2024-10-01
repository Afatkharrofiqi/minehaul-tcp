import { Logger } from './Logger';

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
  ioElements?: Record<number, number>;
  rawData: string;
}

export class Codec8EParser {
  public static parsePacket(data: Buffer): DecodedPacket {
    Logger.log(`Received data length: ${data.length}`);
    Logger.log(`Hex data: ${data.toString('hex')}`); // Log the raw data in hex format

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
    const ioElements: Record<number, number> = {};
    const ioElementCount = data.readUInt8(24); // Number of IO elements
    let offset = 25; // Starting position of IO elements

    for (let i = 0; i < ioElementCount; i++) {
      if (offset + 1 >= data.length) {
        console.warn(
          `Incomplete IO element at offset ${offset}. Skipping remaining elements.`
        );
        break;
      }
      const ioId = data.readUInt8(offset); // 1 byte for IO ID
      const ioValue = data.readUInt8(offset + 1); // 1 byte for IO value (assuming 1 byte values)
      ioElements[ioId] = ioValue;
      offset += 2; // Move to next IO element
    }

    return {
      timestamp,
      priority,
      gpsData,
      ioElements,
      rawData: data.toString('hex'),
    };
  }
}

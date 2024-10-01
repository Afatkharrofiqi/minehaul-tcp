// src/utils/Codec8EParser.ts

export interface DecodedPacket {
  timestamp: Date;
  priority: number;
  gpsData: {
    latitude: number;
    longitude: number;
    altitude: number;
    angle: number;
    satellites: number;
    speed: number;
  };
  ioElements: Record<number, number>;
}

export class Codec8EParser {
  public static parsePacket(data: Buffer): DecodedPacket {
    const dataView = new DataView(data.buffer);

    // Example parsing logic, replace with correct byte offset according to Codec 8 Extended structure.
    // Offset values need to be adjusted based on the actual packet structure.

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
      const ioId = data.readUInt8(offset); // 1 byte for IO ID
      const ioValue = data.readUInt8(offset + 1); // 1 byte for IO value (assuming 1 byte values)
      ioElements[ioId] = ioValue;
      offset += 2; // Move to next IO element
    }

    return { timestamp, priority, gpsData, ioElements };
  }
}

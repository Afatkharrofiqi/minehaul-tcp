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
    console.log(`Received data length: ${data.length}`); // Print the length of the received data

    if (data.length < 25) {
      // Check if the packet length is at least 25 bytes
      throw new Error(
        `Data packet is too short: ${data.length} bytes. Expected at least 25 bytes.`
      );
    }

    const dataView = new DataView(data.buffer);

    // Example parsing logic based on length, replace with actual structure if needed.
    const timestamp = new Date(Number(dataView.getBigInt64(0))); // 8 bytes for timestamp
    const priority = data.readUInt8(8); // 1 byte for priority

    // Parse GPS Data (replace with correct offset and length)
    const latitude = data.readInt32BE(9) / 10000000;
    const longitude = data.readInt32BE(13) / 10000000;
    const altitude = data.readInt16BE(17); // This line causes error if packet length < 19
    const angle = data.readUInt16BE(19); // This line causes error if packet length < 21
    const satellites = data.readUInt8(21); // This line causes error if packet length < 22
    const speed = data.readUInt16BE(22); // This line causes error if packet length < 24

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

    return { timestamp, priority, gpsData, ioElements };
  }
}

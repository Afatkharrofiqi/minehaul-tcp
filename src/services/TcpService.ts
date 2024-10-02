import crc from 'crc';
import { Server, Socket } from 'net';

import { TcpConfig } from '../configs/TcpConfig';
// import { Codec8EParser, DecodedPacket } from '../utils/Codec8EParser';
import { Logger } from '../utils/Logger';
import { SyncDeviceDataService } from './SyncDeviceDataService';

function parseTeltonikaData(buffer: Buffer) {
  if (!buffer || buffer.length < 15) {
    Logger.log(
      'Invalid or empty buffer. Please provide a valid Teltonika data buffer.'
    );
    return;
  }

  let offset = 0;

  // Read Preamble (4 bytes)
  const preamble = buffer.readUInt32BE(offset);
  offset += 4;
  Logger.log(`Preamble: 0x${preamble.toString(16)}`);

  // Read Data Field Length (4 bytes)
  const dataFieldLength = buffer.readUInt32BE(offset);
  offset += 4;
  Logger.log(`Data Field Length: ${dataFieldLength}`);

  // Read Codec ID (1 byte)
  const codecId = buffer.readUInt8(offset);
  offset += 1;
  Logger.log(`Codec ID: 0x${codecId.toString(16)}`);

  // Check if the Codec ID matches Codec 8 Extended (0x8e)
  if (codecId !== 0x8e) {
    Logger.log('Unsupported codec. Expected Codec 8 Extended.');
    return;
  }

  // Read Number of Data 1 (1 byte)
  const numberOfData1 = buffer.readUInt8(offset);
  offset += 1;
  Logger.log(`Number of Data 1: ${numberOfData1}`);

  // Parse AVL Data Records based on Number of Data 1
  for (let i = 0; i < numberOfData1; i++) {
    if (buffer.length < offset + 24) {
      // Minimum length for one AVL record (Timestamp 8 bytes + Priority 1 byte + GPS Element 15 bytes)
      Logger.log(`Insufficient buffer length to parse AVL record ${i + 1}.`);
      return;
    }

    // Timestamp (8 bytes)
    const timestamp = buffer.readBigUInt64BE(offset);
    offset += 8;
    const date = new Date(Number(timestamp));
    Logger.log(`Timestamp: ${isNaN(date.getTime()) ? 'Invalid Date' : date}`);

    // Priority (1 byte)
    const priority = buffer.readUInt8(offset);
    offset += 1;

    // GPS Element (15 bytes)
    const longitude = buffer.readInt32BE(offset) / 10000000;
    const latitude = buffer.readInt32BE(offset + 4) / 10000000;
    const altitude = buffer.readInt16BE(offset + 8);
    const angle = buffer.readUInt16BE(offset + 10);
    const satellites = buffer.readUInt8(offset + 12);
    const speed = buffer.readUInt16BE(offset + 13);
    offset += 15;

    Logger.log(
      `GPS Data: Latitude: ${latitude}, Longitude: ${longitude}, Altitude: ${altitude}, Speed: ${speed}, Satellites: ${satellites}, Angle: ${angle}, Priority: ${priority}`
    );

    // Event IO ID (2 bytes)
    const eventId = buffer.readUInt16BE(offset);
    offset += 2;

    // Total Number of Properties (2 bytes)
    const totalIoElements = buffer.readUInt16BE(offset);
    offset += 2;

    Logger.log(`Event ID: ${eventId}, Total IO Elements: ${totalIoElements}`);

    // Parse IO elements (variable length)
    offset = parseIoElementsExtended(buffer, offset, totalIoElements);

    if (offset === -1) {
      Logger.log(`Error parsing IO Elements for record ${i + 1}.`);
      return;
    }
  }

  // Read Number of Data 2 (1 byte, should match Number of Data 1)
  if (buffer.length < offset + 1) {
    Logger.log('Insufficient buffer length for Number of Data 2.');
    return;
  }
  const numberOfData2 = buffer.readUInt8(offset);
  offset += 1;
  Logger.log(`Number of Data 2: ${numberOfData2}`);

  // Validate that Number of Data 1 and Number of Data 2 match
  if (numberOfData1 !== numberOfData2) {
    Logger.log(
      `Number of data records mismatch between start (${numberOfData1}) and end (${numberOfData2}).`
    );
    return;
  }

  // CRC-16 (4 bytes)
  if (buffer.length < offset + 4) {
    Logger.log('Insufficient buffer length for CRC.');
    return;
  }
  const crc16 = buffer.readUInt32BE(offset);
  offset += 4;
  Logger.log(`CRC (From Buffer): ${crc16}`);

  // Calculate CRC for validation
  const calculatedCrc16 = crc.crc16modbus(buffer.subarray(4, offset - 4)); // Calculate CRC for the data excluding preamble and CRC itself
  Logger.log(`Calculated CRC: ${calculatedCrc16}`);

  if (crc16 !== calculatedCrc16) {
    Logger.log(
      `CRC Error: Expected ${crc16}, but calculated ${calculatedCrc16}`
    );
    return;
  }

  Logger.log('Data parsed successfully');
}

// Updated Function to Parse IO Elements for Codec 8 Extended
function parseIoElementsExtended(
  buffer: Buffer,
  offset: number,
  totalElements: number
) {
  Logger.log(`Parsing ${totalElements} IO Elements...`);

  for (let i = 0; i < totalElements; i++) {
    // Ensure we have at least 2 bytes to read the IO ID
    if (buffer.length < offset + 2) {
      Logger.log(`Insufficient buffer length for IO Element ID at index ${i}.`);
      return -1;
    }

    // Read IO ID (2 bytes)
    const ioId = buffer.readUInt16BE(offset);
    offset += 2;

    // Determine the length of the IO value based on the configuration
    const ioValueLength = getIoValueLength(ioId);
    if (buffer.length < offset + ioValueLength) {
      Logger.log(`Insufficient buffer length for IO Value of IO ID ${ioId}.`);
      return -1;
    }

    // Read IO Value (variable length)
    let ioValue;
    if (ioValueLength > 0) {
      ioValue = buffer.readUIntBE(offset, ioValueLength);
    } else {
      ioValue = buffer.readUInt8(offset);
    }
    offset += ioValueLength;

    Logger.log(`IO Element ID: ${ioId}, Value: ${ioValue}`);
  }

  return offset;
}

// Helper function to determine IO element length based on ID (this is a simplified version, adjust as necessary)
function getIoValueLength(ioId: number): number {
  // This should be defined based on the specific IO ID mappings and lengths in the Teltonika documentation
  if (ioId === 0) return 1; // Length of 1 byte for some IO elements
  if (ioId === 1) return 2; // Length of 2 bytes for some IO elements
  return 4; // Default length for other IO elements
}

export class TcpService {
  private server: Server;

  constructor(private syncServiceData: SyncDeviceDataService) {
    // Create a TCP server and bind the `handleConnection` method as the connection handler
    this.server = new Server(this.handleConnection.bind(this));
  }

  private async handleConnection(socket: Socket): Promise<void> {
    Logger.log(
      `Client connected: ${socket.remoteAddress}:${socket.remotePort}`
    );

    socket.on('data', async (data) => {
      Logger.log(`Data length: ${data.length} bytes`);

      try {
        // Handle initial IMEI packet (17 bytes long)
        if (data.length === 17) {
          const imei = data.subarray(2).toString('ascii');
          Logger.log(`Received IMEI: ${imei}`);
          // Acknowledge IMEI reception
          socket.write(Buffer.from([0x01]));
          return;
        }

        parseTeltonikaData(data);

        // Decode the incoming data using Codec8E parser
        // const decodedData: DecodedPacket = Codec8EParser.parsePacket(data);

        // // Check if parsed data contains GPS data and IO elements
        // if (!decodedData.gpsData || !decodedData.ioElements) {
        //   Logger.warn(
        //     `Received an incomplete or unrecognized packet: ${decodedData.rawData}`
        //   );
        //   socket.write(`Received an incomplete packet.`);
        //   return;
        // }

        // // Save parsed data to the database
        // await this.syncServiceData.insert(decodedData);

        // Acknowledge successful data logging
        socket.write(Buffer.from([0x01])); // Send acknowledgement byte (for example)
        Logger.log('Data logged successfully.');
      } catch (error) {
        socket.write(`Failed to log data.`);
        Logger.error(`Failed to log data: ${error}`);
      }
    });

    socket.on('end', () => {
      Logger.log('Client disconnected');
    });

    socket.on('error', (err) => {
      Logger.error(`Socket error: ${err.message}`);
    });
  }

  public startServer(): void {
    const { host, port } = TcpConfig;
    this.server.listen(port, host, () => {
      Logger.log(`TCP Server is running on ${host}:${port}`);
    });
  }
}

import crc from 'crc';
import { Server, Socket } from 'net';

import { TcpConfig } from '../configs/TcpConfig';
// import { Codec8EParser, DecodedPacket } from '../utils/Codec8EParser';
import { Logger } from '../utils/Logger';
import { SyncDeviceDataService } from './SyncDeviceDataService';

// Function to parse the data
function parseTeltonikaData(buffer: Buffer) {
  if (!buffer || buffer.length < 11) {
    Logger.log(
      'Invalid or empty buffer. Please provide a valid Teltonika data buffer.'
    );
    return;
  }

  // Log the buffer content in hexadecimal format for easier inspection
  Logger.log(`Buffer Content (Hex):', ${buffer.toString('hex')}`);

  let offset = 0;

  // Read Preamble (8 bytes)
  const preamble = buffer.readBigUInt64BE(offset);
  offset += 8;
  Logger.log(`Preamble: 0x${preamble.toString(16)}`);

  // Read Codec ID (1 byte)
  const codecId = buffer.readUInt8(offset);
  offset += 1;
  Logger.log(`Codec ID: 0x${codecId.toString(16)}`);

  // Check if the Codec ID matches Codec 8 Extended (0x8e)
  if (codecId !== 0x8e) {
    Logger.log('Unsupported codec. Expected Codec 8 Extended.');
    return;
  }

  // Read Data Size (2 bytes)
  if (buffer.length < offset + 2) {
    Logger.log('Insufficient buffer length for Data Size.');
    return;
  }
  const dataSize = buffer.readUInt16BE(offset);
  offset += 2;
  Logger.log(`Data Size: 0x${dataSize.toString(16)}`);

  // Number of Data Records (1 byte)
  if (buffer.length < offset + 1) {
    Logger.log('Insufficient buffer length for Number of Data Records.');
    return;
  }
  // Number of Data (1 byte)
  const numberOfRecords = buffer.readUInt8(offset);
  offset += 1;
  Logger.log(`Number of Data Records: ${numberOfRecords}`);

  // Parse AVL Data Records
  for (let i = 0; i < numberOfRecords; i++) {
    // Timestamp (8 bytes)
    const timestamp = buffer.readBigUInt64BE(offset);
    offset += 8;
    Logger.log(`Timestamp: ${new Date(Number(timestamp))}`);

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

    // IO Element (variable length, based on IO data set configuration)
    const eventId = buffer.readUInt8(offset); // Event IO ID
    const totalElements = buffer.readUInt8(offset + 1); // Total number of IO elements
    offset += 2;

    Logger.log(`Event ID: ${eventId}, Total IO Elements: ${totalElements}`);

    // Parse IO elements
    offset = parseIoElements(buffer, offset, totalElements);

    // BLE Data (optional, parse if available based on configuration)
    if (buffer.length > offset) {
      offset = parseBleData(buffer, offset);
    }
  }

  // Number of Data (1 byte, repeated)
  const repeatNumberOfData = buffer.readUInt8(offset);
  Logger.log(`RepeatNumberofData: ${repeatNumberOfData}`);
  offset += 1;

  // CRC-16 (2 bytes)
  const crc16 = buffer.readUInt16BE(offset);
  const calculatedCrc16 = crc.crc16modbus(buffer.subarray(4, offset)); // Calculate CRC for the data
  if (crc16 !== calculatedCrc16) {
    Logger.log(
      `CRC Error: Expected ${crc16}, but calculated ${calculatedCrc16}`
    );
    return;
  }

  Logger.log('Data parsed successfully');
}

// Function to parse IO elements
function parseIoElements(
  buffer: Buffer,
  offset: number,
  totalElements: number
) {
  for (let i = 0; i < totalElements; i++) {
    // IO elements could be of different sizes: 1 byte, 2 bytes, 4 bytes, 8 bytes, etc.
    // Implement IO parsing logic here based on your specific IO setup
    // For simplicity, skipping IO parsing in this example
  }
  return offset;
}

// Function to parse BLE data (if present)
function parseBleData(buffer: Buffer, offset: number) {
  // Implement BLE parsing logic based on Teltonika's protocol documentation
  // Typically includes beacon UUID, RSSI, and other sensor data
  return offset;
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

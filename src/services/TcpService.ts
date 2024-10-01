import { Server, Socket } from 'net';

import { TcpConfig } from '../configs/TcpConfig';
import { Logger } from '../utils/Logger';
import { SyncDeviceDataService } from './SyncDeviceDataService';

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

    // Store parsed data from Teltonika devices
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teltonikaData: Record<string, any[]> = {};

    socket.on('data', async (data) => {
      // Logger.log(`Data length: ${data.length} bytes`);

      // try {
      //   // Handle initial IMEI packet (17 bytes long)
      //   if (data.length === 17) {
      //     const imei = data.subarray(2).toString('ascii');
      //     Logger.log(`Received IMEI: ${imei}`);
      //     // Acknowledge IMEI reception
      //     socket.write(Buffer.from([0x01]));
      //     return;
      //   }

      //   // Decode the incoming data using Codec8E parser
      //   const decodedData: DecodedPacket = Codec8EParser.parsePacket(data);

      //   // Check if parsed data contains GPS data and IO elements
      //   if (!decodedData.gpsData || !decodedData.ioElements) {
      //     Logger.warn(
      //       `Received an incomplete or unrecognized packet: ${decodedData.rawData}`
      //     );
      //     socket.write(`Received an incomplete packet.`);
      //     return;
      //   }

      //   // Save parsed data to the database
      //   await this.syncServiceData.insert(decodedData);

      //   // Acknowledge successful data logging
      //   socket.write(Buffer.from([0x01])); // Send acknowledgement byte (for example)
      //   Logger.log('Data logged successfully.');
      // } catch (error) {
      //   socket.write(`Failed to log data.`);
      //   Logger.error(`Failed to log data: ${error}`);
      // }
      const hexData = data.toString('hex');
      Logger.log(`Received data: ${hexData}`);

      // Check if the data is IMEI
      if (hexData.length === 30) {
        const imei = parseIMEI(hexData);
        Logger.log(`Received IMEI: ${imei}`);
        socket.write(Buffer.from([0x01])); // Acknowledge IMEI reception
      } else {
        // Handle Teltonika Codec8 or Codec8E data
        const result = handleTeltonikaPacket(hexData);
        if (result.success) {
          Logger.log(
            `Parsed records: ${JSON.stringify(result.records, null, 2)}`
          );
          if (!teltonikaData[result.imei]) {
            teltonikaData[result.imei] = [];
          }
          teltonikaData[result.imei].push(...result.records);
          // Send the number of records received as a response
          const response = Buffer.alloc(4);
          response.writeUInt32BE(result.records.length, 0);
          socket.write(response);
        } else {
          Logger.error(`Failed to parse Teltonika packet: ${result.error}`);
          socket.end(); // Terminate the connection on error
        }
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

// Utility function to parse IMEI
export function parseIMEI(hexData: string): string {
  const imeiBuffer = Buffer.from(hexData, 'hex');
  return imeiBuffer.toString('ascii').slice(4); // Convert hex to ASCII and slice to get IMEI
}

// Function to handle Teltonika packet parsing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleTeltonikaPacket(hexData: string): {
  success: boolean;
  imei: string;
  records: any[];
  error?: string;
} {
  try {
    const imei = 'default_imei'; // Replace with actual IMEI extraction logic
    const records = handleRecordData(hexData); // Implement parsing logic based on Codec8E
    return { success: true, imei, records };
  } catch (error) {
    return {
      success: false,
      imei: '',
      records: [],
      error: (error as Error).message,
    };
  }
}

// Function to handle and parse record data based on Teltonika Codec8E packet format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleRecordData(data: string): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records: any[] = [];
  let position = 0;

  // Zero bytes - skip the first 8 characters (4 bytes)
  position += 8;

  // Data length (8 characters / 4 bytes)
  // const dataLengthHex = data.substring(position, position + 8);
  // const dataLength = parseInt(dataLengthHex, 16);
  position += 8;

  // Codec type (2 characters / 1 byte)
  // const codecType = data.substring(position, position + 2);
  position += 2;

  // Number of records (2 characters / 1 byte)
  const numberOfRecords = parseInt(data.substring(position, position + 2), 16);
  position += 2;

  // Parse each record
  for (let i = 0; i < numberOfRecords; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: any = {};

    // Timestamp (16 characters / 8 bytes)
    const timestampHex = data.substring(position, position + 16);
    const timestampMs = parseInt(timestampHex, 16) / 1000;
    const timestamp = new Date(timestampMs);
    record.timestamp = timestamp.toISOString();
    position += 16;

    // Priority (2 characters / 1 byte)
    const priority = parseInt(data.substring(position, position + 2), 16);
    record.priority = priority;
    position += 2;

    // GPS Longitude (8 characters / 4 bytes)
    const longitudeHex = data.substring(position, position + 8);
    record.longitude = parseCoordinate(longitudeHex);
    position += 8;

    // GPS Latitude (8 characters / 4 bytes)
    const latitudeHex = data.substring(position, position + 8);
    record.latitude = parseCoordinate(latitudeHex);
    position += 8;

    // Altitude (4 characters / 2 bytes)
    const altitudeHex = data.substring(position, position + 4);
    record.altitude = parseInt(altitudeHex, 16);
    position += 4;

    // Angle (4 characters / 2 bytes)
    const angleHex = data.substring(position, position + 4);
    record.angle = parseInt(angleHex, 16);
    position += 4;

    // Satellites (2 characters / 1 byte)
    const satellitesHex = data.substring(position, position + 2);
    record.satellites = parseInt(satellitesHex, 16);
    position += 2;

    // Speed (4 characters / 2 bytes)
    const speedHex = data.substring(position, position + 4);
    record.speed = parseInt(speedHex, 16);
    position += 4;

    // Event IO ID (2 characters / 1 byte)
    const eventIoIdHex = data.substring(position, position + 2);
    record.eventIoId = parseInt(eventIoIdHex, 16);
    position += 2;

    // Total number of IO elements (2 characters / 1 byte)
    // const totalIoElementsHex = data.substring(position, position + 2);
    // const totalIoElements = parseInt(totalIoElementsHex, 16);
    position += 2;

    // Parse IO elements
    record.ioElements = parseIoElements(data, position);
    position = record.ioElements.newPosition; // Update position after parsing IO elements

    records.push(record);
  }

  return records;
}

// Function to parse IO elements based on length
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseIoElements(
  data: string,
  position: number
): { elements: any; newPosition: number } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elements: any = {};

  // Parse 1-byte IO elements
  const numberOf1ByteElements = parseInt(
    data.substring(position, position + 2),
    16
  );
  position += 2;
  for (let i = 0; i < numberOf1ByteElements; i++) {
    const id = parseInt(data.substring(position, position + 2), 16);
    position += 2;
    const value = parseInt(data.substring(position, position + 2), 16);
    position += 2;
    elements[id] = value;
  }

  // Parse 2-byte IO elements
  const numberOf2ByteElements = parseInt(
    data.substring(position, position + 2),
    16
  );
  position += 2;
  for (let i = 0; i < numberOf2ByteElements; i++) {
    const id = parseInt(data.substring(position, position + 2), 16);
    position += 2;
    const value = parseInt(data.substring(position, position + 4), 16);
    position += 4;
    elements[id] = value;
  }

  // Parse 4-byte IO elements
  const numberOf4ByteElements = parseInt(
    data.substring(position, position + 2),
    16
  );
  position += 2;
  for (let i = 0; i < numberOf4ByteElements; i++) {
    const id = parseInt(data.substring(position, position + 2), 16);
    position += 2;
    const value = parseInt(data.substring(position, position + 8), 16);
    position += 8;
    elements[id] = value;
  }

  // Parse 8-byte IO elements
  const numberOf8ByteElements = parseInt(
    data.substring(position, position + 2),
    16
  );
  position += 2;
  for (let i = 0; i < numberOf8ByteElements; i++) {
    const id = parseInt(data.substring(position, position + 2), 16);
    position += 2;
    const value = BigInt('0x' + data.substring(position, position + 16));
    position += 16;
    elements[id] = value;
  }

  return { elements, newPosition: position };
}

// Helper function to parse coordinates
function parseCoordinate(hexCoordinate: string): number {
  const coordinate = parseInt(hexCoordinate, 16);
  if (coordinate & (1 << 31)) {
    return (coordinate - 2 ** 32) / 10000000;
  } else {
    return coordinate / 10000000;
  }
}

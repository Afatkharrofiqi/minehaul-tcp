import { Server, Socket } from 'net';

import { TcpConfig } from '../configs/TcpConfig';
// import { Codec8EParser, DecodedPacket } from '../utils/Codec8EParser';
import { Logger } from '../utils/Logger';
import { SyncDeviceDataService } from './SyncDeviceDataService';

interface IOElement {
  n1IoId: number;
  ioValue: number;
}

interface Record {
  timestamp: bigint;
  priority: number;
  longitude: number;
  latitude: number;
  altitude: number;
  angle: number;
  satellites: number;
  speed: number;
  eventIoId: number;
  nTotalId: number;
  ioElements: IOElement[];
}

// Utility function to convert a hexadecimal string to a Buffer object
const hexToBuffer = (hex: string) => Buffer.from(hex, 'hex');

// Function to parse AVL data (not modified in this fix)
const parseAvlData = (hexStream: string) => {
  const buffer = hexToBuffer(hexStream);
  let offset = 0;

  // Skip Zero Bytes (4 bytes)
  const zeroBytes = buffer.slice(offset, offset + 4).toString('hex');
  offset += 4;

  // Data Field Length (4 bytes)
  const dataFieldLength = buffer.readUInt32BE(offset);
  offset += 4;

  // Codec ID (1 byte)
  const codecId = buffer.readUInt8(offset);
  offset += 1;

  // Number of Data 1 (1 byte)
  const numberOfData1 = buffer.readUInt8(offset);
  offset += 1;

  const records = [];
  for (let i = 0; i < numberOfData1; i++) {
    const record: Record = {
      timestamp: BigInt(0),
      priority: 0,
      longitude: 0,
      latitude: 0,
      altitude: 0,
      angle: 0,
      satellites: 0,
      speed: 0,
      eventIoId: 0,
      nTotalId: 0,
      ioElements: [],
    };

    // Timestamp (8 bytes)
    record.timestamp = buffer.readBigUInt64BE(offset);
    offset += 8;

    // Priority (1 byte)
    record.priority = buffer.readUInt8(offset);
    offset += 1;

    // Longitude (4 bytes)
    record.longitude = buffer.readInt32BE(offset);
    offset += 4;

    // Latitude (4 bytes)
    record.latitude = buffer.readInt32BE(offset);
    offset += 4;

    // Altitude (2 bytes)
    record.altitude = buffer.readInt16BE(offset);
    offset += 2;

    // Angle (2 bytes)
    record.angle = buffer.readUInt16BE(offset);
    offset += 2;

    // Satellites (1 byte)
    record.satellites = buffer.readUInt8(offset);
    offset += 1;

    // Speed (2 bytes)
    record.speed = buffer.readUInt16BE(offset);
    offset += 2;

    // Event IO ID (1 byte)
    record.eventIoId = buffer.readUInt8(offset);
    offset += 1;

    // N of Total ID (1 byte)
    record.nTotalId = buffer.readUInt8(offset);
    offset += 1;

    // Example of parsing N1, N2, N4, and N8 IO Elements
    record.ioElements = [];
    for (let j = 0; j < record.nTotalId; j++) {
      const ioElement: IOElement = {
        n1IoId: 0,
        ioValue: 0,
      };

      // N1 of One Byte IO (1 byte)
      ioElement.n1IoId = buffer.readUInt8(offset);
      offset += 1;

      // 1st IO Value (1 byte)
      ioElement.ioValue = buffer.readUInt8(offset);
      offset += 1;

      record.ioElements.push(ioElement);
    }

    records.push(record);
  }

  // Number of Data 2 (Number of Total Records) (1 byte)
  const numberOfData2 = buffer.readUInt8(offset);
  offset += 1;

  // CRC-16 (4 bytes)
  const crc16 = buffer.slice(offset, offset + 4).toString('hex');
  offset += 4;

  return {
    zeroBytes,
    dataFieldLength,
    codecId,
    numberOfData1,
    records,
    numberOfData2,
    crc16,
  };
};

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

    let dataBuffer: Buffer = Buffer.alloc(0);

    socket.on('data', async (data) => {
      Logger.log(`Data length: ${data.length} bytes`);

      // Append incoming data to buffer
      dataBuffer = Buffer.concat([dataBuffer, data]);

      try {
        // Handle initial IMEI packet (17 bytes long)
        if (dataBuffer.length === 17) {
          const imei = data.subarray(2).toString('ascii');
          Logger.log(`Received IMEI: ${imei}`);
          // Acknowledge IMEI reception
          socket.write(Buffer.from([0x01]));
          return;
        }

        const hexStream = dataBuffer.toString('hex');
        parseAvlData(hexStream);

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

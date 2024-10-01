import { Server, Socket } from 'net';

import { TcpConfig } from '../configs/TcpConfig';
import { Logger } from '../utils/Logger';
import { SyncDeviceDataService } from './SyncDeviceDataService';

interface Codec8ExtendedPacket {
  codecId: number;
  timestamp: number;
  priority: number;
  gps: {
    longitude: number;
    latitude: number;
    altitude: number;
    angle: number;
    satellites: number;
    speed: number;
  };
  ioElements: {
    eventId: number;
    totalIO: number;
    ioData: { [key: number]: number };
  };
}

// Function to parse the received buffer data
const parseCodec8Extended = (buffer: Buffer): Codec8ExtendedPacket => {
  // Parse the buffer according to Codec 8 Extended specifications
  const codecId = buffer.readUInt8(0);
  const timestamp = buffer.readBigUInt64BE(1);
  const priority = buffer.readUInt8(9);

  // Example parsing, adjust according to actual packet structure
  const gps = {
    longitude: buffer.readInt32BE(10),
    latitude: buffer.readInt32BE(14),
    altitude: buffer.readInt16BE(18),
    angle: buffer.readUInt16BE(20),
    satellites: buffer.readUInt8(22),
    speed: buffer.readUInt16BE(23),
  };

  const ioElements = {
    eventId: buffer.readUInt8(25),
    totalIO: buffer.readUInt8(26),
    ioData: {
      // Example IO data extraction
      1: buffer.readUInt8(27),
      2: buffer.readUInt8(28),
    },
  };

  return { codecId, timestamp: Number(timestamp), priority, gps, ioElements };
};

export class TcpService {
  private server: Server;
  private syncServiceData: SyncDeviceDataService;

  constructor(syncServiceData: SyncDeviceDataService) {
    this.server = new Server(this.handleConnection.bind(this));
    this.syncServiceData = syncServiceData;
  }

  private async handleConnection(socket: Socket): Promise<void> {
    Logger.log(
      `Client connected: ${socket.remoteAddress}:${socket.remotePort}`
    );

    // socket.on('data', async (data) => {
    //   Logger.log(`Received raw data: ${data.toString('hex')}`);
    //   Logger.log(`Data length: ${data.length} bytes`);

    //   try {
    //     // Check if the data is an IMEI (typically 15 ASCII characters encoded in hexadecimal)
    //     const isImeiPacket = this.isImeiPacket(data);

    //     if (isImeiPacket) {
    //       const imei = this.extractImei(data);
    //       Logger.log(`Received IMEI: ${imei}`);

    //       // Respond to the client acknowledging the IMEI
    //       socket.write(`IMEI received: ${imei}`);
    //       return;
    //     }

    //     // Parse the incoming data using Codec 8E parser
    //     const decodedData: DecodedPacket = Codec8EParser.parsePacket(data);

    //     // Check if packet is partially parsed or has only raw data
    //     if (!decodedData.gpsData || !decodedData.ioElements) {
    //       Logger.warn(
    //         `Received an incomplete or unrecognized packet: ${decodedData.rawData}`
    //       );
    //       socket.write(`Received an incomplete packet.`);
    //       return;
    //     }

    //     // Save parsed data into the database
    //     await this.syncServiceData.insert(decodedData);

    //     // Respond to the client
    //     socket.write(`Data logged successfully.`);
    //     Logger.log('Data logged successfully.');
    //   } catch (error) {
    //     socket.write(`Failed to log data.`);
    //     Logger.error(`Failed to log data: ${error}`);
    //   }
    // });

    socket.on('data', (data) => {
      console.log('Data received:', data);

      // Parse the received data as a Codec 8 Extended packet
      const packet = parseCodec8Extended(data);

      console.log('Parsed packet:', packet);

      // Send acknowledgment to client if needed
      const response = Buffer.from([0x01]);
      socket.write(response);
    });

    socket.on('end', () => {
      Logger.log('Client disconnected');
    });

    socket.on('error', (err) => {
      Logger.error(`Socket error: ${err}`);
    });
  }

  public startServer(): void {
    const { host, port } = TcpConfig;
    this.server.listen(port, host, () => {
      Logger.log(`TCP Server is running on ${host}:${port}`);
    });
  }
}

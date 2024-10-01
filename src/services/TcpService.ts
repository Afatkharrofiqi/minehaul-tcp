import { Server, Socket } from 'net';

import { TcpConfig } from '../configs/TcpConfig';
import { Logger } from '../utils/Logger';
import { SyncDeviceDataService } from './SyncDeviceDataService';

function decodeAvlData(buffer: Buffer) {
  let index = 0;

  // Timestamp (8 bytes, unsigned 64-bit)
  const timestamp = buffer.readBigUInt64BE(index);
  index += 8;

  // Priority (1 byte, unsigned 8-bit)
  const priority = buffer.readUInt8(index);
  index += 1;

  // GPS Data
  const longitude = buffer.readInt32BE(index) / 10000000; // Longitude (4 bytes)
  index += 4;
  const latitude = buffer.readInt32BE(index) / 10000000; // Latitude (4 bytes)
  index += 4;
  const altitude = buffer.readInt16BE(index); // Altitude (2 bytes)
  index += 2;
  const angle = buffer.readUInt16BE(index); // Angle (2 bytes)
  index += 2;
  const satellites = buffer.readUInt8(index); // Satellites (1 byte)
  index += 1;
  const speed = buffer.readUInt16BE(index); // Speed (2 bytes)
  index += 2;

  // Displaying the decoded data
  console.log('Timestamp:', timestamp);
  console.log('Priority:', priority);
  console.log('Longitude:', longitude);
  console.log('Latitude:', latitude);
  console.log('Altitude:', altitude);
  console.log('Angle:', angle);
  console.log('Satellites:', satellites);
  console.log('Speed:', speed);

  // AVL IO data and records should be decoded here as per Teltonika's protocol
  // The decoding logic will depend on the device's protocol specification

  return {
    timestamp,
    priority,
    longitude,
    latitude,
    altitude,
    angle,
    satellites,
    speed,
  };
}

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

    socket.once('data', (data) => {
      // Step 1: Receive IMEI (15-byte string)
      const imeiLength = 15;
      const imei = data.slice(0, imeiLength).toString();
      console.log(`Received IMEI: ${imei}`);

      // Step 2: Respond to IMEI confirmation (1-byte acknowledgment: 0x01)
      socket.write(Buffer.from([0x01])); // Acknowledge the IMEI

      // Step 3: Listen for AVL data packets
      socket.on('data', (packet) => {
        try {
          // Read the first 4 bytes to get the length of the AVL data packet
          if (packet.length >= 4) {
            const packetLength = packet.readUInt32BE(0);
            console.log(`AVL packet length: ${packetLength}`);

            // Check if the packet has the correct length and parse the AVL data
            if (packet.length >= 4 + packetLength) {
              const avlData = packet.slice(4, 4 + packetLength);
              decodeAvlData(avlData);

              // Acknowledge the number of data records received
              // For simplicity, assuming 1 record; adjust according to actual data
              const numDataRecords = 1;
              const acknowledgment = Buffer.alloc(4);
              acknowledgment.writeUInt32BE(numDataRecords, 0);
              socket.write(acknowledgment);
            }
          }
        } catch (error) {
          console.error('Error processing AVL data:', error);
        }
      });
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

import { Server, Socket } from 'net';

import { TcpConfig } from '../configs/TcpConfig';
import { Codec8EParser, DecodedPacket } from '../utils/Codec8EParser';
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

        // Decode the incoming data using Codec8E parser
        const decodedData: DecodedPacket = Codec8EParser.parsePacket(data);

        // Check if parsed data contains GPS data and IO elements
        if (!decodedData.gpsData || !decodedData.ioElements) {
          Logger.warn(
            `Received an incomplete or unrecognized packet: ${decodedData.rawData}`
          );
          socket.write(`Received an incomplete packet.`);
          return;
        }

        // Save parsed data to the database
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

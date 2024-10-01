// src/services/TcpService.ts
import { Server, Socket } from 'net';

import { TcpConfig } from '../configs/TcpConfig';
import { Codec8EParser, DecodedPacket } from '../utils/Codec8EParser';
import { Logger } from '../utils/Logger';
import { SyncDeviceDataService } from './SyncDeviceDataService';

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

    socket.on('data', async (data) => {
      Logger.log(`Received raw data: ${data.toString('hex')}`);
      Logger.log(`Data length: ${data.length} bytes`);

      try {
        // Parse the incoming data using Codec 8E parser
        const decodedData: DecodedPacket = Codec8EParser.parsePacket(data);

        // Check if packet is partially parsed or has only raw data
        if (!decodedData.gpsData || !decodedData.ioElements) {
          Logger.warn(
            `Received an incomplete or unrecognized packet: ${decodedData.rawData}`
          );
          socket.write(`Received an incomplete packet.`);
          return;
        }

        // Save parsed data into the database
        await this.syncServiceData.insert(decodedData);

        // Respond to the client
        socket.write(`Data logged successfully.`);
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

import { DataSource, Repository } from 'typeorm';

import { SyncDeviceData } from '../models/SyncDeviceData';
import { DecodedPacket } from '../utils/Codec8EParser';
import { Logger } from '../utils/Logger';

export class SyncDeviceDataService {
  private repo: Repository<SyncDeviceData>;

  constructor(private dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(SyncDeviceData);
  }

  async insert(decodedData: DecodedPacket): Promise<SyncDeviceData> {
    Logger.log(
      `Inserting data into the database: ${JSON.stringify(decodedData)}`
    );

    // Create a new SyncDeviceData entity instance with the decoded data
    const syncDeviceData = this.repo.create({
      timestamp: decodedData.timestamp,
      priority: decodedData.priority,
      latitude: decodedData.gpsData?.latitude,
      longitude: decodedData.gpsData?.longitude,
      altitude: decodedData.gpsData?.altitude,
      angle: decodedData.gpsData?.angle,
      satellites: decodedData.gpsData?.satellites,
      speed: decodedData.gpsData?.speed,
      io_elements: decodedData.ioElements, // Save IO elements as a JSON object
      ble_data: decodedData.bleData, // Save BLE data as a JSON object
      raw_data: decodedData.rawData, // Save raw data as text
    });

    // Save the data in the database
    const savedData = await this.repo.save(syncDeviceData);
    Logger.log(`Data successfully saved with ID: ${savedData.id}`);
    return savedData;
  }
}

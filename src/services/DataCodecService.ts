import { DataSource, Repository } from 'typeorm';

import { DataCodec } from '../models/DataCodec';
import { Logger } from '../utils/Logger';

export class DataCodecService {
  private repo: Repository<DataCodec>;

  constructor(private dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(DataCodec);
  }

  async insert(imei: string): Promise<number> {
    Logger.log(`Inserting data into the database with IMEI: ${imei}`);

    try {
      // Create a new SyncDeviceData entity instance with the provided IMEI
      const dataCodec = this.repo.create({ imei });

      // Save the new entity instance in the database
      const savedData = await this.repo.save(dataCodec);
      Logger.log(`Data successfully saved with id: ${savedData.id}`);
      return savedData.id;
    } catch (error) {
      Logger.error(`Failed to insert data into the database. Error: ${error}`);
      throw error;
    }
  }

  async update(id: number, codec: string): Promise<DataCodec> {
    Logger.log(`Updating data in the database for id: ${id}`);

    // Find the entity instance using the provided id
    const dataCodec = await this.repo.findOne({ where: { id } });

    if (!dataCodec) {
      Logger.warn(`No record found with id: ${id}`);
      throw new Error(`No record found with id: ${id}`);
    }

    // Update the entity with the new codec value
    dataCodec.codec = codec;

    // Save the updated data back to the database
    const savedData = await this.repo.save(dataCodec);
    Logger.log(
      `Data successfully updated for id: ${id} with new codec: ${codec}`
    );

    return savedData;
  }
}

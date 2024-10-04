import { DataSource, Repository } from 'typeorm';

import { DataCodec } from '../models/DataCodec';
import { Logger } from '../utils/Logger';

export class DataCodecService {
  private repo: Repository<DataCodec>;

  constructor(private dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(DataCodec);
  }

  async insert(imei: string): Promise<DataCodec> {
    Logger.log(`Inserting data into the database`);

    // Create a new SyncDeviceData entity instance with the decoded data
    const dataCodec = this.repo.create({
      imei: imei,
    });

    // Save the data in the database
    const savedData = await this.repo.save(dataCodec);
    Logger.log(`Data successfully saved with ID: ${savedData.id}`);
    return savedData;
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

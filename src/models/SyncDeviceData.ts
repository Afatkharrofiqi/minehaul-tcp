import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import {
  BLEAssetData,
  BLEBeaconData,
  BLESensorData,
} from '../utils/Codec8EParser';

@Entity('sync_device_data')
export class SyncDeviceData {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'timestamp', nullable: true })
  timestamp!: Date;

  @Column({ type: 'int', nullable: true })
  priority!: number;

  @Column({ type: 'float', nullable: true })
  latitude!: number;

  @Column({ type: 'float', nullable: true })
  longitude!: number;

  @Column({ type: 'int', nullable: true })
  altitude!: number;

  @Column({ type: 'int', nullable: true })
  angle!: number;

  @Column({ type: 'int', nullable: true })
  satellites!: number;

  @Column({ type: 'int', nullable: true })
  speed!: number;

  // Change type to allow various types in the io_elements field
  @Column({ type: 'jsonb', nullable: true })
  io_elements!: Record<number, number | string | Record<string, unknown>>;

  @Column({ type: 'jsonb', nullable: true })
  ble_data!: Record<
    string,
    BLESensorData | BLEBeaconData | BLEAssetData | string
  >;

  @Column({ type: 'text', nullable: true })
  raw_data!: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;
}

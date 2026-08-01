import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
  } from 'typeorm';
  @Entity({ name: 'currency_type' })
  export class Currencytype {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('varchar', { length: 3 })
    currency: string

    @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
    rate: number;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
  }
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { special_test_lab } from './special_test_lab.entity';
import { special_test_items } from '../special_test_items/special_test_items.entity';
import { Repository } from 'typeorm';
import { CreateSpecialTestLabDto } from './dto/create-special_test_lab.dto';
import { UpdateSpecialTestLabDto } from './dto/update-special_test_lab.dto';

@Injectable()
export class SpecialTestLabService {
  constructor(
    @InjectRepository(special_test_lab)
    private specialTestLabRepository: Repository<special_test_lab>,
  ) {}

  async createSpecialTestLab(
    laboratory: CreateSpecialTestLabDto,
  ): Promise<any> {
    return this.specialTestLabRepository.save(laboratory);
  }

  async getSpecialTestLabList() {
    return this.specialTestLabRepository.find({
      relations: ['specialTestItems'], // Carga la relación OneToMany
    });
  }

  async getSpecialTestLab(id: number) {
    const laboratoryFound = await this.specialTestLabRepository.findOne({
      where: {
        id,
      },
      relations: ['specialTestItems'],
    });
    if (!laboratoryFound) {
      return new HttpException(
        'Laboratorio no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    return laboratoryFound;
  }

  async deleteSpecialTestLab(id: number) {
    return this.specialTestLabRepository.manager.transaction(
      async (manager) => {
        const laboratoryFound = await manager.findOne(special_test_lab, {
          where: { id },
        });
        if (!laboratoryFound) {
          throw new HttpException(
            'Laboratorio no encontrado',
            HttpStatus.NOT_FOUND,
          );
        }

        await manager.delete(special_test_items, { specialTestLabId: id });
        await manager.remove(special_test_lab, laboratoryFound);
        return true;
      },
    );
  }

  async updateSpecialTestLab(id: number, laboratory: UpdateSpecialTestLabDto) {
    const laboratoryFound = await this.specialTestLabRepository.findOne({
      where: {
        id,
      },
    });
    if (!laboratoryFound) {
      return new HttpException(
        'Laboratorio no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    const updateLaboratorio = Object.assign(laboratoryFound, laboratory);
    return this.specialTestLabRepository.save(updateLaboratorio);
  }
}

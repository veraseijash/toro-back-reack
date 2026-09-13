import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Examlists } from './examlists.entity';
import { Like, Repository } from 'typeorm';
import { CreateExam_listDto } from './dto/create-exam_lists.dto';
import { UpdateExam_listDto } from './dto/update-exam_lists.dto';
import { COST_FIELDS, UpdateGroupCostsDto } from './dto/update-group-costs.dto';

@Injectable()
export class ExamListsService {
  constructor(
    @InjectRepository(Examlists)
    private examListRepository: Repository<Examlists>,
  ) {}

  async getExamLists() {
    return this.examListRepository.find();
  }

  async createExamList(examLists: CreateExam_listDto) {
    const { group_id } = examLists;
    const maxPosition = await this.getMaxPosition(group_id);
    const nextPosition = maxPosition + 1;
    const newExam = this.examListRepository.create({
      ...examLists,
      position: nextPosition,
    });
    return this.examListRepository.save(newExam);
  }

  async getMaxPosition(groupId: number): Promise<number> {
    const result = await this.examListRepository
      .createQueryBuilder('exam_lists')
      .select('MAX(exam_lists.position)', 'max')
      .where('exam_lists.group_id = :groupId', { groupId })
      .getRawOne();

    return result.max || 0;
  }

  async getExamList(id: number) {
    const examListFound = this.examListRepository.findOne({
      where: {
        id,
      },
    });
    if (!examListFound) {
      return new HttpException('examen no encontrado', HttpStatus.NOT_FOUND);
    }
    return examListFound;
  }

  async getExamByGroup(id: number) {
    const examListFound = await this.examListRepository.find({
      where: {
        group_id: id,
      },
      order: {
        description: 'ASC',
      },
    });
    if (!examListFound) {
      return new HttpException('examen no encontrado', HttpStatus.NOT_FOUND);
    }
    return examListFound;
  }

  async getExamByGroupPaginated(
    groupId: number,
    itemsPerPage: number,
    page: number,
  ) {
    const normalizedGroupId = Number(groupId);
    const normalizedItemsPerPage = Number(itemsPerPage);
    const normalizedPage = Number(page);

    if (
      !Number.isInteger(normalizedGroupId) ||
      normalizedGroupId <= 0 ||
      !Number.isInteger(normalizedItemsPerPage) ||
      normalizedItemsPerPage <= 0 ||
      !Number.isInteger(normalizedPage) ||
      normalizedPage <= 0
    ) {
      throw new HttpException(
        'groupId, itemsPerPage y page deben ser enteros mayores que cero',
        HttpStatus.BAD_REQUEST,
      );
    }

    const [items, total] = await this.examListRepository.findAndCount({
      where: {
        group_id: normalizedGroupId,
      },
      order: {
        description: 'ASC',
      },
      skip: (normalizedPage - 1) * normalizedItemsPerPage,
      take: normalizedItemsPerPage,
    });

    return {
      items,
      total,
      page: normalizedPage,
      itemsPerPage: normalizedItemsPerPage,
      totalPages: Math.ceil(total / normalizedItemsPerPage),
    };
  }

  async getExamByGroupAnulled(id: number) {
    const examListFound = this.examListRepository.find({
      where: {
        group_id: id,
        annulled: false,
      },
      order: {
        description: 'ASC',
      },
    });
    if (!examListFound) {
      return new HttpException('examen no encontrado', HttpStatus.NOT_FOUND);
    }
    return examListFound;
  }

  async getExamListByDescription(description: string) {
    return this.examListRepository.find({
      where: {
        description: Like(`%${description}%`),
      },
    });
  }

  async updateGroupCosts(request: UpdateGroupCostsDto) {
    if (
      !request ||
      !Number.isInteger(request.group_id) ||
      request.group_id < 0
    ) {
      throw new HttpException(
        'group_id debe ser un entero mayor o igual a cero',
        HttpStatus.BAD_REQUEST,
      );
    }
    const { group_id, cambios } = request;
    if (!Array.isArray(cambios) || cambios.length === 0) {
      throw new HttpException(
        'cambios debe ser un arreglo no vacío',
        HttpStatus.BAD_REQUEST,
      );
    }
    const targets = new Set<string>();
    for (const cambio of cambios) {
      if (
        !cambio ||
        !COST_FIELDS.includes(cambio.aplicar) ||
        !COST_FIELDS.includes(cambio.sobre) ||
        !Number.isFinite(cambio.incremento) ||
        cambio.incremento < 0 ||
        targets.has(cambio.aplicar)
      ) {
        throw new HttpException(
          'Cada cambio debe indicar aplicar y sobre entre cost1 y cost6, un incremento numérico no negativo y un campo aplicar sin repetir',
          HttpStatus.BAD_REQUEST,
        );
      }
      targets.add(cambio.aplicar);
    }

    return this.examListRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(Examlists);
      const exams = await repository.find({
        ...(group_id === 0 ? {} : { where: { group_id } }),
        lock: { mode: 'pessimistic_write' },
      });
      for (const exam of exams) {
        const costs: Partial<Examlists> = {};
        for (const cambio of cambios) {
          // MySQL devuelve DECIMAL como string; todos los cálculos usan la fila original.
          const value = Math.round(
            Number(exam[cambio.aplicar]) +
              (Number(exam[cambio.sobre]) * cambio.incremento) / 100,
          );
          if (!Number.isSafeInteger(value)) {
            throw new HttpException(
              'El costo calculado excede el rango de enteros seguros',
              HttpStatus.BAD_REQUEST,
            );
          }
          costs[cambio.aplicar] = value;
        }
        await repository.update(exam.id, costs);
      }
      return { group_id, updated: exams.length };
    });
  }

  async updateExamList(id: number, examLists: UpdateExam_listDto) {
    const examListFound = await this.examListRepository.findOne({
      where: {
        id,
      },
    });
    if (!examListFound) {
      return new HttpException('exam no encontrado', HttpStatus.NOT_FOUND);
    }
    const updateExam = Object.assign(examListFound, examLists);
    return this.examListRepository.save(updateExam);
  }
}

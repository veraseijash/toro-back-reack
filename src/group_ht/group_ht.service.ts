import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Groupht } from './group_ht.entity';
import { Repository, Like } from 'typeorm';
import { CreateGroup_htDto } from './dto/create-group_ht.dto';
import { UpdateGroup_htDto } from './dto/update-group_ht.dto';

@Injectable()
export class GroupHtService {
  constructor(
    @InjectRepository(Groupht) private group_htRepository: Repository<Groupht>,
  ) {}

  async getGroupHtList() {
    return this.group_htRepository.find();
  }

  async getGroupHtListActive() {
    return this.group_htRepository.find({
      where: {
        annulled: false,
      },
      relations: ['grouphtitems', 'user'],
    });
  }

  async getGroupHtListActiveWithTotals() {
    const groups = await this.group_htRepository
      .createQueryBuilder('groupht')
      .leftJoin('groupht.user', 'user')
      .leftJoin('groupht.grouphtitems', 'grouphtitems')
      .leftJoin(
        'exams',
        'exam',
        'exam.examlistsId = grouphtitems.examId AND DATE(exam.date) = CURDATE()',
      )
      .select('groupht.id', 'id')
      .addSelect('groupht.description', 'description')
      .addSelect('groupht.details', 'details')
      .addSelect('groupht.annulled', 'annulled')
      .addSelect('groupht.userId', 'userId')
      .addSelect('user.name', 'user_name')
      .addSelect('user.url_photo', 'user_url_photo')
      .addSelect('COALESCE(COUNT(exam.id), 0)', 'total')
      .addSelect(
        'COALESCE(SUM(CASE WHEN exam.processed_id <> 0 THEN 1 ELSE 0 END), 0)',
        'total_processed',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN exam.approved_id <> 0 THEN 1 ELSE 0 END), 0)',
        'total_approved',
      )
      .where('groupht.annulled = :annulled', { annulled: false })
      .groupBy('groupht.id')
      .addGroupBy('groupht.description')
      .addGroupBy('groupht.details')
      .addGroupBy('groupht.annulled')
      .addGroupBy('groupht.userId')
      .addGroupBy('user.id')
      .addGroupBy('user.name')
      .addGroupBy('user.url_photo')
      .getRawMany();

    return groups.map((group) => ({
      id: Number(group.id),
      description: group.description,
      details: group.details,
      annulled: Boolean(group.annulled),
      userId: Number(group.userId),
      user: group.user_name
        ? {
            name: group.user_name,
            url_photo: group.user_url_photo,
          }
        : null,
      total: Number(group.total),
      total_processed: Number(group.total_processed),
      total_approved: Number(group.total_approved),
    }));
  }

  async countWithLike(description: string) {
    return this.group_htRepository.count({
      where: {
        description: Like(`%${description}%`),
      },
    });
  }

  async getGroupHt(id: number) {
    const groupHtFound = this.group_htRepository.findOne({
      where: {
        id,
      },
      relations: ['grouphtitems', 'user'],
    });
    if (!groupHtFound) {
      return new HttpException('grupo HT no encontrado', HttpStatus.NOT_FOUND);
    }
    return groupHtFound;
  }

  async createGroupHt(groupHt: CreateGroup_htDto) {
    const newGroupHt = this.group_htRepository.create(groupHt);
    return this.group_htRepository.save(newGroupHt);
  }

  async updateGroupHt(id: number, groupHt: UpdateGroup_htDto) {
    const groupHtFound = await this.group_htRepository.findOne({
      where: {
        id,
      },
    });
    if (!groupHtFound) {
      return new HttpException('grupo ht no encontrado', HttpStatus.NOT_FOUND);
    }
    const updateGroupHt = Object.assign(groupHtFound, groupHt);
    return this.group_htRepository.save(updateGroupHt);
  }

  async deleteGroupHt(id: number) {
    const groupHtFound = await this.group_htRepository.findOne({
      where: {
        id,
      },
      relations: ['grouphtitems'],
    });
    if (!groupHtFound) {
      return new HttpException('grupo ht no encontrado', HttpStatus.NOT_FOUND);
    }
    await this.group_htRepository.remove(groupHtFound);
    return true;
  }

  async getGroupList() {
    return this.group_htRepository
      .createQueryBuilder('groupht')
      .leftJoinAndSelect('groupht.grouphtitems', 'grouphtitems')
      .where('groupht.annulled = false')
      .orderBy('groupht.description', 'ASC')
      .addOrderBy('grouphtitems.id', 'ASC')
      .getMany();
  }
}

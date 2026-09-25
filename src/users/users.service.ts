import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './users.entity';
import { Repository, Not } from 'typeorm';
import { CreateUsersDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { LaboratoryService } from 'src/laboratory/laboratory.service';
import { LicenseService } from 'src/license/license.service';
import { Message } from 'src/websockets/message.entity';
import { cash_register } from 'src/cash_register/cash_register.entity';
const bcrypt = require('bcrypt');

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    private jwtUserService: JwtService,
    private readonly laboratoryService: LaboratoryService,
    private readonly LicenseService: LicenseService,
  ) {}

  async createUser(users: CreateUsersDto): Promise<any> {
    const userFond = await this.usersRepository.findOne({
      where: {
        user_name: users.user_name,
      },
    });

    if (userFond) {
      return new HttpException(
        'Ya existe un usuario con ese nombre de usuario',
        HttpStatus.CONFLICT,
      );
    }

    if (users.password !== undefined) {
      const password = users.password;
      const passwordHash = await bcrypt.hash(password, 8);
      users.password = passwordHash;
    }
    return this.usersRepository.save(users);
  }

  getUsers() {
    return this.usersRepository.find();
  }

  getUsersWithPatientsByDate(admissionDate: string) {
    const parsedDate = new Date(`${admissionDate}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(admissionDate) ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== admissionDate
    ) {
      throw new BadRequestException(
        'La fecha debe ser una fecha valida con formato YYYY-MM-DD',
      );
    }

    return this.usersRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.name',
        'user.user_name',
        'user.url_photo',
        'user.position',
      ])
      .innerJoinAndSelect(
        'user.patients',
        'patient',
        'patient.admission_date = :admissionDate',
        { admissionDate },
      )
      .leftJoinAndMapMany(
        'user.cash_register',
        cash_register,
        'cashRegister',
        'cashRegister.user_id = user.id AND cashRegister.admission_date = :admissionDate',
        { admissionDate },
      )
      .orderBy('user.name', 'ASC')
      .addOrderBy('user.id', 'ASC')
      .addOrderBy('patient.id', 'ASC')
      .addOrderBy('cashRegister.id', 'ASC')
      .getMany();
  }

  getUsersOrder() {
    return this.usersRepository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  async getVisibleUsersWithUnreadMessageCount(userId: number) {
    const { entities, raw } = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoin(
        Message,
        'message',
        `message.senderUserId = user.id
          AND message.recipientUserId = :userId
          AND message.isRead = :isRead`,
        { userId, isRead: false },
      )
      .select('user')
      .addSelect('COUNT(message.id)', 'messageCount')
      .addSelect('MAX(message.createdAt)', 'lastMessageAt')
      .where('user.hide_user = :hideUser', { hideUser: false })
      .andWhere('user.id != :userId', { userId })
      .groupBy('user.id')
      .orderBy('user.name', 'ASC')
      .getRawAndEntities();

    return entities.map((user, index) => {
      const userWithoutPasswordSignature: Partial<User> = { ...user };
      delete userWithoutPasswordSignature.passwordSignature;
      const messageCount = Number(raw[index].messageCount);

      return {
        ...userWithoutPasswordSignature,
        messageCount,
        ...(messageCount > 0 && { lastMessageAt: raw[index].lastMessageAt }),
      };
    });
  }

  getSignatureUsers() {
    return this.usersRepository
      .createQueryBuilder('entidad')
      .where('entidad.college_number != :valorVacio', { valorVacio: '' })
      .getMany();
  }

  async getUser(id: number) {
    const userFound = await this.usersRepository.findOne({
      where: {
        id,
      },
    });

    if (!userFound) {
      return new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    return userFound;
  }

  async verifyEmail(email: string) {
    const userFound = await this.usersRepository.findOne({
      where: {
        email,
      },
    });
    return userFound;
  }

  async verifyEmailId(id: number, email: string) {
    const userFound = await this.usersRepository.findOne({
      where: {
        id: Not(id),
        email,
      },
    });
    return userFound;
  }

  async verifySignature(id: number, passwordSignature: string) {
    const userFound = await this.usersRepository.findOne({
      where: {
        id,
      },
    });
    if (!userFound) {
      return new HttpException('USER_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    const compare = await bcrypt.compareSync(
      passwordSignature,
      userFound.passwordSignature,
    );
    if (!compare) {
      return new HttpException('PASSWORD_INVALID', HttpStatus.NOT_FOUND);
    }

    const payload = {
      id: id,
      name: userFound.name,
      college_number: userFound.college_number,
    };

    const dataUser = {
      user: payload,
    };
    return dataUser;
  }

  async getUserSession(userLogin: LoginUserDto) {
    const { user_name, password } = userLogin;
    const laboratoryFound = await this.laboratoryService.getLaboratory(1);
    const row = JSON.parse(JSON.stringify(laboratoryFound));
    const license = await this.LicenseService.validateLicenseKey(
      row.rif.replace(/-/g, ''),
      row.business_name.replace(/\s+/g, ''),
      row.license,
    );
    console.log('license', license);
    if (!license) {
      return new HttpException('INVALID_LICENSE_KEY', HttpStatus.FORBIDDEN);
    }
    const userFound = await this.usersRepository.findOne({
      where: {
        user_name,
      },
    });

    if (!userFound) {
      return new HttpException('USER_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    const compare = await bcrypt.compareSync(password, userFound.password);
    if (!compare) {
      return new HttpException('PASSWORD_INVALID', HttpStatus.NOT_FOUND);
    }

    const payload = { id: userFound.id, name: userFound.name };
    const token = await this.jwtUserService.sign(payload);

    const dataUser = {
      user: userFound,
      token,
    };
    return dataUser;
  }

  async deleteUser(id: number) {
    const result = await this.usersRepository.delete({ id });
    if (result.affected === 0) {
      return new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    return result;
  }

  async updateUser(id: number, user: UpdateUserDto) {
    const userFound = await this.usersRepository.findOne({
      where: {
        id,
      },
    });
    if (!userFound) {
      return new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }
    const userFondN = await this.usersRepository.findOne({
      where: {
        id: Not(id),
        user_name: user.user_name,
      },
    });

    if (userFondN) {
      return new HttpException(
        'Ya existe un usuario con ese nombre de usuario',
        HttpStatus.CONFLICT,
      );
    }
    if (user.password !== undefined) {
      const password = user.password;
      const passwordHash = await bcrypt.hash(password, 8);
      user.password = passwordHash;
    }
    if (user.passwordSignature !== undefined) {
      const passwordS = user.passwordSignature;
      const passwordHash = await bcrypt.hash(passwordS, 8);
      user.passwordSignature = passwordHash;
    }
    const updateUser = Object.assign(userFound, user);
    return this.usersRepository.save(updateUser);
  }
}

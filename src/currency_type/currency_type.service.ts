import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Currencytype } from './currency_type.entity';
import { Repository } from 'typeorm';
import { CreateCurrencytypeDto } from "./dto/create-currencytype.dto";
import { UpdateCurrencytypeDto } from "./dto/update-currencytype.dto";

@Injectable()
export class CurrencytypeService {
    constructor(
        @InjectRepository(Currencytype) private currencytypeRepository: Repository<Currencytype>,
    ) {}

    async createCurrencytype(currencytype: CreateCurrencytypeDto): Promise<any> {
        return this.currencytypeRepository.save(currencytype);
    }

    async getListCurrencytype() {
        return this.currencytypeRepository.find();
    }

    async updateCurrencytype(id: number, currencytype: UpdateCurrencytypeDto) {
        const currencytypeFound = await this.currencytypeRepository.findOne({
          where: {
            id,
          },
        });
        if (!currencytypeFound) {
          return new HttpException(
            'Tipo de moneda no encontrado',
            HttpStatus.NOT_FOUND,
          );
        }
        const updateCurrencytypevalue = Object.assign(currencytypeFound, currencytype);
        return this.currencytypeRepository.save(updateCurrencytypevalue);
    }


    async getCurrencytype(id: number) {
        const currencytypeFound = this.currencytypeRepository.findOne({
          where: {
            id,
          },
        });
        if (!currencytypeFound) {
          return new HttpException('Tipo de moneda no encontrado', HttpStatus.NOT_FOUND);
        }
        return currencytypeFound;
    }

}
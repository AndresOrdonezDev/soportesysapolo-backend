import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { EntidadesService } from './entidades.service';
import { CreateEntidadDto } from './dto/create-entidad.dto';
import { UpdateEntidadDto } from './dto/update-entidad.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('entidades')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class EntidadesController {
  constructor(private readonly entidadesService: EntidadesService) {}

  @Get()
  findAll(@Query('moduloIds') moduloIds?: string) {
    const ids = moduloIds
      ? moduloIds.split(',').map(Number).filter(Boolean)
      : undefined;
    return this.entidadesService.findAll(ids);
  }

  @Get('export/excel')
  async exportExcel(
    @Query('moduloIds') moduloIds: string,
    @Res() res: Response,
  ) {
    const ids = moduloIds
      ? moduloIds.split(',').map(Number).filter(Boolean)
      : null;
    const buffer = await this.entidadesService.exportToExcel(ids);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=entidades.xlsx',
    );
    res.send(buffer);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.entidadesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateEntidadDto) {
    return this.entidadesService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEntidadDto,
  ) {
    return this.entidadesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.entidadesService.remove(id);
  }
}

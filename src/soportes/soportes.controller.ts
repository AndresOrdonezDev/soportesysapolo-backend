import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  Query,
  Res,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import * as path from 'path';
import * as fs from 'fs';
import { SoportesService } from './soportes.service';
import { CreateSoporteDto } from './dto/create-soporte.dto';
import { CreateMensajeDto } from './dto/create-mensaje.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const multerConfig: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      fs.mkdirSync(tempDir, { recursive: true });
      cb(null, tempDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_MIMES.includes(file.mimetype));
  },
};

@Controller('soportes')
@UseGuards(JwtAuthGuard)
export class SoportesController {
  constructor(private readonly soportesService: SoportesService) {}

  @Get()
  findAll(
    @Request() req,
    @Query('estado') estado?: string,
    @Query('entidadId') entidadId?: string,
  ) {
    return this.soportesService.findAll(
      req.user,
      estado,
      entidadId ? Number(entidadId) : undefined,
    );
  }

  @Get('export/excel')
  @UseGuards(RolesGuard)
  @Roles('admin', 'soporte')
  async exportExcel(
    @Request() req,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Query('entidades') entidades: string,
    @Res() res: Response,
  ) {
    const entidadIds = entidades
      ? entidades.split(',').map(Number).filter(Boolean)
      : null;
    const buffer = await this.soportesService.exportToExcel(
      desde,
      hasta,
      entidadIds,
      req.user,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=solicitudes_${desde}_${hasta}.xlsx`,
    );
    res.send(buffer);
  }

  @Get('adjuntos/:id')
  async serveFile(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Res() res: Response,
  ) {
    const { filePath, adjunto } = await this.soportesService.getAdjunto(
      id,
      req.user,
    );
    res.setHeader('Content-Type', adjunto.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(adjunto.nombre)}"`,
    );
    fs.createReadStream(filePath).pipe(res);
  }

  @Get('adjuntos/:id/download')
  async downloadFile(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Res() res: Response,
  ) {
    const { filePath, adjunto } = await this.soportesService.getAdjunto(
      id,
      req.user,
    );
    res.setHeader('Content-Type', adjunto.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(adjunto.nombre)}"`,
    );
    fs.createReadStream(filePath).pipe(res);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.soportesService.findOne(id, req.user);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('archivos', 10, multerConfig))
  create(
    @Body() dto: CreateSoporteDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    return this.soportesService.create(dto, files ?? [], req.user);
  }

  @Post(':id/mensajes')
  @UseInterceptors(FilesInterceptor('archivos', 10, multerConfig))
  addMensaje(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMensajeDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    return this.soportesService.addMensaje(id, dto, files ?? [], req.user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.soportesService.remove(id, req.user);
  }
}

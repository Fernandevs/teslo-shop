import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { DataSource, Repository } from 'typeorm';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductImage } from './entities';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  private readonly logger;

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    private readonly dataSource: DataSource
  ) {
    this.logger = new Logger('ProductService');
  }

  async create(createProductDto: CreateProductDto) {
    try {
      const { images = [], ...productDetails } = createProductDto;

      const product = this.productRepository.create({
        ...productDetails,
        images: images.map((image) => this.productImageRepository.create({ url: image }))
      });

      await this.productRepository.save(product);

      return { ...product, images };
    } catch (e) {
      this.handleDatabaseExceptions(e);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    try {
      const { limit = 10, offset = 0 } = paginationDto;

      const products = await this.productRepository.find({
        take: limit,
        skip: offset,
        relations: {
          images: true
        }
      });

      return products.map(({ images, ...rest }) => ({
        ...rest,
        images: images.map((image) => image.url)
      }));
    } catch (e) {
      this.handleDatabaseExceptions(e);
    }
  }

  async findOne(arg: string) {
    let product;

    if (isUUID(arg)) product = await this.productRepository.findOneBy({
      id: arg
    });

    else {
      const queryBuilder = this.productRepository.createQueryBuilder('prod');

      product = await queryBuilder.where('UPPER(title) =:title or slug =:slug', {
        title: arg.toUpperCase(),
        slug: arg.toLowerCase()
      })
        .leftJoinAndSelect('prod.images', 'prodImages')
        .getOne();
    }

    if (!product) throw new NotFoundException(`Product with ${ arg } not found`);

    return product;
  }

  async findOnePlain(arg: string) {
    const { images = [], ...rest } = await this.findOne(arg);

    return {
      ...rest,
      images: images.map((image: ProductImage) => image.url)
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { images, ...toUpdate } = updateProductDto;

    const product = await this.productRepository.preload({
      id,
      ...toUpdate
    });

    if (!product) throw new NotFoundException(`Product with id ${ id } not found`);

    // Create query runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: { id } });

        product.images = images.map(
          (image: string) => this.productImageRepository.create({ url: image })
        );
      }

      await queryRunner.manager.save(product);
      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOnePlain(id);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();

      this.handleDatabaseExceptions(e);
    }
  }

  async remove(id: string) {
    try {
      const product = await this.findOne(id);

      return await this.productRepository.remove(product);
    } catch (e) {
      this.handleDatabaseExceptions(e);
    }
  }

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product');

    try {
      return await query
        .delete()
        .where({})
        .execute();
    } catch (e) {
      this.handleDatabaseExceptions(e);
    }
  }

  private handleDatabaseExceptions(e: any): never {
    if (e.code === '23505') throw new BadRequestException(e.detail);

    this.logger.error(e);

    throw new InternalServerErrorException('Unexpected error, check server logs');
  }
}

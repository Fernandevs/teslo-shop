import { Injectable } from '@nestjs/common';

import { ProductsService } from '../products/products.service';
import { initialData } from './data/data.seed';

@Injectable()
export class SeedService {
  constructor(
    private readonly productsService: ProductsService
  ) {
  }

  async executeSeed() {
    return await this.insertAllProducts() ? 'SEED EXECUTED' : 'FAILED EXECUTION';
  }

  private async insertAllProducts() {
    await this.productsService.deleteAllProducts();

    const products = initialData.products;

    const insertPromises = [];

    products.forEach((product) => insertPromises.push(this.productsService.create(product)));

    const results = await Promise.all(insertPromises);

    return true;
  }
}

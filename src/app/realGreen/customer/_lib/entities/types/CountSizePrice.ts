import { Service } from "./ServiceTypes";

export type CountSizePrice = {
  count: number;
  size: number;
  price: number;
  rev: number;
};

export const baseCountSizePrice = {
  count: 0,
  size: 0,
  price: 0,
  rev: 0,
};

export abstract class CountSizePriceOps {
  static fromService(service: Service): CountSizePrice {
    return {
      count: 1,
      size: service.size,
      price: service.price,
      rev: service.x.getPriceAfterDiscounts("price"),
    };
  }

  static sum(a: CountSizePrice, b: CountSizePrice): CountSizePrice {
    return {
      count: a.count + b.count,
      size: a.size + b.size,
      price: a.price + b.price,
      rev: a.rev + b.rev,
    };
  }

  static sumAll(csps: CountSizePrice[]): CountSizePrice {
    // return rest.reduce((acc, curr) => CountSizePriceOps.sum(acc, curr), a);
    return csps.reduce((acc, curr) => CountSizePriceOps.sum(acc, curr), {
      ...baseCountSizePrice,
    });
  }

  static divideBy(a: CountSizePrice, n: number): CountSizePrice {
    return {
      count: a.count / n,
      size: a.size / n,
      price: a.price / n,
      rev: a.rev / n,
    };
  }

  static multiply(a: CountSizePrice, factor: number): CountSizePrice {
    return {
      count: a.count * factor,
      size: a.size * factor,
      price: a.price * factor,
      rev: a.rev * factor,
    };
  }

  static subtract(a: CountSizePrice, b: CountSizePrice): CountSizePrice {
    return {
      count: a.count - b.count,
      size: a.size - b.size,
      price: a.price - b.price,
      rev: a.rev - b.rev,
    };
  }
}

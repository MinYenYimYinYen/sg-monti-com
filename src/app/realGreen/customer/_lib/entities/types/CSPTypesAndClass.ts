import { Service } from "./ServiceTypes";

export type CSP = {
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

export abstract class CSPOps {
  static fromService(service: Service): CSP {
    return {
      count: 1,
      size: service.size,
      price: service.price,
      rev: service.x.getPriceAfterDiscounts("price"),
    };
  }

  static sum(a: CSP, b: CSP): CSP {
    return {
      count: a.count + b.count,
      size: a.size + b.size,
      price: a.price + b.price,
      rev: a.rev + b.rev,
    };
  }

  static sumAll(csps: CSP[]): CSP {
    // return rest.reduce((acc, curr) => CountSizePriceOps.sum(acc, curr), a);
    return csps.reduce((acc, curr) => CSPOps.sum(acc, curr), {
      ...baseCountSizePrice,
    });
  }

  static divideBy(a: CSP, n: number): CSP {
    return {
      count: a.count / n,
      size: a.size / n,
      price: a.price / n,
      rev: a.rev / n,
    };
  }

  static multiply(a: CSP, factor: number): CSP {
    return {
      count: a.count * factor,
      size: a.size * factor,
      price: a.price * factor,
      rev: a.rev * factor,
    };
  }

  static subtract(a: CSP, b: CSP): CSP {
    return {
      count: a.count - b.count,
      size: a.size - b.size,
      price: a.price - b.price,
      rev: a.rev - b.rev,
    };
  }

  // Returns the component-wise minimum of two CSPs.
  static min(a: CSP, b: CSP): CSP {
    return {
      count: Math.min(a.count, b.count),
      size: Math.min(a.size, b.size),
      price: Math.min(a.price, b.price),
      rev: Math.min(a.rev, b.rev),
    };
  }

  // Divides each dimension independently, returning 0 for any dimension where denominator is 0.
  // Returns null if ALL denominator dimensions are 0 (no data at all).
  static safeDivide(numerator: CSP, denominator: CSP): CSP | null {
    if (
      denominator.count === 0 &&
      denominator.size === 0 &&
      denominator.price === 0 &&
      denominator.rev === 0
    ) {
      return null;
    }
    return {
      count: denominator.count !== 0 ? numerator.count / denominator.count : 0,
      size: denominator.size !== 0 ? numerator.size / denominator.size : 0,
      price: denominator.price !== 0 ? numerator.price / denominator.price : 0,
      rev: denominator.rev !== 0 ? numerator.rev / denominator.rev : 0,
    };
  }
}

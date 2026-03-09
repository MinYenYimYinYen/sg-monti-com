/**
 * Base class for chainable query operations on arrays.
 * Provides set operations and filtering methods that return new query instances.
 */
export abstract class BaseQuery<T> {
  protected constructor(protected items: T[]) {}

  protected abstract createInstance(items: T[]): this;

  get results(): T[] {
    return this.items;
  }

  /**
   * Combines this query with another, returning all items from both.
   * @example
   * const activeCustomers = new CustomerQuery(customers).byStatus('active');
   * const premiumCustomers = new CustomerQuery(customers).byTier('premium');
   * const combined = activeCustomers.union(premiumCustomers);
   * // Result: All customers who are active OR premium (or both)
   */
  union(other: BaseQuery<T>): this {
    const combined = [...this.items, ...other.items];
    return this.createInstance(combined);
  }

  /**
   * Returns only items that exist in both this query and another.
   * @example
   * const activeCustomers = new CustomerQuery(customers).byStatus('active');
   * const premiumCustomers = new CustomerQuery(customers).byTier('premium');
   * const both = activeCustomers.intersection(premiumCustomers);
   * // Result: Only customers who are BOTH active AND premium
   */
  intersection(other: BaseQuery<T>): this {
    const otherSet = new Set(other.items);
    const common = this.items.filter(item => otherSet.has(item));
    return this.createInstance(common);
  }

  /**
   * Returns items in this query that are NOT in another query.
   * @example
   * const activeCustomers = new CustomerQuery(customers).byStatus('active');
   * const premiumCustomers = new CustomerQuery(customers).byTier('premium');
   * const activeNonPremium = activeCustomers.difference(premiumCustomers);
   * // Result: Customers who are active but NOT premium
   */
  difference(other: BaseQuery<T>): this {
    const otherSet = new Set(other.items);
    const onlyInThis = this.items.filter(item => !otherSet.has(item));
    return this.createInstance(onlyInThis);
  }

  /**
   * Removes duplicate items from the query results.
   * @param keyFn Optional function to determine uniqueness by a specific property
   * @example
   * // Remove duplicate customer objects
   * const uniqueCustomers = customerQuery.unique();
   * 
   * // Remove duplicates based on customer ID
   * const uniqueById = customerQuery.unique(c => c.id);
   * 
   * // Remove duplicates based on email address
   * const uniqueByEmail = customerQuery.unique(c => c.email);
   */
  unique(keyFn?: (item: T) => any): this {
    if (!keyFn) {
      return this.createInstance([...new Set(this.items)]);
    }

    const seen = new Set();
    const uniqueItems = this.items.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    return this.createInstance(uniqueItems);
  }
}

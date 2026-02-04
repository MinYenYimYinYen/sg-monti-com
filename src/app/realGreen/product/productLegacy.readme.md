 - Singles are recognized as products in SA that are
For Production, For Mobile Device, and NOT Master Product
checked in SA Product Setup.
These are not added to a master product, but are available for techs to use directly.
   - isProduction: true,
   - isMobileDevice: true,
   - isMasterProduct: false

 - Masters are recognized as products in SA that have
For Production, For Work Orders, Master Product, and Mobile Device all checked in SA Product Setup.
The subs are products that are added to the master product.
But the SA api does not expose this relationship. So we must manually configure the sub-products for each master product here.
   - isProduction: true,
   - isMobileDevice: true,
   - isMasterProduct: true

 - Subs are recognized as products in SA that have
For Production, NOT Mobile Device, and NOT Master Product
checked in SA Product Setup.
Subs are added to the master product.
   - isProduction: true,
   - isMobileDevice: false,
   - isMasterProduct: false
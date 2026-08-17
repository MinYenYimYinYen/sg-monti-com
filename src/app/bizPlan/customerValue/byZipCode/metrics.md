## Metrics

1. Active Customer Count: customer.status === 9 and at least one service is (['active', 'asap', 'completed', 'printed'])
2. Customer Value: sum of all service.x.getPriceAfterDiscounts("price")
3. Average Customer Value
4. Total Pest Control Customers: customers with at least one program.programType === "H"
5. Total MLC Customers: customers with at least one program.progCodeId === "MLC"
6. Average Extra Services per customer: count of all services filtered by statuses above and not pest control and not MLC, divided by total customer count

## Group By
1. Zip Code: Need to reveal the city associated with the zip code as well. We can try useZipCode to get that data into state

## Layout
1. Need a zip code selector left panel, default to all checked.  Have a select all, select none.



# CSV Parser Architecture

## Purpose
Parse CSV files from RealGreen CRM to supplement data not available via RealGreen API.
Specifically: service assignment data (employee assignments to services).

## Architecture Decisions

### 1. Separation of Concerns
- **CSVDropzone**: File upload only (single responsibility)
- **csvParser**: Parsing logic with Papa Parse
- **csvSlice**: Redux state management for parsed data

### 2. Parsing Strategy: Hard-coded with Migration Path
**Decision**: Hard-code parsing configuration but structure it as if retrieved from MongoDB.

**Rationale**:
- Simpler initial implementation
- Clear migration path to dynamic parsing models later
- Avoid over-engineering for single use case
- Easy to extend when multiple CSV formats needed

**Structure**:
```typescript
const parseConfig = {
  columnMappings: {
    'Employee ID': 'employeeId',
    'Service Date': 'date',
    'Customer Number': 'custId'
  },
  requiredColumns: ['Employee ID', 'Service Date'],
  optionalColumns: ['Notes'],
  transformations: {
    'Service Date': (val) => formatToISO(val)
  }
}
```

### 3. Column Validation
Explicitly define required and optional columns:
- **Required**: Employee ID, Service Date, Customer Number, Service ID
- **Optional**: Notes, Status

Benefits:
- Clear error messages for missing columns
- Type safety
- Easy to debug

### 4. Error Handling
Use Result type pattern for better UX:
```typescript
type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] }
```

Allows UI to display validation errors without throwing exceptions.

### 5. File Location
Place parser in domain folder: `src/app/realGreen/customer/_lib/csvParser.ts`

Co-located with related types and logic. Generic solution can be extracted later if needed.

## Data Flow

1. User drops CSV ’ CSVDropzone
2. CSVDropzone calls onFileDrop(file)
3. Parent component dispatches file to parser
4. Parser validates columns ’ parses ’ transforms to ServiceCSV[]
5. Result stored in Redux via csvSlice
6. Components consume from Redux state

## Types

### ServiceCSV
Intermediate type holding only CSV data needed:
```typescript
type ServiceCSV = {
  servId: number;
  custId: number;
  employeeId: string;
  date: string;
}
```

Positioned in ServiceTypes.ts after ServiceDoc, before ServiceProps.

## Implementation Notes

### Papa Parse Configuration
- `header: true` - Parse first row as column names
- `skipEmptyLines: true` - Ignore empty rows
- `transform: (value, column)` - Apply transformations
- `transformHeader: (header)` - Normalize column names

### Future Extensions

#### MongoDB ParseModel Schema
When multiple CSV formats needed:
```typescript
{
  name: 'RealGreen Unserviced Report',
  columnMappings: {...},
  requiredColumns: [...],
  transformations: {...}
}
```

Parser can accept optional parseModel parameter, defaulting to hard-coded config.

## Dependencies
- papa-parse: CSV parsing library
- @types/papaparse: TypeScript definitions

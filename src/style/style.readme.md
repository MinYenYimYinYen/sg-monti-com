# Styling Architecture

This project uses a **Semantic Styling System** with an **Intensity-Based Design Pattern** built on **Tailwind CSS v4** and **shadcn/ui**.

## 1. Design Philosophy

### Color Usage
- **primary** (Blue): Buttons, primary actions, tabs - most common action color
- **accent** (Green): Backgrounds, surfaces, NavBar, table rows - most used by area
- **secondary** (Orange): Alternative variant, less common
- **destructive** (Burnt Orange): Errors, destructive actions, warnings

### Intensity Scale
Instead of separate `-light` and `-strong` variants, we use a single **intensity axis**:

| Intensity | Opacity | Text Color | Use Case |
|-----------|---------|------------|----------|
| **ghost** | 10% bg | Colored text | Very subtle highlight, alternating rows |
| **soft** | 20% bg (30% dark) | Dark text | Light backgrounds, inactive states |
| **solid** | 100% bg | Light text | **DEFAULT** - Active states, buttons, selected items |
| **bold** | 100% bg | Light text + emphasis | Extra prominence (shadow, font-weight) |

## 2. CSS Variables (`src/style/tailwind.css`)

### Light Mode
```css
/* Foundation Colors */
--background: oklch(0.98 0 0);       /* Near white */
--foreground: oklch(0.20 0 0);       /* Dark gray text */
--card: oklch(1 0 0);                /* White */
--muted: oklch(0.96 0 0);            /* Light neutral */
--border: oklch(0.90 0 0);           /* Light gray */

/* Brand Colors - Solid (100%) */
--primary: oklch(0.534 0.042 239.5); /* Blue */
--accent: oklch(0.628 0.145 142.4);  /* Green */
--secondary: oklch(0.691 0.137 42.8); /* Orange */
--destructive: oklch(0.525 0.173 38.4); /* Burnt Orange */
```

### Dark Mode
```css
/* Surfaces darker, brand colors brighter */
--background: oklch(0.15 0 0);
--card: oklch(0.20 0 0);
--primary: oklch(0.60 0.08 239.5);   /* Brighter blue */
--accent: oklch(0.68 0.16 142.4);    /* Brighter green */
--secondary: oklch(0.72 0.15 42.8);  /* Brighter orange */
```

## 3. Component Patterns

### Button
Supports **variant** × **intensity** axes:

```tsx
// Default: solid primary (blue)
<Button>Click Me</Button>

// Ghost accent (10% green bg, green text)
<Button variant="accent" intensity="ghost">Subtle</Button>

// Soft secondary (20% orange bg, dark text)
<Button variant="secondary" intensity="soft">Light Background</Button>

// Bold destructive (red + shadow)
<Button variant="destructive" intensity="bold">Delete</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

### Badge
Same variant × intensity pattern:

```tsx
<Badge>Default (solid primary)</Badge>
<Badge variant="accent" intensity="soft">Soft Green</Badge>
<Badge variant="secondary" intensity="ghost">Ghost Orange</Badge>
```

### Tabs
Variant controls color scheme:

```tsx
<Tabs defaultValue="tab1">
  <TabsList variant="primary"> {/* Ghost blue background */}
    <TabsTrigger value="tab1">Tab 1</TabsTrigger> {/* Solid blue when active */}
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content</TabsContent>
</Tabs>
```

### Table
Variant controls row styling:

```tsx
<Table>
  <TableBody>
    <TableRow variant="alternating"> {/* even:bg-accent/10 (ghost green) */}
      <TableCell>Data</TableCell>
    </TableRow>
    <TableRow variant="selected"> {/* bg-accent/20 (soft green) */}
      <TableCell>Selected</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Card
Always uses semantic colors:

```tsx
<Card> {/* bg-card text-card-foreground */}
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Input, Select, Checkbox
All use primary color for focus rings and interactions:

```tsx
<Input placeholder="Enter text" /> {/* focus:ring-primary */}

<Select>
  <SelectTrigger /> {/* hover:bg-primary/10, focus:ring-primary */}
  <SelectContent /> {/* bg-card */}
  <SelectItem /> {/* focus:bg-primary/20 (soft) */}
</Select>

<Checkbox /> {/* border-primary, checked:bg-primary, focus:ring-primary */}
```

## 4. Common Patterns

### NavBar Background
```tsx
<nav className="bg-accent/20"> {/* Soft green (20%) */}
  <Button variant="accent" intensity="ghost">Icon</Button>
</nav>
```

### Alternating Table Rows
```tsx
<TableRow variant="alternating"> {/* even:bg-accent/10 */}
```

### Selected/Active States
```tsx
// Buttons, tabs - use solid intensity
<Button intensity="solid">Active</Button>

// Table rows, backgrounds - use soft intensity
<TableRow variant="selected"> {/* bg-accent/20 */}
```

### Hover States
Use opacity modifiers:
```tsx
<Button className="hover:bg-primary/90"> {/* 90% opacity on hover */}
```

## 5. Focus Rings
Focus rings automatically match variant color:
- `variant="primary"` → `focus-visible:ring-primary` (blue)
- `variant="accent"` → `focus-visible:ring-accent` (green)
- `variant="secondary"` → `focus-visible:ring-secondary` (orange)
- `variant="destructive"` → `focus-visible:ring-destructive` (burnt orange)

## 6. Styling Rules

### DO ✓
- Use semantic colors: `bg-primary`, `bg-accent`, `bg-card`, `text-foreground`
- Use variant + intensity props: `<Button variant="primary" intensity="solid">`
- Use opacity modifiers for tints: `bg-accent/10`, `bg-primary/20`
- Default buttons to `variant="primary" intensity="solid"`
- Default backgrounds to accent with ghost/soft intensity

### DON'T ✗
- Hardcoded colors: `bg-blue-500`, `bg-green-50`, `bg-white`, `text-gray-600`
- Hardcoded focus rings: `focus:ring-blue-500` (use variant color)
- Custom inline styles for brand colors
- Override semantic colors with className

## 7. Adding New Components

1. **Use `cva` for variants:**
```tsx
const componentVariants = cva(
  "base-classes",
  {
    variants: {
      variant: {
        primary: "",
        accent: "",
        secondary: "",
        destructive: "",
      },
      intensity: {
        ghost: "",
        soft: "",
        solid: "",
        bold: "",
      },
    },
    compoundVariants: [
      {
        variant: "primary",
        intensity: "solid",
        className: "bg-primary text-primary-foreground hover:bg-primary/90",
      },
      // ... 16 total combinations (4 colors × 4 intensities)
    ],
    defaultVariants: {
      variant: "primary",
      intensity: "solid",
    },
  }
);
```

2. **Export variant props interface:**
```tsx
export interface ComponentProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof componentVariants> {}
```

3. **Use semantic colors in compound variants:**
- Ghost: `bg-{variant}/10 text-{variant}`
- Soft: `bg-{variant}/20 text-foreground dark:bg-{variant}/30`
- Solid: `bg-{variant} text-{variant}-foreground`
- Bold: `bg-{variant} text-{variant}-foreground font-semibold shadow-lg`

## 8. Dark Mode

Dark mode is controlled by the `.dark` class on the root element. Variables automatically adjust:
- Surfaces get darker (background, card)
- Brand colors get brighter (higher lightness in OKLCH)
- Soft intensity uses 30% opacity instead of 20%

## 9. File Locations

- **CSS Variables**: `src/style/tailwind.css`
- **Components**: `src/style/components/*.tsx`
- **Utilities**: `src/style/utils.ts` (cn helper)
- **Types**: Component files export VariantProps interfaces

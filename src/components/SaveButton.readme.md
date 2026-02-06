# SaveButton Pattern

## Overview
The `SaveButton` provides a slick, localized feedback loop for async actions (like saving forms). It handles the "Saving..." spinner and the "Success" checkmark animation internally, reducing boilerplate in your parent components.

## 1. The Hook (Data Layer)
Your Redux actions/thunks must be awaitable.
- **Do**: Return the promise from `dispatch`.
- **Do**: Use `.unwrap()` if using `createAsyncThunk` to handle errors in the component (optional but recommended).

### Example (`useProduct.ts`)
```typescript
const updateCategory = (id: number, name: string) => {
  // ... dispatch other actions ...

  // RETURN the promise
  return dispatch(
    productActions.saveCategory({ ... })
  ).unwrap(); // .unwrap() makes it throw on error, allowing try/catch in component
};
```

## 2. The Component (UI Layer)
The component manages the `status` state and passes the "close" logic to the button.

### Step-by-Step
1.  **State**: Add `const [status, setStatus] = useState<SaveStatus>("idle");`
2.  **Handler**: Make your save handler `async`.
    - Set `saving` before the await.
    - Await the hook function.
    - Set `success` after the await.
    - Wrap in `try/catch` to handle errors (set `idle` on error).
3.  **Render**:
    - Pass `status` to `SaveButton`.
    - Pass `onSuccessComplete` to handle what happens *after* the success animation (e.g., closing a modal).

### Example (`EditCategorySheet.tsx`)
```tsx
import { SaveButton, SaveStatus } from "@/components/SaveButton";

export default function MySheet({ onClose }) {
  const { updateData } = useMyHook();
  const [status, setStatus] = useState<SaveStatus>("idle");

  const handleSave = async () => {
    setStatus("saving"); // 1. Start loading
    try {
      await updateData(...); // 2. Wait for API
      setStatus("success");  // 3. Trigger success animation
    } catch (e) {
      setStatus("idle");     // 4. Handle error
    }
  };

  return (
    <SaveButton
      status={status}
      onClick={handleSave}
      onSuccessComplete={() => onClose(false)} // 5. Close after animation
    >
      Save
    </SaveButton>
  );
}
```

## 3. Props

| Prop | Type | Description |
|------|------|-------------|
| `status` | `'idle' \| 'saving' \| 'success'` | Controls the button state. |
| `onSuccessComplete` | `() => void` | Callback fired after the success animation + hold duration finishes. |
| `successDuration` | `number` | Total time (ms) to show success state (default: 1000ms). |
| ... | `ButtonProps` | All standard Button props (variant, size, etc). |

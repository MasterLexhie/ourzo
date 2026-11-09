import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { finalizeSlug, sanitizeSlugInput } from "@/lib/slug";

interface SlugInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
}

/** Workspace slug field with a non-overlapping "ourzo.app/" prefix addon. */
export function SlugInput({
  id = "slug",
  value,
  onChange,
  disabled,
  invalid,
  placeholder = "acme-inc",
}: SlugInputProps) {
  return (
    <div
      className={cn(
        "flex w-full items-stretch overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring/50",
        invalid && "border-destructive",
        disabled && "opacity-50",
      )}
    >
      <span className="flex items-center border-r border-input bg-muted px-3 text-sm text-muted-foreground select-none">
        ourzo.app/
      </span>
      <Input
        id={id}
        className="flex-1 rounded-none border-0 shadow-none focus-visible:ring-0"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(sanitizeSlugInput(e.target.value))}
        onBlur={() => onChange(finalizeSlug(value))}
        disabled={disabled}
        aria-invalid={invalid}
        maxLength={150}
      />
    </div>
  );
}

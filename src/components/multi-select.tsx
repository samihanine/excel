import type * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type MultiSelectOption = { value: string; label: string };

/** Sélection multiple compacte (menu à cases à cocher). */
export const MultiSelect = ({
  options,
  value,
  onChange,
  label,
  icon,
  disabled,
  size = "sm",
  emptyLabel = "Aucun",
}: {
  size?: "sm" | "default";
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Libellé du bouton et de l'accessibilité. */
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  emptyLabel?: string;
}) => {
  const summary =
    value.length === 0
      ? emptyLabel
      : value.length === options.length
        ? label
        : `${label} ${value.length}/${options.length}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size={size}
            aria-label={label}
            disabled={disabled || options.length === 0}
          />
        }
      >
        {icon}
        {summary}
        <ChevronDownIcon data-icon="inline-end" className="opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {options.map((option) => {
          const checked = value.includes(option.value);
          return (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={checked}
              closeOnClick={false}
              onCheckedChange={(next) =>
                onChange(
                  next
                    ? [...value, option.value]
                    : value.filter((item) => item !== option.value),
                )
              }
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

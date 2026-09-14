import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Dataset } from "@/schemas/dataset-schema";

export const SelectDataset = ({
  datasets,
  value,
  onChange,
  disabled,
}: {
  datasets: Dataset[];
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
}) => {
  return (
    <Select
      items={datasets.map((dataset) => ({
        value: dataset.id,
        label: dataset.title,
      }))}
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") onChange(next);
      }}
      disabled={disabled || datasets.length === 0}
    >
      <SelectTrigger
        size="sm"
        className="min-w-44 rounded-4xl"
        aria-label="Dataset"
      >
        <SelectValue
          placeholder={datasets.length === 0 ? "Aucun dataset" : "Dataset"}
        />
      </SelectTrigger>
      <SelectContent>
        {datasets.map((dataset) => (
          <SelectItem key={dataset.id} value={dataset.id}>
            {dataset.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

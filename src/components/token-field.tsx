import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/retry";
import type { TokenStatus } from "@/hooks/use-tokens";

const STATUS_LABEL: Record<TokenStatus, string> = {
  missing: "Manquant",
  checking: "Vérification…",
  valid: "Valide",
  invalid: "Invalide",
};

export const TokenField = ({
  id,
  label,
  hint,
  value,
  status,
  error,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  status: TokenStatus;
  error: unknown;
  onChange: (value: string) => void;
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <Badge
          variant={
            status === "valid"
              ? "secondary"
              : status === "checking"
                ? "outline"
                : "destructive"
          }
        >
          {status === "checking" ? <Spinner className="size-3" /> : null}
          {STATUS_LABEL[status]}
        </Badge>
      </div>
      <Input
        id={id}
        type="password"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value.trim())}
        aria-invalid={status === "invalid"}
      />
      {status === "invalid" && error ? (
        <p className="text-xs text-destructive">
          {getErrorMessage(error).slice(0, 280)}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
};

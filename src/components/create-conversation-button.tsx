import { SquarePenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CreateConversationButton = ({
  onCreate,
  disabled,
}: {
  onCreate: () => void;
  disabled?: boolean;
}) => {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Nouvelle conversation"
      onClick={onCreate}
      disabled={disabled}
    >
      <SquarePenIcon />
    </Button>
  );
};

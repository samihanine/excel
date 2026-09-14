import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PageHeader = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}) => {
  return (
    <header className="flex items-start gap-3">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Retour au chat"
        render={<Link to="/" />}
      >
        <ArrowLeftIcon />
      </Button>
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </header>
  );
};

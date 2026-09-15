import { useMutation } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Powerpoint } from "@/artefacts/powerpoint-artefact";
import { downloadPowerpoint } from "@/lib/pptx/generate";
import { SlidePreview } from "@/lib/pptx/sections";
import { slugify } from "@/lib/download";
import { getErrorMessage } from "@/lib/retry";

/** Aperçu live des slides + téléchargement .pptx. */
export const PowerpointView = ({
  deck,
  name,
}: {
  deck: Powerpoint;
  name: string;
}) => {
  const filename = slugify(deck.title ?? name);
  const download = useMutation({
    mutationKey: ["powerpoint", "download", filename],
    mutationFn: () => downloadPowerpoint(filename, deck),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {deck.title ? (
            <h2 className="text-lg font-semibold">{deck.title}</h2>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {deck.slides.length === 0
              ? "Aucune slide"
              : `${deck.slides.length} slide${deck.slides.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Button
          size="sm"
          disabled={download.isPending}
          onClick={() => download.mutate()}
        >
          {download.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <DownloadIcon data-icon="inline-start" />
          )}
          Télécharger .pptx
        </Button>
      </div>

      {download.isError ? (
        <p className="text-sm text-destructive">
          {getErrorMessage(download.error)}
        </p>
      ) : null}

      {deck.slides.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aucune slide : demande à l'agent d'en ajouter.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {deck.slides.map((slide, index) => (
            <div key={slide.id} className="flex flex-col gap-2">
              <p className="eyebrow">
                Slide {index + 1} / {deck.slides.length}
              </p>
              <SlidePreview slide={slide} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

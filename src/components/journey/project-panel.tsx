"use client";

import type { RefObject } from "react";
import { ArrowUpRight, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-media-query";
import type { Project } from "@/lib/github";
import { storyFor } from "./story";

type ProjectPanelProps = {
  project: Project;
  close: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onFocusFallback?: () => void;
};

export function ProjectPanel({ project, close, returnFocusRef, onFocusFallback }: ProjectPanelProps) {
  const mobile = useIsMobile();
  const story = storyFor(project);

  return (
    <Sheet open onOpenChange={(open) => { if (!open) close(); }}>
      <SheetContent
        side={mobile ? "bottom" : "right"}
        showClose={false}
        className={`studio-sheet game-sheet game-project-sheet overflow-y-auto ${mobile ? "max-h-[85dvh] rounded-t-2xl" : ""}`}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => {
            const target = returnFocusRef?.current;
            if (target?.isConnected) target.focus();
            else onFocusFallback?.();
          });
        }}
      >
        <div className="game-sheet-heading">
          <SheetHeader>
            <SheetTitle className="game-sheet-title break-words">{project.name}</SheetTitle>
            <SheetDescription className="game-sheet-description">{project.description}</SheetDescription>
          </SheetHeader>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={close}
            aria-label="Close project detail"
            className="game-dialog-close"
          >
            <X size={20} aria-hidden="true" />
          </Button>
        </div>

        <dl className="studio-project-facts">
          <div><dt>Technology</dt><dd>{project.language ?? "Mixed stack"}</dd></div>
          <div><dt>Created</dt><dd>{new Date(project.createdAt).getFullYear()}</dd></div>
          <div><dt>Last public update</dt><dd>{new Date(project.pushedAt).toLocaleDateString("en", { month: "short", year: "numeric" })}</dd></div>
        </dl>

        <h3 className="mt-8 text-lg font-semibold">The idea behind this chapter</h3>
        <p className="studio-sheet-description">{story.lesson}</p>

        <div className="grid gap-3">
          <Button type="button" asChild size="lg" className="game-button game-button--primary">
            <a href={project.url} target="_blank" rel="noreferrer">
              Read the source <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </Button>
          {project.homepage && (
            <Button type="button" asChild variant="outline" size="lg" className="game-button">
              <a href={project.homepage} target="_blank" rel="noreferrer">
                Open project website <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </Button>
          )}
          <a href="/work" className="studio-reader-link game-sheet-link">
            Engineering case studies <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}

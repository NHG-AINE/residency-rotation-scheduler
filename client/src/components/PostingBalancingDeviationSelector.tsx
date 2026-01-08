import React, { useMemo, useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import PostingDeviationConfigBody from "./BalancingDeviationDropdown";

interface PostingBalancingDeviationSelectorProps {
  value: Record<string, number>;
  setValue: (val: Record<string, number>) => void;
  postings: string[];
}

const PostingBalancingDeviationSelector: React.FC<
  PostingBalancingDeviationSelectorProps
> = ({ value, setValue, postings }) => {
  const [open, setOpen] = useState(false);
  const [selectedPostings, setSelectedPostings] = useState<string[]>([]);
  const [threshold, setThreshold] = useState<number>(1);
  const [showDropdown, setShowDropdown] = useState(false);

  const hasPostings = postings.length > 0;

  const configuredPostings = Object.keys(value);

  const availablePostings = useMemo(() => {
    return postings
      .filter((p) => {
        // never show already-selected postings
        if (p in value) return false;

        // never show individual GRM / MedComm
        if (p === "GRM (TTSH)" || p === "MedComm (TTSH)")
          return false;

        return true;
      })
      .sort();
  }, [postings, value]);

  const handleAdd = (): void => {
    if (selectedPostings.length === 0) return;

    const next = { ...value };

    selectedPostings.forEach((posting) => {
      next[posting] = threshold;
    });

    setValue(next);
    setSelectedPostings([]);
    setThreshold(1);
    setShowDropdown(false);
  };

  const handleRemove = (posting: string): void => {
    const next = { ...value };
    delete next[posting];
    setValue(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">
            Balancing Deviation for Postings
          </h2>
          <p className="text-sm text-muted-foreground">
            Allows uneven distribution of residents across blocks for each
            posting. If deviation exceeds posting capacity, it is capped at
            capacity.
          </p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setShowDropdown(false);
              setSelectedPostings([]);
            }
          }}
        >
          <DialogTrigger asChild>
            <span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasPostings}
                      className={!hasPostings ? "cursor-not-allowed opacity-60" : ""}
                    >
                      Configure
                    </Button>
                  </span>
                </TooltipTrigger>
                {!hasPostings && (
                  <TooltipContent>
                    Upload Postings CSV to enable configuration
                  </TooltipContent>
                )}
              </Tooltip>
            </span>
        </DialogTrigger>

          <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {hasPostings
                  ? "Configure posting deviations"
                  : "No postings found"}
              </DialogTitle>

              <DialogDescription>
                {hasPostings
                  ? "Select one or more postings and apply the same allowed imbalance across all 6 blocks."
                  : "Upload Postings CSV to configure balancing deviation."}
              </DialogDescription>
            </DialogHeader>
            {hasPostings && (
              <PostingDeviationConfigBody
                value={value}
                configuredPostings={configuredPostings}
                availablePostings={availablePostings}
                selectedPostings={selectedPostings}
                setSelectedPostings={setSelectedPostings}
                threshold={threshold}
                setThreshold={setThreshold}
                showDropdown={showDropdown}
                setShowDropdown={setShowDropdown}
                onAdd={handleAdd}
                onUpdate={(p, v) =>
                  setValue({ ...value, [p]: v })
                }
                onRemove={handleRemove}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* summary */}
      <div className="text-sm text-muted-foreground">
        <span className="font-semibold">Current configuration: </span>
        {configuredPostings.length === 0
          ? "All postings use default balancing (no deviation)."
          : configuredPostings
              .map((p) => `${p}: ${value[p]}`)
              .join(", ")}
      </div>
    </div>
  );
};

export default PostingBalancingDeviationSelector;
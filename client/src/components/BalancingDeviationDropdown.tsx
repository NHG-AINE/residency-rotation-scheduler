import React from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { InfoIcon, TrashIcon } from "lucide-react";
import { Check } from "lucide-react";

interface PostingDeviationConfigBodyProps {
  value: Record<string, number>;
  configuredPostings: string[];
  availablePostings: string[];

  selectedPostings: string[];
  setSelectedPostings: React.Dispatch<React.SetStateAction<string[]>>;

  threshold: number;
  setThreshold: (v: number) => void;

  showDropdown: boolean;
  setShowDropdown: React.Dispatch<React.SetStateAction<boolean>>;

  onAdd: () => void;
  onUpdate: (posting: string, value: number) => void;
  onRemove: (posting: string) => void;
}

const MAX_THRESHOLD = 20;

const PostingDeviationConfigBody: React.FC<
  PostingDeviationConfigBodyProps
> = ({
  value,
  configuredPostings,
  availablePostings,
  selectedPostings,
  setSelectedPostings,
  threshold,
  setThreshold,
  showDropdown,
  setShowDropdown,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  return (
    <>
      <div className="flex items-end gap-2">
        {/* Posting selector */}
        <div className="flex-1">
          <Label>Postings</Label>
          <div className="relative">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => setShowDropdown((v) => !v)}
            >
              {selectedPostings.length === 0
                ? "Select postings"
                : `${selectedPostings.length} selected`}
            </Button>

            {showDropdown && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow">
                <div className="max-h-60 overflow-y-auto p-1">
                  {availablePostings.map((posting) => {
                    const checked = selectedPostings.includes(posting);

                    return (
                      <button
                        key={posting}
                        type="button"
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                        onClick={() =>
                          setSelectedPostings((prev) =>
                            checked
                              ? prev.filter((p) => p !== posting)
                              : [...prev, posting]
                          )
                        }
                      >
                        <Check
                          className={`h-4 w-4 ${
                            checked ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        {posting}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Threshold */}
        <div className="w-24">
          <Label>Threshold</Label>
          <Input
            type="number"
            min={1}
            max={MAX_THRESHOLD}
            value={threshold}
            onChange={(e) =>
              setThreshold(
                Math.max(
                  1,
                  Math.min(MAX_THRESHOLD, Number(e.target.value) || 1)
                )
              )
            }
          />
        </div>

        {/* Add */}
        <Button
          className="mb-[2px]"
          onClick={onAdd}
          disabled={selectedPostings.length === 0}
        >
          Add
        </Button>
      </div>

      {/* Configured list */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 mt-4 pr-1">
        {configuredPostings.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No deviations configured.
          </p>
        )}

        {configuredPostings.map((posting) => (
          <Item key={posting}>
            <ItemContent>
              <ItemTitle className="flex items-center gap-1">
                {posting}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon size={14} />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Max − min residents across 6 blocks
                  </TooltipContent>
                </Tooltip>
              </ItemTitle>

              <ItemDescription className="text-xs">
                Allowed deviation
              </ItemDescription>

              <Input
                type="number"
                min={0}
                max={MAX_THRESHOLD}
                value={value[posting]}
                onChange={(e) =>
                  onUpdate(posting, Number(e.target.value))
                }
              />
            </ItemContent>

            <ItemActions>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(posting)}
              >
                <TrashIcon size={16} />
              </Button>
            </ItemActions>
          </Item>
        ))}
      </div>
    </>
  );
};

export default PostingDeviationConfigBody;

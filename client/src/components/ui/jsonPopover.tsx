import { prettyPrintJson } from "@/utils";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface JsonPopoverProps {
  jsonData: Record<string, any>;
}

export default function JsonPopover({ jsonData }: JsonPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant={"outline"}>
          JSON
        </Button>
      </PopoverTrigger>
      <PopoverContent className="text-xs overflow-auto max-w-80 max-h-80 p-4">
        <code className="">{prettyPrintJson(jsonData)}</code>
      </PopoverContent>
    </Popover>
  );
}

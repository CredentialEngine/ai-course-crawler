import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { API_URL } from "@/constants";
import { TrackedSseMessage, useSse } from "@/useSse";
import { DetectConfigurationProgress, Recipe } from "@/utils";
import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { useEffect } from "react";

export interface RecipeProgressProps {
  recipe: Recipe;
  onProgress?: (progress: DetectConfigurationProgress) => void;
}

export interface ProgressIconProps {
  status?: "info" | "success" | "failure";
}

export function ProgressIcon({ status }: ProgressIconProps) {
  if (!status) {
    return null;
  }

  const textColor = {
    success: "text-green-700",
    failure: "text-red-700",
    info: "text-black",
  };

  switch (status) {
    case "success":
      return (
        <div className={`${textColor[status]}`}>
          <CircleCheck size="16" />
        </div>
      );
    case "failure":
      return (
        <div className={`${textColor[status]}`}>
          <CircleX size="16" />
        </div>
      );
  }
}

export interface ProgressLineProps {
  item: TrackedSseMessage<DetectConfigurationProgress>;
}

export function ProgressLine({ item }: ProgressLineProps) {
  return (
    <div
      className={`text-sm flex gap-2 items-center ${
        item.isNew
          ? "transition-opacity duration-1000 opacity-0 animate-fadeIn"
          : null
      }`}
    >
      {item.data.message} <ProgressIcon status={item.data.status} />
    </div>
  );
}

export default function RecipeProgress({
  recipe,
  onProgress,
}: RecipeProgressProps) {
  const { messages, newMessage } = useSse<DetectConfigurationProgress>(
    `${API_URL}/sse/recipes/configuration/${recipe.id}`
  );
  useEffect(() => {
    if (onProgress && newMessage) {
      onProgress(newMessage?.data);
    }
  }, [newMessage]);
  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex gap-2 items-center">
          Detecting configuration{" "}
          <LoaderCircle className="animate-spin" size={16} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          {messages.map((message, idx) => (
            <ProgressLine item={message} key={`progress-${idx}`} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

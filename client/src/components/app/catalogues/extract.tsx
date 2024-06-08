import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Recipe, prettyPrintDate, trpc } from "@/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pickaxe } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useParams } from "wouter";
import { z } from "zod";

const FormSchema = z.object({
  recipeId: z.string(),
});

export default function CatalogueCreateExtraction() {
  let { catalogueId, recipeId } = useParams();
  const [_recipe, setRecipe] = useState<Recipe | null>(null);
  const catalogueDetail = trpc.catalogues.detail.useQuery(
    { id: parseInt(catalogueId || "") },
    { enabled: !!parseInt(catalogueId || "") }
  );
  const createExtraction = trpc.extractions.create.useMutation();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      recipeId: recipeId || "",
    },
  });
  const [_location, navigate] = useLocation();

  useEffect(() => {
    if (!catalogueDetail.data) {
      setRecipe(null);
      form.reset({ recipeId: "" });
    } else {
      const parsedRecipeId = parseInt(recipeId || "");
      const foundRecipe = parsedRecipeId
        ? catalogueDetail.data.recipes.find((r) => r.id == parsedRecipeId)
        : catalogueDetail.data.recipes.find((r) => r.isDefault);
      if (foundRecipe) {
        setRecipe(foundRecipe);
        form.reset({ recipeId: foundRecipe.id.toString() });
      }
    }
  }, [catalogueDetail.data, recipeId]);

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    await createExtraction.mutateAsync({
      catalogueId: parseInt(catalogueId!),
      recipeId: parseInt(data.recipeId),
    });
    navigate(`~/extractions`);
  }

  const recipes = catalogueDetail?.data?.recipes.filter((r) => r.configuredAt);

  if (!recipes) {
    return null;
  }

  return (
    <>
      <h1 className="text-lg font-semibold md:text-2xl">Create extraction</h1>
      <div>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-6"
          >
            <div className="grid gap-2 md:grid-cols-[1fr_250px] lg:grid-cols-2 lg:gap-4">
              <Card>
                <CardHeader>
                  <CardDescription>Recipe settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="recipeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipe</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select recipe" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {recipes.map((r) => (
                              <SelectItem
                                key={`option-${r.id}`}
                                value={r.id.toString()}
                              >
                                <div>
                                  Recipe #{r.id}{" "}
                                  {r.isDefault ? "(Default)" : null}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {prettyPrintDate(r.createdAt)}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription></FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
            <Button>
              <Pickaxe className="h-4 w-4 mr-2" /> Start extraction
            </Button>
          </form>
        </Form>
      </div>
    </>
  );
}

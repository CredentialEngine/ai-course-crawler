import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import {
  Catalogue,
  PAGE_DATA_TYPE,
  Recipe,
  RecipeConfiguration,
  trpc,
} from "@/utils";
import { Pickaxe, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import RecipeProgress from "./RecipeProgress";

const FormSchema = z.object({
  url: z
    .string()
    .url("Catalogue URL must be a valid URL (e.g. https://example.com)."),
  configuration: z
    .object({
      rootPageType: z.enum([
        PAGE_DATA_TYPE.COURSE_LINKS_PAGE,
        PAGE_DATA_TYPE.COURSE_DETAIL_PAGE,
        PAGE_DATA_TYPE.CATEGORY_PAGE,
      ]),
      pagination: z
        .object({
          hasPagination: z.boolean(),
          urlPatternType: z.enum(["page_num", "offset"]),
          urlPattern: z.string(),
          totalPages: z.number().positive(),
        })
        .optional(),
    })
    .optional(),
});

export interface RecipeFormProps {
  catalogue: Catalogue;
  recipe?: Recipe;
  onRequestConfigure: (recipeId: number) => void;
}

const RecipeForm = ({
  catalogue,
  recipe,
  onRequestConfigure,
}: RecipeFormProps) => {
  const [currentRecipe, setCurrentRecipe] = useState(recipe);
  const [configuration, setConfiguration] = useState<
    RecipeConfiguration | undefined
  >(undefined);
  const createRecipe = trpc.recipes.create.useMutation();
  const updateRecipe = trpc.recipes.update.useMutation();
  const reconfigureRecipe = trpc.recipes.reconfigure.useMutation();
  const setDefaultRecipe = trpc.recipes.setDefault.useMutation();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      url: recipe?.url || catalogue.url,
      configuration: undefined,
    },
  });
  const { toast } = useToast();
  useEffect(() => {
    receiveNewRecipe(recipe);
  }, [recipe]);

  const receiveNewRecipe = (newRecipe?: Recipe) => {
    if (!newRecipe) {
      return;
    }
    const newConfiguration = newRecipe.configuration as RecipeConfiguration;
    setConfiguration(newConfiguration);
    setCurrentRecipe((_) => ({
      ...newRecipe,
      configuration: newConfiguration,
    }));
    form.reset({
      url: newRecipe.url || catalogue.url,
      configuration: newConfiguration,
    });
  };

  const hasPagination = form.watch("configuration.pagination.hasPagination");

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    if (currentRecipe?.id) {
      if (currentRecipe.configuredAt) {
        const newRecipe = await updateRecipe.mutateAsync({
          id: currentRecipe.id,
          update: data,
        });
        receiveNewRecipe(newRecipe);
      } else {
        await reconfigureRecipe.mutateAsync({ id: currentRecipe.id });
        onRequestConfigure(currentRecipe.id);
      }
    } else {
      const result = await createRecipe.mutateAsync({
        catalogueId: catalogue.id,
        url: data.url,
      });
      if (result.message) {
        toast({
          title: "Configuration detection issue",
          description: result.message,
        });
      }
      onRequestConfigure(result.id);
    }
  }

  async function onSetDefault(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const result = await setDefaultRecipe.mutateAsync({
      id: currentRecipe!.id,
    });
    receiveNewRecipe(result);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
        <div>
          <div className="grid gap-2 md:grid-cols-[1fr_250px] lg:grid-cols-2 lg:gap-4">
            <Card>
              <CardHeader>
                <CardDescription>Page Type</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL</FormLabel>
                      <FormControl>
                        <Input placeholder="Catalogue URL" {...field} />
                      </FormControl>
                      <FormDescription>
                        The URL where courses appear
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {currentRecipe?.configuredAt ? (
                  <FormField
                    control={form.control}
                    name="configuration.rootPageType"
                    render={({ field }) => (
                      <FormItem className="space-y-3 mt-4">
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem
                                  value={PAGE_DATA_TYPE.COURSE_LINKS_PAGE}
                                  checked={
                                    field.value ==
                                    PAGE_DATA_TYPE.COURSE_LINKS_PAGE
                                  }
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Course Links
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem
                                  value={PAGE_DATA_TYPE.CATEGORY_PAGE}
                                  checked={
                                    field.value == PAGE_DATA_TYPE.CATEGORY_PAGE
                                  }
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Category Links
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem
                                  value={PAGE_DATA_TYPE.COURSE_DETAIL_PAGE}
                                  checked={
                                    field.value ==
                                    PAGE_DATA_TYPE.COURSE_DETAIL_PAGE
                                  }
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Course Details
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </CardContent>
            </Card>
            {configuration ? (
              <Card>
                <CardHeader>
                  <CardDescription>Pagination</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="configuration.pagination.hasPagination"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Has Pagination </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  {hasPagination ? (
                    <>
                      <FormField
                        control={form.control}
                        name="configuration.pagination.urlPatternType"
                        render={({ field }) => (
                          <FormItem className="space-y-3 mt-4">
                            <FormLabel>Pattern Type</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                className="flex flex-col space-y-1"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem
                                      value="page_num"
                                      checked={field.value == "page_num"}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Page Number
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem
                                      value="offset"
                                      checked={field.value == "offset"}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Offset
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="configuration.pagination.urlPattern"
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>URL Pattern</FormLabel>
                            <FormControl>
                              <Input placeholder="URL Pattern" {...field} />
                            </FormControl>
                            <FormDescription>
                              The pattern where page information should be
                              replaced
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </div>
          {currentRecipe?.configuredAt ? (
            <div className="mt-4 grid gap-2 md:grid-cols-[1fr_250px] lg:grid-cols-2 lg:gap-4">
              <Card>
                <CardHeader>
                  <CardDescription>Default</CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  {currentRecipe.isDefault ? (
                    <p className="text-green-800">
                      This recipe is currently set as the default extraction
                      method for the catalogue.
                    </p>
                  ) : (
                    <div>
                      <p>
                        This recipe is not currently set as the default
                        extraction method for the catalogue.
                      </p>
                      <Button
                        className="mt-4"
                        variant="outline"
                        size="sm"
                        onClick={onSetDefault}
                        disabled={setDefaultRecipe.isLoading}
                      >
                        <Star className="w-4 h-4 mr-2" />
                        Set as Default
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
          {currentRecipe?.detectionStartedAt ? (
            <div className="mt-4">
              <RecipeProgress
                recipe={currentRecipe}
                onProgress={(progress) =>
                  progress.shouldRefetch && onRequestConfigure(currentRecipe.id)
                }
              />
            </div>
          ) : null}
        </div>
        <div className="flex items-center">
          <Button
            disabled={
              createRecipe.isLoading ||
              updateRecipe.isLoading ||
              reconfigureRecipe.isLoading ||
              !!currentRecipe?.detectionStartedAt ||
              (!!currentRecipe?.configuration && !form.formState.isDirty)
            }
            type="submit"
          >
            {currentRecipe?.configuredAt ? "Save changes" : "Next"}
          </Button>
          {currentRecipe?.configuredAt ? (
            <Link
              className="ml-4"
              to={`/${catalogue.id}/extract/${currentRecipe.id}`}
            >
              <Button>
                <Pickaxe className="h-3.5 w-3.5 mr-2" />
                Start Extraction
              </Button>
            </Link>
          ) : null}
        </div>
      </form>
    </Form>
  );
};

export default RecipeForm;

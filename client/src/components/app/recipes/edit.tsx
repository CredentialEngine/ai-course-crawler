import BreadcrumbTrail from "@/components/ui/breadcrumb-trail";
import { STATUS, trpc } from "@/utils";
import { useParams } from "wouter";

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
import { LoaderIcon, Pickaxe, RotateCcw, Star } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { displayRecipeDetails } from "./util";

const FormSchema = z.object({
  url: z
    .string()
    .url("Catalogue URL must be a valid URL (e.g. https://example.com)."),
});

export default function EditRecipe() {
  let { catalogueId, recipeId } = useParams();
  const catalogueQuery = trpc.catalogues.detail.useQuery(
    { id: parseInt(catalogueId || "") },
    { enabled: !!catalogueId }
  );
  const recipeQuery = trpc.recipes.detail.useQuery(
    { id: parseInt(recipeId || "") },
    { enabled: !!recipeId }
  );
  const updateRecipe = trpc.recipes.update.useMutation();
  const reconfigureRecipe = trpc.recipes.reconfigure.useMutation();
  const setDefaultRecipe = trpc.recipes.setDefault.useMutation();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      url: "",
    },
  });
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const pollQuery = () => {
      if (recipeQuery.data?.status == STATUS.SUCCESS) {
        window.clearInterval(intervalRef.current!);
        intervalRef.current = null;
        return;
      }
      recipeQuery.refetch();
    };

    if (!recipeQuery.data) {
      return;
    }

    if (recipeQuery.data.status != STATUS.SUCCESS) {
      if (!intervalRef.current) {
        intervalRef.current = window.setInterval(pollQuery, 2000);
      } else {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    form.reset(recipeQuery.data);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [recipeQuery.data]);

  if (!catalogueQuery.data || !recipeQuery.data) {
    return null;
  }

  const catalogue = catalogueQuery.data;
  const recipe = recipeQuery.data;

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    await updateRecipe.mutateAsync({
      id: recipe.id,
      update: data,
    });
    recipeQuery.refetch();
  }

  async function onReconfigure() {
    await reconfigureRecipe.mutateAsync({ id: recipe.id });
    recipeQuery.refetch();
  }

  async function onSetDefault(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    await setDefaultRecipe.mutateAsync({
      id: recipe.id,
    });
    recipeQuery.refetch();
  }

  const breadCrumbs = [
    { label: "Catalogues", href: "/" },
    { label: catalogueQuery.data.name, href: `/${catalogueId}` },
    { label: "Recipe", href: `/${catalogueId}/${recipeId}` },
  ];

  return (
    <>
      <BreadcrumbTrail items={breadCrumbs} />
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Configure recipe</h1>
      </div>
      <div className="">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-6"
          >
            <div>
              <div className="grid gap-2 md:grid-cols-[1fr_250px] lg:grid-cols-2 lg:gap-4">
                <Card>
                  <CardHeader>
                    <CardDescription>Root URL</CardDescription>
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
                  </CardContent>
                </Card>
                {recipe.status == STATUS.SUCCESS ? (
                  <Card>
                    <CardHeader>
                      <CardDescription>Configuration</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs">
                        {displayRecipeDetails(recipe)}
                      </div>
                      <pre className="mt-4 text-xs overflow-x-auto">
                        {JSON.stringify(recipe.configuration, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
              {recipe.status == STATUS.WAITING ? (
                <div className="mt-4 grid gap-2 md:grid-cols-[1fr_250px] lg:grid-cols-2 lg:gap-4">
                  <Card>
                    <CardHeader>
                      <CardDescription>Configuration Pending</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <div>
                        <p>
                          Configuration detection hasn't started for this
                          recipe. Please check back later.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
              {recipe.status == STATUS.ERROR ? (
                <div className="mt-4 grid gap-2 md:grid-cols-[1fr_250px] lg:grid-cols-2 lg:gap-4">
                  <Card>
                    <CardHeader>
                      <CardDescription>Configuration Error</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <div>
                        <p className="text-red-800 font-semibold">
                          AI Course Crawler failed to detect a valid
                          configuration for this recipe.
                        </p>
                        <p className="mt-4">
                          You can adjust the URL, or try again.
                        </p>
                        <p className="mt-8">Failure reason:</p>
                        <pre className="mt-2 text-xs overflow-x-auto">
                          {recipe.detectionFailureReason}
                        </pre>
                        <Button
                          className="mt-8"
                          variant="outline"
                          size="sm"
                          onClick={onReconfigure}
                          disabled={reconfigureRecipe.isLoading}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Redetect configuration
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
              {recipe.status == STATUS.SUCCESS ? (
                <div className="mt-4 grid gap-2 md:grid-cols-[1fr_250px] lg:grid-cols-2 lg:gap-4">
                  <Card>
                    <CardHeader>
                      <CardDescription>Default</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm">
                      {recipe.isDefault ? (
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
            </div>
            <div className="flex items-center">
              {recipe.status == STATUS.IN_PROGRESS ? (
                <Button disabled={true} variant={"outline"}>
                  <div className="flex text-sm items-center">
                    <LoaderIcon className="animate-spin mr-2 w-3.5" />
                    Detecting configuration{" "}
                  </div>
                </Button>
              ) : (
                <Button
                  disabled={
                    recipeQuery.isLoading ||
                    updateRecipe.isLoading ||
                    reconfigureRecipe.isLoading ||
                    recipe.status == STATUS.IN_PROGRESS ||
                    !form.formState.isDirty
                  }
                  type="submit"
                >
                  Save changes
                </Button>
              )}
              {recipe.status == STATUS.SUCCESS ? (
                <Link
                  className="ml-4"
                  to={`/${catalogue.id}/extract/${recipe.id}`}
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
      </div>
    </>
  );
}

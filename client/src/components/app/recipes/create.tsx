import BreadcrumbTrail from "@/components/ui/breadcrumb-trail";
import { trpc } from "@/utils";
import { useLocation, useParams } from "wouter";

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
import { useToast } from "@/components/ui/use-toast";
import { useEffect } from "react";

const FormSchema = z.object({
  url: z
    .string()
    .url("Catalogue URL must be a valid URL (e.g. https://example.com)."),
});

export default function CreateRecipe() {
  let { catalogueId } = useParams();
  const catalogueQuery = trpc.catalogues.detail.useQuery(
    { id: parseInt(catalogueId || "") },
    { enabled: !!parseInt(catalogueId || "") }
  );
  const createRecipe = trpc.recipes.create.useMutation();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      url: "",
    },
  });
  const { toast } = useToast();
  const [_location, navigate] = useLocation();
  useEffect(() => {}, [catalogueQuery.data?.url]);

  if (!catalogueQuery.data) {
    return null;
  }

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      const result = await createRecipe.mutateAsync({
        catalogueId: parseInt(catalogueId!),
        url: data.url,
      });
      if (result.message) {
        toast({
          title: "Configuration detection issue",
          description: result.message,
        });
      }
      navigate(`/${catalogueId}/recipes/${result.id}`);
    } catch (err) {
      toast({
        description: (err as Error).message,
      });
    }
  }

  const breadCrumbs = [
    { label: "Catalogues", href: "/" },
    { label: catalogueQuery.data.name, href: `/${catalogueId}` },
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
              </div>
            </div>
            <div className="flex items-center">
              <Button disabled={createRecipe.isLoading} type="submit">
                Next
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
}

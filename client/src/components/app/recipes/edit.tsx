import BreadcrumbTrail from "@/components/ui/breadcrumb-trail";
import { trpc } from "@/utils";
import { useState } from "react";
import { useParams } from "wouter";
import RecipeForm from "./RecipeForm";

export default function EditRecipe() {
  let { catalogueId, recipeId } = useParams();
  const [currentRecipeId, setCurrentRecipeId] = useState(
    parseInt(recipeId || "")
  );
  const catalogueQuery = trpc.catalogues.detail.useQuery(
    { id: parseInt(catalogueId || "") },
    { enabled: !!parseInt(catalogueId || "") }
  );
  const recipeQuery = trpc.recipes.detail.useQuery(
    { id: currentRecipeId },
    { enabled: !!currentRecipeId }
  );

  const handleConfigure = (newRecipeId: number) => {
    if (newRecipeId != currentRecipeId) {
      setCurrentRecipeId(newRecipeId);
      window.history.replaceState(
        {},
        "",
        `/catalogues/${catalogueId}/recipes/${newRecipeId}`
      );
    } else {
      window.setTimeout(recipeQuery.refetch, 1500);
    }
  };

  if (!catalogueId || !catalogueQuery.data) {
    return null;
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
        <RecipeForm
          catalogue={catalogueQuery.data}
          recipe={recipeQuery.data}
          onRequestConfigure={handleConfigure}
        />
      </div>
    </>
  );
}

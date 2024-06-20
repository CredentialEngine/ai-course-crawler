import BreadcrumbTrail from "@/components/ui/breadcrumb-trail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_URL } from "@/constants";
import { CourseStructuredData, DataItem, trpc } from "@/utils";
import { Download } from "lucide-react";
import { useState } from "react";
import { useParams } from "wouter";
import usePagination from "../usePagination";

interface CourseDisplayItemProps {
  item: DataItem;
}

function CourseDisplayItem({ item }: CourseDisplayItemProps) {
  const structuredData = item.structuredData as
    | CourseStructuredData
    | undefined;

  if (!structuredData) {
    return (
      <TableRow>
        <TableCell colSpan={5}>No data.</TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="text-sm">{item.id}</TableCell>
      <TableCell className="text-sm">{structuredData.courseId}</TableCell>
      <TableCell className="text-sm max-w-40">
        {structuredData.courseName}
      </TableCell>
      <TableCell className="text-sm max-w-80">
        {structuredData.courseDescription}
      </TableCell>
      <TableCell className="text-sm">
        {structuredData.courseCreditsMin}-{structuredData.courseCreditsMax}
      </TableCell>
    </TableRow>
  );
}

export default function CatalogueDataCourses() {
  const { catalogueDataId } = useParams();
  const [downloadInProgress, setDownloadInProgress] = useState(false);
  const { page, PaginationButtons } = usePagination();

  const datasetQuery = trpc.catalogueData.detail.useQuery(
    { catalogueDataId: parseInt(catalogueDataId || "") },
    { enabled: !!catalogueDataId }
  );

  const coursesQuery = trpc.catalogueData.courses.useQuery(
    { catalogueDataId: parseInt(catalogueDataId || ""), page },
    { enabled: !!catalogueDataId }
  );

  if (!datasetQuery.data || !coursesQuery.data) {
    return null;
  }
  const handleDownload: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    setDownloadInProgress(true);
    e.preventDefault();
    fetch(
      `${API_URL}/downloads/courses/bulk_upload_template/${catalogueDataId}`,
      {
        credentials: "include",
      }
    )
      .then((response) => {
        const disposition = response.headers.get("Content-Disposition");
        let filename = `AICourseMapping-BulkUploadTemplate-${catalogueDataId}.csv`; // Fallback filename

        if (disposition && disposition.includes("attachment")) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, "");
          }
        }

        return response.blob().then((blob) => ({
          blob,
          filename,
        }));
      })
      .then(({ blob, filename }) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        setDownloadInProgress(false);
      })
      .catch((err) => {
        console.error("Download error:", err);
        setDownloadInProgress(false);
      });
  };

  const extraction = datasetQuery.data.extraction;
  const catalogue = extraction.recipe.catalogue;
  const items = coursesQuery.data.results;

  const breadCrumbs = [
    { label: "Data Library", href: "/" },
    { label: `Catalogue #${catalogue.id}`, href: `/catalogue/${catalogue.id}` },
  ];

  return (
    <>
      <BreadcrumbTrail items={breadCrumbs} />
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">
          Extraction #{extraction.id} Library — Courses
        </h1>
      </div>
      <div className="border p-6">
        <div className="font-semibold">Downloads</div>
        <div className="mt-4">
          <Button onClick={handleDownload} disabled={downloadInProgress}>
            <Download className="w-4 h-4 mr-2" />
            Download bulk-upload template
          </Button>
        </div>
      </div>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data ID</TableHead>
                <TableHead>Course ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Credits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <CourseDisplayItem key={`step-item-${item.id}`} item={item} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
        {items.length > 0 ? (
          <CardFooter>
            <PaginationButtons
              totalItems={coursesQuery.data.totalItems}
              totalPages={coursesQuery.data.totalPages}
            />
          </CardFooter>
        ) : null}
      </Card>
    </>
  );
}

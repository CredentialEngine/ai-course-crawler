import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import JsonPopover from "@/components/ui/jsonPopover";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CrawlStep,
  STATUS,
  concisePrintDate,
  prettyPrintDate,
  trpc,
} from "@/utils";
import { CookingPot, LibraryBig, List } from "lucide-react";
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import { Link, useParams } from "wouter";
import { displayRecipeDetails } from "../recipes/util";
import { displayStepType } from "./utils";

function displayStepParent(steps: CrawlStep[], parentId: number) {
  const parent = steps.find((s) => s.id == parentId);
  if (!parent) {
    return parentId;
  }
  return displayStepType(parent.step);
}

export default function ExtractionDetail() {
  let { extractionId } = useParams();
  const query = trpc.extractions.detail.useQuery(
    { id: parseInt(extractionId || "") },
    { enabled: !!parseInt(extractionId || "") }
  );

  const logsQuery = trpc.extractions.logs.useQuery(
    { extractionId: parseInt(extractionId || ""), perPage: 5 },
    { enabled: !!parseInt(extractionId || "") }
  );

  if (!query.data) {
    return null;
  }

  const extraction = query.data;
  const extractionLogs = logsQuery.data?.results;
  let totalDownloads = 0,
    totalDownloadsAttempted = 0,
    totalDownloadErrors = 0,
    totalExtractionsPossible = 0,
    totalExtractionsAttempted = 0,
    totalExtractionErrors = 0;
  for (const step of extraction.completionStats?.steps || []) {
    totalDownloads += step.downloads.total;
    totalDownloadsAttempted += step.downloads.attempted;
    totalDownloadErrors += step.downloads.attempted - step.downloads.succeeded;
    totalExtractionsPossible += step.downloads.succeeded;
    totalExtractionsAttempted += step.extractions.attempted;
    totalExtractionErrors +=
      step.extractions.attempted - step.extractions.succeeded;
  }

  return (
    <>
      <div className="">
        <Card>
          <CardHeader>
            <CardTitle>Extraction Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              Started at {prettyPrintDate(extraction.createdAt)}.{" "}
              <Badge>{extraction.status}</Badge>
            </div>
            <div className="flex gap-4">
              <div className="rounded-md border p-4 mt-2 flex items-center">
                {extraction.dataItemsCount ? (
                  <Link
                    to={`~/datasets/courses/${extraction.id}`}
                    className="flex items-center gap-4"
                  >
                    <div>
                      <LibraryBig className="w-4 h-4" />
                    </div>
                    <div>View Data</div>
                  </Link>
                ) : (
                  <div>
                    <p>No data</p>
                    <div className="text-sm text-muted-foreground">
                      Check again later
                    </div>
                  </div>
                )}
              </div>
              <div className="rounded-md border p-4 mt-2">
                <Link
                  to={`~/catalogues/${extraction.recipe.catalogue.id}/recipes/${extraction.recipe.id}`}
                  className="flex items-center gap-4"
                >
                  <div>
                    <CookingPot className="w-4 h-4" />
                  </div>
                  <div>
                    Recipe #{extraction.recipe.id}{" "}
                    {extraction.recipe.status == STATUS.SUCCESS
                      ? null
                      : "— Draft"}
                    <div className="text-xs">
                      {displayRecipeDetails(extraction.recipe)}
                    </div>
                    <div className="text-xs">
                      {extraction.recipe.url.substring(0, 200)}...
                    </div>
                  </div>
                </Link>
              </div>
            </div>
            {extraction.completionStats ? (
              <div>
                <div className="flex mt-4 gap-4">
                  <ChartContainer config={{}} className="h-[140px] w-4/5">
                    <BarChart
                      margin={{
                        left: 10,
                        right: 0,
                        top: 0,
                        bottom: 10,
                      }}
                      data={[
                        {
                          activity: "Downloads",
                          value:
                            (totalDownloadsAttempted / totalDownloads) * 100,
                          label: `${totalDownloadsAttempted}/${totalDownloads}`,
                        },
                        {
                          activity: "Extractions",
                          value:
                            (totalExtractionsAttempted /
                              totalExtractionsPossible) *
                            100,
                          label: `${totalExtractionsAttempted}/${totalExtractionsPossible}`,
                        },
                      ]}
                      layout="vertical"
                      barSize={32}
                      barGap={2}
                    >
                      <XAxis type="number" dataKey="value" hide />
                      <YAxis
                        dataKey="activity"
                        type="category"
                        tickLine={false}
                        tickMargin={4}
                        axisLine={false}
                        className="capitalize"
                      />
                      <Bar
                        dataKey="value"
                        radius={5}
                        background={{ fill: "#949494" }}
                      >
                        <LabelList
                          position="insideLeft"
                          dataKey="label"
                          fill="white"
                          offset={8}
                          fontSize={12}
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>
                <div className="mt-2 gap-4 text-xs">
                  <div>
                    Download Errors: {totalDownloadErrors} /{" "}
                    {totalDownloadsAttempted}.
                  </div>
                  <div>
                    Extraction Errors: {totalExtractionErrors} /{" "}
                    {totalExtractionsAttempted}.
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Extraction Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Step ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Configuration</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extraction.crawlSteps.map((step) => (
                  <TableRow key={`steps-${step.id}`}>
                    <TableCell className="font-medium w-20">
                      {step.id}
                    </TableCell>
                    <TableCell>{displayStepType(step.step)}</TableCell>
                    <TableCell>
                      {step.parentStepId
                        ? displayStepParent(
                            extraction.crawlSteps,
                            step.parentStepId
                          )
                        : null}
                    </TableCell>
                    <TableCell>
                      {step.configuration ? (
                        <JsonPopover jsonData={step.configuration} />
                      ) : null}
                    </TableCell>
                    <TableCell>{concisePrintDate(step.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={"outline"}
                        size="sm"
                        className="text-xs"
                        asChild
                      >
                        <Link to={`/${extraction.id}/steps/${step.id}`}>
                          <List className="w-3.5 h-3.5 mr-2" />
                          View {step.itemCount} items
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {extractionLogs?.length ? (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Extraction Log</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead className="text-right">Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractionLogs.map((log) => (
                    <TableRow key={`logs-${log.id}`}>
                      <TableCell className="text-xs w-20">{log.id}</TableCell>
                      <TableCell className="text-xs">{log.createdAt}</TableCell>
                      <TableCell className="text-xs">{log.logLevel}</TableCell>
                      <TableCell className="text-xs text-right">
                        {log.log}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableCaption>
                  Only the newest 5 log entries are displayed.{" "}
                  <Link to={`/${extractionId}/logs`} className="underline">
                    View full log
                  </Link>
                </TableCaption>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}

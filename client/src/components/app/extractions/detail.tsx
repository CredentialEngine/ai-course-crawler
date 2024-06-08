import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ExtractionStep,
  concisePrintDate,
  prettyPrintDate,
  trpc,
} from "@/utils";
import { CookingPot, LibraryBig, List } from "lucide-react";
import { Link, useParams } from "wouter";
import { displayStepType } from "./utils";

function displayStepParent(steps: ExtractionStep[], parentId: number) {
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

  return (
    <>
      <div className="">
        <Card>
          <CardHeader>
            <CardTitle>Extraction Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              Started at {prettyPrintDate(extraction.createdAt)}
            </div>
            <div className="flex gap-4">
              <div className="rounded-md border p-4 mt-2 flex items-center">
                <Link
                  to={`~/data/extraction/${extraction.id}`}
                  className="flex items-center gap-4"
                >
                  <div>
                    <LibraryBig className="w-4 h-4" />
                  </div>
                  <div>View Data</div>
                </Link>
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
                    {extraction.recipe.configuredAt ? null : "— Draft"}
                    <div className="flex gap-4 text-sm">
                      <div>Root URL</div>
                      <div className="text-sm">
                        {extraction.recipe.url.substring(0, 200)}...
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
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
                {extraction.extractionSteps.map((step) => (
                  <TableRow key={`steps-${step.id}`}>
                    <TableCell className="font-medium w-20">
                      {step.id}
                    </TableCell>
                    <TableCell>{displayStepType(step.step)}</TableCell>
                    <TableCell>
                      {step.parentStepId
                        ? displayStepParent(
                            extraction.extractionSteps,
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

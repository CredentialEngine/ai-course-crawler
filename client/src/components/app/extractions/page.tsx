import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/utils";
import { useState } from "react";
import { useParams } from "wouter";
import { base64Img } from "./utils";
import BreadcrumbTrail from "@/components/ui/breadcrumb-trail";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export default function CrawlPageDetail() {
  const { extractionId, stepId, crawlPageId } = useParams();
  const crawlPageQuery = trpc.extractions.crawlPageDetail.useQuery(
    { crawlPageId: parseInt(crawlPageId || "") },
    { enabled: !!crawlPageId }
  );
  const simulateExtractionQuery =
    trpc.extractions.simulateDataExtraction.useMutation();
  const [simulatedExtractedData, setSimulatedExtractedData] =
    useState<
      Awaited<ReturnType<
        (typeof simulateExtractionQuery)["mutateAsync"]
      > | null>
    >(null);
  if (!crawlPageQuery.data) {
    return null;
  }

  const onSimulateDataExtraction = async () => {
    const simulatedData = await simulateExtractionQuery.mutateAsync({
      crawlPageId: parseInt(crawlPageId || ""),
    });
    if (simulatedData) {
      setSimulatedExtractedData(simulatedData);
    }
  };

  const item = crawlPageQuery.data;

  const breadCrumbs = [
    { label: "Extractions", href: "/" },
    { label: `Extraction #${extractionId}`, href: `/${extractionId}` },
    {
      label: `Step #${stepId}`,
      href: `/${extractionId}/steps/${stepId}`,
    },
    {
      label: `Step Item #${crawlPageId}`,
      href: `/${extractionId}/steps/${stepId}/items/${item.id}`,
    },
  ];

  const tabTriggers = [
    <TabsTrigger value="raw_content">Raw content</TabsTrigger>,
  ];
  const tabContents = [
    <TabsContent value="raw_content">
      <code>{item.content}</code>
    </TabsContent>,
  ];

  let defaultTab = "raw_content";

  if (item.simplifiedContent) {
    tabTriggers.push(
      <TabsTrigger value="simplified_content">Simplified Content</TabsTrigger>
    );
    tabContents.push(
      <TabsContent value="simplified_content">
        <pre>{item.simplifiedContent}</pre>
      </TabsContent>
    );
  }

  const screenshot = item.screenshot ? base64Img(item.screenshot) : null;
  if (screenshot) {
    defaultTab = "screenshot";
    tabTriggers.unshift(
      <TabsTrigger value="screenshot">Screenshot</TabsTrigger>
    );
    tabContents.unshift(
      <TabsContent value="screenshot">{screenshot}</TabsContent>
    );
  }

  const formattedSimulatedData = simulatedExtractedData
    ? JSON.stringify(simulatedExtractedData, null, 2)
    : null;

  return (
    <>
      <BreadcrumbTrail items={breadCrumbs} />

      {item.content ? (
        <div>
          <Button
            className="mb-4"
            onClick={onSimulateDataExtraction}
            disabled={simulateExtractionQuery.isLoading}
          >
            Simulate data extraction
          </Button>
          {formattedSimulatedData ? (
            <Accordion type="single" collapsible={true}>
              <AccordionItem value="simulated_data">
                <AccordionTrigger>Simulated Data</AccordionTrigger>
                <AccordionContent>
                  <pre className="text-xs">{formattedSimulatedData}</pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">
          Extraction Step Item #{crawlPageId} - Content Preview
        </h1>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="w-full mb-4">{tabTriggers}</TabsList>
        <div className="border border-dashed p-4 text-xs overflow-auto">
          {tabContents}
        </div>
      </Tabs>
    </>
  );
}

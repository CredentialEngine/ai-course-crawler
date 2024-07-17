import BreadcrumbTrail from "@/components/ui/breadcrumb-trail";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/utils";
import { useParams } from "wouter";
import { base64Img } from "./utils";

export default function CrawlPageDetail() {
  let { extractionId, stepId, crawlPageId } = useParams();
  const crawlPageQuery = trpc.extractions.crawlPageDetail.useQuery(
    { crawlPageId: parseInt(crawlPageId || "") },
    { enabled: !!crawlPageId }
  );
  if (!crawlPageQuery.data) {
    return null;
  }

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

  return (
    <>
      <BreadcrumbTrail items={breadCrumbs} />

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

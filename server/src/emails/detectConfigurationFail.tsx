import { Button, CodeInline, Html, Link, Text } from "@react-email/components";
import { buildFrontendUrl } from "../utils";

export interface DetectConfigurationFailProps {
  catalogueId: number;
  recipeId: number;
  url: string;
  reason: string;
}

const button = {
  fontSize: "14px",
  backgroundColor: "#000",
  color: "#fff",
  lineHeight: 1.5,
  borderRadius: "0.5em",
  padding: "12px 24px",
};

const DetectConfigurationFail = ({
  catalogueId,
  recipeId,
  url,
  reason,
}: DetectConfigurationFailProps) => {
  const recipeUrl = buildFrontendUrl(
    `/catalogues/${catalogueId}/recipes/${recipeId}`
  );
  return (
    <Html lang="en">
      <Text>Hi,</Text>
      <Text>
        It looks like configuration detection failed for an extraction recipe we
        were working on.
      </Text>
      <Text>
        The URL we tried to detect configuration for was:{" "}
        <Link href={url}>{url}</Link>
      </Text>
      <Text>Here's a preview of the error:</Text>
      <CodeInline style={{ color: "red" }}>{reason}</CodeInline>
      <Text>For more details, you can click the link below.</Text>
      <Button style={button} href={recipeUrl}>
        View recipe
      </Button>
    </Html>
  );
};

DetectConfigurationFail.DefaultSubject =
  "Recipe configuration detection has failed";
DetectConfigurationFail.PreviewProps = {
  catalogueId: 1,
  recipeId: 1,
  url: "https://www.learningtapestry.com",
  reason: "Not a course page",
};

export default DetectConfigurationFail;

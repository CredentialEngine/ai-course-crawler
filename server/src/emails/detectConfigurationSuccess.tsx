import { Button, Html, Link, Text } from "@react-email/components";
import { buildFrontendUrl } from "../utils";

export interface DetectConfigurationSuccessProps {
  catalogueId: number;
  recipeId: number;
  url: string;
}

const button = {
  fontSize: "14px",
  backgroundColor: "#000",
  color: "#fff",
  lineHeight: 1.5,
  borderRadius: "0.5em",
  padding: "12px 24px",
};

const DetectConfigurationSuccess = ({
  catalogueId,
  recipeId,
  url,
}: DetectConfigurationSuccessProps) => {
  const recipeUrl = buildFrontendUrl(
    `/catalogues/${catalogueId}/recipes/${recipeId}`
  );
  return (
    <Html lang="en">
      <Text>Hi,</Text>
      <Text>
        Good news! It looks like configuration detection was successful for the
        URL:
      </Text>
      <Link href={url}>{url}</Link>
      <Text>To start an extraction, you can click the link below.</Text>
      <Button style={button} href={recipeUrl}>
        View recipe
      </Button>
    </Html>
  );
};

DetectConfigurationSuccess.DefaultSubject =
  "Recipe configuration detection is complete";
DetectConfigurationSuccess.PreviewProps = {
  catalogueId: 1,
  recipeId: 1,
  url: "https://www.learningtapestry.com",
};

export default DetectConfigurationSuccess;

import {
    Body,
    Button,
    Column,
    Container,
    Head,
    Html,
    Link,
    Preview,
    Row,
    Section,
    Text,
} from "@react-email/components";
import { buildFrontendUrl } from "../utils";
import * as styles from "./styles";

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
      <Head />
      <Preview>Recipe configuration detection succeeded</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Text style={styles.title}>
            Hi! It looks like configuration detection has completed successfully
            for the URL below.
          </Text>
          <Section style={styles.dataSection}>
            <Row>
              <Column style={styles.dataColumnHeader}>URL</Column>
              <Column>
                <Link href={url}>{url}</Link>
              </Column>
            </Row>
          </Section>
          <Text>To start an extraction, see the link below.</Text>
          <Button style={styles.button} href={recipeUrl}>
            View recipe and start extraction
          </Button>
          <Text style={styles.footer}>
            Credential Engine - CTDL xTRA
          </Text>
        </Container>
      </Body>
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

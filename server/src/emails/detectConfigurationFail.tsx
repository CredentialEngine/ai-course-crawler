import {
    Body,
    Button,
    CodeInline,
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

export interface DetectConfigurationFailProps {
  catalogueId: number;
  recipeId: number;
  url: string;
  reason: string;
}

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
      <Head />
      <Preview>Recipe configuration detection failed</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Text style={styles.title}>
            Hi. It looks like configuration detection failed for an extraction
            recipe we were working on.
          </Text>
          <Section style={styles.dataSection}>
            <Row>
              <Column style={styles.dataColumnHeader}>URL</Column>
              <Column>
                <Link href={url}>{url}</Link>
              </Column>
            </Row>
          </Section>
          <Text>Here's a preview of the error:</Text>
          <CodeInline style={{ color: "red" }}>{reason}</CodeInline>
          <Text>For more details, see the link below.</Text>
          <Button style={styles.button} href={recipeUrl}>
            View recipe
          </Button>
          <Text style={styles.footer}>
            Credential Engine - CTDL xTRA
          </Text>
        </Container>
      </Body>
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

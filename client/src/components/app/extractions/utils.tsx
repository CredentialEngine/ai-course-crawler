const STEP_TYPE_LABELS: Record<string, string> = {
  FETCH_COURSE_LINKS: "Fetch course links",
  FETCH_COURSE_DETAILS: "Fetch course details",
  FETCH_COURSE_CATEGORY_LINKS: "Fetch category links",
  FETCH_PAGINATED_URLS: "Fetch multiple pages",
  FETCH_SINGLE_URL: "Fetch single page",
};

export function displayStepType(stepType: string) {
  if (stepType in STEP_TYPE_LABELS) {
    return STEP_TYPE_LABELS[stepType];
  }
  return stepType;
}

export function base64Img(base64Image: string) {
  const url = `data:image/webp;base64,${base64Image}`;
  return <img src={url} />;
}

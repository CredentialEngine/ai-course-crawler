export function displayStepType(stepType: string) {
  if (stepType == "FETCH_PAGINATED_URLS") {
    return "Fetch pages";
  } else if (stepType == "FETCH_COURSE_LINKS") {
    return "Fetch course links";
  }
  return stepType;
}

export function base64Img(base64Image: string) {
  const url = `data:image/webp;base64,${base64Image}`;
  return <img src={url} />;
}

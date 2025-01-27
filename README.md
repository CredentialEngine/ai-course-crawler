# CTDL xTRA

CTDL xTRA (`eXtensible Extract and Transformation Assistant`) is a tool for
automating the extraction of structured
[CTDL data](https://credentialengine.org/credential-transparency/ctdl/) from
online resources. Currently the focus is on courses, credentials, competencies
and learning programs. Courses are the first priority.

## High level overview

xTRA works by crawling an educational institution's website, downloading
relevant pages, and then transforming the raw content into structured CTDL data.

The process happens in 3 phases:

1. A recipe is created for crawling the website. For recipe configuration, LLMs
are used to detect the kind of content that will be extracted as well as details
such as URL and pagination patterns.

2. A crawler executes the recipe, feeding URLs it discovers to a background task
queue.

3. Once a page with relevant content is downloaded, an LLM is used to extract
structured data from it.

The structured data is then used to generate a bulk upload file for the [Credential Registry](https://credentialengine.org/credential-transparency/credential-registry/).

## Crawling recipes and extractions

### Configuration / recipes

Most websites we extract data from follow certain patterns in their layout and navigation structure, and the crawler has been built with that in mind.

For courses, the structure tends to be:

- Some kind of catalogue index page with links to courses / collections of
courses (i.e. a program), or with the content directly in the page.

- Course collection pages that typically link to course detail pages.

- Course detail pages. Those contain the data we're interested in: course name,
description, and other information such as credit values.

- The index and the collection pages are often paginated.

### LLM usage in crawling configuration

Assuming a website matches the structure above, the challenge is how to execute
on the details for arbitrary websites (that the system has no knowledge of).

An LLM is used to detect:

- What kind of content is present in the index page.
  In case it's an index page (links), what kind of links and their patterns.

- The content type and links in the destination pages.

- Whether there's pagination and what's the pagination pattern.

### Data extraction

Once a web page containing relevant data (for example, course details)
is downloaded, we first check if it's more than one entity (course) per page.

If that's the case, we split the page by entity, as LLMs tend to lose track of
details with longer documents.

We then extract the data for each entity using an LLM.

## Technical implementation

xTRA is written in TypeScript, with a React frontend (Vite) and a Fastify
backend (node.js). Background tasks are performed by BullMQ, and vitest is used
for tests. Data is stored on PostgreSQL.

See the [client README](client/README.md) and [server README](server/README.md)
for more details.

## Deployment

The app is deployed on Cloud66 using their container feature
(Docker + Kubernetes). See [Dockerfile](Dockerfile) for the main app
and [worker.Dockerfile](worker.Dockerfile) for the background worker app.

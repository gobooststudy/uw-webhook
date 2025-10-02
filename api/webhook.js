import { put } from "@vercel/blob";
import { DOMParser } from "xmldom";
import xpath from "xpath";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Only POST allowed");
  }

  const { output, feed_name } = req.body;
  if (!output || !feed_name) {
    return res.status(400).send("Missing required fields");
  }

  // Parse HTML with xmldom
  const doc = new DOMParser().parseFromString(output, "text/html");
  const jobNodes = xpath.select('//section[contains(@class, "card-list-container")]/article', doc);

  const jobs = [];
  for (let job of jobNodes) {
    const titleNode = xpath.select('.//h2[contains(@class, "job-tile-title")]/a', job);
    const title = titleNode.length > 0 ? titleNode[0].firstChild.data.trim() : "No title found";
    const link = titleNode.length > 0 ? "https://www.upwork.com" + titleNode[0].getAttribute("href") : "No link found";

    const descNode = xpath.select('.//div[contains(@class, "air3-line-clamp-wrapper clamp mb-3")]/div[contains(@class, "air3-line-clamp")]/p[contains(@class, "mb-0 text-body-sm")]', job);
    const description = descNode.length > 0 ? descNode[0].firstChild.data.trim() : "No description found";

    const dateNode = xpath.select('.//small[@data-test="job-pubilshed-date"]/span[last()]', job);
    const publishedDate = dateNode.length > 0 ? dateNode[0].firstChild.data.trim() : "No date found";

    jobs.push({ title, link, description, publishedDate });
  }

  // Build RSS XML
  const feedUrl = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/feed/${feed_name}.xml`;
  let rss = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>Upwork Job Feed RSS</title>
      <description>RSS Feed for Upwork Jobs</description>
      <link>${feedUrl}</link>`;

  jobs.forEach(job => {
    rss += `
      <item>
        <title>${job.title}</title>
        <link>${job.link}</link>
        <description>${job.description}</description>
        <pubDate>${job.publishedDate}</pubDate>
      </item>`;
  });

  rss += `
    </channel>
  </rss>`;

  // Save to Vercel Blob
  await put(`feed/${feed_name}.xml`, rss, {
    access: "public", // makes the file publicly accessible
    contentType: "application/xml",
  });

  return res.status(200).json({
    message: "Feed updated",
    url: feedUrl,
  });
}

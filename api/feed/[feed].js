import { get } from "@vercel/blob";

export default async function handler(req, res) {
  const { feed } = req.query; // e.g., "myjobs.xml"

  try {
    const blob = await get(`feed/${feed}`); // fetch from Blob storage
    if (!blob) return res.status(404).send("Feed not found");

    res.setHeader("Content-Type", "application/xml"); // tell browser/RSS reader it's XML
    const response = await fetch(blob.url);          // get the actual content from Blob
    const text = await response.text();
    return res.status(200).send(text);              // return XML to client
  } catch (err) {
    return res.status(500).send("Error fetching feed");
  }
}

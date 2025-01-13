import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import OpenAI from "openai";

import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

import "dotenv/config";

type SimilarityMertric = "cosine" | "euclidean" | "dot_product";

const { ASTRA_DB_NAMESPACE, ASTRA_DB_COLLECTION, ASTRA_DB_API_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN, OPENAI_API_KEY } = process.env;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const swuData = [
  'https://starwarsunlimited.com/cards',
  'https://sw-unlimited-db.com/cards/',
  'https://starwarsunlimited.com/articles/built-by-the-masters',
  'https://starwarsunlimited.com/articles/jump-to-lightspeed',
  'https://starwarsunlimited.com/how-to-play?chapter=rules',
  'https://starwarsunlimited.com/how-to-play?chapter=how-to-play',
  'https://starwarsunlimited.com/how-to-play?chapter=different-ways-to-play',
  'https://starwarsunlimited.com/how-to-play?chapter=premier',
  'https://starwarsunlimited.com/how-to-play?chapter=draft-play',
  'https://starwarsunlimited.com/how-to-play?chapter=sealed-play',
  'https://starwarsunlimited.com/how-to-play?chapter=twin-suns',
  'https://starwarsunlimited.com/how-to-play?chapter=getting-started',
]

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, {
  namespace: ASTRA_DB_NAMESPACE
});

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100
});

const createCollection = async (similarityMetrix: SimilarityMertric = 'dot_product') => {
  const res = await db.createCollection(ASTRA_DB_COLLECTION, {
    vector: {
      dimension: 1536,
      metric: similarityMetrix
    }
  });

  console.log(res);
};

const loadSampleData = async () => {
  const collection = db.collection(ASTRA_DB_COLLECTION);
  for await (const url of swuData) {
    const content = await scrapePage(url);
    const chunks = await splitter.splitText(content);

    const documents = [];
    for (const chunk of chunks) {
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
        encoding_format: "float",
      });

      const vector = embedding.data[0].embedding;
      documents.push({
        $vector: vector,
        text: chunk,
      });
    }

    // Insert chunks in batch
    const res = await collection.insertMany(documents);
    console.log(`Inserted documents for URL ${url}:`, res);
  }
};


const scrapePage = async (url: string) => {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: {
      headless: true
    },
    gotoOptions: {
      waitUntil: "domcontentloaded"
    },
    evaluate: async (page, browser) => {
      const res = await page.evaluate(() => document.body.innerHTML);
      await browser.close();
      return res;
    },
  });

  return ( await loader.scrape())?.replace(/<[^>]*>?/gm, '');
};

createCollection().then(() => loadSampleData());
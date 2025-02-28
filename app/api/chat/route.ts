import { DataAPIClient } from '@datastax/astra-db-ts';
import { openai } from '@ai-sdk/openai';
import OpenAI from 'openai';
import { streamText } from 'ai';
import pdf from 'pdf-parse';

const { ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COllECTION,
  OPENAI_API_KEY } =
  process.env;

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT!, { namespace: ASTRA_DB_NAMESPACE });
const collection = db.collection(ASTRA_DB_COllECTION!);

function decodeBase64(base64String) {
  const base64Data = base64String.split(',')[1] || base64String;
  const binaryData = Buffer.from(base64Data, 'base64');
  return binaryData;
}

async function extractTextFromPDF(pdfBuffer) {
  try {
    const data = await pdf(pdfBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
  }
}

export async function POST(req: Request) {
  let docContext = '';

  try {
    const { messages, data } = await req.json();

    let newData;
    let fileContent = '';
    if (data) {
      newData = decodeBase64(data);
      fileContent = await extractTextFromPDF(newData);
    }

    const latestMessages = messages[messages.length - 1];
    const embedding = await new OpenAI({ apiKey: OPENAI_API_KEY }).embeddings.create({
      model: "text-embedding-3-small",
      input: latestMessages.content,
      encoding_format: "float"
    });

    try {
      const cursor = await collection.find({},
        {
          sort: {
            $vector: embedding.data[0].embedding,
          },
          limit: 5
        }
      );

      const documents = await cursor.toArray();
      const docsMap = documents.map((doc) => {
        const sanitizedText = doc.text.replace(/[\r\n]+/g, ' ').slice(0, 500);
        return sanitizedText;
      });
      docContext = JSON.stringify(docsMap, null, 2);
    } catch (error) {
      console.log('Error querying db', error);
    }

    const template = {
      role: 'system',
      content: `
        ---------------
        START CONTEXT
        ${docContext}
        END CONTEXT
        ---------------
        QUESTION: ${latestMessages.content}
        ---------------
        FILE CONTENT: ${fileContent ? fileContent : newData ? newData.toString() : ''}
        ---------------
      `
    };

    const result = await streamText({
      model: openai('gpt-3.5-turbo'),
      messages: [template, ...messages]
    });

    newData = '';
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Error:', error);
    docContext = '';
  }
}
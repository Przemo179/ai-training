import { DataAPIClient } from '@datastax/astra-db-ts';
import { openai } from '@ai-sdk/openai';
import OpenAI from 'openai';
import { streamText } from 'ai';
import pdf from 'pdf-parse';
import Tesseract from 'tesseract.js';

const { ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COllECTION,
  OPENAI_API_KEY } =
  process.env;


const aiClient = new OpenAI({ apiKey: OPENAI_API_KEY })
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

function isBase64Image(base64String) {
  return base64String.startsWith('data:image/');
}

async function extractTextFromImage(imageBuffer) {
  try {
    const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng');
    return text;
  } catch (error) {
    console.error('Error extracting text from image:', error);
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
      console.log('newData', newData);
      if (isBase64Image(data)) {
        console.log('isBase64Image', isBase64Image(data));
        fileContent = await extractTextFromImage(newData);
      } else {
        fileContent = await extractTextFromPDF(newData);
      }
    }

    console.log('1');

    const latestMessages = messages[messages.length - 1];
    const embedding = await aiClient.embeddings.create({
      model: "text-embedding-3-small",
      input: latestMessages.content,
      encoding_format: "float"
    });

    console.log('2');

    try {
      console.log('3');

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
      console.log('4');

      console.log('Error querying db', error);
    }

    const fileContentsArray: string[] = [];

    function addFileContent(newContent: string) {
      const content = `[fileStart${fileContentsArray.length+1}] ${newContent} [fileEnd${fileContentsArray.length+1}]`;
      fileContentsArray.push(content);
    }

    addFileContent(fileContent ? fileContent : newData ? newData.toString() : '');

    const allFileContents = fileContentsArray.join('\n');

    console.log('5');
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
        FILE CONTENT: ${allFileContents}
        ---------------
      `
    };

    console.log('6');
    const result = await streamText({
      model: openai('gpt-4o'),
      messages: [template, ...messages]
    });

    console.log('7');
    newData = '';
    return result.toDataStreamResponse();
  } catch (error) {
    console.log('8');
    console.error('Error:', error);
    docContext = '';
  }
}
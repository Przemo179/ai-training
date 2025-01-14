"use client";
import { useChat } from "ai/react";
import { Message } from "ai";
import Bubble from "./components/Bubble";
import LoadingBubble from "./components/LoadingBubble";
import PromptSuggestionRow from "./components/PromptSuggestionsRow";
import { useState } from "react";

const Home = () => {
  const [fileBase64, setFileBase64] = useState('');
  // const [filename, setFilename] = useState('');

  const handleFileChange = (e) => {
    const { type, files } = e.target;

    console.log('e', e);
    if (type === 'file' && files.length > 0) {
      const file = files[0];

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setFileBase64(reader.result.split(",")[1]);
          const modifiedEvent = { 
            ...e, 
            target: { 
              ...e.target, 
              value: file.name
            },
          };
          // setFilename(file.name);
          handleInputChange(modifiedEvent);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const { isLoading, messages, input, handleInputChange, handleSubmit } = useChat();

  const noMessages = !messages || messages.length === 0;

  return (
    <main>
      <section className={noMessages ? "" : "populated"}>
        { noMessages ? (
          <>
            <p>Star wars unlimited database with cards, etc.</p>
            <br/>
            <PromptSuggestionRow />
          </>
        ) : (
          <>
            {messages.map((message: Message, index: number) => {
              console.log('messages', messages)
              if (message) {
                const isBase64 = (str: string) => {
                  try {
                    return btoa(atob(str)) === str;
                  // eslint-disable-next-line
                  } catch (err) {
                    return false;
                  }
                };
            
                const extractFileName = (base64Str: string) => {
                  const matches = base64Str.match(/filename=([^;]*)/);
                  return matches ? matches[1] : 'unknown';
                };
            
                const contentIsBase64 = isBase64(message.content);
                const decodedContent = contentIsBase64 ? message.content + atob(message.content) + '. ' + extractFileName(message.content) : message.content;
                const file = extractFileName(message.content);

                console.log('file', file);
                console.log('contentIsBase64', contentIsBase64);
                console.log('decodedContent', decodedContent);
            
                return (
                  <Bubble key={`msg-${index}`} message={{ ...message }} content={decodedContent} />
                );
              }
            })}
            {isLoading && <LoadingBubble />}
          </>
        )}
      </section>
      <form onSubmit={(e) => handleSubmit(e, {data: fileBase64})}>
        <input className="question" onChange={(e) => {handleInputChange(e)}} value={input} placeholder="Ask me something..."/>
        <input type="file" onChange={handleFileChange} />
        <input type="submit" />
      </form>
    </main>
  )
}

export default Home;
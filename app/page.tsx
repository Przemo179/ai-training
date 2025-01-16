"use client";
import { useChat } from "ai/react";
import { Message } from "ai";
import Bubble from "./components/Bubble";
import LoadingBubble from "./components/LoadingBubble";
import PromptSuggestionRow from "./components/PromptSuggestionsRow";
import { useState, useRef } from "react";

const Home = () => {
  const [fileBase64, setFileBase64] = useState('');
  const [filesAdded, setFilesAdded] = useState([]);
  const [fileName, setFileName] = useState(null);
  const fileInputRef = useRef(null);
  // const [filename, setFilename] = useState('');

  const handleFileChange = (e) => {
    const { type, files } = e.target;

    console.log('e', e);
    if (type === 'file' && files.length > 0) {
      const file = files[0];
      const fileExtension = file.name.split('.').pop();
      const fileType = file.type

      setFileName(file.name);

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          if (fileExtension === 'png' || fileExtension === 'jpg' || fileExtension === 'jpeg') {
            const base64WithPrefix = `data:${fileType};base64,${reader.result.split(",")[1]}`;
            setFileBase64(base64WithPrefix);
          } else {
            setFileBase64(reader.result.split(",")[1]);
          }
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
      <form onSubmit={(e) => {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
            setFileName(null);
            if (fileName) {
              setFilesAdded([...filesAdded, fileName]);
            }
          }
        handleSubmit(e, {data: fileBase64})}
      }>
        <input className="question" onChange={(e) => {handleInputChange(e)}} value={input} placeholder="Ask me something..."/>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} />
        <input type="submit" />
      </form>
      <div>
        <h4>
          Attached files:
          <ul>
            {filesAdded.map((file, index) => (
              <li key={index}>{file}</li>
            ))}
          </ul>
        </h4>
      </div>
    </main>
  )
}

export default Home;
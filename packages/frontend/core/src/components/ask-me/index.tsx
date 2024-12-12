import { useState } from "react";
import AskMeButton from "./askme-button";
import AskMeConversation from "./askme-conversation";

function AskMe() {
  const [isVisible, setIsVisible] = useState<boolean>(false)
  return (
    <>
      <AskMeButton isVisible={isVisible} setIsVisible={setIsVisible}/>
      <AskMeConversation isVisible={isVisible}/>
    </>
  )
}

export default AskMe
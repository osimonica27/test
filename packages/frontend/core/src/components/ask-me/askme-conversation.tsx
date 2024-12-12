import * as style from "./styles.css"

function AskMeConversation({isVisible}: {isVisible:boolean}) {
  return (
    <div className={style.askMeConversationContainer} style={{right: isVisible?"":"-400px"}}>
      <iframe
        allow="microphone;"
        width="350"
        height="430"
        src="https://console.dialogflow.com/api-client/demo/embedded/19435599-920e-409d-a5dd-dfc839fa5b4d">
      </iframe>
    </div>
  )
}

export default AskMeConversation
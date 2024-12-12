import * as style from './styles.css';

function AskMeConversation({ isVisible }: { isVisible: boolean }) {
  return (
    <div
      className={style.askMeConversationContainer}
      style={{ right: isVisible ? '' : '-400px' }}
    >
      <iframe
        allow="microphone;"
        width="350"
        height="430"
        src="https://console.dialogflow.com/api-client/demo/embedded/bafbedf0-1c84-4302-aeb0-46b833239dc5"
      ></iframe>
    </div>
  );
}

export default AskMeConversation;

import { useCallback } from "react";
import * as styles from "./styles.css";

interface AskMeButtonProps {
  isVisible: boolean
  setIsVisible: React.Dispatch<React.SetStateAction<boolean>>
}

function AskMeButton({isVisible, setIsVisible}: AskMeButtonProps) {
  const clickHandler = useCallback(():void => {
    setIsVisible(prev => !prev)
  }, [])
  return (
    <>
      <button className={styles.askMeButtonView} onClick={clickHandler} style={{right: isVisible?"-400px":""}}>
        <div className={styles.askMeSvgContainer}>
          <svg className={styles.askMeSvgChatBot} viewBox="0 0 32 32" id="icon" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><defs><style></style></defs><title>chat-bot</title><path d="M16,19a6.9908,6.9908,0,0,1-5.833-3.1287l1.666-1.1074a5.0007,5.0007,0,0,0,8.334,0l1.666,1.1074A6.9908,6.9908,0,0,1,16,19Z"></path><path d="M20,8a2,2,0,1,0,2,2A1.9806,1.9806,0,0,0,20,8Z"></path><path d="M12,8a2,2,0,1,0,2,2A1.9806,1.9806,0,0,0,12,8Z"></path><path d="M17.7358,30,16,29l4-7h6a1.9966,1.9966,0,0,0,2-2V6a1.9966,1.9966,0,0,0-2-2H6A1.9966,1.9966,0,0,0,4,6V20a1.9966,1.9966,0,0,0,2,2h9v2H6a3.9993,3.9993,0,0,1-4-4V6A3.9988,3.9988,0,0,1,6,2H26a3.9988,3.9988,0,0,1,4,4V20a3.9993,3.9993,0,0,1-4,4H21.1646Z"></path><rect id="_Transparent_Rectangle_" data-name="<Transparent Rectangle>" className={styles.askMeSvgRect} width="32" height="32"></rect></g></svg>
        </div>
      </button>
      <button className={styles.askMeButtonView} onClick={clickHandler} style={{right: isVisible?"":"-400px"}}>
        <div className={styles.askMeSvgContainer}>
          <svg viewBox="0 0 16 16" fill="none" width="25" height="25" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M11 15H12L16 11L12 7H11V10H5C3.34315 10 2 8.65685 2 7C2 5.34315 3.34315 4 5 4H12V2H5C2.23858 2 0 4.23858 0 7C0 9.76142 2.23858 12 5 12H11V15Z" className={styles.askMeSvgRightDir}></path> </g></svg>
        </div>
      </button>
    </>
    
  )
}

export default AskMeButton
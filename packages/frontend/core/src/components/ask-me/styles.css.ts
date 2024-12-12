import { style } from '@vanilla-extract/css';

export const askMeButtonView = style({
  width: "44px",
  height: "44px",
  backgroundColor: "#1E1E1E",
  borderRadius: "99999px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  position: "absolute",
  bottom: "77px",
  right: "17px",
  borderWidth: "1px",
  borderColor: "#2E2E2E",
  borderStyle: "solid",
  transition: "right 0.2s ease",
  ":hover": {
    "backgroundColor": "hsla(0,0%,100%,.1)"
  }
})

export const askMeSvgContainer = style({
  width: "30px",
  height: "30px",
  position: "relative",
  top: "2px",
  minWidth: "30px",
})

export const askMeSvgRect = style({
  fill: "none"
})

export const askMeSvgChatBot = style({
  fill: "#77757D"
})

export const askMeSvgRightDir = style({
  fill: "#77757D",
})

export const askMeConversationContainer = style({
  position: "absolute",
  bottom: "128px",
  right: "17px",
  transition: "all 0.2s ease"
})
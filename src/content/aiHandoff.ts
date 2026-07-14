const openPreferredAi = (nextSteps: string) => `Click Copy prompt. Open your preferred AI, ${nextSteps}`

export const AI_HANDOFF_COPY = {
  sendUnchanged: openPreferredAi('start a new conversation, paste the prompt, and send it unchanged.'),
  followQuestions: openPreferredAi('start a new conversation, paste the prompt, and follow any questions it asks.'),
  attachCv: openPreferredAi('paste the prompt, and attach your CV file. If file attachments are unavailable, paste the full CV text after the prompt.'),
} as const

import type { ChatMessage, Participant } from "./types";

export const REMOTE_PARTICIPANTS: Participant[] = [
  {
    id: "sarah",
    name: "Sarah Chen",
    isHost: false,
    isMuted: false,
    isCameraOff: false,
    isSpeaking: false,
    accentClassName: "from-sky-500/25 via-sky-500/10 to-background",
    status: "Product review",
  },
  {
    id: "mike",
    name: "Mike Johnson",
    isHost: false,
    isMuted: true,
    isCameraOff: false,
    isSpeaking: false,
    accentClassName: "from-amber-500/25 via-orange-500/10 to-background",
    status: "Listening",
  },
  {
    id: "emily",
    name: "Emily Davis",
    isHost: false,
    isMuted: false,
    isCameraOff: true,
    isSpeaking: false,
    accentClassName: "from-emerald-500/25 via-emerald-500/10 to-background",
    status: "Taking notes",
  },
  {
    id: "alex",
    name: "Alex Turner",
    isHost: false,
    isMuted: false,
    isCameraOff: false,
    isSpeaking: false,
    accentClassName: "from-fuchsia-500/25 via-rose-500/10 to-background",
    status: "Ready",
  },
];

export const CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    name: "Sarah Chen",
    time: "9:45 AM",
    message: "Slides look great. We can move to the rollout plan after this section.",
  },
  {
    id: "2",
    name: "Mike Johnson",
    time: "9:46 AM",
    message: "Please drop the final deck in chat when you're done presenting.",
  },
];

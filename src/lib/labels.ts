import type { Doc } from "../../convex/_generated/dataModel";

export const OUTCOME_LABEL: Record<Doc<"calls">["outcome"], string> = {
  no_answer: "No answer",
  voicemail: "Voicemail",
  front_desk: "Front desk",
  callback: "Call back",
  not_now: "Not right now",
  not_interested: "Not interested",
  booked: "Booked",
  do_not_call: "Do not call",
  bad_number: "Bad number",
};

export const STATUS_LABEL: Record<Doc<"prospects">["callStatus"], string> = {
  new: "Not called",
  calling: "Calling",
  callback: "Callback set",
  booked: "Booked",
  not_interested: "Not interested",
  do_not_call: "Do not call",
  bad_number: "Bad number",
  no_contact: "Couldn't reach",
  won: "Client",
};

export const MEETING_STATUS_LABEL: Record<Doc<"meetings">["status"], string> = {
  scheduled: "Scheduled",
  held: "Held",
  no_show: "No-show",
  rescheduled: "Rescheduled",
  canceled: "Canceled",
  won: "Won",
};

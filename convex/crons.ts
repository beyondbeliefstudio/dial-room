import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Call audio is kept about 30 days for reviews, then deleted. Transcripts and reviews stay.
crons.daily("delete old call audio", { hourUTC: 8, minuteUTC: 0 }, internal.reviews.cleanup, {});

export default crons;

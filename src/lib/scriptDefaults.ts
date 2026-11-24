// The built-in scripts. Edits made on the Scripts tab are saved in the database and override these;
// "Reset to default" brings these back.

export type ScriptCategory = "call" | "objection" | "facebook" | "email" | "meeting" | "other";

export type ScriptDef = {
  key: string;
  category: ScriptCategory;
  title: string;
  subject?: string; // emails and invites
  body: string; // the script; ARA for objections
  body2?: string; // ACE for objections
  note?: string; // shown beside the script where it's used
  order: number;
  custom?: boolean; // added on the Scripts tab, not built in
};

export const CATEGORY_LABELS: Record<ScriptCategory, string> = {
  call: "Calls",
  objection: "Objections",
  facebook: "Facebook",
  email: "Email",
  meeting: "Meetings",
  other: "Other",
};

export const DEFAULT_SCRIPTS: ScriptDef[] = [
  // ---------- Calls ----------
  {
    key: "call.followup",
    category: "call",
    order: 1,
    title: "Script 1 · Follow-up call",
    note: "They already got a message from you. Who you are, why you're calling, then the meeting ask.",
    body: `Hey {name}, this is Chris calling from Beyond Belief Web Design, how's it going?

(Downward inflection. Wait for their answer.)

{if:site} Good! I'm a web designer {monroe}, and I reached out by {channel} {since}. I help local businesses like yours get more calls from Google and AI search engines, and I had a few ideas for redesigning your homepage.
{if:!site} Good! I'm a web designer {monroe}, and I reached out by {channel} {since}. I help local businesses like yours get more calls from Google and AI search engines, and I had a few ideas for a homepage for {business}.

(Pause a beat. Let it land.)

I know I'm calling you out of the blue. I'm just trying to find some time to show you {homepage}, and how it could bring in more business and help you stand out against your competitors. Does {window} work best for you?`,
  },
  {
    key: "call.cold",
    category: "call",
    order: 2,
    title: "Script 2 · Cold call",
    note: "No earlier message. Who you are, why you're calling, then the meeting ask.",
    body: `Hey {name}, this is Chris calling from Beyond Belief Web Design, how's it going?

(Downward inflection. Wait for their answer.)

{if:site} Good! I'm a web designer {monroe}, and I help local businesses like yours get more calls from Google and AI search engines. I had a few ideas for redesigning your homepage.
{if:!site} Good! I'm a web designer {monroe}, and I help local businesses like yours get more calls from Google and AI search engines. I had a few ideas for a homepage for {business}.

(Pause a beat. Let it land.)

I know I'm calling you out of the blue. I'm just trying to find some time to show you {homepage}, and how it could bring in more business and help you stand out against your competitors. Does {window} work best for you?`,
  },
  {
    key: "call.frontdesk",
    category: "call",
    order: 3,
    title: "Front desk",
    body: `Hey, this is Chris with Beyond Belief Web Design. Is {owner} around?

[What's it regarding?] I'm a local web designer {monroeShort}. I've got some ideas for {newHomepage} for {business} and wanted to set up a quick call to show them. Are you the one who handles the website, or is that them?

[Owner's not in] No problem. When's usually the best time to catch them?

(Log Front desk and set the callback to the time they gave you. Ask for their name too.)`,
  },
  {
    key: "call.voicemail",
    category: "call",
    order: 4,
    title: "Voicemail",
    body: `Hey {name}, it's Chris with Beyond Belief Web Design {monroeShort}. I've got some ideas for {newHomepage} for {business} and how it could bring you more business, and I'd love to show you on a quick 15-minute call. You can reach me at 980-290-7034. Again, that's Chris, 980-290-7034. Talk soon.

(Under 20 seconds. Say the number slowly both times.)`,
  },
  {
    key: "call.prep",
    category: "call",
    order: 5,
    title: "Pre-meeting prep call",
    note: "For booked meetings where they haven't accepted the invite yet.",
    body: `Hey {name}, it's Chris with Beyond Belief. I was getting your homepage ready for {when} and realized I forgot to ask you two quick things that'll make it more useful.

First, what's the one service you'd want more calls for right now?

And when new customers find you today, is it mostly Google, referrals, or Facebook?

Perfect, that helps a lot. I'll work that in and talk to you {when}.

(Actually use their answers to tweak the homepage before the meeting.)`,
  },

  // ---------- Objections ----------
  {
    key: "objection.who-is-this",
    category: "objection",
    order: -1,
    title: "Who is this?",
    body: `{if:contacted} It's Chris, with Beyond Belief Web Design {monroeShort}. I reached out by {channel} {since} about {business}, so I figured I'd put a voice to it. I'm a web designer, and I help local businesses like yours get more calls from Google and AI search like ChatGPT. I had a few ideas for your homepage. Can I take 30 seconds to tell you what they are?
{if:!contacted} It's Chris, with Beyond Belief Web Design {monroeShort}. We haven't talked before, so I'll be honest with you, this is a cold call. I'm a web designer, and I help local businesses like yours get more calls from Google and AI search like ChatGPT. I had a few ideas for your homepage. Can I take 30 seconds to tell you why I'm calling, and you tell me if it's worth another minute?`,
    body2: "Totally fair question. I found {business} on Google, and I only reach out to a handful of local businesses I think I can actually help. I'm not trying to sell you anything over the phone. I just want to find 15 minutes to show you {homepage}, and how it could bring in more business and help you stand out against your competitors. Does {window} work best for you?",
    note: "Usually they just didn't catch your name, so they're not annoyed. Say it slower and warmer than the first time, own that it's a cold call, and don't apologize for calling. If they ask how you got their number, it's the ACE side: you found them on Google.",
  },
  {
    key: "objection.bad-time",
    category: "objection",
    order: 0,
    title: "Bad time / I'm on a job",
    body: "No problem at all, sounds like I caught you in the middle of something. I'll get out of your hair. When's better for a quick 2-minute call, end of the day today or first thing tomorrow morning?",
    body2: "Totally. Is earlier or later in the day usually better for you? I just want to catch you when you're not up on a roof or under a sink.",
    note: "Don't pitch. Get a specific time, repeat it back (\"Perfect, I'll call you at 4:30\"), then hit Call back (C) and set it.",
  },
  {
    key: "objection.send",
    category: "objection",
    order: 1,
    title: "Just send it over",
    body: "Yeah, I can definitely do that. The reason I'd rather show you live is the homepage is only half of it. The other half is how it's set up to get your phone ringing, and that doesn't really come across in a video. It's 15 minutes. Does {day1Ask} work, or is {day2} better?",
    body2: "Totally, I'll send it. Quick question so I send the right thing: when you look at it, what would make it worth a conversation for you? More calls, looking more professional, something else? The reason I ask is most owners care about one of those a lot more than the other, and I'd rather focus the homepage on the parts that matter to you than send something generic.",
    note: "If they insist, send a couple of sites you've built, then: \"If those land, can we grab 15 minutes on {day2} so I can show you what yours could look like?\"",
  },
  {
    key: "objection.have-site",
    category: "objection",
    order: 2,
    title: "Already have a site / a guy",
    body: "Got it, that makes sense. This wouldn't be about ripping anything out today. It's really just showing you a different take on your homepage so you've got something to compare against. 15 minutes, {day1} or {day2}?",
    body2: "Got it. Is the site bringing in the kind of calls you want right now, or is it more of an online business card? The reason I ask is a lot of sites I see look fine but don't really get the phone ringing, and that usually comes down to how the homepage is laid out and how it shows up on Google. If yours is already doing that, I'll tell you.",
  },
  {
    key: "objection.referrals",
    category: "objection",
    order: 3,
    title: "Word of mouth",
    body: "That makes sense, and honestly that's the best kind of business. This wouldn't be about replacing that. A lot of referrals look you up before they call, so it's more about making sure your site backs up what people are saying about you. 15 minutes on {day2}?",
    body2: "Love that. When someone gets your name from a friend, what do you think they do before they call? Google you, check Facebook? The reason I ask is that's usually where the website either seals it or makes them second-guess, and that's a lot of what I'd build the homepage around.",
  },
  {
    key: "objection.busy",
    category: "objection",
    order: 4,
    title: "Slammed right now",
    body: "Totally get it, sounds like business is good. That's why I'd keep it to 15 minutes with no prep on your end. Would before your day starts or after you wrap up be easier, {day1} or {day2}?",
    body2: "Is it busy right now because of the season, or is that pretty much year-round for you? I only ask because if you've got a slower stretch coming, that's usually the best time to get a new site live so it's already working when things pick back up.",
  },
  {
    key: "objection.cost",
    category: "objection",
    order: 5,
    title: "What's it cost / no budget",
    body: "Fair question. It's a monthly plan with no big upfront cost, starting at $149 a month. But honestly, I'd rather show you what the homepage could look like first, and you decide if it's even worth talking numbers. 15 minutes on {day2}?",
    body2: "Totally fair. Roughly what are you paying for the current site right now, between hosting and whoever updates it? The reason I ask is a lot of owners are already paying something every month and not getting much back for it, so sometimes it's less about new budget and more about where that money's going.",
    note: "Give the starting price straight. Save Essentials vs. Professional for the meeting.",
  },
  {
    key: "objection.not-interested",
    category: "objection",
    order: 6,
    title: "Not interested",
    body: "Totally fair, I did call out of the blue. Just to be clear, I'm not asking you to buy anything on the phone. It's really just 15 minutes to show you what a homepage redesign could look like for you. If it's not for you, no hard feelings. {day1} or {day2}?",
    body2: "Fair enough. Is that more \"not interested in a new website, period,\" or more \"not right now\"? I only ask because those are pretty different. If it's just not a priority, I'll leave you alone. If it's timing, I'm happy to check back when it makes more sense.",
  },

  {
    key: "objection.different",
    category: "objection",
    order: 7,
    title: "Why you? / Everyone does websites",
    body: "Fair question, there are a lot of options. I'm not the kind of agency that builds a site and disappears. It's a partnership: I handle the hosting, the updates, and the changes, so you never have to think about your website again. On top of that there's no big upfront bill, you own the whole thing, and I only work with one {tradeOne} per county. Easier to show you than tell you though. 15 minutes, {day1} or {day2}?",
    body2: "Totally fair. Have you worked with a web company before? The reason I ask is most owners I talk to got burned somewhere along the way: a big bill up front, a template site, or someone who won't hand over the keys. If I know what went wrong last time, I can tell you straight whether I'm actually any different.",
    note: "This is where the differentiators live now. Pick the one or two that answer their worry, not the whole list.",
  },

  {
    key: "objection.ai",
    category: "objection",
    order: 8,
    title: "Why does AI matter? / My customers just call me",
    body: "Fair question. More and more people are asking ChatGPT or Gemini things like \"who's a good {tradeOne} near me\" instead of scrolling through Google. Those tools pull their answer from your website, your Google listing, and your reviews. If your site doesn't clearly say what you do and where, they recommend somebody else. That's a big part of what I'd show you on the homepage. 15 minutes, {day1} or {day2}?",
    body2: "Have you ever asked ChatGPT for a {tradeOne} in {town}? The reason I ask is it's a quick way to see if you show up. If you're not in that answer, it's usually because your site and Google listing aren't giving it enough to go on, and that part's very fixable.",
    note: "Say \"more and more people,\" never \"more than Google.\" If they ask how it works: clear service and town pages, structured data on the site, a strong Google Business Profile, and reviews. Those are what AI tools read.",
  },
  {
    key: "objection.no-video",
    category: "objection",
    order: 9,
    title: "Can we just do a phone call? / I don't do video",
    body: "Totally fine, you don't need to be on camera at all. It's just a link that opens right on your phone, nothing to download, and you watch me scroll through the homepage while we talk. 15 minutes, still good for {day1} or {day2}?",
    body2: "No problem. Would it be easier to look at it on your phone or a computer? I only ask because the homepage is something you really have to see, so I'd rather set it up however's easiest for you.",
    note: "Send a Google Meet link and say \"no download, no camera needed.\" If they still push back: \"I'll just call you at that time and text you the link while we're talking.\"",
  },

  {
    key: "objection.google-listing",
    category: "objection",
    order: 10,
    title: "We get calls from Google Maps / Google listing",
    body: `{if:rating} That's great, the map listing is where a lot of local calls come from. The thing is, Google ranks that listing partly off your website, so the two work together. I also set up and optimize Google Business Profiles as part of what I do, to get you higher in that top three on the map. Let me show you both. 15 minutes, {day1} or {day2}?
{if:!rating} Funny you mention Google. When I looked, I couldn't find a Google listing for you, so people searching for a {tradeOne} nearby can't call you from the map. Setting that up and optimizing it is one of the first things I do, along with the homepage. 15 minutes, {day1} or {day2}?`,
    body2: "When someone searches \"{tradeOne} near me\" around {town}, do you know where you land in that top three on the map? The reason I ask is most of the calls go to those three spots, and it usually comes down to a complete profile, steady reviews, and a website that backs it up. If you're already up there, I'll tell you.",
    note: "Check their Google listing before the call. Their rating and review count are on the left. Before the meeting, search their trade and town on Google Maps and screenshot where they land.",
  },

  // ---------- Facebook ----------
  // Connor's Who > Why > What, kept short for Messenger.
  {
    key: "facebook.first",
    category: "facebook",
    order: 1,
    title: "First message",
    note: "Use \"Hey!\" instead of \"Hey man\" if a woman runs the page. If you spot one specific thing on their site, swap it into the middle line. No links in the first message.",
    body: `{if:!contacted} Hey man, {greeting}! I'm Chris, a web designer {where}. Not an overseas agency or one of those AI website things, just a local guy.
{if:contacted} Hey man, I sent you a note by {channel} {since} but figured it might have gotten buried.

{if:site} I build websites for local businesses like {business} that show up on Google and get the phone ringing. I took a look at your site and had a few ideas for how the homepage could bring in more calls.
{if:!site} I build websites for local businesses like {business} that show up on Google and get the phone ringing. I noticed you don't have a website yet, and that's probably sending some calls to competitors who do.

Why don't we hop on a quick call {window}, and let me show you {newHomepage}: what that could look like for you guys, and how it could bring in more business? No strings attached.`,
  },
  {
    key: "facebook.followup",
    category: "facebook",
    order: 2,
    title: "Follow-up",
    note: "For prospects with no email. Goes out the day after your call attempt, in the same Messenger conversation.",
    body: "Hey, just bumping this in case it got buried. Still happy to hop on a quick call and show you {newHomepage} for you guys. Got 15 minutes {window}? No pressure either way.",
  },

  // ---------- Email: Connor Murray's cold email sequence ----------
  // One first email (Framework 1, Who > Why > What), then three follow-ups in the same thread.
  {
    key: "email.first",
    category: "email",
    order: 1,
    title: "First email",
    subject: "{if:name} {name} // Chris | Intro\n{if:!name} {business} | More calls from Google",
    note: "Connor's Framework 1. Subject uses his name // name pattern when you know the owner, otherwise company | priority. Also the next touch for anyone you've only messaged on Facebook. Tomorrow they're on your call list.",
    body: `{if:name} Good morning {name},
{if:!name} Good morning,

I'm reaching out from Beyond Belief Web Design {monroeShort}, where I work with local businesses a lot like yours, across the Charlotte area and beyond.

{if:contacted} I also reached out by {channel} {since}, in case that got buried.

{if:site} Beyond Belief is a custom web design studio that helps local businesses show up on Google in the towns they serve, look like the established name in their market, and make calling or requesting a quote easy from a phone, to bring in more calls and quote requests every month.
{if:!site} Beyond Belief is a custom web design studio that helps local businesses get a website up with no money down, show up when people nearby search for what they do, and make calling or requesting a quote easy from a phone, so more of the people already looking for a {tradeOne} find you first.

Unlike most agencies, there's no big upfront bill, you work with me directly, and you own your site and everything on it.

I'm looking to set time to briefly introduce myself, show you {homepage}, and walk through how it can bring you more business. What does your availability look like next week?

Thanks in advance,
{sig}

P.S. If this isn't a fit, just reply and let me know and I won't reach out again.`,
  },
  {
    key: "email.f1",
    category: "email",
    order: 2,
    title: "Follow-up 1 · Value add",
    note: "The day after your first call attempt, in the same thread. Three use cases, no fake proof.",
    body: `{if:name} Hi {name},
{if:!name} Hi,

To give you a better idea, Beyond Belief works with local businesses like yours to bring in more calls from Google and turn more of their site visitors into booked jobs.

What makes my approach different is that every site is hand-coded from scratch with no templates or page builders, there's no big upfront bill, and you own your domain and everything on it. I also only take on one {tradeOne} per county, so I'm never building for your competition.

I focus on three core use cases:

- Showing up locally: service and town pages built so you show up when people in {area} search for what you do
{if:site} - More calls from the homepage: a fast, mobile-first layout that makes calling or requesting a quote the obvious next step
{if:!site} - Calls from a phone: one tap to call or request a quote, with your services, service area, and hours right up front
- Hands-off upkeep: hosting, maintenance, and unlimited content changes included, so the site never sits outdated

Let me know if any of these are a focus for you, and I'll send over an invite to walk you through {homepage}.

Thanks,
{sig}`,
  },
  {
    key: "email.f2",
    category: "email",
    order: 3,
    title: "Follow-up 2 · Direct request",
    note: "The day after your second call attempt, in the same thread. Short on purpose, no new pitch.",
    body: `{if:name} Hi {name},
{if:!name} Hi,

Please let me know your thoughts on a quick walkthrough when you have a moment.

Thanks,
{sig}`,
  },
  {
    key: "email.f3",
    category: "email",
    order: 4,
    title: "Follow-up 3 · Close the loop",
    note: "The day after your third call attempt, in the same thread. Last email. No guilt, no fake deadline.",
    body: `{if:name} Hi {name},
{if:!name} Hi,

I'm planning the next couple of weeks and wanted to close the loop either way. Does a quick walkthrough of the homepage make sense now, or would {laterMonth} be better?

Thanks,
{sig}`,
  },

  // ---------- Reference ----------
  {
    key: "other.playbook",
    category: "other",
    order: 1,
    title: "Outreach playbook",
    note: "How every channel works. Read before editing the scripts.",
    body: `THE GOAL
Every call, email, and Facebook message asks for one thing: "Why don't we hop on a call, and let me show you a homepage redesign: what that could look like for your business, how it could bring you more business, and how it helps you stand out against your competitors?" Never say it's already built. Build it after they say yes, before the meeting.

WHAT MAKES YOU DIFFERENT (use one or two, never the whole list)
A partnership, not a hand-off: you handle the site for them, so they never have to worry about it again.
No big upfront bill: one monthly plan, where most agencies charge thousands up front.
Hand-coded from scratch: no templates, page builders, or one-click AI sites.
You own everything: domain, site, and accounts. No platform lock-in, nothing held hostage.
Unlimited changes, hosting, and maintenance included: they never wait on a developer or pay per edit.
One company per industry per county: you never build for their competition.
They deal with you directly: a local guy in Monroe, not an account manager or an overseas team.
They see the homepage before committing to anything.

THE FRAMEWORK: WHO, WHY, WHAT
Who: you, Beyond Belief, Monroe, local businesses like theirs. One sentence.
Why: what they care about. More calls from Google, looking like the established name, a site they own with no money down.
What: a direct ask for the meeting with a day. Never "Would you be open to" or "Thoughts?"

THE ABAB CADENCE
Every prospect alternates writing and calling, one business day apart:
Day 1 first email, day 2 call, day 3 follow-up 1, day 4 call, day 5 follow-up 2, day 6 call, day 7 follow-up 3. Then stop.
After an email, you call before anything else goes out. The Today page won't show the next email until you've tried calling.
Only messaged on Facebook so far? Email them next, then call.
No email on file: Facebook takes the email slots (first message, one follow-up). No email or Facebook: calls only.
Mornings: send the follow-ups and today's new prospects. Afternoons (or whenever you have an hour): work the call list.
Two lists, A and B, happen on their own: whoever you emailed yesterday is today's call list, and whoever you called yesterday gets today's email.
No reply after the round: they rest about 5 weeks, then come back for a new round automatically.
Stop the moment they reply or book. Honor every opt-out.

CHEAT SHEET
Relevance beats trivia: their trade, their town, their site. Skip "saw your post" openers.
Never claim results, clients, or work you can't back up.
Email: plain text, no images, no links in the first email, steady volume.
Facebook: no links in the first message.
Metrics: replies, positive replies, meetings set, meetings held. Opens are noisy, ignore them. Change one thing at a time.
After a yes: reply fast, build the homepage, and send an invite with an agenda.`,
  },

  // ---------- Meetings ----------
  {
    key: "meeting.invite",
    category: "meeting",
    order: 1,
    title: "Calendar invite",
    subject: "Beyond Belief + {business} | Your new homepage",
    body: `{if:name} Hey {name}, looking forward to it. Here's what we'll cover:
{if:!name} Hey, looking forward to it. Here's what we'll cover:

1. A walkthrough of {newHomepage} for {business}
{if:site} 2. How it's set up to bring in more calls and quote requests from {area}
{if:!site} 2. What having a real site would do for your calls from Google
3. Whether it makes sense to keep talking. No pressure either way.

Chris Nervegna
Beyond Belief Web Design
(980) 290-7034`,
  },
];

export type Library = {
  byKey: Map<string, ScriptDef>;
  list: (category: ScriptCategory) => ScriptDef[];
  get: (key: string) => ScriptDef;
};

/** Built-ins, with saved edits on top, plus any custom scripts. */
export function makeLibrary(saved: ScriptDef[] = []): Library {
  const byKey = new Map<string, ScriptDef>();
  for (const s of DEFAULT_SCRIPTS) byKey.set(s.key, s);
  // Saved edits to built-in scripts that no longer exist are ignored; custom scripts always show.
  for (const s of saved) if (s.custom || byKey.has(s.key)) byKey.set(s.key, { ...(byKey.get(s.key) ?? {}), ...s });
  return {
    byKey,
    list: (category) =>
      [...byKey.values()]
        .filter((s) => s.category === category)
        .sort((a, b) => Number(!!a.custom) - Number(!!b.custom) || a.order - b.order || a.title.localeCompare(b.title)),
    get: (key) => byKey.get(key) ?? DEFAULT_SCRIPTS.find((s) => s.key === key)!,
  };
}

export const DEFAULT_LIBRARY = makeLibrary();

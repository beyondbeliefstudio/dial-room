// The built-in scripts. Edits made on the Scripts tab are saved in the database and override these;
// "Reset to default" brings these back.

export type ScriptCategory = "call" | "objection" | "facebook" | "email" | "meeting" | "other";

export type ScriptDef = {
  key: string;
  category: ScriptCategory;
  title: string;
  short?: string; // button label on the call screen (objections)
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
    note: "Connor's Who, Why, What. They already got a message from you. Straight from the greeting to why you're calling, then an assumptive ask for time.",
    body: `Hey {name}, this is Chris calling from Beyond Belief Web Design, how's it going?

(Downward inflection. Wait for their answer.)

Good! I'm reaching out because I sent you a note by {channel} {since}. I'm a web designer {monroe} that works with local businesses like yours across the Charlotte area.

So I focus on things like custom website design and handling the whole website for you, things like that, usually by helping local businesses look like the most trusted name in their area, never have to worry about their website, and bring in more calls.

(Pause a beat. Let it land.)

And I know I kind of called you out of the blue here too, so I was actually more looking to set some time aside, just to show you {homepage}, and how it could bring in more business and help you stand out against your competitors. What's your calendar like {day1} or {day2}?`,
  },
  {
    key: "call.cold",
    category: "call",
    order: 2,
    title: "Script 2 · Cold call",
    note: "Connor's Who, Why, What. No earlier message. Straight from the greeting to why you're calling, then an assumptive ask for time.",
    body: `Hey {name}, this is Chris calling from Beyond Belief Web Design, how's it going?

(Downward inflection. Wait for their answer.)

Good! I'm reaching out because I'm a web designer {monroe} that works with local businesses like yours across the Charlotte area.

So I focus on things like custom website design and handling the whole website for you, things like that, usually by helping local businesses look like the most trusted name in their area, never have to worry about their website, and bring in more calls.

(Pause a beat. Let it land.)

And I know I kind of called you out of the blue here too, so I was actually more looking to set some time aside, just to show you {homepage}, and how it could bring in more business and help you stand out against your competitors. What's your calendar like {day1} or {day2}?`,
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
    body: `Hey {name}, it's Chris with Beyond Belief Web Design {monroeShort}. I've got some ideas for {newHomepage} for {business}, to help you stand out against your competitors and bring in more business. I'd love to show you on a quick 15-minute call. You can reach me at 980-290-7034. Again, that's Chris, 980-290-7034. Talk soon.

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
    short: "Who is this?",
    order: -1,
    title: "Who is this?",
    body: `{if:contacted} It's Chris, with Beyond Belief Web Design {monroeShort}. I sent you a note by {channel} {since}. I'm a web designer, and I work with local businesses like yours on custom websites and handling the whole site for them, so they look like the most trusted name in their area. I was actually looking to set some time aside to show you {homepage}. What's your calendar like {day1} or {day2}?
{if:!contacted} It's Chris, with Beyond Belief Web Design {monroeShort}. I'm a web designer, and I work with local businesses like yours on custom websites and handling the whole site for them, so they look like the most trusted name in their area. I was actually looking to set some time aside to show you {homepage}. What's your calendar like {day1} or {day2}?`,
    body2: "Totally fair question. I found {business} on Google, and I only reach out to a handful of local businesses I think I can actually help. I'm not trying to sell you anything over the phone. I was more looking to set 15 minutes aside to show you {homepage}, and how it could bring in more business and help you stand out against your competitors. What's your calendar like {day1} or {day2}?",
    note: "Usually they just didn't catch your name, so they're not annoyed. Say it slower and warmer than the first time, run Who, Why, What again in short, and end on the calendar. No apologizing, no asking for 30 seconds. If they ask how you got their number, it's the ACE side: you found them on Google.",
  },
  {
    key: "objection.bad-time",
    category: "objection",
    short: "Bad time",
    order: 0,
    title: "Bad time / I'm on a job",
    body: "No problem at all, sounds like I caught you in the middle of something. I'll get out of your hair. When's better for a quick 2-minute call, end of the day today or first thing tomorrow morning?",
    body2: "Totally. Is earlier or later in the day usually better for you? I just want to catch you when you're not up on a roof or under a sink.",
    note: "Don't pitch. Get a specific time, repeat it back (\"Perfect, I'll call you at 4:30\"), then hit Call back (C) and set it.",
  },
  {
    key: "objection.calls-all-time",
    category: "objection",
    short: "Get these calls a lot",
    order: 0.5,
    title: "We get these calls all the time / Is this a sales call?",
    body: "I bet you do, and most of them are from out of state or overseas. I'm actually {monroe}. I'm not asking you to sign up for anything, I just want to show you {homepage}. If you'd rather not do it over the phone, I can bring my laptop by your shop or wherever you'll be {day1} morning and show you in person. What's your calendar like {day1} or {day2}?",
    body2: "Totally fair. Are most of those calls trying to get you to buy a package right there on the phone? The reason I ask is that's not what this is. I just want to show you what I'd do with your homepage. No money, no commitment, and if you don't like it, we shake hands and move on. I'm local, and I like working with the people I build for directly, not through an account manager.",
    note: "Lean on being local. Offer to come by in person when they're close enough to drive to; for far counties, keep it to a screen share.",
  },
  {
    key: "objection.whats-wrong",
    category: "objection",
    short: "What's wrong with it?",
    order: 0.7,
    title: "What's wrong with my website? / Name one thing",
    body: "Fair question. One thing that jumped out when I looked: {angle}. But honestly, that's not really why I'm calling. Even with that fixed, I don't think your site is the most trusted, best-looking one in your market yet, not next to your competitors. That's what I'd build for you, and it's a lot easier to show you than list it all over the phone. What's your calendar like {day1} or {day2}?",
    body2: "Totally fair. When you pull up your site next to your competitors', which one would you call first? The reason I ask is that's really the test. Most people call whoever looks the most established and trustworthy, and that's exactly what I'd show you on the homepage.",
    note: "The highlighted part is your research from \"Your angle\" on the left. Say it in your own words, one thing only, and don't critique the whole site: the rest is for the meeting. Then pivot: this isn't about fixing problems, it's about being the most trusted, best-looking site in their market.",
  },
  {
    key: "objection.send",
    category: "objection",
    short: "Just send it",
    order: 1,
    title: "Just send it over",
    body: "Yeah, I can definitely do that. The reason I'd rather show you live is the homepage is only half of it. The other half is why it's designed the way it is, and that doesn't really come across in an email. It's 15 minutes. What's your calendar like {day1} or {day2}?",
    body2: "Totally, I'll send it. Quick question so I send the right thing: when you look at it, what would make it worth a conversation for you? More calls, looking more professional, something else? The reason I ask is most owners care about one of those a lot more than the other, and I'd rather focus the homepage on the parts that matter to you than send something generic.",
    note: "If they insist, send a couple of sites you've built, then: \"If those land, let's grab 15 minutes on {day2} so I can show you what yours could look like.\"",
  },
  {
    key: "objection.have-site",
    category: "objection",
    short: "Have a site",
    order: 2,
    title: "Already have a site / a guy",
    body: "Got it, that makes sense. This wouldn't be about ripping anything out today. It's really just showing you a different take on your homepage, so you've got something to compare against. What's your calendar like {day1} or {day2}?",
    body2: "Got it. Is the site bringing in the kind of calls you want right now, or is it more of an online business card? The reason I ask is a lot of sites I see show up fine, but they look like every other {tradeOne} out there, so people don't have a reason to pick them. That usually comes down to the design and how the homepage is laid out. If yours is already doing that, I'll tell you.",
  },
  {
    key: "objection.referrals",
    category: "objection",
    short: "Word of mouth",
    order: 3,
    title: "Word of mouth",
    body: "That makes sense, and honestly that's the best kind of business. This wouldn't be about replacing that. A lot of referrals look you up before they call, so it's really just showing you a homepage that backs up what people are saying about you. What's your calendar like {day1} or {day2}?",
    body2: "Love that. When someone gets your name from a friend, what do you think they do before they call? Google you, check Facebook? The reason I ask is that's usually where the website either seals it or makes them second-guess, and that's a lot of what I'd build the homepage around.",
  },
  {
    key: "objection.busy",
    category: "objection",
    short: "Slammed",
    order: 4,
    title: "Slammed right now",
    body: "Totally get it, sounds like business is good. Honestly, that's what I hear from most owners: they know the website needs work, they just don't have the time for it. That's the whole idea, I handle all of it. It's 15 minutes with no prep on your end, before your day starts or after you wrap up. What's your calendar like {day1} or {day2}?",
    body2: "Is it busy right now because of the season, or is that pretty much year-round for you? I only ask because if you've got a slower stretch coming, that's usually the best time to get a new site live so it's already working when things pick back up.",
  },
  {
    key: "objection.cost",
    category: "objection",
    short: "What's it cost?",
    order: 5,
    title: "What's it cost / no budget",
    body: "Got it, makes sense. This wouldn't be a pricing conversation right now. It's a monthly plan with no big upfront cost, and I'll walk you through all of it once you've seen the homepage and know if it's even worth talking numbers. What's your calendar like {day1} or {day2}?",
    body2: "Totally fair. Roughly what are you paying for the current site right now, between hosting and whoever updates it? The reason I ask is a lot of owners are already paying something every month and not getting much back for it, so sometimes it's less about new budget and more about where that money's going.",
    note: "Don't quote numbers on a cold call. If they press a second time: \"It starts at $149 a month, and I'll show you exactly what's included.\" Then straight back to the calendar.",
  },
  {
    key: "objection.not-interested",
    category: "objection",
    short: "Not interested",
    order: 6,
    title: "Not interested",
    body: "Totally fair, I did call out of the blue. I'm not asking you to buy or sign up for anything. It's really just 15 minutes to show you {homepage}. No money and no commitment on your end, and if you don't like it, we shake hands and move on. What's your calendar like {day1} or {day2}?",
    body2: "Fair enough. Is that more \"not interested in a new website, period,\" or more \"not right now\"? I only ask because those are pretty different. If it's just not a priority, I'll leave you alone. If it's timing, I'm happy to check back when it makes more sense.",
  },

  {
    key: "objection.different",
    category: "objection",
    short: "Why you?",
    order: 7,
    title: "Why you? / Everyone does websites",
    body: "Got it, fair question, there are a lot of options. The short version is every site is designed from scratch around your brand, and I handle everything after launch, so you never have to touch it. That's a lot easier to show you than tell you. What's your calendar like {day1} or {day2}?",
    body2: "Totally fair. Have you worked with a web company before? The reason I ask is most owners I talk to got burned somewhere along the way: a big bill up front, a template site, or someone who won't hand over the keys. If I know what went wrong last time, I can tell you straight whether I'm actually any different.",
    note: "Don't list everything here. Hand-coding, no upfront bill, owning everything, one company per county: that's all for the meeting.",
  },

  {
    key: "objection.ai",
    category: "objection",
    short: "Why AI?",
    order: 8,
    title: "Why does AI matter? / My customers just call me",
    body: "Got it, makes sense. More and more people are asking ChatGPT or Gemini for a {tradeOne} near them, and those tools pull from your website. This wouldn't be about chasing AI today. It's really just showing you the homepage, and I'll walk you through how it's set up for that when we meet. What's your calendar like {day1} or {day2}?",
    body2: "Have you ever asked ChatGPT for a {tradeOne} in {town}? The reason I ask is it's a quick way to see if you show up. If you're not in that answer, it's usually because your site and Google listing aren't giving it enough to go on, and that part's very fixable.",
    note: "One sentence about AI, then back to the meeting. The how (hand-coded, fast, clear service and town pages, Google listing, reviews) is for the meeting. Say \"more and more people,\" never \"more than Google.\"",
  },
  {
    key: "objection.no-video",
    category: "objection",
    short: "No video call",
    order: 9,
    title: "Can we just do a phone call? / I don't do video",
    body: "Totally fine, you don't need to be on camera at all. It's just a link that opens right on your phone, nothing to download. Or since I'm {monroe}, I can bring my laptop by and show you in person, wherever you're going to be. What's your calendar like {day1} or {day2}?",
    body2: "No problem. Would it be easier to look at it on your phone or a computer? I only ask because the homepage is something you really have to see, so I'd rather set it up however's easiest for you.",
    note: "Offer in person when they're close enough to drive to. Otherwise send a Google Meet link and say \"no download, no camera needed.\" If they still push back: \"I'll just call you at that time and text you the link while we're talking.\"",
  },

  {
    key: "objection.google-listing",
    category: "objection",
    short: "Google Maps",
    order: 10,
    title: "We get calls from Google Maps / Google listing",
    body: `{if:rating} That's great, the map listing is where a lot of local calls come from, and your website plays a big part in how that listing ranks. This wouldn't be about changing anything today. It's really just showing you the homepage and how it backs up your listing. What's your calendar like {day1} or {day2}?
{if:!rating} Got it. When I looked, I couldn't find a Google listing for you, so that's worth a look too. This wouldn't be about changing anything today. It's really just showing you the homepage and where your listing fits in. What's your calendar like {day1} or {day2}?`,
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

{if:site} I design custom websites that make local businesses like {business} look like the most trusted name in their area, and I handle everything after launch so you never have to touch it. I took a look at your site and had a few ideas for a homepage redesign.
{if:!site} I design custom websites that make local businesses like {business} look like the most trusted name in their area, and I handle everything after launch so you never have to touch it. I noticed you don't have a website yet, and that's probably sending some calls to competitors who look more established online.

Why don't we hop on a quick call {window}, and let me show you {newHomepage}: what that could look like for you guys, and how it could bring in more business and help you stand out against your competitors? No strings attached.`,
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
  // His Framework 1 first email, then Follow-up 1 (Option B), 2 and 3 in the same thread. Keep his wording;
  // only the details are ours.
  {
    key: "email.first",
    category: "email",
    order: 1,
    title: "First email",
    subject: "{if:name} {name} // Chris | Intro\n{if:!name} {business} | Standing out online",
    note: "Connor's Framework 1 (Direct Introduction & Value Proposition). Subject uses his name // name pattern when you know the owner, otherwise company | priority. Also the next touch for anyone you've only messaged on Facebook. Tomorrow they're on your call list.",
    body: `{if:name} Good morning {name},
{if:!name} Good morning,

I'm reaching out from Beyond Belief Web Design {monroeShort}, where I work with local businesses a lot like yours, across the Charlotte area and beyond.

{if:contacted} I also reached out by {channel} {since}, in case that got buried.

{if:site} We're a custom web design studio that helps local businesses get a website designed from scratch around their brand, hand off every edit and update, and make calling or requesting a quote easy from a phone, to look like the most trusted name in their area and bring in more calls.
{if:!site} We're a custom web design studio that helps local businesses get a website designed around their brand with no money down, hand off every edit and update, and make calling or requesting a quote easy from a phone, to look like the most trusted name in their area and bring in more calls.

I'm looking to set time to briefly introduce myself, show you {homepage}, and see where I may be able to help you stand out against your competitors and bring in more business. What does your availability look like next week?

Thanks in advance,
{sig}

P.S. If this isn't a fit, just reply and let me know and I won't reach out again.`,
  },
  {
    key: "email.f1",
    category: "email",
    order: 2,
    title: "Follow-up 1 · Value add",
    note: "Connor's Follow-up 1, Option B (use cases). The day after your first call attempt, in the same thread. Exactly three use cases, no fake proof.",
    body: `{if:name} Hi {name},
{if:!name} Hi,

To give you a better idea, Beyond Belief works with local businesses like yours to look like the most trusted name in their area and bring in more calls from the people already looking for them.

What makes my approach different is that every site is designed from scratch around your brand, never a template or page builder, and I handle every edit and update so you never have to touch it.

I focus on three core use cases:

- Standing out: a custom design built around your brand, so you look like the most trusted {tradeOne} in {area}, even next to bigger competitors
{if:site} - More calls from the homepage: a layout that makes calling or requesting a quote the obvious next step, especially on a phone
{if:!site} - Calls from a phone: one tap to call or request a quote, with your services, service area, and hours right up front
- Hands-off upkeep: I handle hosting, edits, and updates, and you can change anything anytime by just sending me a message

Let me know if any of these are a focus for you, and I'll send over an invite.

Thanks,
{sig}`,
  },
  {
    key: "email.f2",
    category: "email",
    order: 3,
    title: "Follow-up 2 · Direct request",
    note: "Connor's Follow-up 2, word for word. The day after your second call attempt, in the same thread. Short on purpose, no new pitch.",
    body: `{if:name} Hi {name},
{if:!name} Hi,

Please let me know your thoughts on this when you have a moment.

Thanks,
{sig}`,
  },
  {
    key: "email.f3",
    category: "email",
    order: 4,
    title: "Follow-up 3 · Close the loop",
    note: "Connor's Follow-up 3, word for word. The day after your third call attempt, in the same thread. Last email. No guilt, no fake deadline.",
    body: `{if:name} Hi {name},
{if:!name} Hi,

I'm planning the next couple of weeks and wanted to close the loop either way. Does a brief introduction make sense now, or would {laterMonth} be better?

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

LEAD WITH DESIGN, NOT RANKINGS
Everyone pitches "more calls from Google." Most agency sites rank with stuffed keywords and templates, and they still don't make anyone want to call. You sell the opposite: a design that makes them the most trusted name in their area, and a site they never have to deal with. Rankings are a side effect, never the hook.

WHAT MAKES YOU DIFFERENT (lead with the first two, then use one or two more, never the whole list)
Design that stands out: built from scratch around their brand, so even the smallest shop looks like the most trusted, reputable choice next to bigger competitors.
Hands-off: you handle the build, edits, and upkeep. The site runs 24/7, and they change anything anytime by just contacting you.
No big upfront bill: one monthly plan, where most agencies charge thousands up front.
You own everything: domain, site, and accounts. No platform lock-in, nothing held hostage.
Hand-coded by you, never Wix or Squarespace bloat: it's what you've specialized in for over 10 years, and a fast, clean site ranks better on Google and in AI search as a byproduct. Touch it lightly, never in an opener.
One company per industry per county: you never build for their competition.
No-risk meeting: you're not asking them to buy or sign up, just 15 minutes to see the homepage. No money, no commitment. If they don't like it, shake hands and move on.
Local, in person if they want: most of these calls come from out of state or overseas. You live in Monroe and can bring your laptop to their shop or job site.
A personal partnership: they deal with you directly, not an account manager or an overseas team.
They know the site needs work but don't have the time: that's the point, you handle all of it.
They see the homepage before committing to anything.

THE FRAMEWORK: CONNOR'S WHO, WHY, WHAT (every call follows it)
Greeting: "Hey [Name], this is Chris calling from Beyond Belief Web Design, how's it going?" Downward inflection, then straight into why you're calling.
Who: "I'm reaching out because I'm a web designer in Monroe that works with local businesses like yours." One sentence.
Why: "So I focus on things like..., things like that, usually by helping..." What they care about: looking like the most trusted name in their area, standing out from competitors, and never having to deal with their website.
What: assumptive. "And I know I kind of called you out of the blue here too, so I was actually more looking to set some time aside, just to show you... What's your calendar like tomorrow or Wednesday?" Always two real days.
Never ask permission ("Can I take 30 seconds?", "Did I catch you at a bad time?", "Would you be open to"). Assume the meeting, and let them decline.

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
{if:site} 2. How it helps you stand out in {area} and bring in more calls and quote requests
{if:!site} 2. What a site built around your brand would do for your calls
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

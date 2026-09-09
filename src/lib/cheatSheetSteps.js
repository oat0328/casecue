// The fixed 32-step IEP meeting order and guidance text. Shared by the cheat sheet UI.
// The backend generation function fills each step with student-specific content.

export const MEETING_STEPS = [
  { index: 1, title: "Welcome and introductions", whatToDiscuss: "Welcome the family and team, introduce each member and their role." },
  { index: 2, title: "Meeting purpose", whatToDiscuss: "State the purpose: annual review, initial IEP, amendment, or reevaluation." },
  { index: 3, title: "Procedural safeguards confirmation", whatToDiscuss: "Confirm the parent received and understands procedural safeguards." },
  { index: 4, title: "Parent concerns", whatToDiscuss: "Invite the parent to share concerns before the team discusses data." },
  { index: 5, title: "Student strengths and interests", whatToDiscuss: "Open with the student's strengths, interests, and positive qualities." },
  { index: 6, title: "Eligibility", whatToDiscuss: "Restate eligibility category and the basis for eligibility." },
  { index: 7, title: "MDT/evaluation findings", whatToDiscuss: "Summarize the most recent evaluation findings in plain language." },
  { index: 8, title: "Academic present levels", whatToDiscuss: "Present academic performance with measurable baselines and sources." },
  { index: 9, title: "Functional present levels", whatToDiscuss: "Present functional performance with measurable baselines and sources." },
  { index: 10, title: "Previous goal progress", whatToDiscuss: "Review progress on each previous goal with data, not impressions." },
  { index: 11, title: "Current areas of need", whatToDiscuss: "Identify the needs this IEP will address." },
  { index: 12, title: "Proposed annual goals", whatToDiscuss: "Present each proposed goal: condition, behavior, criterion, measurement." },
  { index: 13, title: "Progress measurement", whatToDiscuss: "Explain how and how often each goal will be measured." },
  { index: 14, title: "Accommodations", whatToDiscuss: "Review each accommodation, the need it addresses, and where it applies." },
  { index: 15, title: "Modifications", whatToDiscuss: "Discuss any changes to what the student is expected to learn." },
  { index: 16, title: "Supplementary aids", whatToDiscuss: "Review supports for adults and peers that help the student." },
  { index: 17, title: "Behavior considerations", whatToDiscuss: "Discuss behavior supports and any FBA/BIP implications." },
  { index: 18, title: "Assistive technology", whatToDiscuss: "Discuss technology the student needs to access instruction." },
  { index: 19, title: "Special education services", whatToDiscuss: "Present each special education service and the need it addresses." },
  { index: 20, title: "Related services", whatToDiscuss: "Present related services (speech, OT, PT, counseling, transportation)." },
  { index: 21, title: "Frequency and service minutes", whatToDiscuss: "State minutes per session, sessions per week, and totals." },
  { index: 22, title: "Testing participation", whatToDiscuss: "Discuss accommodations for district and state testing." },
  { index: 23, title: "Extended School Year consideration", whatToDiscuss: "Review ESY criteria and team decision." },
  { index: 24, title: "Transportation consideration", whatToDiscuss: "Discuss transportation needs, if any." },
  { index: 25, title: "Least Restrictive Environment discussion", whatToDiscuss: "Explain why the setting is the least restrictive appropriate option." },
  { index: 26, title: "Placement and participation percentage", whatToDiscuss: "State proposed placement and percentage inside general education." },
  { index: 27, title: "Transition planning", whatToDiscuss: "For age-appropriate students, review transition assessments and post-secondary goals." },
  { index: 28, title: "Progress-reporting schedule", whatToDiscuss: "State when and how the family will receive progress reports." },
  { index: 29, title: "Unresolved decisions", whatToDiscuss: "List any decisions still open and how they will be resolved." },
  { index: 30, title: "Parent questions", whatToDiscuss: "Invite questions and parking-lot items before closing." },
  { index: 31, title: "Agreement and next steps", whatToDiscuss: "Confirm agreements, next steps, and responsible people." },
  { index: 32, title: "Signatures and completion", whatToDiscuss: "Review signature pages and give the parent a copy of everything." },
];

export const stepMeta = (i) => MEETING_STEPS[i] || MEETING_STEPS[0];
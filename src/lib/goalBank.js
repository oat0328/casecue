export const GOAL_BANK = [
  {
    area: "Reading",
    goal_text: "By the next annual review, [Student] will read a [grade]-level passage and answer literal and inferential comprehension questions with 80% accuracy in 4 out of 5 opportunities.",
    criterion: "80% accuracy in 4/5 opportunities",
    measurement_method: "Curriculum-based reading probe"
  },
  {
    area: "Reading",
    goal_text: "By the next annual review, [Student] will decode unfamiliar single-syllable and multisyllabic words using phonics patterns with 90% accuracy as measured by weekly word-reading probes.",
    criterion: "90% accuracy on 3 consecutive probes",
    measurement_method: "Word-reading probe"
  },
  {
    area: "Reading",
    goal_text: "By the next annual review, [Student] will read [grade]-level text orally at 90 words per minute with 95% accuracy.",
    criterion: "90 WPM at 95% accuracy",
    measurement_method: "Oral reading fluency (1-minute timed)"
  },
  {
    area: "Writing",
    goal_text: "By the next annual review, [Student] will write a 5-sentence paragraph with a topic sentence, 3 supporting details, and a concluding sentence in 4 out of 5 writing samples.",
    criterion: "4/5 writing samples",
    measurement_method: "Writing rubric (teacher-scored)"
  },
  {
    area: "Writing",
    goal_text: "By the next annual review, [Student] will compose an expository text of at least 3 paragraphs using correct capitalization, punctuation, and grade-appropriate spelling in 80% of written work.",
    criterion: "80% of writing samples",
    measurement_method: "Writing samples scored with rubric"
  },
  {
    area: "Math",
    goal_text: "By the next annual review, [Student] will solve [grade]-level addition, subtraction, multiplication, and division problems with 80% accuracy on daily work samples.",
    criterion: "80% accuracy on 4/5 work samples",
    measurement_method: "Curriculum-based math probe"
  },
  {
    area: "Math",
    goal_text: "By the next annual review, [Student] will solve one- and two-step word problems by identifying the correct operation and showing their work with 75% accuracy in 4 out of 5 trials.",
    criterion: "75% accuracy in 4/5 trials",
    measurement_method: "Teacher-made word-problem assessment"
  },
  {
    area: "Math",
    goal_text: "By the next annual review, [Student] will demonstrate mastery of fractions (identifying, comparing, and adding with like denominators) with 80% accuracy on unit assessments.",
    criterion: "80% on 3 consecutive unit assessments",
    measurement_method: "Unit assessment / probe"
  },
  {
    area: "Behavior",
    goal_text: "By the next annual review, [Student] will use a self-regulation strategy (e.g., break card, breathing sequence) in place of disruptive behavior in 4 out of 5 observed opportunities across settings.",
    criterion: "4/5 observed opportunities",
    measurement_method: "Direct behavior observation / frequency count"
  },
  {
    area: "Behavior",
    goal_text: "By the next annual review, [Student] will remain on task for 15 consecutive minutes during independent work in 4 out of 5 observations without more than one adult prompt.",
    criterion: "15 min on-task, 4/5 observations, ≤1 prompt",
    measurement_method: "Momentary time sampling"
  },
  {
    area: "Social Skills",
    goal_text: "By the next annual review, [Student] will initiate an appropriate social interaction with a peer (greeting, question, or invitation to play) during at least 2 structured activities per week.",
    criterion: "2 initiations per week for 4 consecutive weeks",
    measurement_method: "Teacher observation log"
  },
  {
    area: "Social Skills",
    goal_text: "By the next annual review, [Student] will take turns during a structured game or activity for 10 minutes with no more than 2 adult reminders in 4 out of 5 opportunities.",
    criterion: "10 min, ≤2 reminders, 4/5 opportunities",
    measurement_method: "Structured observation"
  },
  {
    area: "Communication",
    goal_text: "By the next annual review, [Student] will express wants and needs using [communication mode: verbal phrases / AAC device / picture exchange] in 4 out of 5 opportunities across the school day.",
    criterion: "4/5 opportunities",
    measurement_method: "Communication sample / SLP data"
  },
  {
    area: "Communication",
    goal_text: "By the next annual review, [Student] will follow 2-step directions containing spatial concepts (in, on, under, behind) with 80% accuracy in structured settings.",
    criterion: "80% accuracy, 3 consecutive sessions",
    measurement_method: "Structured language probe (SLP/teacher)"
  },
  {
    area: "Study Skills",
    goal_text: "By the next annual review, [Student] will independently record assignments in a planner and submit completed homework on time in 4 out of 5 school weeks.",
    criterion: "4/5 weeks",
    measurement_method: "Planner check / teacher log"
  },
  {
    area: "Study Skills",
    goal_text: "By the next annual review, [Student] will use a graphic organizer to plan and complete a multi-step assignment in 4 out of 5 opportunities with minimal adult support.",
    criterion: "4/5 opportunities with ≤2 prompts",
    measurement_method: "Work sample review"
  },
  {
    area: "Functional / Life Skills",
    goal_text: "By the next annual review, [Student] will independently sequence the steps of a 4-step daily-living task (e.g., handwashing, snack preparation) with 100% accuracy in 4 out of 5 trials.",
    criterion: "100% of steps, 4/5 trials",
    measurement_method: "Task analysis data"
  },
  {
    area: "Functional / Life Skills",
    goal_text: "By the next annual review, [Student] will identify community signs and safety symbols in the school environment with 90% accuracy across 3 consecutive probes.",
    criterion: "90% accuracy, 3 consecutive probes",
    measurement_method: "Teacher-made picture probe"
  }
];

export const GOAL_AREAS = [...new Set(GOAL_BANK.map((g) => g.area))];
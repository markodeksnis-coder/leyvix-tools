function _da(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function _r(from, to) {
  const a = []
  for (let i = from; i >= to; i--) a.push(_da(i))
  return a
}

const HABITS = [
  {
    id: 'no_pmo', name: 'No PMO', icon: '🧠',
    logs: [..._r(89, 82), ..._r(75, 45), ..._r(14, 0)],
    fails: [_da(81), _da(44), _da(15)],
  },
  {
    id: 'daily_gym', name: 'Daily Gym', icon: '💪',
    logs: [..._r(88, 75), ..._r(70, 55), ..._r(42, 32), ..._r(28, 9), ..._r(7, 0)],
    fails: [_da(74), _da(54), _da(31), _da(8)],
  },
  {
    id: 'prayer', name: 'Prayer', icon: '✝️',
    logs: [..._r(89, 63), ..._r(60, 24), ..._r(21, 0)],
    fails: [_da(62), _da(23)],
  },
  {
    id: 'sales_content', name: 'Sales Content', icon: '📈',
    logs: [..._r(80, 65), ..._r(55, 38), ..._r(25, 8), ..._r(5, 0)],
    fails: [_da(37), _da(7), _da(6)],
  },
  {
    id: 'nutrition', name: 'Nutrition On Point', icon: '🥩',
    logs: [..._r(70, 50), ..._r(35, 20), ..._r(15, 7), ..._r(3, 0)],
    fails: [_da(49), _da(19), _da(6), _da(5), _da(4)],
  },
  {
    id: 'cold_outreach', name: 'Cold Outreach', icon: '📞',
    logs: [..._r(85, 70), ..._r(50, 35), ..._r(29, 14), ..._r(10, 0)],
    fails: [_da(69), _da(34), _da(13), _da(11)],
  },
  {
    id: 'no_junk', name: 'No Junk Food', icon: '🚫',
    logs: [..._r(80, 60), ..._r(50, 30), ..._r(24, 10), ..._r(6, 0)],
    fails: [_da(59), _da(29), _da(9), _da(8), _da(7)],
  },
  {
    id: 'learning', name: 'Learning Session', icon: '📚',
    logs: [..._r(89, 70), ..._r(65, 50), ..._r(45, 22), ..._r(18, 0)],
    fails: [_da(69), _da(49), _da(21), _da(19)],
  },
  {
    id: 'boxing', name: 'Boxing Training', icon: '🥊',
    logs: [..._r(60, 45), ..._r(30, 18), ..._r(12, 6), ..._r(4, 0)],
    fails: [_da(44), _da(17), _da(5)],
  },
  {
    id: 'reading', name: 'Reading', icon: '📖',
    logs: [..._r(88, 72), ..._r(65, 48), ..._r(40, 25), ..._r(19, 4), ..._r(2, 0)],
    fails: [_da(71), _da(47), _da(24), _da(3)],
  },
  {
    id: 'hydration', name: 'Hydration (2L+)', icon: '💧',
    logs: [..._r(89, 70), ..._r(60, 40), ..._r(32, 18), ..._r(13, 0)],
    fails: [_da(69), _da(39), _da(17), _da(14)],
  },
]

const CONTENT = [
  { id: 1, title: 'Sell or Be Sold — Grant Cardone', category: 'Sales', date: _da(2), takeaway: 'Every interaction is either you selling them or them selling you on why not.' },
  { id: 2, title: 'Influence: The Psychology of Persuasion', category: 'Psychology', date: _da(5), takeaway: 'Reciprocity is the most powerful compliance trigger — give first, always.' },
  { id: 3, title: 'Matthew 6 — Anxiety & Trust', category: 'Theology', date: _da(7), takeaway: 'Seek first the kingdom and your needs are covered. Worry is the opposite of faith.' },
  { id: 4, title: 'The Lean Startup — Build-Measure-Learn', category: 'Business', date: _da(9), takeaway: 'Validate assumptions with MVPs before scaling. Speed of iteration beats planning.' },
  { id: 5, title: 'Hypertrophy Science: Rep Ranges', category: 'Fitness', date: _da(12), takeaway: '6-30 reps all build muscle equally — proximity to failure is the key variable.' },
  { id: 6, title: 'Why Men Ghost in Friendships', category: 'Relationships', date: _da(14), takeaway: 'Men communicate through action and presence, not words or scheduled check-ins.' },
  { id: 7, title: 'D2D: The First 7 Seconds', category: 'Door-to-Door', date: _da(15), takeaway: 'Posture, eye contact, and tonality close more doors than any script line.' },
  { id: 8, title: 'Reading Microexpressions', category: 'Psychology', date: _da(18), takeaway: 'True emotions flash in under a second before the social mask goes back on.' },
  { id: 9, title: 'Protein Synthesis & Recovery', category: 'Fitness', date: _da(20), takeaway: 'Muscle protein synthesis peaks 24-48h post training — daily protein matters more than timing.' },
  { id: 10, title: 'Revenue vs. Profit Mindset', category: 'Business', date: _da(22), takeaway: 'Chasing revenue without margin discipline destroys businesses at scale.' },
  { id: 11, title: 'The Sales Frame Control', category: 'Sales', date: _da(25), takeaway: 'Whoever sets the frame controls the conversation. Never enter their frame uninvited.' },
  { id: 12, title: 'Proverbs 27 — Iron Sharpens Iron', category: 'Theology', date: _da(28), takeaway: 'Your circle determines your trajectory. One man sharpens another.' },
  { id: 13, title: 'Door-Knocking Objection Patterns', category: 'Door-to-Door', date: _da(33), takeaway: 'Most objections are reflexes, not real. The second ask closes 40% of initial nos.' },
  { id: 14, title: 'The Art of Noticing People', category: 'Psychology', date: _da(40), takeaway: 'People reveal their values through what they defend and what they ignore.' },
]

const MIND = [
  { id: 1, title: 'Scarcity Principle', category: 'Sales Psychology', summary: 'Perceived scarcity drives urgency. People value what they might lose more than what they might gain. The fear of missing out is more motivating than desire for gain.', source: 'Influence — Cialdini', date: _da(5), keyPrinciple: 'Loss aversion > desire' },
  { id: 2, title: 'Status Signals in Conversation', category: 'Human Behavior', summary: 'High-status individuals speak less, interrupt more, and take up more physical space. They do not explain themselves. They make others qualify to them.', source: 'The Art of Power', date: _da(8), keyPrinciple: 'Less talking = more status' },
  { id: 3, title: 'Progressive Overload', category: 'Fitness Science', summary: 'Muscles grow when subjected to progressively higher loads over time. Without consistent overload — more weight, reps, or sets — you plateau. Track and add.', source: 'Scientific Principles of Strength Training', date: _da(12), keyPrinciple: 'Always add stress' },
  { id: 4, title: 'The Assumptive Close', category: 'Door-to-Door', summary: 'Instead of asking if they want to proceed, assume they do and proceed. "So let me get your info started" instead of "Would you like to move forward?" Removes the decision point.', source: 'Field training', date: _da(15), keyPrinciple: "Assume, don't ask" },
  { id: 5, title: "Parkinson's Law", category: 'Business Frameworks', summary: 'Work expands to fill the time allotted for it. Compress deadlines to compress output. 4-hour work sessions with tight deadlines outperform 8-hour days with vague goals.', source: 'The 4-Hour Workweek', date: _da(20), keyPrinciple: 'Constraints create output' },
  { id: 6, title: '2 Commandments of Relationships', category: 'Relationships', summary: 'Show up consistently and add more value than you take. Relationships die when the ratio flips. People keep who makes them feel good and elevated.', source: 'Personal observation', date: _da(22), keyPrinciple: 'Consistency + value = loyalty' },
]

const BODY = {
  currentWeight: 187,
  bodyFat: 14.5,
  goalBodyFat: 10,
  weightHistory: [
    ...[...Array(30)].map((_, i) => ({ date: _da(30 - i), weight: 192 - (i * 0.17) })),
  ],
  workouts: [
    { id: 1, date: _da(0), name: 'Push Day', exercises: [{ name: 'Bench Press', sets: 4, reps: '8,8,7,6', weight: 195 }, { name: 'Incline DB Press', sets: 3, reps: '10,10,8', weight: 70 }, { name: 'Lateral Raises', sets: 4, reps: '15,15,12,12', weight: 25 }] },
    { id: 2, date: _da(1), name: 'Pull Day', exercises: [{ name: 'Weighted Pull-ups', sets: 4, reps: '6,6,5,5', weight: 45 }, { name: 'Barbell Row', sets: 4, reps: '8,8,8,6', weight: 185 }, { name: 'Face Pulls', sets: 3, reps: '20,20,18', weight: 50 }] },
    { id: 3, date: _da(3), name: 'Leg Day', exercises: [{ name: 'Back Squat', sets: 4, reps: '6,6,5,4', weight: 275 }, { name: 'Romanian Deadlift', sets: 3, reps: '10,10,8', weight: 185 }, { name: 'Leg Press', sets: 3, reps: '15,15,12', weight: 360 }] },
    { id: 4, date: _da(4), name: 'Push Day', exercises: [{ name: 'Bench Press', sets: 4, reps: '8,8,7,7', weight: 190 }, { name: 'OHP', sets: 3, reps: '8,7,6', weight: 135 }, { name: 'Cable Fly', sets: 3, reps: '15,15,12', weight: 40 }] },
    { id: 5, date: _da(6), name: 'Pull Day', exercises: [{ name: 'Deadlift', sets: 3, reps: '5,4,3', weight: 315 }, { name: 'Lat Pulldown', sets: 4, reps: '10,10,8,8', weight: 160 }, { name: 'Hammer Curls', sets: 3, reps: '12,12,10', weight: 45 }] },
    { id: 6, date: _da(7), name: 'Leg Day', exercises: [{ name: 'Back Squat', sets: 4, reps: '5,5,4,4', weight: 285 }, { name: 'Walking Lunges', sets: 3, reps: '12,12,10', weight: 45 }, { name: 'Calf Raises', sets: 4, reps: '20,20,18,15', weight: 135 }] },
    { id: 7, date: _da(8), name: 'Boxing Session', exercises: [{ name: 'Heavy Bag', sets: 6, reps: '3 min rounds', weight: 0 }, { name: 'Shadowboxing', sets: 4, reps: '3 min rounds', weight: 0 }] },
    { id: 8, date: _da(10), name: 'Full Body', exercises: [{ name: 'Back Squat', sets: 3, reps: '5,5,5', weight: 265 }, { name: 'Bench Press', sets: 3, reps: '5,5,5', weight: 180 }, { name: 'Barbell Row', sets: 3, reps: '8,8,8', weight: 175 }] },
  ],
  prs: {
    'Bench Press': { weight: 225, reps: 4, date: _da(18) },
    'Back Squat': { weight: 315, reps: 2, date: _da(25) },
    'Deadlift': { weight: 365, reps: 1, date: _da(45) },
    'Weighted Pull-ups': { weight: 55, reps: 4, date: _da(30) },
    'OHP': { weight: 155, reps: 3, date: _da(60) },
  },
}

const DIET = {
  targets: { calories: 2800, protein: 220, carbs: 280, fats: 80 },
  history: [
    ...[...Array(14)].map((_, i) => ({
      date: _da(i),
      calories: 2600 + Math.round(Math.sin(i) * 200),
      protein: 200 + Math.round(Math.cos(i) * 20),
      carbs: 260 + Math.round(Math.sin(i + 1) * 30),
      fats: 75 + Math.round(Math.cos(i + 2) * 10),
    }))
  ],
  supplements: [
    { id: 'creatine', name: 'Creatine 5g', logs: _r(14, 0) },
    { id: 'vitamins', name: 'Multivitamin', logs: _r(14, 0) },
    { id: 'vitamin_d', name: 'Vitamin D3', logs: [..._r(14, 3), _da(1), _da(0)] },
    { id: 'omega3', name: 'Omega-3', logs: _r(14, 0) },
    { id: 'zinc', name: 'Zinc + Magnesium', logs: _r(10, 0) },
  ],
}

const RELATIONS = {
  people: [
    { id: 1, name: 'David Chen', type: 'Mentor', lastContact: _da(3), energyRating: 'builds', notes: 'Sales director. Met at conference. Runs a $5M door-to-door operation. Study his methods.', psychologyNotes: [{ id: 1, note: 'Only responds to direct asks — never hints', date: _da(10) }] },
    { id: 2, name: 'Jake Marini', type: 'Friend', lastContact: _da(1), energyRating: 'builds', notes: 'Closest friend. On same mission. Accountability partner for gym and business goals.', psychologyNotes: [] },
    { id: 3, name: 'Sarah Deksnis', type: 'Family', lastContact: _da(0), energyRating: 'neutral', notes: 'Sister. Good relationship. Needs consistent investment.', psychologyNotes: [] },
    { id: 4, name: 'God', type: 'God', lastContact: _da(0), energyRating: 'builds', notes: 'Prayer + scripture daily. He is the source of everything.', psychologyNotes: [] },
    { id: 5, name: 'Marcus Webb', type: 'Business', lastContact: _da(7), energyRating: 'neutral', notes: 'Potential partner. Still proving himself. Watch for consistency between words and actions.', psychologyNotes: [{ id: 1, note: 'Talks big but delays action — needs accountability', date: _da(7) }] },
    { id: 6, name: 'Uncle Ray', type: 'Family', lastContact: _da(14), energyRating: 'drains', notes: 'Negative energy. Loves to criticize ambition. Keep exposure low.', psychologyNotes: [{ id: 1, note: 'Projects insecurities onto others\' goals', date: _da(14) }] },
  ],
  behaviorNotes: [
    { id: 1, observation: 'Confident people fill silence', detail: 'Insecure people rush to fill silence with explanations. Confident people let silence breathe. Silence is power.', category: 'Status', date: _da(4) },
    { id: 2, observation: 'People follow energy, not logic', detail: 'Nobody gets convinced by argument. They get moved by emotion and then justify it with logic after. Lead with feeling.', category: 'Persuasion', date: _da(9) },
    { id: 3, observation: 'How someone treats service workers', detail: 'Non-negotiable filter. Someone who disrespects waiters or cashiers reveals their true character the moment they have power.', category: 'Status', date: _da(17) },
  ],
}

const BUSINESS = {
  deals: [
    { id: 1, prospect: 'Thompson Family', status: 'Closed', value: 3200, date: _da(2) },
    { id: 2, prospect: 'Garcia Residence', status: 'Closed', value: 2800, date: _da(5) },
    { id: 3, prospect: 'Martinez Home', status: 'Appointment Set', value: 2500, date: _da(1) },
    { id: 4, prospect: 'Lee Property', status: 'No Show', value: 2200, date: _da(3) },
    { id: 5, prospect: 'Anderson Family', status: 'Lead', value: 3500, date: _da(0) },
    { id: 6, prospect: 'Wilson Residence', status: 'Closed', value: 4100, date: _da(12) },
    { id: 7, prospect: 'Brown Home', status: 'Lost', value: 1800, date: _da(10) },
    { id: 8, prospect: 'Davis Family', status: 'Closed', value: 2600, date: _da(18) },
  ],
  lessons: [
    { id: 1, title: 'What killed the Martinez appointment', what: 'Knocked at 7pm, owner just got home from work. Tired, hungry, distracted.', learned: 'Never pitch tired people. Come back Saturday morning or weekday 6-7pm before dinner.', category: 'Sales Call', date: _da(3) },
    { id: 2, title: 'Thompson — what closed it', what: 'Led with neighborhood social proof. Three neighbors already had our system. Used names.', learned: 'Social proof from neighbors is the #1 door opener. Collect and use names aggressively.', category: 'Client', date: _da(2) },
    { id: 3, title: 'Garcia — almost lost it at the close', what: 'Gave too many options. Confusion created hesitation. Wife started questioning.', learned: 'One path forward only. Eliminate choice at close. "The next step is X, when works better — Tuesday or Wednesday?"', category: 'Sales Call', date: _da(5) },
  ],
  revenueHistory: [
    ...[...Array(30)].map((_, i) => {
      const amt = i === 2 ? 3200 : i === 5 ? 2800 : i === 12 ? 4100 : i === 18 ? 2600 : 0
      return { date: _da(30 - i), amount: amt }
    })
  ],
}

const SOUL = {
  prayers: [
    { id: 1, date: _da(0), content: 'Lord, give me clarity on the path forward with the business. I trust your timing but I need to walk in faith today. Praying for protection over my family and strength to honor you through my work.' },
    { id: 2, date: _da(1), content: 'Gratitude day. Thankful for health, the grind, and the men around me. Asked for wisdom in relationships and boldness in sales calls.' },
    { id: 3, date: _da(2), content: 'Felt off today. Prayed about discipline vs motivation. Reminded that discipline is a form of worship. Action as prayer.' },
    { id: 4, date: _da(4), content: 'Interceding for Jake and his family situation. Praying against complacency and for a spirit of excellence.' },
    { id: 5, date: _da(7), content: 'Matthew 6:33. Seek first the kingdom. Reminded that money is a byproduct of value created. Shift the focus.' },
  ],
  values: [
    { id: 1, value: 'Integrity', description: 'Do what you said you would do, when you said you would do it. No exceptions, no excuses.' },
    { id: 2, value: 'Excellence', description: 'Never do less than your best. The standard is the standard, every single day.' },
    { id: 3, value: 'Faith', description: 'God first. Trust the process. Act boldly because you are covered.' },
    { id: 4, value: 'Discipline', description: 'Emotions are passengers. You are the driver. Show up regardless.' },
    { id: 5, value: 'Brotherhood', description: 'Iron sharpens iron. Invest in the men around you and demand they do the same.' },
    { id: 6, value: 'Growth', description: 'Every day must be a step forward. Stagnation is regression.' },
  ],
  identity: `I am a man of God, built for impact. I operate at the highest standard because anything less is an insult to my potential and my Creator.

I am becoming a man whose word is his bond, whose body reflects discipline, and whose business reflects excellence. I do not chase comfort — I chase growth.

I am a provider, a protector, and a student of life. I am becoming the kind of man who other men want to be around and women want to build with.

I do not wait for motivation. I act on principle. Every day I choose to be better than yesterday — not for recognition, but because it is who I am.`,
  identityArchive: [
    { id: 1, content: 'I am working on becoming more disciplined and consistent. I want to build a business that supports my family and grow in my faith.', date: _da(90) },
  ],
}

export function initSeedData() {
  if (!localStorage.getItem('marko_app_start')) {
    localStorage.setItem('marko_app_start', new Date().toISOString().split('T')[0])
  }
  if (!localStorage.getItem('anthropic_key')) {
    localStorage.setItem('anthropic_key', '')
  }
  if (localStorage.getItem('marko_initialized')) return
  localStorage.setItem('marko_habits', JSON.stringify(HABITS))
  localStorage.setItem('marko_content', JSON.stringify(CONTENT))
  localStorage.setItem('marko_mind', JSON.stringify(MIND))
  localStorage.setItem('marko_body', JSON.stringify(BODY))
  localStorage.setItem('marko_diet', JSON.stringify(DIET))
  localStorage.setItem('marko_relations', JSON.stringify(RELATIONS))
  localStorage.setItem('marko_business', JSON.stringify(BUSINESS))
  localStorage.setItem('marko_soul', JSON.stringify(SOUL))
  localStorage.setItem('marko_settings', JSON.stringify({ name: 'Marko' }))
  localStorage.setItem('marko_coach_messages', JSON.stringify([]))
  localStorage.setItem('marko_initialized', 'true')
}

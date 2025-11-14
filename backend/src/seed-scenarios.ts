import { ScenarioModel } from './models/scenario.model';
import { AgentModel } from './models/agent.model';

/**
 * Seed script to create default scenarios for interview and sales training
 * Run with: npm run seed:scenarios
 */

interface ScenarioSeedData {
  title: string;
  description: string;
  category: string;
  topic: string;
  agentNames: string[]; // Agent names to look up by
  agentsStartFirst?: boolean; // If true, agents kick off the conversation
  difficultyLevel: string;
  estimatedDuration: number;
  recommendedFor: string;
}

const DEFAULT_SCENARIOS: ScenarioSeedData[] = [
  // ===== INTERVIEW SCENARIOS (5) =====
  {
    title: 'Technical Interview Panel',
    description: 'Practice technical interviews with a senior engineer and HR director. Expect deep-dive questions on system design, algorithms, and technical leadership.',
    category: 'interview',
    agentsStartFirst: true,
    topic: `You're interviewing for a Senior Software Engineer role at a fast-growing fintech company. You're meeting with the technical lead and HR director for a panel interview.

The technical lead starts: "Thanks for joining us today. I'd like to kick things off with a system design question. How would you design a URL shortening service like bit.ly? Walk me through your approach, thinking about scale, storage, and potential bottlenecks."`,
    agentNames: ['Marcus Chen', 'Jennifer Martinez'],
    difficultyLevel: 'intermediate',
    estimatedDuration: 30,
    recommendedFor: 'Software engineers with 3-8 years of experience preparing for senior roles',
  },
  {
    title: 'Executive Leadership Interview',
    description: 'High-stakes interview for a VP of Engineering position with multiple stakeholders. Practice articulating your leadership philosophy, strategic thinking, and managing complex tradeoffs.',
    category: 'interview',
    agentsStartFirst: true,
    topic: `You're interviewing for VP of Engineering at a Series B startup that's scaling rapidly from 30 to 100 engineers. The panel includes a VC board member, a management consultant, and the HR director.

The VC opens: "We're excited to speak with you. This company is at a critical inflection point - we need to scale the team 3x in the next year while shipping a complete platform rewrite. Tell me about a time you've led an organization through a similar transformation. What was your approach, and what would you do differently?"`,
    agentNames: ['Victoria Sterling', 'Robert Chen', 'Jennifer Martinez'],
    difficultyLevel: 'advanced',
    estimatedDuration: 45,
    recommendedFor: 'Engineering managers and directors preparing for VP or C-level roles',
  },
  {
    title: 'Behavioral Interview - Entry Level',
    description: 'Practice behavioral interview questions using the STAR method. Great for candidates new to the professional world or transitioning careers.',
    category: 'interview',
    agentsStartFirst: true,
    topic: `You're interviewing for an entry-level Marketing Coordinator position. This is a phone screen with the HR director to assess your soft skills and culture fit.

The interviewer begins: "Thanks for taking the time to speak with me today. I'd like to start with a behavioral question. Tell me about a time when you had to work with a difficult team member on a group project. What was the situation, and how did you handle it?"`,
    agentNames: ['Jennifer Martinez'],
    difficultyLevel: 'beginner',
    estimatedDuration: 20,
    recommendedFor: 'Recent graduates, career changers, and first-time job seekers',
  },
  {
    title: 'Consulting Case Interview',
    description: 'Practice management consulting case interviews with realistic business problems. Learn to structure your thinking and develop frameworks under pressure.',
    category: 'interview',
    agentsStartFirst: true,
    topic: `You're interviewing for an associate consultant role at a top-tier firm. You're in a one-on-one case interview with a senior consultant.

The interviewer presents the case: "Our client is a regional coffee shop chain with 50 locations across the Midwest. They've been profitable for years, but in the last 18 months, profits have declined by 25%. The CEO has hired us to figure out what's going on and recommend a path forward. Where would you start?"`,
    agentNames: ['Robert Chen'],
    difficultyLevel: 'advanced',
    estimatedDuration: 40,
    recommendedFor: 'MBA candidates and professionals targeting MBB or tier-2 consulting firms',
  },
  {
    title: 'Product Manager Interview',
    description: 'Practice PM interviews covering product sense, stakeholder management, and handling competing priorities from design, engineering, and business teams.',
    category: 'interview',
    agentsStartFirst: true,
    topic: `You're interviewing for a Product Manager role at a B2B SaaS company. You're meeting with the UX design lead, engineering manager, and a business strategist for a panel interview.

The UX designer kicks off: "Thanks for joining us. We'd like to start with a product design question. Imagine we're building a mobile app for busy parents to coordinate family schedules and activities. How would you approach designing the core features? What's most important?"`,
    agentNames: ['Nina Rodriguez', 'Marcus Chen', 'Robert Chen'],
    difficultyLevel: 'intermediate',
    estimatedDuration: 35,
    recommendedFor: 'Product managers with 2-5 years experience or aspiring PMs from adjacent roles',
  },

  // ===== SALES SCENARIOS (3) =====
  {
    title: 'Enterprise SaaS Sales Call',
    description: 'Multi-stakeholder B2B SaaS sales call with decision makers from finance and business. Practice navigating complex buying dynamics.',
    category: 'sales',
    agentsStartFirst: true,
    topic: `You're demoing your workforce management SaaS platform to a mid-market company. On the call are the CFO and a business strategist/COO.

The CFO starts: "Thanks for taking the time. We're currently using spreadsheets and an outdated system that's frankly a mess. But before we dive into your demo, I need to understand the business case. What kind of ROI are we talking about, and how quickly can we expect to see it? We're looking at three vendors, and I need to justify any investment to the board."`,
    agentNames: ['Victoria Sterling', 'Robert Chen'],
    difficultyLevel: 'intermediate',
    estimatedDuration: 25,
    recommendedFor: 'B2B SaaS sales reps, account executives, and sales engineers',
  },
  {
    title: 'Handling Price Objections',
    description: 'Practice advanced objection handling when prospects push back on pricing. Learn to reframe value, negotiate effectively, and know when to walk away.',
    category: 'sales',
    agentsStartFirst: true,
    topic: `You're in late-stage negotiations with a prospect who loves your solution but is pushing hard on price. You're on a call with their procurement lead and a business decision maker.

The procurement lead opens: "Look, we want to move forward, but I have to be honest - your competitor came in at $85K annually, and you're asking for $140K. That's a 65% premium. I need you to help me understand why we should pay that much more, or frankly, we'll need you to sharpen your pencil significantly."`,
    agentNames: ['Robert Chen', 'Victoria Sterling'],
    difficultyLevel: 'advanced',
    estimatedDuration: 20,
    recommendedFor: 'Sales reps handling enterprise deals and negotiating contracts',
  },
  {
    title: 'Cold Outreach to New Prospect',
    description: 'Practice cold calling scenarios. Learn to build rapport quickly, qualify leads, and secure next steps without being pushy.',
    category: 'sales',
    agentsStartFirst: true,
    topic: `You're making a cold call to a Director of Operations at a logistics company. You're selling supply chain optimization software. This is your first contact with them.

The prospect answers: "Hello, this is Rachel Kim... Wait, how did you get this number? I don't think we've spoken before. I'm actually in the middle of something right now."`,
    agentNames: ['Rachel Kim'],
    difficultyLevel: 'beginner',
    estimatedDuration: 15,
    recommendedFor: 'SDRs, BDRs, and sales reps doing outbound prospecting',
  },

  // ===== D&D / ROLEPLAY SCENARIOS (4) =====
  {
    title: 'The Tavern Mystery',
    description: 'A classic D&D tavern encounter with intrigue. Practice roleplaying and social interaction with NPCs as you investigate a local mystery.',
    category: 'roleplay',
    agentsStartFirst: true,
    topic: `You're a traveling adventurer who's just arrived in the village of Millhaven. You enter the Rusty Flagon tavern seeking information about recent disappearances in the area.

The Dungeon Master sets the scene: "As you push open the heavy oak door, the smell of ale and roasted meat washes over you. The tavern is dimly lit, filled with locals nursing their drinks. Behind the bar, a grizzled dwarf is polishing a mug. He looks up as you enter. 'Well now, we don't get many strangers 'round here lately. Not since folks started vanishing on the Old Forest Road. What brings you to Millhaven, traveler?'"`,
    agentNames: ['Dungeon Master Aldric'],
    difficultyLevel: 'beginner',
    estimatedDuration: 20,
    recommendedFor: 'New D&D players or those wanting to practice roleplay and social encounters',
  },
  {
    title: 'The Goblin Ambush',
    description: 'Combat encounter with tactical decisions. Work with your party member to overcome enemies using strategy and teamwork.',
    category: 'roleplay',
    agentsStartFirst: true,
    topic: `You and your companion are traveling through the Thornwood Forest when you're ambushed by goblins. You must work together tactically to survive.

The DM describes the scene: "You're walking along the forest path when suddenly arrows whistle past your head! Roll for initiative! Three goblins emerge from the bushes - two with crude bows, one with a rusty sword. They have the high ground on a rocky outcrop 30 feet ahead."

Thora Ironheart growls: "Ambush! I'll take the front line. What's your move, friend?"`,
    agentNames: ['Dungeon Master Aldric', 'Thora Ironheart'],
    difficultyLevel: 'intermediate',
    estimatedDuration: 30,
    recommendedFor: 'Players wanting to practice tactical combat and party coordination',
  },
  {
    title: 'The Arcane Library Investigation',
    description: 'Mystery and puzzle-solving scenario. Use intelligence, investigation skills, and magical knowledge to uncover secrets.',
    category: 'roleplay',
    agentsStartFirst: true,
    topic: `You've been hired to investigate strange magical disturbances at an abandoned wizard's tower. You're accompanied by Lyra Moonshadow, an elf wizard with knowledge of the arcane.

The DM sets the scene: "You and Lyra stand before the obsidian doors of the Starweaver's Tower. Runes glow faintly along the doorframe, pulsing with an eerie blue light. The air crackles with residual magic."

Lyra examines the door: "Fascinating... these are warding runes, but they've been partially disrupted. Someone - or something - has been tampering with them. We should proceed carefully. Do you notice anything unusual?"`,
    agentNames: ['Dungeon Master Aldric', 'Lyra Moonshadow'],
    difficultyLevel: 'intermediate',
    estimatedDuration: 35,
    recommendedFor: 'Players who enjoy investigation, puzzles, and magical mysteries',
  },
  {
    title: 'The Dragon Negotiation',
    description: 'High-stakes diplomatic encounter. Negotiate with an ancient dragon while managing party dynamics and conflicting approaches.',
    category: 'roleplay',
    agentsStartFirst: true,
    topic: `Your party has entered the lair of Azurewing, an ancient blue dragon, to negotiate for a stolen artifact. The dragon is intelligent but dangerous. Thora wants to be direct and bold, Lyra counsels caution and diplomacy.

The DM narrates: "You enter the vast cavern, treasure glittering in every direction. At the center, coiled on a mountain of gold, is Azurewing. Her scales shimmer like sapphires, and her eyes - ancient and intelligent - fix upon you."

Azurewing's voice rumbles: "More tiny mortals seeking to steal from my hoard. How... predictable. Speak quickly before I lose interest."

Thora whispers urgently: "We should stand firm. Dragons respect strength."
Lyra counters quietly: "Careful. One wrong word and we're ash. Let me try reasoning with it."`,
    agentNames: ['Dungeon Master Aldric', 'Thora Ironheart', 'Lyra Moonshadow'],
    difficultyLevel: 'advanced',
    estimatedDuration: 40,
    recommendedFor: 'Experienced players who enjoy complex social encounters and party dynamics',
  },

  // ===== EDUCATION SCENARIOS (3) =====
  {
    title: 'Chemistry Tutoring - Stoichiometry',
    description: 'One-on-one tutoring session on chemical calculations. Practice explaining your thought process and asking questions.',
    category: 'education',
    agentsStartFirst: true,
    topic: `You're a student struggling with stoichiometry in your chemistry class. You have a tutoring session to prepare for your upcoming exam.

Professor Vasquez greets you warmly: "Welcome! I'm so glad you reached out for help. Stoichiometry trips up a lot of students at first, but once it clicks, you'll see it's really just organized problem-solving. Let's start with a problem: If you have 10 grams of hydrogen gas (H₂) reacting with excess oxygen, how many grams of water (H₂O) will you produce? Walk me through your thinking - don't worry about getting it perfect."`,
    agentNames: ['Professor Elena Vasquez'],
    difficultyLevel: 'beginner',
    estimatedDuration: 25,
    recommendedFor: 'Students learning chemistry fundamentals or practicing problem-solving',
  },
  {
    title: 'Study Group - Machine Learning Concepts',
    description: 'Collaborative study session with a peer and professor. Discuss concepts, work through problems together, and teach each other.',
    category: 'education',
    agentsStartFirst: true,
    topic: `You're studying for a machine learning midterm with your study buddy Alex and have invited Professor Vasquez for office hours. You're working through supervised vs unsupervised learning.

Alex starts: "Okay, so I understand that supervised learning uses labeled data, but I'm confused about when you'd actually use unsupervised learning in the real world. Can you think of any examples?"

Professor Vasquez adds: "That's an excellent question to explore together. Before I jump in, what's your intuition? When might you have data but no labels?"`,
    agentNames: ['Professor Elena Vasquez', 'Alex Kumar'],
    difficultyLevel: 'intermediate',
    estimatedDuration: 30,
    recommendedFor: 'Students preparing for exams or learning technical concepts collaboratively',
  },
  {
    title: 'Thesis Defense Preparation',
    description: 'Practice defending your research thesis. Face challenging questions about methodology, results, and implications from academic reviewers.',
    category: 'education',
    agentsStartFirst: true,
    topic: `You're preparing to defend your master's thesis on renewable energy optimization. You're doing a mock defense with Professor Vasquez (your advisor) and Dr. Brooks (your external reviewer).

Dr. Brooks opens with a pointed question: "I've reviewed your thesis, and while the results are interesting, I have concerns about your methodology. In chapter 3, you use a Monte Carlo simulation with 10,000 iterations. Can you justify why that sample size is sufficient? And what sensitivity analysis did you perform on your key assumptions?"`,
    agentNames: ['Professor Elena Vasquez', 'Dr. Alan Brooks'],
    difficultyLevel: 'advanced',
    estimatedDuration: 40,
    recommendedFor: 'Graduate students preparing for thesis or dissertation defenses',
  },

  // ===== WELLNESS / COACHING SCENARIOS (2) =====
  {
    title: 'Career Transition Coaching',
    description: 'Work with a life coach to navigate a career change. Explore your values, fears, and create an actionable plan.',
    category: 'wellness',
    agentsStartFirst: true,
    topic: `You're considering a major career transition but feel stuck and uncertain. You've hired a life coach to help you work through this decision.

Dr. Williams begins: "Thank you for trusting me with this session. I know career transitions can feel overwhelming, but they're also opportunities for tremendous growth. You mentioned in your intake form that you're considering leaving your corporate job to pursue something more meaningful. Tell me - if you woke up five years from now and your career transition had been wildly successful, what would that look like? Don't filter yourself, just describe it."`,
    agentNames: ['Dr. Patricia Williams'],
    difficultyLevel: 'beginner',
    estimatedDuration: 30,
    recommendedFor: 'Professionals considering career changes or seeking clarity on life direction',
  },
  {
    title: 'Goal Setting & Accountability Session',
    description: 'Set concrete goals and create accountability systems with a life coach. Practice committing to challenging objectives.',
    category: 'wellness',
    agentsStartFirst: true,
    topic: `You've been working with your coach for a few weeks and are ready to set concrete goals for the next quarter. It's time to get specific and create accountability.

Dr. Williams opens the session: "Welcome back! Last time we talked about your desire to improve your health, advance your career, and spend more time with family. Those are great intentions, but today we need to turn them into specific, measurable goals. Let's start with health. You mentioned wanting to 'get in shape.' What does that actually mean for you? What would success look like in 90 days?"`,
    agentNames: ['Dr. Patricia Williams'],
    difficultyLevel: 'intermediate',
    estimatedDuration: 25,
    recommendedFor: 'Anyone wanting to practice goal-setting, accountability, and personal development',
  },

  // ===== DEBATE / DISCUSSION SCENARIOS (2) =====
  {
    title: 'AI Ethics Debate',
    description: 'Structured debate on AI ethics. Defend positions, counter arguments, and navigate complex ethical questions with a devil\'s advocate and moderator.',
    category: 'debate',
    agentsStartFirst: true,
    topic: `You're participating in a debate on AI ethics. The topic is: "Should AI companies be required to open-source their models for public safety?" You'll argue with a devil's advocate while a moderator ensures productive discussion.

Sophia (moderator) sets the stage: "Welcome to today's debate. We'll be discussing AI transparency and safety. To start, I'd like to hear your opening position. Should frontier AI labs be legally required to open-source their models? You have 90 seconds for your opening statement."

Dr. Morrison (devil's advocate) adds: "And I'll be ready to challenge whatever position you take. This should be interesting."`,
    agentNames: ['Dr. James Morrison', 'Sophia Okafor'],
    difficultyLevel: 'advanced',
    estimatedDuration: 35,
    recommendedFor: 'Anyone wanting to practice argumentative skills, critical thinking, or prepare for debates',
  },
  {
    title: 'Town Hall Q&A Practice',
    description: 'Practice handling tough questions from a moderator in a town hall format. Great for executives, politicians, or anyone facing public speaking.',
    category: 'debate',
    agentsStartFirst: true,
    topic: `You're a company executive preparing for an all-hands meeting after recent layoffs. You need to practice handling difficult questions from employees with a professional moderator.

Sophia begins: "Thank you for doing this prep session. I'm going to play the role of your moderator in the town hall, but I'll be asking the tough questions your employees are thinking. Let's start with this one: 'You just laid off 15% of the workforce while reporting record profits. How do you justify cutting people during our most profitable year ever?'"`,
    agentNames: ['Sophia Okafor'],
    difficultyLevel: 'advanced',
    estimatedDuration: 30,
    recommendedFor: 'Executives, managers, politicians, or anyone preparing for difficult public speaking',
  },

  // ===== LANGUAGE LEARNING SCENARIO (1) =====
  {
    title: 'French Conversation Practice',
    description: 'Practice conversational French in a relaxed setting. Discuss everyday topics, get corrections, and improve fluency with a native speaker.',
    category: 'language',
    agentsStartFirst: true,
    topic: `You're practicing conversational French with Pierre, a native speaker and language tutor. Today's topic is discussing your hobbies and weekend plans.

Pierre greets you warmly: "Bonjour! Comment allez-vous aujourd'hui? Today we practice talking about hobbies and ze weekend, oui? I start us off: What do you like to do in your free time? En français, s'il vous plaît - don't worry about mistakes, I will help you!"`,
    agentNames: ['Pierre Dubois'],
    difficultyLevel: 'beginner',
    estimatedDuration: 20,
    recommendedFor: 'French learners at A2-B1 level wanting to practice conversation',
  },
];

async function seedScenarios() {
  console.log('🌱 Seeding scenarios...\n');

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Get all agents once at the start
  const allAgents = AgentModel.findAll();
  console.log(`📊 Found ${allAgents.length} agents in database\n`);

  for (const scenarioData of DEFAULT_SCENARIOS) {
    try {
      // Look up agent IDs by name
      const agentIds: string[] = [];
      for (const agentName of scenarioData.agentNames) {
        const agent = allAgents.find(a => a.name === agentName);
        if (!agent) {
          console.log(`⚠️  Warning: Agent "${agentName}" not found for scenario "${scenarioData.title}"`);
          errors.push(`Agent "${agentName}" not found for scenario "${scenarioData.title}"`);
        } else {
          agentIds.push(agent.id);
        }
      }

      if (agentIds.length === 0) {
        console.log(`❌ Skipping "${scenarioData.title}" - no agents found\n`);
        skipped++;
        continue;
      }

      // Check if scenario already exists (by title)
      const existing = ScenarioModel.findAll().find(s => s.title === scenarioData.title);

      if (existing) {
        // Update existing scenario
        const updated = ScenarioModel.update(existing.id, {
          title: scenarioData.title,
          description: scenarioData.description,
          category: scenarioData.category,
          topic: scenarioData.topic,
          agentIds,
          agentsStartFirst: scenarioData.agentsStartFirst !== undefined ? scenarioData.agentsStartFirst : true,
          difficultyLevel: scenarioData.difficultyLevel,
          estimatedDuration: scenarioData.estimatedDuration,
          recommendedFor: scenarioData.recommendedFor,
        });

        console.log(`🔄 Updated "${scenarioData.title}" (${scenarioData.category}, ${agentIds.length} agents)\n`);
        created++;
      } else {
        // Create the scenario
        const scenario = ScenarioModel.create({
          title: scenarioData.title,
          description: scenarioData.description,
          category: scenarioData.category,
          topic: scenarioData.topic,
          agentIds,
          agentsStartFirst: scenarioData.agentsStartFirst !== undefined ? scenarioData.agentsStartFirst : true,
          difficultyLevel: scenarioData.difficultyLevel,
          estimatedDuration: scenarioData.estimatedDuration,
          recommendedFor: scenarioData.recommendedFor,
        });

        console.log(`✅ Created "${scenario.title}" (${scenario.category}, ${agentIds.length} agents)\n`);
        created++;
      }
    } catch (error: any) {
      console.error(`❌ Error creating scenario "${scenarioData.title}":`, error.message);
      errors.push(`Failed to create "${scenarioData.title}": ${error.message}`);
      skipped++;
    }
  }

  console.log('\n📊 Seeding Summary:');
  console.log(`✅ Created: ${created} scenarios`);
  console.log(`⏭️  Skipped: ${skipped} scenarios`);

  if (errors.length > 0) {
    console.log(`\n⚠️  Errors encountered:`);
    errors.forEach(err => console.log(`  - ${err}`));
  }

  console.log('\n✨ Scenario seeding complete!\n');
}

// Run the seeding function if this file is executed directly
if (require.main === module) {
  seedScenarios()
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error during seeding:', error);
      process.exit(1);
    });
}

export { seedScenarios, DEFAULT_SCENARIOS };

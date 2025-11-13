import { AgentModel } from './models/agent.model';

/**
 * Script to add avatars to existing agents
 * Run with: npx tsx src/update-avatars.ts
 */

const AVATAR_UPDATES = [
  {
    name: 'Miguel Vasquez Wiley',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MiguelVasquezWiley&backgroundColor=ff7675',
  },
  {
    name: 'Nick Heap',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NickHeap&backgroundColor=74b9ff',
  },
  {
    name: 'Alex Savage',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlexSavage&backgroundColor=00b894',
  },
];

async function updateAvatars() {
  console.log('🎨 Updating agent avatars...\n');

  let updated = 0;
  let notFound = 0;

  for (const { name, avatarUrl } of AVATAR_UPDATES) {
    const agents = AgentModel.findAll();
    const agent = agents.find(a => a.name === name);

    if (!agent) {
      console.log(`❌ Agent "${name}" not found`);
      notFound++;
      continue;
    }

    AgentModel.update(agent.id, { avatarUrl });
    console.log(`✅ Updated avatar for "${name}"`);
    updated++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updated} agents`);
  console.log(`   Not found: ${notFound} agents\n`);

  if (updated > 0) {
    console.log('🎉 Avatar updates complete!\n');
  }
}

// Run if called directly
if (require.main === module) {
  updateAvatars()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Error updating avatars:', error);
      process.exit(1);
    });
}

export { updateAvatars };

import { AgentModel } from './models/agent.model';

const agents = AgentModel.findAll();
console.log('\nExisting agents:');
agents.forEach(a => console.log(`  - ${a.name}`));
console.log(`\nTotal: ${agents.length} agents\n`);

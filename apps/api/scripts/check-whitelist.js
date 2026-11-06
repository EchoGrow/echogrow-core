const fs = require('fs');
const path = require('path');

const whitelistPath = path.join(__dirname, '../../../packages/shared/src/data/whitelist.json');

const whitelist = JSON.parse(fs.readFileSync(whitelistPath, 'utf8'));

async function checkUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.status;
  } catch (error) {
    return 'Error: ' + error.message;
  }
}

async function main() {
  console.log(`Checking ${whitelist.length} skills...`);
  let invalidCount = 0;

  for (const skill of whitelist) {
    console.log(`\n[${skill.skillName}]`);
    for (const resource of skill.resources) {
      const status = await checkUrl(resource.resourceUrl);
      const isOk = status === 200;
      if (!isOk) invalidCount++;
      
      console.log(`  ${isOk ? '✅' : '❌'} [${status}] ${resource.resourceTitle} - ${resource.resourceUrl}`);
    }
  }

  console.log(`\n\nTotal invalid URLs: ${invalidCount}`);
}

main();
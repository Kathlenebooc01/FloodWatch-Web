const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/GEMINI_LANTAW_AI=([^\r\n]+)/);
if(match) {
  let key = match[1].trim();
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }
  fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key)
    .then(res => res.json())
    .then(data => {
      console.log(data.models.map(m => m.name).join('\n'));
    }).catch(console.error);
} else {
  console.log('No match');
}

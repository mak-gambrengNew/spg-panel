import fs from 'node:fs'
import path from 'node:path'
const root = path.resolve(new URL('..', import.meta.url).pathname)
const read = f => fs.readFileSync(path.join(root,f),'utf8')
const checks = [
  ['React entry', fs.existsSync(path.join(root,'src/main.jsx'))],
  ['PWA manifest', fs.existsSync(path.join(root,'public/manifest.webmanifest'))],
  ['Service worker', fs.existsSync(path.join(root,'public/sw.js'))],
  ['Supabase client', read('src/lib/supabase.js').includes('@supabase/supabase-js')],
  ['SPG login endpoint', read('src/lib/api.js').includes("'spg-login'" )],
  ['Login stores Supabase session', read('src/components/Access.jsx').includes('setSession')],
  ['Gerai context endpoint', read('src/lib/api.js').includes("'gerai-context'" )],
  ['Operations endpoint', read('src/lib/api.js').includes("'gerai-operations'" )],
  ['Monitoring endpoint', read('src/lib/api.js').includes('monitoring-ingest-sale')],
  ['IndexedDB queue', read('src/lib/idb.js').includes('pending-sales')],
  ['No simulated serverApply', !['src/App.jsx','src/components/Access.jsx','src/components/Dashboard.jsx','src/components/OpeningForm.jsx','src/lib/api.js'].some(x=>read(x).includes('serverApply'))],
  ['No hardcoded Gerai 1', !['src/App.jsx','src/components/Access.jsx','src/components/Dashboard.jsx','src/components/OpeningForm.jsx','src/lib/api.js'].some(x=>read(x).includes('Gerai 1'))],
  ['No SPG close UI', !read('src/App.jsx').includes("operation('close'") && !read('src/components/Dashboard.jsx').includes("operation('close'")],
]
let fail=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)fail++}
process.exitCode=fail?1:0

const envExample = read('.env.example')
const extraChecks = [
  ['VAPID public env documented', envExample.includes('VITE_VAPID_PUBLIC_KEY=')],
  ['VAPID private key not in frontend env example', !envExample.includes('VAPID_PRIVATE_KEY=')],
  ['Push config endpoint implemented', read('src/lib/push.js').includes('gerai-push-config') && fs.existsSync(path.join(root,'supabase/functions/gerai-push-config/index.ts'))],
  ['Push sender uses VAPID secret', read('supabase/functions/send-web-push/index.ts').includes('VAPID_PRIVATE_KEY')],
  ['Supabase CI workflow', fs.existsSync(path.join(root,'.github/workflows/supabase-functions.yml'))],
  ['Push config derives public key from secret', read('supabase/functions/gerai-push-config/index.ts').includes('VAPID_PRIVATE_KEY') && read('supabase/functions/gerai-push-config/index.ts').includes('getPublicKey')],
]
for (const [name, ok] of extraChecks) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) fail++ }
process.exitCode=fail?1:0

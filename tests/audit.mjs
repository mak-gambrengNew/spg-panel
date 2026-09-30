import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(new URL('..', import.meta.url).pathname)

const read = f => fs.readFileSync(path.join(root, f), 'utf8')
const exists = f => fs.existsSync(path.join(root, f))

const checks = [
  ['React entry', exists('src/main.jsx')],

  ['PWA manifest', exists('public/manifest.webmanifest')],

  ['Service worker', exists('public/sw.js')],

  [
    'Supabase client',
    read('src/lib/supabase.js').includes('@supabase/supabase-js')
  ],

  [
    'SPG login endpoint',
    read('src/lib/api.js').includes("'spg-login'")
  ],

  [
    'Login stores Supabase session',
    read('src/components/Access.jsx').includes('setSession')
  ],

  [
    'Gerai context endpoint',
    read('src/lib/api.js').includes("'gerai-context'")
  ],

  [
    'Operations endpoint',
    read('src/lib/api.js').includes("'gerai-operations'")
  ],

  [
    'Monitoring endpoint',
    read('src/lib/api.js').includes('monitoring-ingest-sale')
  ],

  [
    'IndexedDB queue',
    read('src/lib/idb.js').includes('pending-sales')
  ],

  [
    'No simulated serverApply',
    ![
      'src/App.jsx',
      'src/components/Access.jsx',
      'src/components/Dashboard.jsx',
      'src/components/OpeningForm.jsx',
      'src/lib/api.js'
    ].some(x => read(x).includes('serverApply'))
  ],

  [
    'No hardcoded Gerai 1',
    ![
      'src/App.jsx',
      'src/components/Access.jsx',
      'src/components/Dashboard.jsx',
      'src/components/OpeningForm.jsx',
      'src/lib/api.js'
    ].some(x => read(x).includes('Gerai 1'))
  ],

  [
    'No SPG close UI',
    !read('src/App.jsx').includes("operation('close'") &&
    !read('src/components/Dashboard.jsx').includes("operation('close'")
  ]
]

let fail = 0

for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) fail++
}


/* =========================================================
   PRODUCTION ENVIRONMENT
   ========================================================= */

const envProductionPath = path.join(root, '.env.production')

if (!fs.existsSync(envProductionPath)) {
  console.error('FAIL  .env.production exists')
  fail++
  process.exitCode = 1
  process.exit()
}

const envProduction = read('.env.production')

const extraChecks = [
  [
    'VAPID public env documented',
    envProduction.includes('VITE_VAPID_PUBLIC_KEY=')
  ],

  [
    'VAPID public key has value',
    /^VITE_VAPID_PUBLIC_KEY=.+$/m.test(envProduction)
  ],

  [
    'VAPID private key not exposed in frontend env',
    !envProduction.includes('VAPID_PRIVATE_KEY=')
  ],

  [
    'Push config endpoint implemented',
    read('src/lib/push.js').includes('gerai-push-config') &&
    exists('supabase/functions/gerai-push-config/index.ts')
  ],

  [
    'Push sender uses VAPID secret',
    read('supabase/functions/send-web-push/index.ts')
      .includes('VAPID_PRIVATE_KEY')
  ],

  [
    'Supabase CI workflow',
    exists('.github/workflows/supabase-functions.yml')
  ],

  [
    'Push config derives public key from secret',
    read('supabase/functions/gerai-push-config/index.ts')
      .includes('VAPID_PRIVATE_KEY') &&
    read('supabase/functions/gerai-push-config/index.ts')
      .includes('getPublicKey')
  ]
]

for (const [name, ok] of extraChecks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) fail++
}

process.exitCode = fail ? 1 : 0

/**
 * setup-admin.js
 * Creates the initial admin user in Supabase and seeds default categories.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/setup-admin.js
 *
 * Or create a .env.setup file with those two vars and run:
 *   node scripts/setup-admin.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'

// Load .env.setup if present
const envFile = new URL('../.env.setup', import.meta.url).pathname
if (existsSync(envFile)) {
  const lines = readFileSync(envFile, 'utf-8').split('\n')
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim()
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  console.error('Create a .env.setup file or export them as environment variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ADMIN_EMAIL = 'gspolidoro@admin.local'
const ADMIN_USERNAME = 'gspolidoro'
const ADMIN_PASSWORD = 'fdsa73fE'

const DEFAULT_CATEGORIES = [
  // Income
  { name: 'Rental Income', type: 'income' },
  { name: 'Late Fee', type: 'income' },
  { name: 'Parking', type: 'income' },
  { name: 'Laundry / Vending', type: 'income' },
  { name: 'Security Deposit', type: 'income' },
  { name: 'Other Income', type: 'income' },
  // Expenses
  { name: 'Mortgage / Loan Payment', type: 'expense' },
  { name: 'Property Tax', type: 'expense' },
  { name: 'Insurance', type: 'expense' },
  { name: 'HOA Fees', type: 'expense' },
  { name: 'Repairs & Maintenance', type: 'expense' },
  { name: 'Utilities', type: 'expense' },
  { name: 'Property Management', type: 'expense' },
  { name: 'Advertising / Marketing', type: 'expense' },
  { name: 'Legal & Professional', type: 'expense' },
  { name: 'Landscaping', type: 'expense' },
  { name: 'Capital Improvements', type: 'expense' },
  { name: 'Other Expense', type: 'expense' },
]

async function main() {
  console.log('Setting up admin user…')

  // 1. Create auth user
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { username: ADMIN_USERNAME, role: 'admin' },
  })

  if (userError) {
    if (userError.message.includes('already been registered')) {
      console.log('User already exists — skipping user creation.')
      // Fetch the existing user
      const { data: listData } = await supabase.auth.admin.listUsers()
      const existing = listData?.users.find(u => u.email === ADMIN_EMAIL)
      if (existing) {
        await seedCategories(existing.id)
      }
      return
    }
    throw userError
  }

  const userId = userData.user.id
  console.log(`Admin user created: ${ADMIN_USERNAME} (${ADMIN_EMAIL})`)

  // 2. Upsert profile with admin role (trigger may have already created it)
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId, username: ADMIN_USERNAME, role: 'admin' })

  if (profileError) throw profileError
  console.log('Profile set to admin role.')

  // 3. Seed default categories
  await seedCategories(userId)

  console.log('\n✅ Setup complete!')
  console.log(`   Login email:    ${ADMIN_EMAIL}`)
  console.log(`   Login password: ${ADMIN_PASSWORD}`)
  console.log('\nIMPORTANT: Change the password after first login!')
}

async function seedCategories(userId) {
  const rows = DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: userId }))
  const { error } = await supabase.from('categories').upsert(rows, { onConflict: 'user_id,name,type' })
  if (error) {
    console.warn('Could not seed categories (may already exist):', error.message)
  } else {
    console.log(`Seeded ${rows.length} default categories.`)
  }
}

main().catch(err => {
  console.error('Setup failed:', err.message)
  process.exit(1)
})

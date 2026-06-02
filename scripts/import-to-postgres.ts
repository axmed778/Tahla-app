import fs from 'fs'
import { PrismaClient } from '@prisma/client'

const data = JSON.parse(fs.readFileSync('./migration-export.json', 'utf-8'))
const pg = new PrismaClient()

async function main() {
  console.log('Starting import...')
  console.log(`Found: ${data.users?.length} users, ${data.people?.length} people, ${data.tags?.length} tags, ${data.relationships?.length} relationships`)

  for (const user of data.users ?? []) {
    await pg.user.upsert({ where: { id: user.id }, update: user, create: user })
  }
  console.log('✅ Users done')

  for (const tag of data.tags ?? []) {
    await pg.tag.upsert({ where: { id: tag.id }, update: tag, create: tag })
  }
  console.log('✅ Tags done')

  for (const { phones, emails, tags, ...person } of data.people ?? []) {
    await pg.person.upsert({ where: { id: person.id }, update: person, create: person })
  }
  console.log('✅ People done')

  for (const rel of data.relationships ?? []) {
    await pg.relationship.upsert({ where: { id: rel.id }, update: rel, create: rel })
  }
  console.log('✅ Relationships done — migration complete!')
}

main().catch(console.error).finally(() => pg.$disconnect())
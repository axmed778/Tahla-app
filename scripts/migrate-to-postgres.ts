import { PrismaClient as SQLiteClient } from '@prisma/client'

// We'll read from SQLite and print JSON exports
const sqlite = new SQLiteClient({
    datasources: { db: { url: 'file:./dev.db' } }
})

async function main() {
  const people = await sqlite.person.findMany({ include: { phones: true, emails: true, tags: true } })
  const relationships = await sqlite.relationship.findMany()
  const users = await sqlite.user.findMany()
  const tags = await sqlite.tag.findMany()

  const fs = await import('fs')
  fs.writeFileSync('migration-export.json', JSON.stringify({ people, relationships, users, tags }, null, 2))
  console.log('✅ Exported to migration-export.json')
}

main().catch(console.error).finally(() => sqlite.$disconnect())
// MILESTONE_3.md §6: seeds SystemSetting rows from SETTING_DEFAULTS so the
// admin settings resource (Phase 24) has real, editable rows from day one
// rather than relying purely on SettingsService's in-code fallback.
// Idempotent (upsert by key) - safe to re-run.
import { PrismaClient } from '@prisma/client';
import { SETTING_DEFAULTS } from '../../src/settings/settings.constants';

const prisma = new PrismaClient();

async function main() {
  for (const [key, { value, description }] of Object.entries(SETTING_DEFAULTS)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { description },
      create: { key, value, description },
    });
  }
  console.log('System settings seeded.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

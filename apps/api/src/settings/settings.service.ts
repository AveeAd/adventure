import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SETTING_DEFAULTS } from './settings.constants';

// In-memory cache over SystemSetting, invalidated (reloaded) on every
// write, so hot paths (approval eligibility checks, point awards) never
// hit the DB just to read a threshold. Unknown/unseeded keys fall back to
// SETTING_DEFAULTS rather than throwing, so a fresh DB before the seed
// script runs still behaves correctly.
@Injectable()
export class SettingsService implements OnModuleInit {
  private cache = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    const rows = await this.prisma.systemSetting.findMany();
    this.cache = new Map(rows.map((row) => [row.key, row.value]));
  }

  get(key: string): string {
    const value = this.cache.get(key) ?? SETTING_DEFAULTS[key]?.value;
    if (value === undefined) {
      throw new BadRequestException(`Unknown setting key: ${key}`);
    }
    return value;
  }

  getNumber(key: string): number {
    return Number(this.get(key));
  }

  async set(key: string, value: string, updatedById: string): Promise<void> {
    if (!(key in SETTING_DEFAULTS)) {
      throw new BadRequestException(`Unknown setting key: ${key}`);
    }
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value, description: SETTING_DEFAULTS[key].description, updatedById },
      update: { value, updatedById },
    });
    this.cache.set(key, value);
  }

  list(): { key: string; value: string; description: string }[] {
    return Object.keys(SETTING_DEFAULTS).map((key) => ({
      key,
      value: this.get(key),
      description: SETTING_DEFAULTS[key].description,
    }));
  }
}

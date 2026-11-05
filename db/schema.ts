import { pgTable, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

// One row per monitored campaign site. The full ProjectRecord (SSL details,
// history, campaign attributes) is kept in `data`; `position` preserves list order.
export const projects = pgTable('projects', {
  id: text().primaryKey(),
  position: integer().notNull().default(0),
  data: jsonb().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Singleton application documents: scheduled run logs, Google Sheet config,
// email settings, email alert logs and the background check status.
export const appState = pgTable('app_state', {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

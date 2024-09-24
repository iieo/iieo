import { bigserial, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['student', 'teacher']);
export type RoleEnumType = (typeof roleEnum.enumValues)[number];

export const userTable = pgTable('user', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  passwordSalt: text('password_salt').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
export type UserRow = typeof userTable.$inferSelect;

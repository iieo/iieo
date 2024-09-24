import { eq } from 'drizzle-orm';

import { db, UserRow, userTable } from '..';
import { createPasswordHash, generateSalt, makeHash } from '../crypto';

export async function dbGetUserById(userId: number): Promise<UserRow> {
  const user = (await db.select().from(userTable).where(eq(userTable.id, userId)))[0];

  if (user === undefined) {
    throw Error(`No user with id ${userId} found`);
  }

  return user;
}

export async function dbGetUserByEmailAndPassword(
  email: string,
  plainPassword: string,
): Promise<UserRow> {
  const maybeUser = (await db.select().from(userTable).where(eq(userTable.email, email)))[0];

  if (maybeUser === undefined) {
    throw Error(`No user with email '${email}' found`);
  }

  const passwordHash = createPasswordHash(plainPassword, maybeUser.passwordSalt);

  if (maybeUser.passwordHash !== passwordHash) {
    throw Error(`Passwords for user with email ${email} do not match.`);
  }
  return maybeUser;
}

export async function dbRegisterNewUser(email: string, name: string, plainPassword: string) {
  const rows = await db.select().from(userTable).where(eq(userTable.email, email));

  if (rows.length > 0) throw new Error('Email already exists.');

  const passwordSalt = makeHash(generateSalt());

  const passwordHash = createPasswordHash(plainPassword, passwordSalt);

  await db.insert(userTable).values({
    email,
    name,
    passwordHash,
    passwordSalt,
  });

  return { plainPassword };
}

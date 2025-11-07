import logger from '#config/logger.js';
import { db } from '#config/database.js';
import { users } from '#models/user.model.js';
import { eq } from 'drizzle-orm';
import { hashPassword } from '#services/auth.service.js';

// Select projection to avoid exposing password
const userProjection = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  created_at: users.created_at,
  updated_at: users.updated_at,
};

export const getAllUsers = async () => {
  try {
    const rows = await db.select(userProjection).from(users);
    return rows;
  } catch (e) {
    logger.error(`Error fetching users: ${e}`);
    throw e;
  }
};

export const getUserById = async (id) => {
  try {
    const rows = await db.select(userProjection).from(users).where(eq(users.id, id)).limit(1);
    return rows[0] || null;
  } catch (e) {
    logger.error(`Error fetching user by id=${id}: ${e}`);
    throw e;
  }
};

export const updateUser = async (id, updates) => {
  try {
    // Ensure the user exists
    const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing || existing.length === 0) {
      throw new Error('User not found');
    }

    const toUpdate = {};
    if (typeof updates.name === 'string') toUpdate.name = updates.name;
    if (typeof updates.email === 'string') toUpdate.email = updates.email;
    if (typeof updates.role === 'string') toUpdate.role = updates.role;
    if (typeof updates.password === 'string') {
      toUpdate.password = await hashPassword(updates.password);
    }

    if (Object.keys(toUpdate).length === 0) {
      // Nothing to update; return current projection
      const [current] = await db
        .select(userProjection)
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return current;
    }

    const [updated] = await db
      .update(users)
      .set(toUpdate)
      .where(eq(users.id, id))
      .returning(userProjection);

    logger.info(`User ${id} updated`);
    return updated;
  } catch (e) {
    logger.error(`Error updating user id=${id}: ${e}`);
    throw e;
  }
};

export const deleteUser = async (id) => {
  try {
    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning(userProjection);

    if (!deleted) {
      throw new Error('User not found');
    }

    logger.info(`User ${id} deleted`);
    return deleted;
  } catch (e) {
    logger.error(`Error deleting user id=${id}: ${e}`);
    throw e;
  }
};

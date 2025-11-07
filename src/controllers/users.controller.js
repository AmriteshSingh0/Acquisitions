import logger from '#config/logger.js';
import { cookies } from '#utils/cookies.js';
import { jwttoken } from '#utils/jwt.js';
import { userIdSchema, updateUserSchema } from '#validations/users.validation.js';
import { getAllUsers, getUserById as svcGetUserById, updateUser as svcUpdateUser, deleteUser as svcDeleteUser } from '#services/users.service.js';

const getAuthUser = (req) => {
  try {
    const token = cookies.get(req, 'token');
    if (!token) return null;
    const payload = jwttoken.verify(token);
    return payload; // { id, email, role }
  } catch (_) {
    return null;
  }
};

export const getAll = async (req, res, next) => {
  try {
    logger.info('Getting users...');
    const allUsers = await getAllUsers();
    res.status(200).json({
      message: 'Successfully retrieved users',
      users: allUsers,
      count: allUsers.length,
    });
  } catch (e) {
    logger.error('Get all users error', e);
    next(e);
  }
};

// Back-compat alias if other modules import fetchAllUsers
export const fetchAllUsers = getAll;

export const getUserById = async (req, res, next) => {
  try {
    const parsed = userIdSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed' });
    }

    const { id } = parsed.data;
    const user = await svcGetUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (e) {
    logger.error('Get user by id error', e);
    next(e);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const idParsed = userIdSchema.safeParse(req.params);
    if (!idParsed.success) {
      return res.status(400).json({ error: 'Validation failed' });
    }

    const bodyParsed = updateUserSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({ error: 'Validation failed' });
    }

    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = idParsed.data;

    const isAdmin = authUser.role === 'admin';
    const isSelf = authUser.id === id;
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = { ...bodyParsed.data };
    if (Object.prototype.hasOwnProperty.call(updates, 'role') && !isAdmin) {
      return res.status(403).json({ error: 'Only admin can change role' });
    }

    const updated = await svcUpdateUser(id, updates);
    res.status(200).json({ message: 'User updated successfully', user: updated });
  } catch (e) {
    logger.error('Update user error', e);
    if (e.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    next(e);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const parsed = userIdSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed' });
    }

    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = parsed.data;
    const isAdmin = authUser.role === 'admin';
    const isSelf = authUser.id === id;
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const deleted = await svcDeleteUser(id);
    res.status(200).json({ message: 'User deleted successfully', user: deleted });
  } catch (e) {
    logger.error('Delete user error', e);
    if (e.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    next(e);
  }
};

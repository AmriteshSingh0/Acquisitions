import express from 'express';
import { getAll, getUserById, updateUser, deleteUser } from '#controllers/users.controller.js';
import { requireAuth } from '#middleware/auth.middleware.js';

const router = express.Router();

router.get('/', getAll);
router.get('/:id', requireAuth, getUserById);
router.patch('/:id', requireAuth, updateUser);
router.delete('/:id', requireAuth, deleteUser);

export default router;

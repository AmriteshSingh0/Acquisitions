/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import { signupSchema, signInSchema } from '#validations/auth.validation.js';
import { formatValidationError } from '#utils/format.js';
import logger from '#config/logger.js';
import { createUser, authenticateUser } from '#services/auth.service.js';
import { jwttoken } from '#utils/jwt.js';
import { cookies } from '#utils/cookies.js';

export const signup = async (req, res, next) => {
  try {
    const validationResult = signupSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error)
      });
    }

    const { email, name } = validationResult.data;

    const user = await createUser(validationResult.data);

    const token = jwttoken.sign({ id: user.id, email: user.email, role: user.role });

    cookies.set(res, 'token', token);

    logger.info(`User signed up with email: ${email}, name: ${name}`);
    res.status(201).json({
      message: 'User signed up successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      }
    });

  } catch (e) {
    logger.error('Signup error', e);

    if (e.message === 'User with this email already exists') {
      return res.status(409).json({ error: 'Email already exist' });
    }

    next(e);
  }
};

export const signIn = async (req, res, next) => {
  try {
    const validationResult = signInSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error)
      });
    }

    const { email, password } = validationResult.data;

    const user = await authenticateUser({ email, password });

    const token = jwttoken.sign({ id: user.id, email: user.email, role: user.role });

    cookies.set(res, 'token', token);

    logger.info(`User signed in with email: ${email}`);
    res.status(200).json({
      message: 'User signed in successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      }
    });

  } catch (e) {
    logger.error('Sign-in error', e);

    if (e.message === 'User not found' || e.message === 'Invalid password') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    next(e);
  }
};

export const signOut = async (req, res, next) => {
  try {
    cookies.clear(res, 'token');
    logger.info('User signed out');
    res.status(200).json({ message: 'User signed out successfully' });
  } catch (e) {
    logger.error('Sign-out error', e);
    next(e);
  }
};

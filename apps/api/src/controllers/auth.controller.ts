import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { generateToken, AuthRequest } from '../middlewares/auth';

const COOKIE_NAME = 'token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  // secure: only send over HTTPS in production
  secure: process.env.NODE_ENV === 'production',
  // strict: don't send on cross-site requests
  sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  // 7 days in milliseconds
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

export async function register(req: Request, res: Response) {
  const { name, email, password, phone } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  const token = generateToken(user);

  // Set httpOnly cookie so Next.js middleware can read it for route protection
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

  res.status(201).json({
    status: 'success',
    data: { user, token },
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = generateToken(user);

  // Set httpOnly cookie so Next.js middleware can read it for route protection
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

  res.json({
    status: 'success',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      token,
    },
  });
}

export async function logout(_req: Request, res: Response) {
  // Clear the httpOnly cookie
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ status: 'success', message: 'Logged out successfully' });
}

export async function getMe(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      role: true,
      createdAt: true,
      addresses: true,
    },
  });

  res.json({ status: 'success', data: { user } });
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const { name, phone, avatar } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { name, phone, avatar },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      role: true,
    },
  });

  res.json({ status: 'success', data: { user } });
}

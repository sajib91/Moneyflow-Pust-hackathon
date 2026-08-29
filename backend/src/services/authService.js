import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { ValidationError, UnauthorizedError, ConflictError } from '../errors/ApiError.js';
import prisma from '../config/prisma.js';
import * as userRepo from '../repositories/userRepository.js';
import * as accountRepo from '../repositories/accountRepository.js';

const SALT_ROUNDS = 12;

export async function register(input) {
  const existingEmail = await userRepo.findUserByEmail(prisma, input.email);
  if (existingEmail) throw new ConflictError('Email already registered', 'EMAIL_EXISTS');

  const existingPhone = await userRepo.findUserByPhone(prisma, input.phone);
  if (existingPhone) throw new ConflictError('Phone already registered', 'PHONE_EXISTS');

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await userRepo.createUser(tx, {
      email: input.email,
      phone: input.phone,
      name: input.name,
      password: passwordHash,
    });

    await accountRepo.createAccount(tx, newUser.id, config.defaultUserBalance);

    return newUser;
  });

  return generateToken(user);
}

export async function login(email, password) {
  const user = await userRepo.findUserByEmail(prisma, email);
  if (!user || !user.active) throw new UnauthorizedError('Invalid credentials');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new UnauthorizedError('Invalid credentials');

  return generateToken(user);
}

function generateToken(user) {
  const token = jwt.sign({ id: user.id, email: user.email }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
  return {
    token,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export async function getProfile(userId) {
  const user = await userRepo.findUserById(prisma, userId);
  if (!user || !user.active) throw new UnauthorizedError('User not found');

  const account = await accountRepo.findAccountByUserId(prisma, userId);
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    balance: account?.balance ?? 0n,
  };
}
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { config } from '../config/index.js';
import {
  InvalidCredentialsError,
  AuthenticationRequiredError,
  UserInactiveError,
  EmailExistsError,
  PhoneExistsError,
} from '../errors/ApiError.js';
import prisma from '../config/prisma.js';
import * as userRepo from '../repositories/userRepository.js';
import * as accountRepo from '../repositories/accountRepository.js';

const SALT_ROUNDS = 12;
// Welcome credit applied to every new account, in BDT (DECIMAL(18,2) column).
// Applied by an explicit database operation inside the registration
// transaction — never by faking values elsewhere.
const WELCOME_BALANCE = new Prisma.Decimal('100000.00');

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function normalizePhone(phone) {
  return phone?.trim() || null;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export async function register(input) {
  // Never trust raw input: normalize before any lookup or write.
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const name = input.name.trim();
  const password = input.password;

  // Early duplicate checks (cheap, friendly). The unique constraints in
  // PostgreSQL are the real guard; P2002 below closes the race window.
  if (await userRepo.findUserByEmail(prisma, email)) {
    throw new EmailExistsError();
  }
  if (phone && (await userRepo.findUserByPhone(prisma, phone))) {
    throw new PhoneExistsError();
  }

  // Hash BEFORE touching the database — plaintext never crosses the wire
  // further or hits the DB.
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const newUser = await userRepo.createUser(tx, {
        email,
        phone,
        name,
        password: passwordHash,
      });

      // Explicit balance initialization: BDT 100,000 via account.create,
      // atomically with the user row.
      await accountRepo.createAccount(tx, newUser.id, WELCOME_BALANCE);

      return newUser;
    });
  } catch (err) {
    // Two registrations racing on the same email/phone: the unique index wins.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target : [];
      if (target.includes('email')) {
        throw new EmailExistsError();
      }
      throw new PhoneExistsError();
    }
    throw err;
  }

  return createAuthResponse(user);
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export async function login(email, password) {
  const normalized = normalizeEmail(email);
  const user = await userRepo.findUserByEmail(prisma, normalized);

  // Same message whether the email doesn't exist, the account is inactive,
  // or the password is wrong — no account enumeration, no implementation
  // details leaked.
  if (!user || !user.active) {
    throw new InvalidCredentialsError();
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new InvalidCredentialsError();
  }

  return createAuthResponse(user);
}

// ---------------------------------------------------------------------------
// Profile (authenticated)
// ---------------------------------------------------------------------------

export async function getProfile(userId) {
  // userId always comes from the verified JWT (req.user.id), never from the
  // request body/query.
  const user = await userRepo.findSafeUserById(prisma, userId);
  if (!user) {
    throw new AuthenticationRequiredError('User not found');
  }
  if (!user.active) {
    throw new UserInactiveError();
  }

  const account = await accountRepo.findAccountByUserId(prisma, userId);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    balance: account ? account.balance.toFixed(2) : '0.00',
    currency: account?.currency ?? 'BDT',
    createdAt: user.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createAuthResponse(user) {
  return {
    token: generateToken(user),
    user: toSafeUser(user),
  };
}

// JWT payload: only identity claims (id, email). No password, no balance,
// no other sensitive data. `iat`/`exp` are added by jsonwebtoken.
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

// Whitelist approach: the password hash (and anything else) is never included.
function toSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
  };
}

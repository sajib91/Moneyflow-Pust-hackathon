import prisma from '../config/prisma.js';
import * as userRepo from '../repositories/userRepository.js';

export async function searchUsers(currentUserId, query, limit = 10) {
  const users = await userRepo.searchUsers(prisma, query, limit, currentUserId);
  return users;
}
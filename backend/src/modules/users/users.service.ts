import { StatusCodes } from "http-status-codes";

import { AppError } from "../../common/errors/app-error";
import { withTransaction } from "../../config/database";
import { usersRepository } from "./users.repository";
import type { UpdateUserProfileInput } from "./users.types";

const getMyProfile = async (userId: string) => {
  const profile = await usersRepository.getUserProfileById(userId);

  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, "User profile was not found.", "USER_PROFILE_NOT_FOUND");
  }

  return profile;
};

const updateMyProfile = async (userId: string, input: UpdateUserProfileInput) => {
  await withTransaction(async (client) => {
    await usersRepository.updateUserProfile(client, userId, input);
  });

  return getMyProfile(userId);
};

export const usersService = {
  getMyProfile,
  updateMyProfile,
};

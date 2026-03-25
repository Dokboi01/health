import type { PoolClient } from "pg";

import type { AppRole, UserStatus } from "../../common/constants/roles";

export interface UserProfile {
  id: string;
  email: string;
  role: AppRole;
  status: UserStatus;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  settings: {
    languageCode: string;
    timezone: string;
    dateFormat: string;
    pushNotificationsEnabled: boolean;
    emailNotificationsEnabled: boolean;
    appointmentRemindersEnabled: boolean;
    medicationRemindersEnabled: boolean;
  };
}

export interface UpdateUserProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  languageCode?: string;
  timezone?: string;
  dateFormat?: string;
  pushNotificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
  appointmentRemindersEnabled?: boolean;
  medicationRemindersEnabled?: boolean;
}

export interface UsersRepository {
  getUserProfileById(userId: string): Promise<UserProfile | null>;
  updateUserProfile(client: PoolClient, userId: string, input: UpdateUserProfileInput): Promise<void>;
}

export abstract class AvatarStorageService {
  /**
   * Upload a profile avatar for a user.
   * @param userId The ID of the user uploading the avatar
   * @param file The Multer file object
   * @returns The relative URL path of the stored avatar
   */
  abstract uploadAvatar(userId: string, file: any): Promise<string>;

  /**
   * Delete an avatar from storage.
   * @param avatarUrl The full or relative URL path of the avatar to delete
   */
  abstract deleteAvatar(avatarUrl: string): Promise<void>;
}

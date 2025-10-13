import { Types } from 'mongoose';
import User, { IUser } from '../schemas/user.schema';

export async function validateRecipient(recipientId: string): Promise<{
  message: string | null;
  validationSuccess: boolean;
  data?: IUser;
}> {
  if (!Types.ObjectId.isValid(recipientId)) {
    const message = 'Invalid Recipient Id';
    return { message, validationSuccess: false };
  }

  const recipient: IUser | null = await User.findById(recipientId);
  if (!recipient) {
    const message = 'Recipient not found';
    return { message, validationSuccess: false };
  }

  return { message: null, validationSuccess: true, data: recipient };
}

export async function checkFriendship(
  sender: IUser,
  recipient: IUser,
): Promise<boolean> {
  const isFriend = sender.friends.some(
    (friendId: any) => friendId.toString() === recipient._id.toString(),
  );

  if (!isFriend) {
    return false;
  }

  return true;
}

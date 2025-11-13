import phoneChangeRequestModel from '../models/phoneChangeRequest.model';
import User from '../models/user.model';

export const cleanupUnverifiedUsers = async () => {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 час назад
  const res = await User.deleteMany({ verified: false, createdAt: { $lt: cutoff } });
  if (res.deletedCount > 0) {
    console.log(`[CLEANUP] Удалено ${res.deletedCount} неподтвержденных пользователей`);
  }
};

export const cleanupPhoneChangeRequests = async () => {
  const res = await phoneChangeRequestModel.deleteMany({ expiresAt: { $lt: new Date() } });
  if (res.deletedCount > 0) {
    console.log(`[CLEANUP] Удалено ${res.deletedCount} истёкших запросов смены телефона`);
  }
};
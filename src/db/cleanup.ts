import User from '../models/user.model';

export const cleanupUnverifiedUsers = async () => {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 час назад
  const res = await User.deleteMany({ verified: false, createdAt: { $lt: cutoff } });
  if (res.deletedCount > 0) {
    console.log(`[CLEANUP] Удалено ${res.deletedCount} неподтвержденных пользователей`);
  }
};

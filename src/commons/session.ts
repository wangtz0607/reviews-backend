import { Store } from 'express-session';

export async function destroySessionsOfUser(sessionStore: Store, userId: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    sessionStore.all!(async (error, sessions) => {
      if (error) {
        reject(error);
        return;
      }
      try {
        if (Array.isArray(sessions)) {
          for (const session of (sessions as Record<string, any>[])) {
            if (session.myUserId === userId) {
              await new Promise<void>((resolve, reject) => {
                sessionStore.destroy(session.id, error => {
                  if (error) reject(error); else resolve();
                });
              });
            }
          }
        } else {
          for (const [id, data] of Object.entries(sessions as Record<string, any>)) {
            if (data.myUserId === userId) {
              await new Promise<void>((resolve, reject) => {
                sessionStore.destroy(id, error => {
                  if (error) reject(error); else resolve();
                });
              });
            }
          }
        }
      } catch (e) {
        reject(e);
      }
      resolve();
    });
  });
}

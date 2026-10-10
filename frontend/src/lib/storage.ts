const keys = Object.freeze({
  user: "atuh_user",
});

const hasStorage = (): boolean =>
  typeof window !== "undefined" && !!window.localStorage;

const safeSet = (key: string, value: unknown) => {
  if (!hasStorage()) return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(error);
  }
};

export const setUser = (user: unknown) => safeSet(keys.user, user);

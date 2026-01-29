// Admin authentication - hardcoded credentials as requested
const ADMIN_USERNAME = "hk2004";
const ADMIN_PASSWORD = "hk2004";

export const validateAdmin = (username: string, password: string): boolean => {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
};

export const isAdminLoggedIn = (): boolean => {
  return sessionStorage.getItem("isAdmin") === "true";
};

export const loginAdmin = (): void => {
  sessionStorage.setItem("isAdmin", "true");
};

export const logoutAdmin = (): void => {
  sessionStorage.removeItem("isAdmin");
};

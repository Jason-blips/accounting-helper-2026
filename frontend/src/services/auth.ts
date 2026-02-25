export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const removeToken = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

export const getUserRole = (): 'user' | 'admin' | null => {
  const role = localStorage.getItem('userRole');
  return role as 'user' | 'admin' | null;
};

export const setUserRole = (role: 'user' | 'admin'): void => {
  localStorage.setItem('userRole', role);
};

export const isAdmin = (): boolean => {
  return getUserRole() === 'admin';
};

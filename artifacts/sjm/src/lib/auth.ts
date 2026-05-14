export function getToken(): string | null {
  return localStorage.getItem("sjm_token");
}

export function setToken(token: string): void {
  localStorage.setItem("sjm_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("sjm_token");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

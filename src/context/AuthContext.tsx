import React, { createContext, useContext, useState } from 'react';

export type UserRole = 'citizen' | 'officer' | null;

export interface AuthContextType {
  role: UserRole;
  persona: 'CITIZEN' | 'OFFICER' | null;
  isAuthenticated: boolean;
  token: string | null;
  user: any | null;
  loginCitizen: (token: string, userData?: any) => void;
  loginOfficer: (token: string, officerData?: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  persona: null,
  isAuthenticated: false,
  token: null,
  user: null,
  loginCitizen: () => {},
  loginOfficer: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('civic_auth_token') ||
      localStorage.getItem('officer_command_token') ||
      localStorage.getItem('citizen_access_token');
  });

  const [role, setRole] = useState<UserRole>(() => {
    const rawRole = localStorage.getItem('civic_role');
    if (rawRole === 'citizen' || rawRole === 'officer') return rawRole;
    const persona = localStorage.getItem('civic_persona');
    if (persona === 'CITIZEN') return 'citizen';
    if (persona === 'OFFICER') return 'officer';
    return null;
  });

  const [persona, setPersona] = useState<'CITIZEN' | 'OFFICER' | null>(() => {
    const p = localStorage.getItem('civic_persona');
    if (p === 'CITIZEN' || p === 'OFFICER') return p;
    return null;
  });

  const [user, setUser] = useState<any | null>(() => {
    try {
      const off = localStorage.getItem('civic_officer_profile');
      if (off) return JSON.parse(off);
      const cit = localStorage.getItem('civic_user_session');
      if (cit) return JSON.parse(cit);
    } catch {
      return null;
    }
    return null;
  });

  const loginCitizen = (accessToken: string, userData?: any) => {
    setToken(accessToken);
    setRole('citizen');
    setPersona('CITIZEN');
    setUser(userData || null);

    localStorage.setItem('citizen_access_token', accessToken);
    localStorage.setItem('civic_auth_token', accessToken);
    localStorage.setItem('civic_persona', 'CITIZEN');
    localStorage.setItem('civic_role', 'citizen');
    if (userData) {
      localStorage.setItem('civic_user_session', JSON.stringify(userData));
    }
  };

  const loginOfficer = (accessToken: string, officerData?: any) => {
    setToken(accessToken);
    setRole('officer');
    setPersona('OFFICER');
    setUser(officerData || null);

    localStorage.setItem('officer_command_token', accessToken);
    localStorage.setItem('civic_auth_token', accessToken);
    localStorage.setItem('civic_persona', 'OFFICER');
    localStorage.setItem('civic_role', 'officer');
    if (officerData) {
      localStorage.setItem('civic_officer_profile', JSON.stringify(officerData));
    }
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setPersona(null);
    setUser(null);

    localStorage.removeItem('citizen_access_token');
    localStorage.removeItem('officer_command_token');
    localStorage.removeItem('civic_auth_token');
    localStorage.removeItem('civic_persona');
    localStorage.removeItem('civic_role');
    localStorage.removeItem('civic_user_session');
    localStorage.removeItem('civic_officer_profile');
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        persona,
        isAuthenticated: Boolean(token && role),
        token,
        user,
        loginCitizen,
        loginOfficer,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;

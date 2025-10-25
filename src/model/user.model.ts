export interface User {
  id?: number;
  username: string;
  email: string;
  password: string;
  role?: "user" | "admin";
  full_name?: string;
  phone?: string;
  address?: string;
  avatar?: string;
  created_at?: Date;
  updated_at?: Date;
}

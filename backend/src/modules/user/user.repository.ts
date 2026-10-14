import { User } from "./user.model.js";

interface CreateUser {
  name: string;
  email: string;
  password: string;
}

// find user by email
export const findByEmail = (email: string) => User.findOne({ email });

// create user
export const createUser = (userData: CreateUser) => User.create(userData);

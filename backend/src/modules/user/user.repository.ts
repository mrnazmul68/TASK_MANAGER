import { User } from "./user.model.js";

interface CreateUser {
  name: string;
  email: string;
  password: string;
}

//todo: find user by email
export const findByEmail = async (email: string) => User.findOne({ email });

//todo: create user
export const createUser = async (userData: CreateUser) => User.create(userData);

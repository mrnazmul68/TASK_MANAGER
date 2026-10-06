import { toAuthUser } from "@modules/user/user.mapper.js";
import * as userRepository from "../user/user.repository.js";
import bcrypt from "bcryptjs";

export interface RegisterInput {
  name?: string;
  email?: string;
  password?: string;
}

//todo: register user
export const registerUser = async (input: RegisterInput) => {
  const { name, email, password } = input;
  if (!name || !email || !password) {
    throw new Error("All fields are required");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 charecters");
  }

  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw new Error("User already exists");
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await userRepository.createUser({
    name,
    email,
    password: hashedPassword,
  });
  return { user: toAuthUser(user) };
};


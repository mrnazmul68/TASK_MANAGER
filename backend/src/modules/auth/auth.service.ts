export interface RegisterInput {
  name?: string;
  email?: string;
  password?: string;
}

export const registerUser = async(input: RegisterInput)=>{

    const {name, email, password} = input
    if(!name || !email || !password){
        throw new Error("All fields are required")
    }

    if(password.length < 6){
        throw new Error("Password must be at least 6 charecters")
    }

    
}
import "dotenv/config";
import readline from "readline";
import { createUser, generateStrongPassword } from "./data/users";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter email: ", (email) => {
  rl.question("Enter name: ", (name) => {
    const generatedPassword = generateStrongPassword(12);
    createUser(email, generatedPassword, name).then((user) => {
      console.log({
        user,
        generatedPassword,
      });
      rl.close();
    });
  });
});

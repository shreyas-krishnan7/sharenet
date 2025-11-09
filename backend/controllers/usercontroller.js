import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import User from "../models/usermodel.js";
import generateToken from "../utils/generatetoken.js";

// Register a new user
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  // Generate salt and hash password
  const salt = await bcrypt.genSalt(10); // salt length 10
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user with hashed password
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  if (user) {
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user.id),
    });
  } else {
    res.status(400);
    throw new Error("Failed to create the user");
  }
});

// Authenticate user / Login
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email });

  // Compare hashed passwords
  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user.id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

export { registerUser, authUser };

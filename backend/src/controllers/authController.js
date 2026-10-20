import supabase from '../config/supabaseClient.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'jwt_secret_queue_cure_26', {
    expiresIn: '30d'
  });
};

// Helper password hashing logic
const hashPassword = (password) => {
  const salt = 'salt_queue_cure_26';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
};

const comparePassword = (inputPassword, storedHash) => {
  const hash = hashPassword(inputPassword);
  return hash === storedHash;
};

// @desc    Register a new receptionist
// @route   POST /api/auth/register
// @access  Public (for demo purposes)
export const registerReceptionist = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Validation checks
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Check if user exists (username or email)
    const { data: userExists, error: checkError } = await supabase
      .from('users')
      .select('*')
      .or(`username.ilike.${trimmedUsername},email.ilike.${trimmedEmail}`)
      .limit(1);

    if (checkError) {
      throw checkError;
    }

    if (userExists && userExists.length > 0) {
      return res.status(400).json({ success: false, error: 'Username or email already exists' });
    }

    const hashedPassword = hashPassword(password);

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([
        {
          username: trimmedUsername,
          email: trimmedEmail,
          password: hashedPassword,
          role: 'receptionist'
        }
      ])
      .select();

    if (createError) {
      throw createError;
    }

    const user = newUser[0];

    res.status(201).json({
      success: true,
      token: generateToken(user.id),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login receptionist
// @route   POST /api/auth/login
// @access  Public
export const loginReceptionist = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const { data: users, error: findError } = await supabase
      .from('users')
      .select('*')
      .ilike('username', username.trim())
      .limit(1);

    if (findError) {
      throw findError;
    }

    if (users && users.length > 0) {
      const user = users[0];
      if (comparePassword(password, user.password)) {
        return res.status(200).json({
          success: true,
          token: generateToken(user.id),
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        });
      }
    }

    return res.status(401).json({ success: false, error: 'Invalid username or password' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get currently logged in user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    // req.user is already set by protect middleware
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};

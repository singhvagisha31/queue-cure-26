import jwt from 'jsonwebtoken';
import supabase from '../config/supabaseClient.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwt_secret_queue_cure_26');

      // Get user from token and attach to request (excluding password)
      const { data: users, error } = await supabase
        .from('users')
        .select('id, username, email, role')
        .eq('id', decoded.id)
        .limit(1);

      if (error || !users || users.length === 0) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      req.user = users[0];
      return next();
    } catch (error) {
      console.error('JWT Verification Error:', error);
      return res.status(401).json({ success: false, error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized, no token provided' });
  }
};

// In middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

/*
module.exports = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];  // Extract token from 'Authorization' header
    if (!token) return res.status(401).json({ error: 'Access denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Verify token
        req.user = decoded;  // Attach the decoded token payload to `req.user`
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid or expired token' });
    }
};
*/

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract Bearer token

  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to request
    console.log('user details:', decoded)
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }
};

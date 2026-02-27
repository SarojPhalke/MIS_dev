const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication token missing or invalid' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Backwards compatible mapping:
    // - New tokens: { id, role }
    // - Old tokens: { sub, role_id, username }
    req.user = {
      id: decoded.id || decoded.sub,
      role: decoded.role,
      roleId: decoded.role_id,
      username: decoded.username,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = {
  authenticate,
};


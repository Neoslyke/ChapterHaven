const crypto = require('crypto');

function basicAuthMiddleware(req, res, next) {
  // Allow disabling auth if explicitly set in environment
  if (process.env.AUTH_ENABLED === 'false') {
    return next();
  }

  const expectedUser = process.env.AUTH_USER || 'admin';
  const expectedPass = process.env.AUTH_PASS || 'chapterhaven123';

  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    console.warn('[ChapterHaven Auth] Missing Authorization header from proxy. Check proxy_set_header Authorization $http_authorization in Nginx.');
    res.setHeader('WWW-Authenticate', 'Basic realm="ChapterHaven Access", charset="UTF-8"');
    return res.status(401).send('Authentication required to access ChapterHaven.');
  }

  try {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const colonIndex = credentials.indexOf(':');

    if (colonIndex === -1) {
      console.warn('[ChapterHaven Auth] Malformed authorization header format.');
      res.setHeader('WWW-Authenticate', 'Basic realm="ChapterHaven Access", charset="UTF-8"');
      return res.status(401).send('Invalid authentication header.');
    }

    const user = credentials.substring(0, colonIndex);
    const pass = credentials.substring(colonIndex + 1);

    const userBuffer = Buffer.from(user);
    const expectedUserBuffer = Buffer.from(expectedUser);
    const passBuffer = Buffer.from(pass);
    const expectedPassBuffer = Buffer.from(expectedPass);

    const isUserValid = userBuffer.length === expectedUserBuffer.length &&
      crypto.timingSafeEqual(userBuffer, expectedUserBuffer);

    const isPassValid = passBuffer.length === expectedPassBuffer.length &&
      crypto.timingSafeEqual(passBuffer, expectedPassBuffer);

    if (!isUserValid || !isPassValid) {
      console.warn(`[ChapterHaven Auth] Login failed: provided user "${user}" vs expected "${expectedUser}". Password match: ${isPassValid}`);
      res.setHeader('WWW-Authenticate', 'Basic realm="ChapterHaven Access", charset="UTF-8"');
      return res.status(401).send('Invalid username or password.');
    }

    console.log(`[ChapterHaven Auth] Login success: "${user}"`);
    req.user = user;
    return next();
  } catch (err) {
    res.setHeader('WWW-Authenticate', 'Basic realm="ChapterHaven Access", charset="UTF-8"');
    return res.status(401).send('Authentication error.');
  }
}

module.exports = { basicAuthMiddleware };


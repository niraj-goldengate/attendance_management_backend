// api/index.js
const app = require('../server/app');

// Vercel (with `@vercel/node`) will detect and call this:
module.exports = (req, res) => {
  // Forward the request into your Express app
  app(req, res);
};

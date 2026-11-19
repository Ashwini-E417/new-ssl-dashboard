import { handleApiRequest } from '../server/serverless/apiHandler.js';

// All /api/* requests are rewritten here (see vercel.json) and routed by the Express app.
export default {
  fetch: handleApiRequest,
};

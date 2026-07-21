const { catchAsync } = require('../../middleware/error.handler');
const SessionService = require('./session.service');
const SessionRepository = require('./session.repository');

const repository = new SessionRepository();
const service = new SessionService(repository);

module.exports = {
  getSessions: catchAsync(async (req, res) => {
    const sessions = await service.getSessions(req.user.id, req.user.role, req.user.businessId);
    res.json({
      sessions,
      currentSessionId: req.user.sessionId || null
    });
  }),

  revokeSession: catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await service.revokeSession(id, req.user.id, req.user.role, req.user.businessId);
    res.json(result);
  }),

  revokeOtherSessions: catchAsync(async (req, res) => {
    const result = await service.revokeOtherSessions(req.user.id, req.user.sessionId);
    res.json(result);
  })
};

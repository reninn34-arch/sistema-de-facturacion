const service = require('./referrals.service');

async function getCode(req, res) {
  try {
    const businessId = req.user.businessId;
    if (!businessId) return res.status(400).json({ message: 'Sin negocio asociado' });

    const [config, business] = await Promise.all([service.getConfig(), service.getCode(businessId)]);

    res.json({
      referralCode: business.referralCode,
      points: business.points,
      referralLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/suscripcion?ref=${business.referralCode}`,
      programEnabled: config.enabled,
      pointsPerReferral: config.pointsPerReferral
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('[Referrals] Error:', error.message);
    res.status(500).json({ message: 'Error al obtener codigo' });
  }
}

async function getHistory(req, res) {
  try {
    const businessId = req.user.businessId;
    const referrals = await service.getHistory(businessId);
    res.json(referrals);
  } catch (error) {
    console.error('[Referrals] Error:', error.message);
    res.status(500).json({ message: 'Error al cargar referidos' });
  }
}

async function register(req, res) {
  try {
    const { referralCode } = req.body;
    const businessId = req.user.businessId;
    if (!referralCode) return res.status(400).json({ message: 'Codigo de referido requerido' });

    const result = await service.register(referralCode, businessId);
    res.status(201).json({ success: true, referral: result.referral, pointsAwarded: result.pointsAwarded });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('[Referrals] Error:', error.message);
    res.status(500).json({ message: 'Error al registrar referido' });
  }
}

async function redeem(req, res) {
  try {
    const businessId = req.user.businessId;
    const { prizeId } = req.body;
    if (!prizeId) return res.status(400).json({ message: 'ID del premio requerido' });

    const result = await service.redeem(prizeId, businessId);
    res.json({ success: true, message: `Canjeaste "${result.prize.name}" por ${result.prize.points} puntos!`, remainingPoints: result.remainingPoints });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('[Referrals] Redeem error:', error.message);
    res.status(500).json({ message: 'Error al canjear premio' });
  }
}

async function getPrizes(req, res) {
  try {
    const result = await service.getPrizes();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar premios' });
  }
}

module.exports = { getCode, getHistory, register, redeem, getPrizes };

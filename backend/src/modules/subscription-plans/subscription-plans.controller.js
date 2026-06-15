const { SubscriptionPlanService } = require('./subscription-plans.service');

const subscriptionPlansController = {
  async getActivePlans(req, res) {
    try {
      const plans = await SubscriptionPlanService.getActivePlans();
      res.json({ plans });
    } catch (error) {
      console.error('Error al obtener planes:', error);
      res.status(500).json({ error: 'Error al obtener planes' });
    }
  },

  async getAllPlans(req, res) {
    try {
      const plans = await SubscriptionPlanService.getAllPlans();
      res.json({ plans });
    } catch (error) {
      console.error('Error al obtener planes:', error);
      res.status(500).json({ error: 'Error al obtener planes' });
    }
  },

  async getPlanById(req, res) {
    try {
      const plan = await SubscriptionPlanService.getPlanById(req.params.id);
      res.json({ plan });
    } catch (error) {
      if (error.statusCode === 404) {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error al obtener plan:', error);
      res.status(500).json({ error: 'Error al obtener plan' });
    }
  },

  async createPlan(req, res) {
    try {
      const newPlan = await SubscriptionPlanService.createPlan(req.body);
      res.status(201).json({ plan: newPlan });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ error: error.message });
      }
      console.error('Error al crear plan:', error);
      res.status(500).json({ error: 'Error al crear plan' });
    }
  },

  async updatePlan(req, res) {
    try {
      const updatedPlan = await SubscriptionPlanService.updatePlan(req.params.id, req.body);
      res.json({ plan: updatedPlan });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ error: error.message });
      }
      if (error.statusCode === 404) {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error al actualizar plan:', error);
      res.status(500).json({ error: 'Error al actualizar plan' });
    }
  },

  async deletePlan(req, res) {
    try {
      await SubscriptionPlanService.deletePlan(req.params.id);
      res.json({ message: 'Plan eliminado correctamente' });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ error: error.message });
      }
      if (error.statusCode === 404) {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error al eliminar plan:', error);
      res.status(500).json({ error: 'Error al eliminar plan' });
    }
  }
};

module.exports = subscriptionPlansController;

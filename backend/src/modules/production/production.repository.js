const prisma = require('../../../prisma/client');

const recipeInclude = {
  product: { select: { id: true, description: true, code: true, price: true } },
  ingredients: {
    include: {
      product: { select: { id: true, description: true, code: true, unitOfMeasure: true } }
    }
  }
};

class ProductionRepository {
  async findRecipesByBusiness(businessId) {
    return prisma.recipe.findMany({
      where: { businessId },
      include: recipeInclude,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findRecipeByIdAndBusiness(id, businessId) {
    return prisma.recipe.findFirst({
      where: { id, businessId },
      include: recipeInclude
    });
  }

  async createRecipe(data) {
    return prisma.recipe.create({
      data: {
        ...data,
        ingredients: { create: data.ingredients }
      },
      include: recipeInclude
    });
  }

  async updateRecipe(id, data, ingredients) {
    if (ingredients) {
      await this.deleteRecipeIngredients(id);
      await this.createRecipeIngredients(id, ingredients);
    }
    return prisma.recipe.update({
      where: { id },
      data,
      include: recipeInclude
    });
  }

  async deleteRecipe(id) {
    return prisma.recipe.delete({ where: { id } });
  }

  async findProductByIdAndBusiness(id, businessId) {
    return prisma.product.findFirst({ where: { id, businessId } });
  }

  async updateProductStock(id, decrementOrIncrement) {
    return prisma.product.update({
      where: { id },
      data: { stock: decrementOrIncrement }
    });
  }

  async createInventoryMovement(data) {
    return prisma.inventoryMovement.create({ data });
  }

  async createProductionRecord(data) {
    return prisma.productionRecord.create({ data });
  }

  async findProductionRecordsByBusiness(businessId) {
    return prisma.productionRecord.findMany({
      where: { businessId },
      include: {
        recipe: {
          include: {
            product: { select: { id: true, description: true, code: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async deleteRecipeIngredients(recipeId) {
    return prisma.recipeIngredient.deleteMany({ where: { recipeId } });
  }

  async createRecipeIngredients(recipeId, ingredients) {
    return prisma.recipeIngredient.createMany({
      data: ingredients.map(ing => ({ ...ing, recipeId }))
    });
  }

  async transaction(callback) {
    return prisma.$transaction(callback);
  }
}

module.exports = ProductionRepository;

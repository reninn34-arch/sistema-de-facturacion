const { AppError } = require('../../middleware/error.handler');

class ProductionService {
  constructor(repository) {
    this.repo = repository;
  }

  async getRecipes(businessId) {
    return this.repo.findRecipesByBusiness(businessId);
  }

  async createRecipe(businessId, data) {
    const { name, description, instructions, yield: recipeYield, productId, ingredients } = data;

    if (!name || !productId || !ingredients || !Array.isArray(ingredients)) {
      throw new AppError('Nombre, producto y lista de ingredientes son requeridos', 400);
    }

    const product = await this.repo.findProductByIdAndBusiness(productId, businessId);
    if (!product) throw new AppError('Producto no encontrado', 404);

    const recipeData = {
      name,
      description,
      instructions,
      yield: recipeYield || 1,
      productId,
      businessId,
      ingredients: ingredients.map(ing => ({
        productId: ing.productId,
        quantity: ing.quantity,
        unitOfMeasure: ing.unitOfMeasure || 'UNIDAD',
        estimatedCost: ing.estimatedCost || 0
      }))
    };

    return this.repo.createRecipe(recipeData);
  }

  async updateRecipe(recipeId, businessId, data) {
    const existing = await this.repo.findRecipeByIdAndBusiness(recipeId, businessId);
    if (!existing) throw new AppError('Receta no encontrada', 404);

    const { name, description, instructions, yield: recipeYield, ingredients } = data;

    const updateData = {
      name: name || existing.name,
      description: description !== undefined ? description : existing.description,
      instructions: instructions !== undefined ? instructions : existing.instructions,
      yield: recipeYield || existing.yield
    };

    let formattedIngredients;
    if (ingredients && Array.isArray(ingredients)) {
      formattedIngredients = ingredients.map(ing => ({
        productId: ing.productId,
        quantity: ing.quantity,
        unitOfMeasure: ing.unitOfMeasure || 'UNIDAD',
        estimatedCost: ing.estimatedCost || 0
      }));
    }

    return this.repo.updateRecipe(recipeId, updateData, formattedIngredients);
  }

  async deleteRecipe(recipeId, businessId) {
    const existing = await this.repo.findRecipeByIdAndBusiness(recipeId, businessId);
    if (!existing) throw new AppError('Receta no encontrada', 404);

    return this.repo.deleteRecipe(recipeId);
  }

  async registerProduction(businessId, data) {
    const { recipeId, quantity, notes } = data;

    if (!recipeId || !quantity || quantity <= 0) {
      throw new AppError('ID de receta y cantidad de lotes son requeridos', 400);
    }

    const recipe = await this.repo.findRecipeByIdAndBusiness(recipeId, businessId);
    if (!recipe) throw new AppError('Receta no encontrada', 404);

    const producedUnits = quantity * recipe.yield;

    let totalCost = 0;
    const insufficientStock = [];

    for (const ing of recipe.ingredients) {
      const requiredQty = ing.quantity * quantity;
      const product = await this.repo.findProductByIdAndBusiness(ing.productId, businessId);
      if (!product) throw new AppError(`Insumo no encontrado: ${ing.productId}`, 404);

      if (product.stock < requiredQty) {
        insufficientStock.push({
          name: product.description,
          required: requiredQty,
          available: product.stock,
          unit: ing.unitOfMeasure
        });
      }
    }

    if (insufficientStock.length > 0) {
      throw new AppError(
        `Stock insuficiente para: ${insufficientStock.map(s => `${s.name} (necesitas ${s.required}, tienes ${s.available})`).join(', ')}`,
        400
      );
    }

    const record = await this.repo.transaction(async (tx) => {
      for (const ing of recipe.ingredients) {
        const requiredQty = ing.quantity * quantity;
        const product = await tx.product.findFirst({ where: { id: ing.productId, businessId } });

        totalCost += (ing.estimatedCost || 0) * quantity;

        await tx.product.update({
          where: { id: ing.productId },
          data: { stock: { decrement: requiredQty } }
        });

        await tx.inventoryMovement.create({
          data: {
            productId: ing.productId,
            type: 'PRODUCCION',
            quantity: -requiredQty,
            previousStock: product.stock,
            newStock: product.stock - requiredQty
          }
        });
      }

      const finishedProduct = await tx.product.findFirst({ where: { id: recipe.productId, businessId } });

      await tx.product.update({
        where: { id: recipe.productId },
        data: { stock: { increment: producedUnits } }
      });

      await tx.inventoryMovement.create({
        data: {
          productId: recipe.productId,
          type: 'PRODUCCION',
          quantity: producedUnits,
          previousStock: finishedProduct.stock,
          newStock: finishedProduct.stock + producedUnits
        }
      });

      return tx.productionRecord.create({
        data: {
          recipeId,
          quantity,
          producedUnits,
          totalCost,
          unitCost: producedUnits > 0 ? totalCost / producedUnits : 0,
          notes,
          businessId
        }
      });
    });

    return { record, producedUnits };
  }

  async getProductionRecords(businessId) {
    return this.repo.findProductionRecordsByBusiness(businessId);
  }
}

module.exports = ProductionService;

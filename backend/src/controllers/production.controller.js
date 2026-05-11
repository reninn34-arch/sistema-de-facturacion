const { PrismaClient } = require('@prisma/client');
const { catchAsync, AppError } = require('../middleware/error.handler');
const prisma = require('../../prisma/client');

const productionController = {
  getRecipes: catchAsync(async (req, res) => {
    const businessId = req.user.businessId;
    if (!businessId) throw new AppError('No se encontró el ID de empresa', 400);

    const recipes = await prisma.recipe.findMany({
      where: { businessId },
      include: {
        product: { select: { id: true, description: true, code: true, price: true } },
        ingredients: {
          include: {
            product: { select: { id: true, description: true, code: true, unitOfMeasure: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, recipes });
  }),

  createRecipe: catchAsync(async (req, res) => {
    const businessId = req.user.businessId;
    if (!businessId) throw new AppError('No se encontró el ID de empresa', 400);

    const { name, description, instructions, yield: recipeYield, productId, ingredients } = req.body;

    if (!name || !productId || !ingredients || !Array.isArray(ingredients)) {
      throw new AppError('Nombre, producto y lista de ingredientes son requeridos', 400);
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, businessId }
    });
    if (!product) throw new AppError('Producto no encontrado', 404);

    const recipe = await prisma.recipe.create({
      data: {
        name,
        description,
        instructions,
        yield: recipeYield || 1,
        productId,
        businessId,
        ingredients: {
          create: ingredients.map(ing => ({
            productId: ing.productId,
            quantity: ing.quantity,
            unitOfMeasure: ing.unitOfMeasure || 'UNIDAD',
            estimatedCost: ing.estimatedCost || 0
          }))
        }
      },
      include: {
        product: { select: { id: true, description: true, code: true, price: true } },
        ingredients: {
          include: {
            product: { select: { id: true, description: true, code: true, unitOfMeasure: true } }
          }
        }
      }
    });

    res.status(201).json({ success: true, recipe });
  }),

  updateRecipe: catchAsync(async (req, res) => {
    const businessId = req.user.businessId;
    const { id } = req.params;

    const existing = await prisma.recipe.findFirst({ where: { id, businessId } });
    if (!existing) throw new AppError('Receta no encontrada', 404);

    const { name, description, instructions, yield: recipeYield, ingredients } = req.body;

    if (ingredients && Array.isArray(ingredients)) {
      await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });
      await prisma.recipeIngredient.createMany({
        data: ingredients.map(ing => ({
          recipeId: id,
          productId: ing.productId,
          quantity: ing.quantity,
          unitOfMeasure: ing.unitOfMeasure || 'UNIDAD',
          estimatedCost: ing.estimatedCost || 0
        }))
      });
    }

    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        instructions: instructions !== undefined ? instructions : existing.instructions,
        yield: recipeYield || existing.yield
      },
      include: {
        product: { select: { id: true, description: true, code: true, price: true } },
        ingredients: {
          include: {
            product: { select: { id: true, description: true, code: true, unitOfMeasure: true } }
          }
        }
      }
    });

    res.json({ success: true, recipe });
  }),

  deleteRecipe: catchAsync(async (req, res) => {
    const businessId = req.user.businessId;
    const { id } = req.params;

    const existing = await prisma.recipe.findFirst({ where: { id, businessId } });
    if (!existing) throw new AppError('Receta no encontrada', 404);

    await prisma.recipe.delete({ where: { id } });

    res.json({ success: true, message: 'Receta eliminada' });
  }),

  registerProduction: catchAsync(async (req, res) => {
    const businessId = req.user.businessId;
    if (!businessId) throw new AppError('No se encontró el ID de empresa', 400);

    const { recipeId, quantity, notes } = req.body;

    if (!recipeId || !quantity || quantity <= 0) {
      throw new AppError('ID de receta y cantidad de lotes son requeridos', 400);
    }

    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, businessId },
      include: { ingredients: true }
    });

    if (!recipe) throw new AppError('Receta no encontrada', 404);

    const producedUnits = quantity * recipe.yield;

    let totalCost = 0;
    const insufficientStock = [];

    for (const ing of recipe.ingredients) {
      const requiredQty = ing.quantity * quantity;
      const product = await prisma.product.findFirst({
        where: { id: ing.productId, businessId }
      });
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

    const result = await prisma.$transaction(async (tx) => {
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

      const record = await tx.productionRecord.create({
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

      return record;
    });

    res.status(201).json({
      success: true,
      record: result,
      message: `Producción registrada: ${producedUnits} unidades`
    });
  }),

  getProductionRecords: catchAsync(async (req, res) => {
    const businessId = req.user.businessId;
    if (!businessId) throw new AppError('No se encontró el ID de empresa', 400);

    const records = await prisma.productionRecord.findMany({
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

    res.json({ success: true, records });
  })
};

module.exports = productionController;
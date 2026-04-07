import { prisma } from "../config/prisma.js";

export const logAction = async (userId, entityType, entityId, action, oldValue, newValue) =>
  prisma.auditLog.create({
    data: {
      user_id: userId ?? null,
      entity_type: entityType,
      entity_id: entityId,
      action,
      old_value: oldValue ?? undefined,
      new_value: newValue ?? undefined
    }
  });

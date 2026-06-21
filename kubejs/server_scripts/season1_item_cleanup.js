// kubejs/server_scripts/season1_item_cleanup.js
//
// Удаляет ЛЮБЫЕ лежащие предметы старше 5 минут.
// Без исключений: ключи, гемы, босс-лут, season1-предметы тоже будут удаляться,
// если пролежат на земле дольше 5 минут.

const SEASON1_ITEM_CLEANUP = {
  enabled: true,

  // Проверять миры раз в 60 секунд
  checkIntervalTicks: 20 * 60,

  // Удалять любые лежащие предметы старше 5 минут
  maxItemAgeTicks: 20 * 60 * 5,

  // Сообщать в чат, если что-то удалено
  announceInChat: true,

  // Писать статистику в лог сервера
  logToConsole: true
};

function season1GetAllServerLevels(server) {
  try {
    if (server.getAllLevels) {
      return server.getAllLevels();
    }
  } catch (ignored) {}

  try {
    if (server.levels) {
      return server.levels;
    }
  } catch (ignored) {}

  return [];
}

function season1GetItemAge(entity) {
  try {
    if (entity.age !== undefined && entity.age !== null) {
      return Number(entity.age);
    }
  } catch (ignored) {}

  try {
    const nbt = entity.fullNBT;
    if (nbt && nbt.Age !== undefined && nbt.Age !== null) {
      return Number(nbt.Age);
    }
  } catch (ignored) {}

  try {
    const nbt = entity.nbt;
    if (nbt && nbt.Age !== undefined && nbt.Age !== null) {
      return Number(nbt.Age);
    }
  } catch (ignored) {}

  return -1;
}

function season1RemoveEntity(entity) {
  try {
    entity.discard();
    return true;
  } catch (ignored) {}

  try {
    entity.kill();
    return true;
  } catch (ignored) {}

  return false;
}

function season1CleanupOldDroppedItems(server) {
  let checked = 0;
  let removed = 0;
  let skippedUnknownAge = 0;
  let skippedYoung = 0;

  const levels = season1GetAllServerLevels(server);

  levels.forEach(level => {
    level.getEntities().forEach(entity => {
      if (String(entity.type) !== 'minecraft:item') {
        return;
      }

      checked++;

      const age = season1GetItemAge(entity);

      if (age < 0) {
        skippedUnknownAge++;
        return;
      }

      if (age < SEASON1_ITEM_CLEANUP.maxItemAgeTicks) {
        skippedYoung++;
        return;
      }

      if (season1RemoveEntity(entity)) {
        removed++;
      }
    });
  });

  if (SEASON1_ITEM_CLEANUP.logToConsole) {
    console.info(`[Season I] Item cleanup: checked=${checked}, removed=${removed}, skippedYoung=${skippedYoung}, skippedUnknownAge=${skippedUnknownAge}`);
  }

  if (SEASON1_ITEM_CLEANUP.announceInChat && removed > 0) {
    server.tell(`§6[Season I] Очистка предметов: удалено ${removed} предметов старше 5 минут.`);
  }
}

ServerEvents.tick(event => {
  if (!SEASON1_ITEM_CLEANUP.enabled) {
    return;
  }

  const server = event.server;

  if (server.tickCount % SEASON1_ITEM_CLEANUP.checkIntervalTicks !== 0) {
    return;
  }

  season1CleanupOldDroppedItems(server);
});
// kubejs/server_scripts/season1_boss_advancements.js
//
// Season I boss advancement sharing.
// Выдаёт достижение всем игрокам рядом с боссом при смерти.
// Также пишет красивое сообщение в общий чат со списком участников.

const SEASON1_BOSS_ADVANCEMENTS = [
  {
    entity: 'irons_spellbooks:fire_boss',
    advancement: 'season1:bosses/tyros_killed',
    radius: 96,
    bossName: 'Тирос, Пепельный Архонт',
    icon: '§6🔥'
  },
  {
    entity: 'irons_spellbooks:dead_king',
    advancement: 'season1:bosses/dead_king_killed',
    radius: 96,
    bossName: 'Мёртвый Король',
    icon: '§8☠'
  },
  {
    entity: 'cataclysm:amethyst_crab',
    advancement: 'season1:bosses/amethyst_crab_killed',
    radius: 96,
    bossName: 'Аметистовый Краб',
    icon: '§d◆'
  }
];

function season1IsSameDimension(player, entity) {
  try {
    return String(player.level.dimension) === String(entity.level.dimension);
  } catch (ignored) {}

  return false;
}

function season1DistanceSq(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function season1GrantBossAdvancement(server, boss, config) {
  const radiusSq = config.radius * config.radius;
  const participants = [];

  server.players.forEach(player => {
    if (!season1IsSameDimension(player, boss)) {
      return;
    }

    if (season1DistanceSq(player, boss) > radiusSq) {
      return;
    }

    participants.push(player);
  });

  if (participants.length <= 0) {
    console.info(`[Season I] Boss killed but no nearby participants found: ${config.entity}`);
    return;
  }

  const names = [];

  participants.forEach(player => {
    const name = String(player.username);
    names.push(name);

    // Выдаём достижение каждому участнику.
    // Если оно уже есть, повторно не стакнется.
    server.runCommandSilent(`advancement grant ${name} only ${config.advancement}`);
  });

  const namesText = names.join('§7, §e');

  server.tell(`${config.icon} §6[Season I] §e${config.bossName} §6повержен!`);
  server.tell(`§6🏆 Участники рейда: §e${namesText}`);
  server.tell(`§7Достижение выдано всем игрокам рядом с боссом.`);

  console.info(`[Season I] Boss advancement shared: boss=${config.entity}, advancement=${config.advancement}, players=${names.join(', ')}`);
}

EntityEvents.death(event => {
  const entity = event.entity;
  if (!entity) return;

  const entityType = String(entity.type);

  for (const config of SEASON1_BOSS_ADVANCEMENTS) {
    if (entityType === config.entity) {
      season1GrantBossAdvancement(event.server, entity, config);
      return;
    }
  }
});
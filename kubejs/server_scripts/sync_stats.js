// Загрузка Java-классов Minecraft для нативной работы со статистиками
const StatsClass = Java.loadClass('net.minecraft.stats.Stats');
const ResourceLocationClass = Java.loadClass('net.minecraft.resources.ResourceLocation');

let BuiltInRegistriesClass;
try {
    BuiltInRegistriesClass = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
} catch (e) {
    try {
        BuiltInRegistriesClass = Java.loadClass('net.minecraft.core.Registry');
    } catch (err) {
        // Не удалось загрузить класс реестров
    }
}

// Попытка загрузить Java-класс MagicData из мода
let MagicDataClass;
try {
    MagicDataClass = Java.loadClass("io.redspace.ironsspellbooks.api.magic.MagicData");
} catch (e) {
    try {
        MagicDataClass = Java.loadClass("io.redspace.irons_spellbooks.api.magic.MagicData");
    } catch (err) {
        // Мод не установлен
    }
}

// Вспомогательная функция для безопасного получения зарегистрированной статистики
function getCustomStat(namespace, path) {
    try {
        if (!BuiltInRegistriesClass || !ResourceLocationClass || !StatsClass) return null;
        let registry = BuiltInRegistriesClass.CUSTOM_STAT;
        if (!registry) return null;
        let loc = new ResourceLocationClass(namespace, path);
        let registeredLoc = registry.get(loc);
        if (registeredLoc) {
            return StatsClass.CUSTOM.get(registeredLoc);
        }
    } catch (e) {
        // Пропускаем ошибки поиска статистики
    }
    return null;
}

// Отслеживаем выстрелы TACZ через спавн пуль
EntityEvents.spawned(event => {
    try {
        if (event.entity && event.entity.type === 'tacz:bullet') {
            let shooter = event.entity.owner; // Определяем игрока, сделавшего выстрел
            if (shooter && shooter.isPlayer()) {
                // Напрямую увеличиваем зарегистрированную статистику игрока (через native Minecraft API)
                try {
                    let stat = getCustomStat('kubejs', 'gun_shots');
                    if (stat) {
                        (shooter.minecraftPlayer || shooter).awardStat(stat, 1);
                    }
                } catch (statError) {
                    // Пропускаем
                }
                
                // Увеличиваем скорборд GunUse для совместимости с книжкой и триггерами
                let objective = shooter.scoreboard.getObjective('GunUse');
                if (objective) {
                    try {
                        objective.getScore(shooter).add(1);
                    } catch (err) {
                        // Резервный метод для скорборда
                        shooter.runCommandSilent("scoreboard players add @s GunUse 1");
                    }
                }
            }
        }
    } catch (e) {
        // Безопасный пропуск потенциальных ошибок
    }
})

// Потиковый контроль уровня маны
PlayerEvents.tick(event => {
    try {
        let player = event.player;
        // Запускаем только на сервере (clientSide === false) и только для реальных игроков
        if (!player || !player.isPlayer() || player.level.clientSide) return;
        
        // Оптимизация: раз в 5 тиков
        if (player.age % 5 !== 0) return;
        
        let currentMana = 0;
        
        // Метод 1: Пытаемся вытащить ману напрямую из NBT игрока (ForgeCaps)
        try {
            let nbt = player.nbt;
            if (nbt && nbt.ForgeCaps) {
                let magicDataNBT = nbt.ForgeCaps['irons_spellbooks:magic_data'] || nbt.ForgeCaps['ironsspellbooks:magic_data'];
                if (magicDataNBT) {
                    currentMana = magicDataNBT.mana;
                }
            }
        } catch (nbtErr) {
            // Игнорируем
        }
        
        // Метод 2: Резервный метод через Java-класс MagicData
        if ((currentMana == null || currentMana <= 0) && MagicDataClass) {
            try {
                let magicData = MagicDataClass.getPlayerMagicData(player.minecraftPlayer || player);
                if (magicData) {
                    currentMana = magicData.getMana();
                }
            } catch (javaErr) {
                // Игнорируем
            }
        }
        
        if (currentMana == null || currentMana <= 0) return;
        
        // Получаем предыдущие значения из persistentData (безопасный доступ как к JS-свойствам)
        let oldMana = player.persistentData.last_mana_tick || 0;
        let currentMaxMana = player.getAttributeValue('irons_spellbooks:max_mana') || 100;
        let oldMaxMana = player.persistentData.last_max_mana || 0;
        
        // Сохраняем текущие значения в persistentData
        player.persistentData.last_max_mana = currentMaxMana;
        player.persistentData.last_mana_tick = currentMana;
        
        if (oldMana <= 0) {
            return;
        }
        
        if (oldMaxMana > 0 && currentMaxMana < oldMaxMana) {
            return;
        }
        
        let diff = oldMana - currentMana;
        
        // Если мана уменьшилась (diff > 0), и это не ложный скачок при перезаходе/смерти (diff < currentMaxMana)
        if (diff > 0 && diff < currentMaxMana) {
            let manaSpentInt = Math.round(diff);
            
            // 1. Увеличиваем статистику KubeJS (через native Minecraft API)
            try {
                let stat = getCustomStat('kubejs', 'mana_spent');
                if (stat) {
                    (player.minecraftPlayer || player).awardStat(stat, manaSpentInt);
                }
            } catch (statError) {
                // Пропускаем
            }
            
            // 2. Увеличиваем скорборд ManaSpent (для Журнала Искателя)
            let objective = player.scoreboard.getObjective('ManaSpent');
            if (objective) {
                try {
                    objective.getScore(player).add(manaSpentInt);
                } catch (scoreErr) {
                    player.runCommandSilent("scoreboard players add @s ManaSpent " + manaSpentInt);
                }
            }
        }
    } catch (e) {
        // Безопасный пропуск
    }
});

// Диагностическая команда для администраторов сборки (полностью безопасная и без крашащихся KubeJS-вызовов)
ServerEvents.commandRegistry(event => {
    const { commands: Commands } = event;
    event.register(
        Commands.literal("manadebug")
        .requires(src => src.hasPermission(2))
        .executes(ctx => {
            let player = ctx.getSource().getPlayer();
            if (!player) return 0;
            
            player.tell("§6=== ДЕБАГ МАНЫ ===");
            
            // 1. Атрибут макс маны
            try {
                let currentMaxMana = player.getAttributeValue('irons_spellbooks:max_mana');
                player.tell("1. Макс. мана (Атрибут): §e" + currentMaxMana);
            } catch (e1) {
                player.tell("1. Макс. мана: §cОшибка: " + e1);
            }
            
            // 2. Проверка Java API
            try {
                if (MagicDataClass) {
                    player.tell("2. Java-класс MagicData: §aЗагружен");
                    let magicData = MagicDataClass.getPlayerMagicData(player.minecraftPlayer || player);
                    if (magicData) {
                        player.tell("3. Мана через Java-API: §aРаботает! Значение: §e" + magicData.getMana());
                    } else {
                        player.tell("3. Мана через Java-API: §cВернул null (не видит игрока)");
                    }
                } else {
                    player.tell("2. Java-класс MagicData: §cНе загружен");
                }
            } catch (e3) {
                player.tell("2. Проверка Java API: §cОшибка: " + e3);
            }
            
            // 3. Скорборд
            try {
                let score = 0;
                let sb = player.level.getScoreboard();
                let obj = sb.getObjective('ManaSpent');
                if (obj) {
                    score = sb.getOrCreatePlayerScore(player.username, obj).getScore();
                } else {
                    score = "Скорборд 'ManaSpent' не найден!";
                }
                player.tell("4. Скорборд 'ManaSpent': §e" + score);
                
                let statsVal = 0;
                try {
                    let stat = getCustomStat('kubejs', 'mana_spent');
                    if (stat) {
                        let vanillaPlayer = player.minecraftPlayer || player;
                        let statsCounter = null;
                        try {
                            if (player.server && player.server.playerList) {
                                statsCounter = player.server.playerList.getPlayerStats(vanillaPlayer);
                            }
                        } catch (err) {
                            // Игнорируем
                        }
                        
                        if (statsCounter) {
                            statsVal = statsCounter.getValue(stat);
                        } else {
                            statsVal = "Ошибка: не удалось получить ServerStatsCounter";
                        }
                    } else {
                        statsVal = "Ошибка: Статистика не зарегистрирована в реестре (требуется перезапуск Minecraft)";
                    }
                } catch (eStats) {
                    statsVal = "Ошибка: " + eStats;
                }
                player.tell("5. Статистика маны (kubejs:mana_spent): §e" + statsVal);
                
                let oldMana = player.persistentData.last_mana_tick || 0;
                player.tell("6. Сохраненная мана в NBT: §e" + oldMana);
            } catch (e4) {
                player.tell("4. Скорборд/NBT: §cОшибка: " + e4);
            }
            
            player.tell("§6===============================");
            return 1;
        })
    );
});
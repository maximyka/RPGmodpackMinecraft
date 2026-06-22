// Загрузка Java-классов Minecraft для нативной работы со статистиками
const StatsClass = Java.loadClass('net.minecraft.stats.Stats');
const ResourceLocationClass = Java.loadClass('net.minecraft.resources.ResourceLocation');
const IntegerClass = Java.loadClass('java.lang.Integer');

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

// Попытка загрузить Java-класс MagicData из мода (проверяем все возможные пакеты)
let MagicDataClass;
let LoadedMagicDataClassName = "Не загружен";
try {
    MagicDataClass = Java.loadClass("io.redspace.ironsspellbooks.api.magic.MagicData");
    LoadedMagicDataClassName = "io.redspace.ironsspellbooks.api.magic.MagicData";
} catch (e) {
    try {
        MagicDataClass = Java.loadClass("io.redspace.ironsspellbooks.player.MagicData");
        LoadedMagicDataClassName = "io.redspace.ironsspellbooks.player.MagicData";
    } catch (e2) {
        try {
            MagicDataClass = Java.loadClass("io.redspace.irons_spellbooks.api.magic.MagicData");
            LoadedMagicDataClassName = "io.redspace.irons_spellbooks.api.magic.MagicData";
        } catch (err) {
            try {
                MagicDataClass = Java.loadClass("io.redspace.irons_spellbooks.player.MagicData");
                LoadedMagicDataClassName = "io.redspace.irons_spellbooks.player.MagicData";
            } catch (err2) {
                // Мод не установлен
            }
        }
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

// Вспомогательная функция для безопасного преобразования JS чисел в примитивные Java-целые (int)
function toJavaInt(value) {
    try {
        return IntegerClass.parseInt(Math.round(value).toFixed(0));
    } catch (e) {
        return 0;
    }
}

// Вспомогательная функция для безопасного вызова awardStat через Java-рефлексию (обходит проблему перегрузки метода в Rhino)
function awardStatReflected(player, stat, amount) {
    try {
        let playerClass = player.getClass();
        let methods = playerClass.getMethods();
        for (let i = 0; i < methods.length; i++) {
            let m = methods[i];
            let params = m.getParameterTypes();
            if (params.length === 2 && 
                params[0].getName() === 'net.minecraft.stats.Stat' && 
                (params[1].getName() === 'int' || params[1].getName() === 'java.lang.Integer')) {
                m.invoke(player, stat, IntegerClass.valueOf(toJavaInt(amount)));
                return true;
            }
        }
    } catch (e) {
        console.error("Ошибка рефлексии при начислении статистики: " + e);
    }
    return false;
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
                        let rawShooter = shooter.minecraftEntity || shooter;
                        awardStatReflected(rawShooter, stat, 1);
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
// Потиковый контроль уровня маны с оптимизированным получением через Java API
PlayerEvents.tick(event => {
    try {
        let player = event.player;
        // Запускаем только на сервере (clientSide === false) и только для реальных игроков
        if (!player || !player.isPlayer() || player.level.clientSide) return;
        
        // Оптимизация: раз в 5 тиков
        if (player.age % 5 !== 0) return;
        
        let currentMana = 0;
        let rawPlayer = player.minecraftEntity || player;
        
        // Метод 1: Пытаемся получить ману напрямую через Java API (официальный статический метод getPlayerMagicData)
        if (MagicDataClass) {
            try {
                let magicData = MagicDataClass.getPlayerMagicData(rawPlayer);
                if (magicData) {
                    currentMana = magicData.getMana();
                }
            } catch (javaErr) {
                // Игнорируем
            }
            
            // Метод 1б: Резервный вызов через Capability, если статический метод не вернул значение
            if (currentMana <= 0) {
                try {
                    let cap = MagicDataClass.CAPABILITY;
                    if (cap) {
                        let lazyOpt = rawPlayer.getCapability(cap, null);
                        if (lazyOpt && lazyOpt.isPresent()) {
                            let magicData = lazyOpt.orElse(null);
                            if (magicData) {
                                currentMana = magicData.getMana();
                            }
                        }
                    }
                } catch (capErr) {
                    // Игнорируем
                }
            }
        }
        
        // Метод 2: Резервный метод через NBT (парсим безопасно через API KubeJS, избегая stall-значений)
        if (currentMana <= 0) {
            try {
                let nbt = player.nbt;
                if (nbt && nbt.contains('ForgeCaps')) {
                    let forgeCaps = nbt.getCompound('ForgeCaps');
                    if (forgeCaps) {
                        let magicDataKey = forgeCaps.contains('irons_spellbooks:magic_data') 
                            ? 'irons_spellbooks:magic_data' 
                            : (forgeCaps.contains('ironsspellbooks:magic_data') ? 'ironsspellbooks:magic_data' : null);
                        if (magicDataKey) {
                            let magicDataNBT = forgeCaps.getCompound(magicDataKey);
                            if (magicDataNBT && magicDataNBT.contains('mana')) {
                                currentMana = magicDataNBT.getFloat('mana');
                            }
                        }
                    }
                }
            } catch (nbtErr) {
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
            
            // 1. Увеличиваем кастомную статистику KubeJS (для внутренних механик мода)
            try {
                let statKube = getCustomStat('kubejs', 'mana_spent');
                if (statKube) {
                    awardStatReflected(rawPlayer, statKube, manaSpentInt);
                }
            } catch (statError) {
                console.error("Ошибка KubeJS Stat: " + statError);
            }
            
            // 2. Увеличиваем ванильную статистику minecraft:inspect_dropper, которая переименована в ресурспаках в "Потрачено маны".
            // При этом Minecraft автоматически обновит скорборд ManaSpent, так как его критерием является minecraft.custom:minecraft.inspect_dropper.
            try {
                let statDropper = getCustomStat('minecraft', 'inspect_dropper');
                if (statDropper) {
                    awardStatReflected(rawPlayer, statDropper, manaSpentInt);
                }
            } catch (statError) {
                console.error("Ошибка Vanilla Stat: " + statError);
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
                    player.tell("2. Java-класс MagicData: §aЗагружен (" + LoadedMagicDataClassName + ")");
                    
                    let magicData = null;
                    let methodUsed = "";
                    let rawPlayer = player.minecraftEntity || player;
                    
                    // Пробуем getPlayerMagicData
                    try {
                        magicData = MagicDataClass.getPlayerMagicData(rawPlayer);
                        methodUsed = "getPlayerMagicData";
                    } catch (eMethod) {
                        // Игнорируем
                    }
                    
                    // Пробуем Capability
                    if (!magicData) {
                        try {
                            let cap = MagicDataClass.CAPABILITY;
                            if (cap) {
                                let lazyOpt = rawPlayer.getCapability(cap, null);
                                if (lazyOpt && lazyOpt.isPresent()) {
                                    magicData = lazyOpt.orElse(null);
                                    methodUsed = "Capability";
                                }
                            }
                        } catch (eCap) {
                            // Игнорируем
                        }
                    }
                    
                    if (magicData) {
                        player.tell("3. Мана через Java-API (" + methodUsed + "): §aРаботает! Значение: §e" + magicData.getMana());
                    } else {
                        player.tell("3. Мана через Java-API: §cВернул null (не удалось получить MagicData)");
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
                        let vanillaPlayer = player.minecraftEntity || player;
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
                player.tell("7. Возраст (player.age): §e" + player.age);
                player.tell("8. Ticks (player.minecraftEntity.tickCount): §e" + (player.minecraftEntity ? player.minecraftEntity.tickCount : "N/A"));
            } catch (e4) {
                player.tell("4. Скорборд/NBT: §cОшибка: " + e4);
            }
            
            player.tell("§6===============================");
            return 1;
        })
    );
});
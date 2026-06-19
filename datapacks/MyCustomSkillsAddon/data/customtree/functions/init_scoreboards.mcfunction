# Базовая безопасная инициализация
scoreboard objectives add Kills minecraft.custom:minecraft.mob_kills "Убито мобов"
scoreboard objectives add DmgTaken minecraft.custom:minecraft.damage_taken "Получено урона"
scoreboard objectives add Block minecraft.custom:minecraft.damage_blocked_by_shield "Блок щитом"
scoreboard objectives add Enchant minecraft.custom:minecraft.enchant_item "Зачаровано предметов"
scoreboard objectives add DmgDealt minecraft.custom:minecraft.damage_dealt "Нанесено урона"
scoreboard objectives add Jumps minecraft.custom:minecraft.jump "Прыжки"
scoreboard objectives add Sprint minecraft.custom:minecraft.sprint_one_cm "Спринт"
scoreboard objectives add SprintM dummy "Бег в метрах"
scoreboard objectives add DmgTakenDiv dummy "Получено урона"
scoreboard objectives add DmgDealtDiv dummy "Нанесено урона"
scoreboard objectives add BlockDiv dummy "Блок щитом"
scoreboard objectives add Const dummy
scoreboard objectives add BowUse minecraft.used:minecraft.bow "Использовано луков"
scoreboard objectives add CrossbowUse minecraft.used:minecraft.crossbow "Использовано арбалетов"
scoreboard objectives add GunUse dummy "Выстрелов из оружия"
scoreboard objectives add ManaSpent minecraft.custom:minecraft.inspect_dropper "Потрачено маны"
scoreboard objectives add ManaSpentDiv dummy "Потрачено маны"

# Инициализация констант для деления
scoreboard players set #100 Const 100
scoreboard players set #10 Const 10

# Инициализация триггера выдачи Журнала Искателя
scoreboard objectives add stats trigger
scoreboard players enable @a stats

# Очистка сайдбаров (чтобы избежать визуального мусора)
scoreboard objectives setdisplay sidebar
scoreboard objectives setdisplay sidebar.team.black
scoreboard objectives setdisplay sidebar.team.dark_blue
scoreboard objectives setdisplay sidebar.team.dark_green
scoreboard objectives setdisplay sidebar.team.dark_aqua
scoreboard objectives setdisplay sidebar.team.dark_red
scoreboard objectives setdisplay sidebar.team.dark_purple
scoreboard objectives setdisplay sidebar.team.gold
scoreboard objectives setdisplay sidebar.team.gray
scoreboard objectives setdisplay sidebar.team.dark_gray
scoreboard objectives setdisplay sidebar.team.blue
scoreboard objectives setdisplay sidebar.team.green
scoreboard objectives setdisplay sidebar.team.aqua
scoreboard objectives setdisplay sidebar.team.red
scoreboard objectives setdisplay sidebar.team.light_purple
scoreboard objectives setdisplay sidebar.team.yellow
scoreboard objectives setdisplay sidebar.team.white

scoreboard objectives add GunShots dummy "Выстрелов сделано"

# 1. Убеждаемся, что системные константы для деления всегда существуют
scoreboard players set #10 Const 10
scoreboard players set #100 Const 100

# 2. Обработка триггера Журнала Искателя (/trigger stats)
execute as @a[scores={stats=1..}] run function customtree:give_stats_book

# 3. Постоянная активация триггера для всех игроков
execute as @a run scoreboard players enable @s stats

# 4. Вычисление математических значений для Журнала Искателя (деление шкал)

# Нанесено урона (перевод из внутренних единиц игры в HP)
execute as @a run scoreboard players operation @s DmgDealtDiv = @s DmgDealt
execute as @a run scoreboard players operation @s DmgDealtDiv /= #10 Const

# Получено урона (перевод из внутренних единиц игры в HP)
execute as @a run scoreboard players operation @s DmgTakenDiv = @s DmgTaken
execute as @a run scoreboard players operation @s DmgTakenDiv /= #10 Const

# Заблокировано щитом (перевод в HP)
execute as @a run scoreboard players operation @s BlockDiv = @s Block
execute as @a run scoreboard players operation @s BlockDiv /= #10 Const

# Дистанция спринта (из сантиметров в метры)
execute as @a run scoreboard players operation @s SprintM = @s Sprint
execute as @a run scoreboard players operation @s SprintM /= #100 Const

# Потрачено маны
execute as @a run scoreboard players operation @s ManaSpentDiv = @s ManaSpent
execute as @a run scoreboard players operation @s ManaSpentDiv /= #10 Const

# Ищем новые пули TACZ в радиусе 3 блоков от игрока, добавляем ему +1 к выстрелам и помечаем пулю тегом, чтобы не считать её повторно
execute as @e[type=tacz:bullet,tag=!tacz_counted] at @s run scoreboard players add @p[distance=..3] GunShots 1
tag @e[type=tacz:bullet,tag=!tacz_counted] add tacz_counted

# Синхронизация скорбордов для отображения в Журнале и триггерах
execute as @a run scoreboard players operation @s GunUse = @s GunShots

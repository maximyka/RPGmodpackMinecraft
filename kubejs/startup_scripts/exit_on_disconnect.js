// KubeJS Startup Script - exit_on_disconnect.js
// Handles screen redirects, locks down the server selection screen, and customizes buttons.

(function() {
    var devModeJson = null;
    try {
        devModeJson = JsonIO.read('local/dev_mode.json');
    } catch (e) {
        // File doesn't exist or not readable
    }
    var isDevMode = devModeJson && devModeJson.devMode === true;

    if (isDevMode) {
        console.log("RPG Modpack: Running in Developer Mode. Bypassing lockdowns and redirects.");
        return;
    }

    var ClientMinecraft = Java.loadClass('net.minecraft.client.Minecraft');
    var ServerList = Java.loadClass('net.minecraft.client.multiplayer.ServerList');
    var ServerData = Java.loadClass('net.minecraft.client.multiplayer.ServerData');
    var ServerAddress = Java.loadClass('net.minecraft.client.multiplayer.resolver.ServerAddress');
    var ConnectScreen = Java.loadClass('net.minecraft.client.gui.screens.ConnectScreen');
    var TitleScreen = Java.loadClass('net.minecraft.client.gui.screens.TitleScreen');
    var JoinMultiplayerScreen = Java.loadClass('net.minecraft.client.gui.screens.multiplayer.JoinMultiplayerScreen');
    var Button = Java.loadClass('net.minecraft.client.gui.components.Button');
    var Component = Java.loadClass('net.minecraft.network.chat.Component');

    var joinedOnce = false;
    var serverSelectionListField = null;
    var printedDebug = false;

    // Reset client server list to official servers (non-destructively)
    function resetServerList() {
        try {
            var mc = ClientMinecraft.getInstance();
            var serverList = new ServerList(mc);
            serverList.load();
            
            var serversJson = null;
            try {
                serversJson = JsonIO.read('local/servers_list.json');
            } catch (e) {
                console.error("RPG Modpack: Failed to read servers_list.json: " + e);
            }
            
            if (!serversJson || !serversJson.length) {
                return;
            }
            
            var changed = false;
            
            // For each server in the JSON config
            for (var i = 0; i < serversJson.length; i++) {
                var targetServer = serversJson[i];
                var exists = false;
                
                // Check if it already exists in the Minecraft ServerList
                for (var j = 0; j < serverList.size(); j++) {
                    var existingServer = serverList.get(j);
                    if (existingServer.ip === targetServer.ip) {
                        exists = true;
                        break;
                    }
                }
                
                if (!exists) {
                    serverList.add(new ServerData(
                        targetServer.name,
                        targetServer.ip,
                        false
                    ));
                    changed = true;
                }
            }
            
            if (changed) {
                serverList.save();
                console.log("RPG Modpack: Added missing official servers to ServerList.");
            }
        } catch (e) {
            console.error("RPG Modpack: Failed to reset server list: " + e);
        }
    }

    // Redirect TitleScreen and SelectWorldScreen to JoinMultiplayerScreen
    ForgeEvents.onEvent('net.minecraftforge.client.event.ScreenEvent$Opening', event => {
        var screen = event.getScreen();
        if (screen) {
            var name = screen.getClass().getName();
            
            // If TitleScreen or SelectWorldScreen opens
            if (name.includes('TitleScreen') || name.includes('SelectWorldScreen')) {
                var mc = ClientMinecraft.getInstance();
                
                // Read selected server IP from local JSON file (bypass java.lang.System restrictions)
                var serverJson = null;
                try {
                    serverJson = JsonIO.read('local/selected_server.json');
                } catch (e) {
                    console.error("RPG Modpack: Failed to read selected_server.json: " + e);
                }
                
                var selectedServer = serverJson ? serverJson.ip : null;
                
                if (name.includes('TitleScreen') && selectedServer && !joinedOnce) {
                    joinedOnce = true;
                    
                    event.setCanceled(true);
                    
                    var selectedServerName = (serverJson && serverJson.name) || "Основной";
                    var serverData = new ServerData(
                        selectedServerName,
                        selectedServer,
                        false
                    );
                    var resolvedAddress = ServerAddress.parseString(selectedServer);
                    
                    ConnectScreen.startConnecting(
                        new TitleScreen(),
                        mc,
                        resolvedAddress,
                        serverData,
                        false // quickPlay = false (prevents auto exit on disconnect!)
                    );
                    return;
                }
                
                // Otherwise, if they just returned to TitleScreen or world select, redirect to locked MultiplayerScreen
                event.setNewScreen(new JoinMultiplayerScreen(new TitleScreen()));
            }
        }
    });

    // Reset server list before Multiplayer screen loads
    ForgeEvents.onEvent('net.minecraftforge.client.event.ScreenEvent$Init$Pre', event => {
        var screen = event.getScreen();
        if (screen) {
            var name = screen.getClass().getName();
            if (name.includes('JoinMultiplayerScreen')) {
                resetServerList();
            }
        }
    });

    // Configure custom buttons on screens (ConnectScreen and JoinMultiplayerScreen)
    ForgeEvents.onEvent('net.minecraftforge.client.event.ScreenEvent$Init$Post', event => {
        var screen = event.getScreen();
        if (screen) {
            var name = screen.getClass().getName();
            
            // 1. Remove Cancel button from ConnectScreen
            if (name.includes('ConnectScreen')) {
                var listeners = event.getListenersList();
                for (var i = 0; i < listeners.size(); i++) {
                    var listener = listeners.get(i);
                    var listenerName = listener.getClass().getName();
                    if (listenerName.includes('Button')) {
                        event.removeListener(listener);
                    }
                }
            }
            
            // 2. Lock down JoinMultiplayerScreen buttons and layout customization
            if (name.includes('JoinMultiplayerScreen')) {
                try {
                    var clazz = screen.getClass();
                    while (clazz != null) {
                        var fields = clazz.getDeclaredFields();
                        for (var i = 0; i < fields.length; i++) {
                            var f = fields[i];
                            var typeName = f.getType().getName();
                            var typeNameLower = typeName.toLowerCase();
                            
                            // Handle LAN scanning thread
                            if (typeNameLower.indexOf("lanserverdetector") !== -1 || typeNameLower.indexOf("thread") !== -1) {
                                f.setAccessible(true);
                                var thread = f.get(screen);
                                if (thread) {
                                    thread.interrupt();
                                    console.log("[RPG Modpack] Interrupted LAN scanning thread: " + f.getName());
                                }
                            }
                            
                            // Handle ServerSelectionList to remove LAN scanning entry
                            if (typeName.indexOf("ServerSelectionList") !== -1) {
                                f.setAccessible(true);
                                serverSelectionListField = f;
                                var serverSelectionList = f.get(screen);
                                if (serverSelectionList) {
                                    try {
                                        var children = serverSelectionList.children();
                                        for (var j = 0; j < children.size(); j++) {
                                            var entry = children.get(j);
                                            var entryClass = entry.getClass().getName();
                                            if (entryClass.indexOf("LanScanEntry") !== -1 || entryClass.indexOf("ScanningEntry") !== -1 || entryClass.indexOf("LANHeader") !== -1) {
                                                serverSelectionList.removeEntry(entry);
                                            }
                                        }
                                    } catch (innerErr) {
                                        console.error("[RPG Modpack] Failed to remove LAN scan entry: " + innerErr);
                                    }
                                }
                            }
                        }
                        clazz = clazz.getSuperclass();
                    }
                } catch (e) {
                    console.error("RPG Modpack: Reflection failed to disable LAN scanning: " + e);
                }

                var listeners = event.getListenersList();
                var buttonsToRemove = [];
                var refreshButton = null;
                var cancelY = 0;

                for (var i = 0; i < listeners.size(); i++) {
                    var listener = listeners.get(i);
                    var listenerName = listener.getClass().getName();
                    if (listenerName.includes('Button')) {
                        var text = listener.getMessage().getString().toLowerCase();
                        
                        if (text.includes('refresh') || text.includes('обновить')) {
                            refreshButton = listener;
                        } else if (text.includes('cancel') || text.includes('отмена') ||
                                   text.includes('back') || text.includes('назад')) {
                            cancelY = listener.getY();
                            buttonsToRemove.push(listener);
                        } else if (text.includes('add') || text.includes('добавить') ||
                                   text.includes('direct') || text.includes('адресу') ||
                                   text.includes('edit') || text.includes('настроить') ||
                                   text.includes('delete') || text.includes('удалить') ||
                                   text.includes('join') || text.includes('подключиться') || 
                                   text.includes('войти') || text.includes('select')) {
                            buttonsToRemove.push(listener);
                        }
                    }
                }

                // Remove unwanted buttons
                for (var j = 0; j < buttonsToRemove.length; j++) {
                    event.removeListener(buttonsToRemove[j]);
                }

                var screenWidth = screen.width || (typeof screen.getWidth === 'function' ? screen.getWidth() : 0);
                var screenHeight = screen.height || (typeof screen.getHeight === 'function' ? screen.getHeight() : 0);

                if (cancelY === 0) {
                    cancelY = screenHeight - 28;
                }

                // Center: "Обновить" (width 120) and "Выйти из игры" (width 160)
                // Total width = 120 + 10 + 160 = 290
                var startX = Math.floor((screenWidth - 290) / 2);

                if (refreshButton) {
                    refreshButton.setX(startX);
                    refreshButton.setY(cancelY);
                    refreshButton.setWidth(120);
                }

                // Add the Exit button next to it in a single row with the Refresh button
                var exitButton = Button.builder(
                    Component.literal("Выйти из игры"),
                    btn => {
                        ClientMinecraft.getInstance().stop();
                    }
                ).bounds(startX + 130, cancelY, 160, 20).build();
                event.addListener(exitButton);
            }
        }
    });

    ForgeEvents.onEvent('net.minecraftforge.client.event.ScreenEvent$Render$Pre', event => {
        var screen = event.getScreen();
        if (screen) {
            var name = screen.getClass().getName();
            if (name.includes('JoinMultiplayerScreen')) {
                if (serverSelectionListField) {
                    try {
                        var serverSelectionList = serverSelectionListField.get(screen);
                        if (serverSelectionList) {
                            var children = serverSelectionList.children();
                            for (var j = 0; j < children.size(); j++) {
                                var entry = children.get(j);
                                var entryClass = entry.getClass().getName();
                                if (entryClass.indexOf("LanScanEntry") !== -1 || entryClass.indexOf("ScanningEntry") !== -1 || entryClass.indexOf("LANHeader") !== -1) {
                                    serverSelectionList.removeEntry(entry);
                                    console.log("[RPG Modpack] Removed LAN scanning entry during render: " + entryClass);
                                }
                            }
                        }
                    } catch (e) {
                        // Ignore reflection errors to prevent spamming the logs
                    }
                }
            }
        }
    });
})();

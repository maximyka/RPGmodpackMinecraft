// KubeJS Startup Script - exit_on_disconnect.js
// Handles screen redirects, locks down the server selection screen, and customizes buttons.

const Minecraft = Java.loadClass('net.minecraft.client.Minecraft');
const ServerList = Java.loadClass('net.minecraft.client.multiplayer.ServerList');
const ServerData = Java.loadClass('net.minecraft.client.multiplayer.ServerData');
const ServerAddress = Java.loadClass('net.minecraft.client.multiplayer.resolver.ServerAddress');
const ConnectScreen = Java.loadClass('net.minecraft.client.gui.screens.ConnectScreen');
const TitleScreen = Java.loadClass('net.minecraft.client.gui.screens.TitleScreen');
const JoinMultiplayerScreen = Java.loadClass('net.minecraft.client.gui.screens.multiplayer.JoinMultiplayerScreen');
const Button = Java.loadClass('net.minecraft.client.gui.components.Button');
const Component = Java.loadClass('net.minecraft.network.chat.Component');

let joinedOnce = false;
let serverSelectionListField = null;

// Listen to client login using Forge event
ForgeEvents.onEvent('net.minecraftforge.client.event.ClientPlayerNetworkEvent$LoggingIn', event => {
    joinedOnce = true;
});

// Reset client server list to official servers (non-destructively)
function resetServerList() {
    try {
        let mc = Minecraft.getInstance();
        let serverList = new ServerList(mc);
        serverList.load();
        
        let serversJson = null;
        try {
            serversJson = JsonIO.read('local/servers_list.json');
        } catch (e) {
            console.error("RPG Modpack: Failed to read servers_list.json: " + e);
        }
        
        if (!serversJson || !serversJson.length) {
            return;
        }
        
        let changed = false;
        
        // For each server in the JSON config
        for (let i = 0; i < serversJson.length; i++) {
            let targetServer = serversJson[i];
            let exists = false;
            
            // Check if it already exists in the Minecraft ServerList
            for (let j = 0; j < serverList.size(); j++) {
                let existingServer = serverList.get(j);
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
    let screen = event.getScreen();
    if (screen) {
        let name = screen.getClass().getName();
        
        // If TitleScreen or SelectWorldScreen opens
        if (name.includes('TitleScreen') || name.includes('SelectWorldScreen')) {
            let mc = Minecraft.getInstance();
            
            // Read selected server IP from local JSON file (bypass java.lang.System restrictions)
            let serverJson = null;
            try {
                serverJson = JsonIO.read('local/selected_server.json');
            } catch (e) {
                console.error("RPG Modpack: Failed to read selected_server.json: " + e);
            }
            
            let selectedServer = serverJson ? serverJson.ip : null;
            
            if (name.includes('TitleScreen') && selectedServer && !joinedOnce) {
                joinedOnce = true;
                
                event.setCanceled(true);
                
                let selectedServerName = (serverJson && serverJson.name) || "Основной";
                let serverData = new ServerData(
                    selectedServerName,
                    selectedServer,
                    false
                );
                let resolvedAddress = ServerAddress.parseString(selectedServer);
                
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
    let screen = event.getScreen();
    if (screen) {
        let name = screen.getClass().getName();
        if (name.includes('JoinMultiplayerScreen')) {
            resetServerList();
        }
    }
});

// Configure custom buttons on screens (ConnectScreen and JoinMultiplayerScreen)
ForgeEvents.onEvent('net.minecraftforge.client.event.ScreenEvent$Init$Post', event => {
    let screen = event.getScreen();
    if (screen) {
        let name = screen.getClass().getName();
        
        // 1. Remove Cancel button from ConnectScreen
        if (name.includes('ConnectScreen')) {
            let listeners = event.getListenersList();
            for (let i = 0; i < listeners.size(); i++) {
                let listener = listeners.get(i);
                let listenerName = listener.getClass().getName();
                if (listenerName.includes('Button')) {
                    event.removeListener(listener);
                }
            }
        }
        
        // 2. Lock down JoinMultiplayerScreen buttons and layout customization
        if (name.includes('JoinMultiplayerScreen')) {
            try {
                let clazz = screen.getClass();
                while (clazz != null) {
                    let fields = clazz.getDeclaredFields();
                    for (let i = 0; i < fields.length; i++) {
                        let f = fields[i];
                        let typeName = f.getType().getName();
                        let typeNameLower = typeName.toLowerCase();
                        
                        // Handle LAN scanning thread
                        if (typeNameLower.indexOf("lanserverdetector") !== -1 || typeNameLower.indexOf("thread") !== -1) {
                            f.setAccessible(true);
                            let thread = f.get(screen);
                            if (thread) {
                                thread.interrupt();
                                console.log("[RPG Modpack] Interrupted LAN scanning thread: " + f.getName());
                            }
                        }
                        
                        // Handle ServerSelectionList to remove LAN scanning entry
                        if (typeName.indexOf("ServerSelectionList") !== -1) {
                            f.setAccessible(true);
                            serverSelectionListField = f;
                            console.log("[RPG Modpack] Found ServerSelectionList field: " + f.getName() + " (Type: " + typeName + ")");
                            let serverSelectionList = f.get(screen);
                            if (serverSelectionList) {
                                try {
                                    let children = serverSelectionList.children();
                                    for (let j = 0; j < children.size(); j++) {
                                        let entry = children.get(j);
                                        let entryClass = entry.getClass().getName();
                                        if (entryClass.indexOf("LanScanEntry") !== -1 || entryClass.indexOf("ScanningEntry") !== -1) {
                                            serverSelectionList.removeEntry(entry);
                                            console.log("[RPG Modpack] Successfully removed LAN scanning entry: " + entryClass);
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

            let listeners = event.getListenersList();
            let buttonsToRemove = [];
            let refreshButton = null;
            let cancelY = 0;

            for (let i = 0; i < listeners.size(); i++) {
                let listener = listeners.get(i);
                let listenerName = listener.getClass().getName();
                if (listenerName.includes('Button')) {
                    let text = listener.getMessage().getString().toLowerCase();
                    
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
            for (let j = 0; j < buttonsToRemove.length; j++) {
                event.removeListener(buttonsToRemove[j]);
            }

            let screenWidth = screen.width || (typeof screen.getWidth === 'function' ? screen.getWidth() : 0);
            let screenHeight = screen.height || (typeof screen.getHeight === 'function' ? screen.getHeight() : 0);

            if (cancelY === 0) {
                cancelY = screenHeight - 28;
            }

            // Center: "Обновить" (width 120) and "Выйти из игры" (width 160)
            // Total width = 120 + 10 + 160 = 290
            let startX = Math.floor((screenWidth - 290) / 2);

            if (refreshButton) {
                refreshButton.setX(startX);
                refreshButton.setY(cancelY);
                refreshButton.setWidth(120);
            }

            // Add the Exit button next to it in a single row with the Refresh button
            let exitButton = Button.builder(
                Component.literal("Выйти из игры"),
                btn => {
                    Minecraft.getInstance().stop();
                }
            ).bounds(startX + 130, cancelY, 160, 20).build();
            event.addListener(exitButton);
        }
    }
});

// Remove LAN scanning entry dynamically on every frame to ensure it is hidden
ForgeEvents.onEvent('net.minecraftforge.client.event.ScreenEvent$Render$Pre', event => {
    let screen = event.getScreen();
    if (screen) {
        let name = screen.getClass().getName();
        if (name.includes('JoinMultiplayerScreen')) {
            console.log("[RPG Modpack] Render$Pre running. Field cached: " + (serverSelectionListField != null));
            if (serverSelectionListField) {
                try {
                    let serverSelectionList = serverSelectionListField.get(screen);
                if (serverSelectionList) {
                    let children = serverSelectionList.children();
                    for (let j = 0; j < children.size(); j++) {
                        let entry = children.get(j);
                        let entryClass = entry.getClass().getName();
                        if (entryClass.indexOf("LanScanEntry") !== -1 || entryClass.indexOf("ScanningEntry") !== -1) {
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


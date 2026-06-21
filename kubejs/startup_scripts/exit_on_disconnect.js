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
const System = Java.loadClass('java.lang.System');

let joinedOnce = false;

// Listen to client login using Forge event
ForgeEvents.onEvent('net.minecraftforge.client.event.ClientPlayerNetworkEvent$LoggingIn', event => {
    joinedOnce = true;
});

// Reset client server list to official servers
function resetServerList() {
    try {
        let mc = Minecraft.getInstance();
        let serverList = new ServerList(mc);
        serverList.load();
        
        let size = serverList.size();
        let alreadyCorrect = false;
        
        // Check if the list already contains exactly our two servers
        if (size === 2) {
            let s1 = serverList.get(0);
            let s2 = serverList.get(1);
            if (s1.name === "Основной" && s1.ip === "ip199-83-103-135.joinserver.xyz:25920" &&
                s2.name === "Альтернативный (обход с прокси)" && s2.ip === "pidorserver.sosal.today") {
                alreadyCorrect = true;
            }
        }
        
        if (!alreadyCorrect) {
            // Remove existing servers
            for (let i = size - 1; i >= 0; i--) {
                serverList.remove(serverList.get(i));
            }
            // Add official servers
            serverList.add(new ServerData(
                "Основной", 
                "ip199-83-103-135.joinserver.xyz:25920", 
                false
            ));
            serverList.add(new ServerData(
                "Альтернативный (обход с прокси)", 
                "pidorserver.sosal.today", 
                false
            ));
            serverList.save();
            console.log("RPG Modpack: Server list reset and locked to official servers.");
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
            let selectedServer = System.getProperty("selectedServer");
            
            if (name.includes('TitleScreen') && selectedServer && !joinedOnce) {
                joinedOnce = true;
                System.clearProperty("selectedServer");
                
                event.setCanceled(true);
                
                let selectedServerName = System.getProperty("selectedServerName") || "Основной";
                mc.tell(() => {
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
                });
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
        
        // 2. Lock down JoinMultiplayerScreen buttons
        if (name.includes('JoinMultiplayerScreen')) {
            let listeners = event.getListenersList();
            let buttonsToRemove = [];
            let cancelX = 0, cancelY = 0, cancelW = 150, cancelH = 20;
            let foundCancel = false;

            for (let i = 0; i < listeners.size(); i++) {
                let listener = listeners.get(i);
                let listenerName = listener.getClass().getName();
                if (listenerName.includes('Button')) {
                    let text = listener.getMessage().getString().toLowerCase();
                    
                    // Filter out server modification buttons
                    if (text.includes('add') || text.includes('добавить') ||
                        text.includes('direct') || text.includes('адресу') ||
                        text.includes('edit') || text.includes('настроить') ||
                        text.includes('delete') || text.includes('удалить')) {
                        buttonsToRemove.push(listener);
                    }
                    
                    // Find and save bounds of the Cancel/Back button
                    if (text.includes('cancel') || text.includes('отмена') ||
                        text.includes('back') || text.includes('назад')) {
                        cancelX = listener.getX();
                        cancelY = listener.getY();
                        cancelW = listener.getWidth();
                        cancelH = listener.getHeight();
                        foundCancel = true;
                        buttonsToRemove.push(listener);
                    }
                }
            }

            // Remove unwanted buttons
            for (let j = 0; j < buttonsToRemove.length; j++) {
                event.removeListener(buttonsToRemove[j]);
            }

            // Replace the Cancel/Back button with a dedicated Exit Game button
            if (foundCancel) {
                let exitButton = Button.builder(
                    Component.literal("Выйти из игры"),
                    btn => {
                        System.exit(0);
                    }
                ).bounds(cancelX, cancelY, cancelW, cancelH).build();
                event.addListener(exitButton);
            }
        }
    }
});

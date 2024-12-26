/// <reference types="@workadventure/iframe-api-typings" />

import { bootstrapExtra, Properties} from "@workadventure/scripting-api-extra";
import {getLayersMap, findLayerBoundaries} from '@workadventure/scripting-api-extra';
import {ITiledMapTileLayer} from "@workadventure/tiled-map-type-guard/dist/ITiledMapTileLayer";

// Waiting for the API to be ready
WA.onInit().then(() => {
    console.log('Scripting API ready');


    // The line below bootstraps the Scripting API Extra library that adds a number of advanced properties/features to WorkAdventure
    bootstrapExtra().then(() => {
        console.log('Scripting API Extra ready');
    }).catch(e => console.error(e));

}).catch(e => console.error(e));


let isAnimating = false;
const soundUrl = "https://cdn.pixabay.com/audio/2022/03/24/audio_81c287eb63.mp3";

// Vereinheitlichte Animationsfunktion (vorwärts und rückwärts)
async function playAnimation(prefix: string, startFrame: number, endFrame: number, delay: number, keepLastFrame: boolean, reverse: boolean = false) {
    const step = reverse ? -1 : 1;
    for (let i = startFrame; reverse ? i >= endFrame : i <= endFrame; i += step) {
        const layerName = `${prefix}/frame${i}`;
        WA.room.showLayer(layerName);
        await new Promise(resolve => setTimeout(resolve, delay));
        if ((reverse && i !== endFrame) || (!reverse && i !== endFrame) || !keepLastFrame) {
            WA.room.hideLayer(layerName);
        }
    }
}

// Optimierte Steuerung der Animation basierend auf dem Betreten und Verlassen der Area
function handleGateAnimation(areaName: string, frameCount: number) {
    const animate = async (enter: boolean) => {
        if (isAnimating) return;
        isAnimating = true;

        // Sound laden und abspielen
        const mySound = WA.sound.loadSound(soundUrl);
        const config = {
            volume: 0.25,
            loop: false,
            rate: 1,
            detune: 1,
            delay: 0,
            seek: 0,
            mute: false
        };
        mySound.play(config);

        if (enter) {
            await playAnimation('gateFG', 1, 6, 500, false);
            await playAnimation('gateBG', 7, frameCount, 500, true);
        } else {
            await playAnimation('gateBG', frameCount, 7, 500, false, true);
            await playAnimation('gateFG', 6, 1, 500, true, true);
        }

        // Sound stoppen
        //mySound.stop();

        isAnimating = false;
    };

    WA.room.area.onEnter(areaName).subscribe(() => animate(true));
    WA.room.area.onLeave("gateArea").subscribe(() => animate(false));
}

// Animationen für die Area "openGate" steuern
handleGateAnimation('openGate', 12);


/////////
WA.onInit().then(() => {
    console.log('WA.onInit called');
    WA.room.getTiledMap().then(map => {
        console.log('Tiled map retrieved');
        const mapProperties = new Properties(map.properties);
        const collisionLayerName = mapProperties.getString('collisionLayerName') || 'collisions';

        const collisionLayer = map.layers.find(layer => layer.name === collisionLayerName);
        if (collisionLayer && collisionLayer.type === 'tilelayer') {
            const tiles = collisionLayer.data;
            const width = collisionLayer.width;
            const height = collisionLayer.height;

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const tileIndex = y * width + x;
                    if (tiles[tileIndex] !== 0) { // Assuming 0 means no tile
                        console.log(`Tile at (${x}, ${y})`);
                    }
                }
            }
        } else {
            console.error('Collision layer not found or is not a tile layer');
        }
    }).catch(e => console.error('Error retrieving tiled map:', e));
}).catch(e => console.error('Error during WA.onInit:', e));

async function populateGifts() {
    const map = await WA.room.getTiledMap();
    console.log("Room Height: ", map.height);
    console.log("Room Width: ", map.width);

    const mapProperties = new Properties(map.properties);
    const collisionLayerName = mapProperties.getString('collisionLayerName') || 'collisions';
    const collisionLayer = map.layers.find(layer => layer.name === collisionLayerName);

    if (!collisionLayer || collisionLayer.type !== 'tilelayer') {
        console.error('Collision layer not found or is not a tile layer');
        return;
    }

    const tiles = collisionLayer.data;
    const width = collisionLayer.width;
    const height = collisionLayer.height;

    const potentialGiftTiles = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const tileIndex = y * width + x;
            if (tiles[tileIndex] === 0) { // Assuming 0 means no collision
                potentialGiftTiles.push({ x, y });
            }
        }
    }

    const giftOptions = 8;
    const giftsToPlace = 10; // Number of gifts to place
    const placedGifts: { x: number, y: number, tile: string, layer: string }[] = [];

    for (let i = 0; i < giftsToPlace; i++) {
        const randomIndex = Math.floor(Math.random() * potentialGiftTiles.length);
        const { x, y } = potentialGiftTiles.splice(randomIndex, 1)[0];
        const giftTile = `gift_${Math.floor(Math.random() * giftOptions) + 1}`;
        placedGifts.push({ x, y, tile: giftTile, layer: "gifts" });
    }

    WA.room.setTiles(placedGifts);
    console.log('Gifts placed:', placedGifts);

    WA.room.onEnterLayer("gifts").subscribe(async () => {
        console.log('Player entered gifts layer');
        const { x, y } = await WA.player.getPosition();
        console.log('Player position in pixels:', { x, y });
        const tileX = Math.floor(x / 32);
        const tileY = Math.floor(y / 32);
        console.log('Player position in tiles:', { tileX, tileY });

        const giftIndex = placedGifts.findIndex(gift => gift.x === tileX && gift.y === tileY);
        if (giftIndex !== -1) {
            console.log('Gift found at player position');
            WA.chat.sendChatMessage("You found a gift!", "Game");
            WA.room.setTiles([{ x: tileX, y: tileY, tile: null, layer: "gifts" }]);
            placedGifts.splice(giftIndex, 1);
        } else {
            console.log('No gift at player position');
        }
    });
}



populateGifts().catch(e => console.error('Error populating gifts:', e));
WA.onInit().then(async () => {
    async function drawShadowAroundPlayer() {
        let previousTiles: { x: number, y: number, tile: string, layer: string }[] = [];

        const layers = await getLayersMap();
        const shadowLayer = layers.get("shadows") as ITiledMapTileLayer;
        const boundaries = findLayerBoundaries(shadowLayer);

        const drawShadow = async () => {
            try {
                const { x, y } = await WA.player.getPosition();
                const tileX = Math.floor(x / 32);
                const tileY = Math.floor(y / 32);

                const shadowTiles = [
                    { x: tileX - 1, y: tileY - 1, tile: 'edge_top_left' },
                    { x: tileX, y: tileY - 1, tile: 'middle_top' },
                    { x: tileX + 1, y: tileY - 1, tile: 'edge_top_right' },
                    { x: tileX + 1, y: tileY, tile: 'middle_right' },
                    { x: tileX + 1, y: tileY + 1, tile: 'edge_bottom_right' },
                    { x: tileX, y: tileY + 1, tile: 'middle_bottom' },
                    { x: tileX - 1, y: tileY + 1, tile: 'edge_bottom_left' },
                    { x: tileX - 1, y: tileY, tile: 'middle_left' },
                    { x: tileX, y: tileY, tile: 'blank' }
                ].map(tile => ({ ...tile, layer: 'shadows' }))
                .filter(tile => 
                    tile.x >= boundaries.left && tile.x <= boundaries.right &&
                    tile.y >= boundaries.top && tile.y <= boundaries.bottom
                );

                // Fill previous shadow tiles with "full" shadow
                if (previousTiles.length > 0) {
                    const fillTiles = previousTiles.map(tile => ({ ...tile, tile: 'full' }))
                    .filter(tile => 
                        tile.x >= boundaries.left && tile.x <= boundaries.right &&
                        tile.y >= boundaries.top && tile.y <= boundaries.bottom
                    );
                    WA.room.setTiles(fillTiles);
                }

                // Draw new shadow tiles
                WA.room.setTiles(shadowTiles);
                previousTiles = shadowTiles;
            } catch (e) {
                console.error('Error drawing shadow around player:', e);
            }
        };

        WA.player.onPlayerMove(() => {
            drawShadow().catch(e => {
                console.error('Error drawing shadow around player:', e);
                // Try to continue the script on the next player move
                WA.player.onPlayerMove(drawShadow);
            });
        });
        await drawShadow(); // Initial draw
    }

    drawShadowAroundPlayer().catch(e => console.error('Error drawing shadow around player:', e));
});
export {}